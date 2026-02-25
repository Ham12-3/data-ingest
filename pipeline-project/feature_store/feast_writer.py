"""Feast writer consumer that materialises computed features to online/offline stores.

Consumes feature vectors from the ``computed-features`` Kafka topic and
writes them to Feast's online (Redis) and offline (Postgres) stores.
Includes a circuit-breaker pattern to avoid cascading failures and
exponential-backoff retry logic for transient write errors.
"""

from __future__ import annotations

import json
import signal
import time
from datetime import datetime, timezone
from enum import Enum
from typing import Any

import pandas as pd
from confluent_kafka import Consumer, KafkaError, KafkaException
from feast import FeatureStore

from config.kafka_config import TOPICS, create_consumer
from config.settings import get_settings
from monitoring.logger import get_feature_logger
from monitoring.prometheus_metrics import METRICS

logger = get_feature_logger()

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MAX_RETRIES: int = 5
"""Maximum number of retry attempts for a failed write operation."""

BASE_BACKOFF_SECONDS: float = 0.5
"""Base delay (seconds) for the exponential back-off calculation."""


# ---------------------------------------------------------------------------
# Circuit breaker
# ---------------------------------------------------------------------------


class CircuitState(str, Enum):
    """Possible states for the :class:`CircuitBreaker`."""

    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half-open"


class CircuitBreaker:
    """Simple circuit breaker that trips after consecutive failures.

    The breaker starts in the *closed* state and counts consecutive
    failures.  Once :pyattr:`failure_threshold` is reached the breaker
    transitions to *open*, rejecting all calls.  After
    :pyattr:`reset_timeout` seconds it moves to *half-open*, allowing a
    single trial call.  A success resets to *closed*; another failure
    reopens the breaker.

    Args:
        name: Human-readable label used in log messages.
        failure_threshold: Number of consecutive failures before opening.
        reset_timeout: Seconds to wait before transitioning from open to
            half-open.
    """

    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        reset_timeout: float = 60.0,
    ) -> None:
        self._name: str = name
        self._failure_threshold: int = failure_threshold
        self._reset_timeout: float = reset_timeout

        self._state: CircuitState = CircuitState.CLOSED
        self._failure_count: int = 0
        self._last_failure_time: float = 0.0

    # -- Properties --------------------------------------------------------

    @property
    def is_open(self) -> bool:
        """Return ``True`` when the breaker is open (calls should be rejected).

        Automatically transitions from *open* to *half-open* once the
        reset timeout has elapsed.
        """
        if self._state == CircuitState.OPEN:
            if time.monotonic() - self._last_failure_time >= self._reset_timeout:
                logger.info(
                    "CircuitBreaker[%s] transitioning from open to half-open",
                    self._name,
                )
                self._state = CircuitState.HALF_OPEN
                return False
            return True
        return False

    @property
    def state(self) -> CircuitState:
        """Return the current :class:`CircuitState`."""
        return self._state

    # -- State transitions -------------------------------------------------

    def record_success(self) -> None:
        """Record a successful call, resetting the breaker to *closed*."""
        if self._state in (CircuitState.HALF_OPEN, CircuitState.CLOSED):
            if self._failure_count > 0:
                logger.info(
                    "CircuitBreaker[%s] reset to closed after success",
                    self._name,
                )
            self._failure_count = 0
            self._state = CircuitState.CLOSED

    def record_failure(self) -> None:
        """Record a failed call, potentially tripping the breaker."""
        self._failure_count += 1
        self._last_failure_time = time.monotonic()

        if self._state == CircuitState.HALF_OPEN:
            logger.warning(
                "CircuitBreaker[%s] half-open trial failed, reopening",
                self._name,
            )
            self._state = CircuitState.OPEN
        elif self._failure_count >= self._failure_threshold:
            logger.warning(
                "CircuitBreaker[%s] failure threshold reached (%d), opening",
                self._name,
                self._failure_count,
            )
            self._state = CircuitState.OPEN


# ---------------------------------------------------------------------------
# Feast writer
# ---------------------------------------------------------------------------


class FeastWriter:
    """Kafka consumer that writes computed features to Feast stores.

    Polls the ``computed-features`` topic, accumulates feature records,
    and periodically flushes them as a :class:`pandas.DataFrame` to
    both the online and offline Feast stores.

    The writer uses circuit breakers and exponential back-off retries to
    handle transient store failures gracefully.
    """

    def __init__(self) -> None:
        """Initialise the Kafka consumer, Feast store, and circuit breakers."""
        self._consumer: Consumer = create_consumer("feast-writer")
        self._store: FeatureStore = FeatureStore(
            repo_path="feature_store/feature_repo"
        )
        self._cb_online: CircuitBreaker = CircuitBreaker(
            name="online-store",
            failure_threshold=5,
            reset_timeout=60.0,
        )
        self._cb_offline: CircuitBreaker = CircuitBreaker(
            name="offline-store",
            failure_threshold=5,
            reset_timeout=60.0,
        )
        self._running: bool = False

        # Batch tuning
        self._flush_interval: float = 5.0  # seconds
        self._max_batch_size: int = 100

    # ------------------------------------------------------------------
    # Main loop
    # ------------------------------------------------------------------

    def run(self) -> None:
        """Subscribe to the computed-features topic and materialise batches.

        Features are accumulated in a buffer and flushed every 5 seconds
        or when 100 records have been collected, whichever comes first.
        """
        self._running = True
        self._consumer.subscribe([TOPICS["computed_features"]])
        logger.info(
            "FeastWriter started, subscribed to %s",
            TOPICS["computed_features"],
        )

        buffer: list[dict[str, Any]] = []
        last_flush: float = time.monotonic()

        try:
            while self._running:
                msg = self._consumer.poll(timeout=1.0)

                if msg is not None:
                    err = msg.error()
                    if err is not None:
                        if err.code() != KafkaError._PARTITION_EOF:
                            logger.error("Kafka error: %s", err)
                        continue

                    try:
                        record: dict[str, Any] = json.loads(
                            msg.value().decode("utf-8")
                        )
                        buffer.append(record)
                    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
                        logger.warning("Skipping malformed message: %s", exc)

                now = time.monotonic()
                should_flush = (
                    len(buffer) >= self._max_batch_size
                    or (buffer and now - last_flush >= self._flush_interval)
                )

                if should_flush:
                    self._write_batch(buffer)
                    buffer.clear()
                    last_flush = time.monotonic()

                    try:
                        self._consumer.commit(asynchronous=True)
                    except KafkaException as exc:
                        logger.warning("Async offset commit failed: %s", exc)

        except KeyboardInterrupt:
            logger.info("KeyboardInterrupt received, shutting down FeastWriter")
        finally:
            if buffer:
                self._write_batch(buffer)
                buffer.clear()

            logger.info("Closing FeastWriter consumer")
            self._consumer.close()

    # ------------------------------------------------------------------
    # Batch writing
    # ------------------------------------------------------------------

    def _write_batch(self, features_list: list[dict[str, Any]]) -> None:
        """Prepare a DataFrame and write to online and offline stores.

        Args:
            features_list: List of feature dictionaries decoded from Kafka.
        """
        if not features_list:
            return

        df: pd.DataFrame = self._prepare_dataframe(features_list)
        self._write_online(df)
        self._write_offline(df)

    def _prepare_dataframe(
        self, features_list: list[dict[str, Any]]
    ) -> pd.DataFrame:
        """Convert a list of feature dicts into a pandas DataFrame.

        Ensures that timestamp columns (``computed_at``, ``window_start``,
        ``window_end``) are converted to ``datetime64[ns, UTC]``.

        Args:
            features_list: Raw feature dictionaries.

        Returns:
            A :class:`pandas.DataFrame` ready for Feast ingestion.
        """
        df: pd.DataFrame = pd.DataFrame(features_list)

        timestamp_columns: list[str] = [
            "computed_at",
            "window_start",
            "window_end",
        ]
        for col in timestamp_columns:
            if col in df.columns:
                df[col] = pd.to_datetime(df[col], utc=True, errors="coerce")

        return df

    def _write_online(self, df: pd.DataFrame) -> None:
        """Write features to the Feast online store with retry and circuit breaker.

        Args:
            df: Feature DataFrame to materialise.
        """
        if self._cb_online.is_open:
            logger.warning("Online-store circuit breaker is open, skipping write")
            return

        for attempt in range(1, MAX_RETRIES + 1):
            start: float = time.monotonic()
            try:
                self._store.write_to_online_store(
                    feature_view_name="user_realtime_features",
                    df=df,
                )
                elapsed: float = time.monotonic() - start

                METRICS.feature_write_latency_seconds.labels(store="online").observe(
                    elapsed
                )
                METRICS.features_written_total.labels(store="online").inc(len(df))

                self._cb_online.record_success()
                logger.debug(
                    "Wrote %d features to online store in %.3fs",
                    len(df),
                    elapsed,
                )
                return

            except Exception as exc:
                elapsed = time.monotonic() - start
                METRICS.feature_write_latency_seconds.labels(store="online").observe(
                    elapsed
                )
                self._cb_online.record_failure()

                if attempt < MAX_RETRIES and not self._cb_online.is_open:
                    backoff: float = BASE_BACKOFF_SECONDS * (2 ** (attempt - 1))
                    logger.warning(
                        "Online write attempt %d/%d failed (%.3fs), "
                        "retrying in %.2fs: %s",
                        attempt,
                        MAX_RETRIES,
                        elapsed,
                        backoff,
                        exc,
                    )
                    time.sleep(backoff)
                else:
                    logger.error(
                        "Online write failed after %d attempt(s): %s",
                        attempt,
                        exc,
                    )
                    return

    def _write_offline(self, df: pd.DataFrame) -> None:
        """Write features to the Feast offline store with retry and circuit breaker.

        Args:
            df: Feature DataFrame to materialise.
        """
        if self._cb_offline.is_open:
            logger.warning("Offline-store circuit breaker is open, skipping write")
            return

        for attempt in range(1, MAX_RETRIES + 1):
            start: float = time.monotonic()
            try:
                self._store.write_to_offline_store(
                    feature_view_name="user_realtime_features",
                    df=df,
                )
                elapsed: float = time.monotonic() - start

                METRICS.feature_write_latency_seconds.labels(store="offline").observe(
                    elapsed
                )
                METRICS.features_written_total.labels(store="offline").inc(len(df))

                self._cb_offline.record_success()
                logger.debug(
                    "Wrote %d features to offline store in %.3fs",
                    len(df),
                    elapsed,
                )
                return

            except Exception as exc:
                elapsed = time.monotonic() - start
                METRICS.feature_write_latency_seconds.labels(store="offline").observe(
                    elapsed
                )
                self._cb_offline.record_failure()

                if attempt < MAX_RETRIES and not self._cb_offline.is_open:
                    backoff: float = BASE_BACKOFF_SECONDS * (2 ** (attempt - 1))
                    logger.warning(
                        "Offline write attempt %d/%d failed (%.3fs), "
                        "retrying in %.2fs: %s",
                        attempt,
                        MAX_RETRIES,
                        elapsed,
                        backoff,
                        exc,
                    )
                    time.sleep(backoff)
                else:
                    logger.error(
                        "Offline write failed after %d attempt(s): %s",
                        attempt,
                        exc,
                    )
                    return

    # ------------------------------------------------------------------
    # Shutdown
    # ------------------------------------------------------------------

    def stop(self) -> None:
        """Signal the writer to stop after the current poll cycle."""
        self._running = False
        logger.info("Stop signal received for FeastWriter")


# ======================================================================
# Entrypoint
# ======================================================================


def main() -> None:
    """Create the Feast writer, register signal handlers, and start processing."""
    writer = FeastWriter()

    def _handle_shutdown(signum: int, frame: Any) -> None:
        """Signal handler that triggers a graceful shutdown."""
        sig_name: str = signal.Signals(signum).name
        logger.info("Received signal %s, initiating FeastWriter shutdown", sig_name)
        writer.stop()

    signal.signal(signal.SIGINT, _handle_shutdown)
    signal.signal(signal.SIGTERM, _handle_shutdown)

    writer.run()


if __name__ == "__main__":
    main()
