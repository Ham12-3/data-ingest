"""PyFlink-style Kafka consumer for the real-time feature pipeline.

Consumes raw events from Kafka, validates and transforms them, feeds them
through tumbling, sliding, and session window aggregators, computes feature
vectors, and publishes the results to the ``computed-features`` topic.

The consumer is designed for at-least-once semantics with manual offset
commits and batched processing for throughput.
"""

from __future__ import annotations

import json
import signal
import time
from datetime import datetime, timezone
from typing import Any

from confluent_kafka import Consumer, KafkaError, KafkaException, Producer

from config.kafka_config import TOPICS, create_consumer, create_producer
from config.settings import get_settings
from monitoring.logger import get_consumer_logger, set_correlation_id
from monitoring.prometheus_metrics import METRICS
from processing.aggregations import (
    SessionWindowAggregator,
    SlidingWindowAggregator,
    TumblingWindowAggregator,
)
from processing.feature_calculator import FeatureCalculator
from processing.transformers import transform_event
from quality.dead_letter import DeadLetterHandler
from quality.validator import EventValidator

logger = get_consumer_logger()


class FlinkStyleConsumer:
    """Kafka consumer that mirrors a Flink-style windowed processing topology.

    Batches incoming events, validates them, feeds them through four window
    aggregators (1-min tumbling, 5-min tumbling, 1-hour sliding, 30-min
    session), computes feature vectors, and produces results to the
    ``computed-features`` topic.
    """

    def __init__(self) -> None:
        """Initialise the consumer, producer, validators, and aggregators."""
        settings = get_settings()

        self._consumer: Consumer = create_consumer("flink-feature-pipeline")
        self._producer: Producer = create_producer()
        self._validator: EventValidator = EventValidator()
        self._dlq: DeadLetterHandler = DeadLetterHandler()
        self._feature_calculator: FeatureCalculator = FeatureCalculator()

        # Window aggregators
        self._tumbling_1m: TumblingWindowAggregator = TumblingWindowAggregator(60)
        self._tumbling_5m: TumblingWindowAggregator = TumblingWindowAggregator(300)
        self._sliding_1h: SlidingWindowAggregator = SlidingWindowAggregator(3600, 300)
        self._session: SessionWindowAggregator = SessionWindowAggregator(1800)

        self._running: bool = False
        self._processed_count: int = 0

        # Batch tuning from settings
        self._batch_size: int = settings.producer.batch_size
        self._validation_interval: int = settings.quality.validation_interval_seconds

    # ------------------------------------------------------------------
    # Main loop
    # ------------------------------------------------------------------

    def run(self) -> None:
        """Subscribe to the raw-events topic and process messages in batches.

        Polls Kafka with a 1-second timeout.  Messages are accumulated in a
        buffer and flushed when either the buffer reaches ``batch_size`` or
        ``validation_interval_seconds`` have elapsed since the last flush.

        Offsets are committed asynchronously after each successful batch.
        Expired sessions are flushed periodically.
        """
        self._running = True
        self._consumer.subscribe([TOPICS["raw_events"]])
        logger.info(
            "FlinkStyleConsumer started, subscribed to %s",
            TOPICS["raw_events"],
        )

        batch_buffer: list[dict[str, Any]] = []
        last_flush_time: float = time.monotonic()
        last_session_flush: float = time.monotonic()
        session_flush_interval: float = 30.0  # seconds

        try:
            while self._running:
                msg = self._consumer.poll(timeout=1.0)

                if msg is not None:
                    err = msg.error()
                    if err is not None:
                        if err.code() == KafkaError._PARTITION_EOF:
                            logger.debug(
                                "Reached end of partition %s [%d] at offset %d",
                                msg.topic(),
                                msg.partition(),
                                msg.offset(),
                            )
                        else:
                            logger.error("Kafka consumer error: %s", err)
                        continue

                    try:
                        event: dict[str, Any] = json.loads(msg.value().decode("utf-8"))
                        batch_buffer.append(event)
                    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
                        logger.warning("Failed to decode message: %s", exc)
                        self._dlq.send(
                            original_event={"raw_bytes": msg.value().decode("utf-8", errors="replace")},
                            error_message=f"Message decode failure: {exc}",
                        )

                    # Report consumer lag
                    METRICS.kafka_consumer_lag.labels(
                        topic=msg.topic(),
                        partition=str(msg.partition()),
                    ).set(max(0, msg.offset()))

                now = time.monotonic()
                elapsed_since_flush = now - last_flush_time
                should_flush = (
                    len(batch_buffer) >= self._batch_size
                    or (batch_buffer and elapsed_since_flush >= self._validation_interval)
                )

                if should_flush:
                    self._process_batch(batch_buffer)
                    batch_buffer.clear()
                    last_flush_time = time.monotonic()

                    # Commit offsets asynchronously
                    try:
                        self._consumer.commit(asynchronous=True)
                    except KafkaException as exc:
                        logger.warning("Async offset commit failed: %s", exc)

                # Periodically flush expired sessions
                if time.monotonic() - last_session_flush >= session_flush_interval:
                    self._flush_sessions()
                    last_session_flush = time.monotonic()

        except KeyboardInterrupt:
            logger.info("KeyboardInterrupt received, shutting down consumer")
        finally:
            # Process any remaining buffered events
            if batch_buffer:
                self._process_batch(batch_buffer)
                batch_buffer.clear()

            logger.info(
                "Closing consumer after processing %d total events",
                self._processed_count,
            )
            self._consumer.close()
            self._producer.flush(timeout=10)
            self._dlq.flush()

    # ------------------------------------------------------------------
    # Batch processing
    # ------------------------------------------------------------------

    def _process_batch(self, events: list[dict[str, Any]]) -> None:
        """Validate, transform, aggregate, and produce features for a batch.

        Args:
            events: A list of raw event dictionaries decoded from Kafka
                messages.

        Steps:
            1. Validate the batch; send failures to the dead-letter queue.
            2. Transform each passing event and feed all four aggregators.
            3. Retrieve window results and compute feature vectors.
            4. Produce feature dicts to the ``computed-features`` topic.
            5. Evict stale tumbling windows and observe latency metrics.
        """
        if not events:
            return

        batch_start: float = time.monotonic()

        # 1. Validate
        passed, failed = self._validator.validate_batch(events)

        for failure in failed:
            self._dlq.send(
                original_event=failure.get("event", {}),
                error_message=failure.get("error", "Validation failed"),
                error_field=failure.get("field"),
            )

        # 2-6. Process each valid event
        for event in passed:
            event_id: str = event.get("event_id", "unknown")
            user_id: str = event.get("user_id", "unknown")
            set_correlation_id(event_id)

            try:
                # Transform
                transformed: dict[str, Any] = transform_event(event)

                # Feed all aggregators
                self._tumbling_1m.add(transformed)
                self._tumbling_5m.add(transformed)
                self._sliding_1h.add(transformed)
                self._session.add(transformed)

                # Get window results
                timestamp_epoch: int = transformed.get("timestamp_epoch", int(time.time()))
                results_1m: dict[str, Any] = self._tumbling_1m.get_window(
                    user_id, timestamp_epoch
                )
                results_5m: dict[str, Any] = self._tumbling_5m.get_window(
                    user_id, timestamp_epoch
                )
                results_1h: dict[str, Any] = self._sliding_1h.get_window(
                    user_id, timestamp_epoch
                )
                results_session: dict[str, Any] = self._session.get_window(
                    user_id, timestamp_epoch
                )

                # Compute features
                features: dict[str, Any] = self._feature_calculator.compute_features(
                    user_id=user_id,
                    window_1m=results_1m,
                    window_5m=results_5m,
                    window_1h=results_1h,
                    window_session=results_session,
                )

                # Produce to computed-features topic
                feature_payload: bytes = json.dumps(features, default=str).encode("utf-8")
                self._producer.produce(
                    topic=TOPICS["computed_features"],
                    key=user_id.encode("utf-8"),
                    value=feature_payload,
                )

                # Increment processed counter
                METRICS.events_processed_total.inc()
                self._processed_count += 1

            except Exception:
                logger.exception(
                    "Failed to process event %s for user %s",
                    event_id,
                    user_id,
                )
                self._dlq.send(
                    original_event=event,
                    error_message="Processing error",
                )

        # 7. Evict old tumbling windows
        now_epoch: int = int(time.time())
        self._tumbling_1m.evict(now_epoch, max_age_seconds=120)
        self._tumbling_5m.evict(now_epoch, max_age_seconds=600)

        # 8. Observe processing latency
        batch_latency: float = time.monotonic() - batch_start
        METRICS.processing_latency_seconds.observe(batch_latency)

        # 9. Log batch summary
        latency_ms: float = batch_latency * 1000.0
        logger.info(
            "Batch processed: passed=%d, failed=%d, latency_ms=%.1f",
            len(passed),
            len(failed),
            latency_ms,
            extra={
                "batch_size": len(events),
                "latency_ms": round(latency_ms, 1),
            },
        )

    # ------------------------------------------------------------------
    # Session flushing
    # ------------------------------------------------------------------

    def _flush_sessions(self) -> None:
        """Flush expired sessions and produce their feature vectors.

        Expired sessions are collected from the ``SessionWindowAggregator``.
        For each expired session a feature vector is computed using the
        session window data and empty 1-minute / 5-minute windows, then
        published to the ``computed-features`` topic.
        """
        now_epoch: int = int(time.time())
        expired_sessions: list[dict[str, Any]] = self._session.flush_expired(now_epoch)

        for session in expired_sessions:
            user_id: str = session.get("user_id", "unknown")
            set_correlation_id(f"session-flush-{user_id}")

            try:
                empty_window: dict[str, Any] = {}
                features: dict[str, Any] = self._feature_calculator.compute_features(
                    user_id=user_id,
                    window_1m=empty_window,
                    window_5m=empty_window,
                    window_1h=self._sliding_1h.get_window(user_id, now_epoch),
                    window_session=session,
                )

                feature_payload: bytes = json.dumps(features, default=str).encode("utf-8")
                self._producer.produce(
                    topic=TOPICS["computed_features"],
                    key=user_id.encode("utf-8"),
                    value=feature_payload,
                )
            except Exception:
                logger.exception(
                    "Failed to flush session features for user %s", user_id
                )

        if expired_sessions:
            self._producer.flush(timeout=5)
            logger.info(
                "Flushed %d expired sessions", len(expired_sessions)
            )

    # ------------------------------------------------------------------
    # Shutdown
    # ------------------------------------------------------------------

    def stop(self) -> None:
        """Signal the consumer to stop after the current poll cycle."""
        self._running = False
        logger.info("Stop signal received for FlinkStyleConsumer")


# ======================================================================
# Entrypoint
# ======================================================================


def main() -> None:
    """Create the consumer, register signal handlers, and start processing."""
    consumer = FlinkStyleConsumer()

    def _handle_shutdown(signum: int, frame: Any) -> None:
        """Signal handler that triggers a graceful shutdown."""
        sig_name: str = signal.Signals(signum).name
        logger.info("Received signal %s, initiating graceful shutdown", sig_name)
        consumer.stop()

    signal.signal(signal.SIGINT, _handle_shutdown)
    signal.signal(signal.SIGTERM, _handle_shutdown)

    consumer.run()


if __name__ == "__main__":
    main()
