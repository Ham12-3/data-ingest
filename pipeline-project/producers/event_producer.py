"""Kafka event producer that publishes synthetic user events.

This module provides :class:`EventProducer`, which generates realistic
user-interaction events via :mod:`producers.sample_data` and publishes
them to the ``raw-events`` Kafka topic.  Serialisation uses Avro via the
Confluent Schema Registry when available, falling back to plain JSON.

Usage (CLI)::

    python -m producers.event_producer

The producer honours the ``PRODUCER_EVENTS_PER_SECOND`` and
``PRODUCER_BATCH_SIZE`` environment variables (see
:mod:`config.settings`).
"""

from __future__ import annotations

import json
import logging
import signal
import sys
import time
import uuid
from datetime import datetime, timezone
from types import FrameType
from typing import Any

from confluent_kafka import KafkaError, KafkaException, Producer

from config.kafka_config import (
    TOPICS,
    create_producer,
    ensure_topics_exist,
    get_schema_registry_client,
)
from config.settings import get_settings
from monitoring.logger import get_producer_logger, set_correlation_id
from monitoring.prometheus_metrics import events_ingested_total
from producers.sample_data import generate_batch

# ---------------------------------------------------------------------------
# Module-level logger
# ---------------------------------------------------------------------------

logger: logging.Logger = get_producer_logger(__name__)


# ---------------------------------------------------------------------------
# EventProducer
# ---------------------------------------------------------------------------


class EventProducer:
    """High-throughput Kafka producer for synthetic pipeline events.

    On construction the producer attempts to connect to the Confluent
    Schema Registry and build an Avro serialiser.  If the registry is
    unreachable, serialisation falls back to plain JSON so the pipeline
    can still run during local development.

    Args:
        events_per_second: Target throughput.  Defaults to the value
                           from :class:`config.settings.ProducerSettings`.
        batch_size:        Number of events to buffer before a
                           :pymethod:`confluent_kafka.Producer.poll`.
                           Defaults to the value from settings.
    """

    _TOPIC: str = TOPICS.get("raw_events", "raw-events")

    def __init__(
        self,
        events_per_second: int | None = None,
        batch_size: int | None = None,
    ) -> None:
        settings = get_settings()
        self._events_per_second: int = (
            events_per_second
            if events_per_second is not None
            else settings.producer.events_per_second
        )
        self._batch_size: int = (
            batch_size
            if batch_size is not None
            else settings.producer.batch_size
        )
        self._running: bool = False

        # Counters for throughput reporting.
        self._produced_count: int = 0
        self._error_count: int = 0

        # Create the underlying Kafka producer.
        self._producer: Producer = create_producer()

        # Attempt Avro serialisation via Schema Registry.
        self._avro_serializer: Any | None = None
        try:
            schema_registry_client = get_schema_registry_client()
            # confluent_kafka.schema_registry.avro provides AvroSerializer.
            from confluent_kafka.schema_registry.avro import AvroSerializer
            from pathlib import Path

            schema_path: Path = (
                Path(__file__).resolve().parent.parent
                / "schemas"
                / "avro"
                / "user_event.avsc"
            )
            schema_str: str = schema_path.read_text(encoding="utf-8")
            self._avro_serializer = AvroSerializer(
                schema_registry_client,
                schema_str,
            )
            logger.info(
                "Avro serialisation enabled via Schema Registry.",
            )
        except Exception:
            logger.warning(
                "Schema Registry unavailable -- falling back to JSON "
                "serialisation.",
                exc_info=True,
            )
            self._avro_serializer = None

    # ------------------------------------------------------------------
    # Delivery callback
    # ------------------------------------------------------------------

    def _delivery_callback(self, err: KafkaError | None, msg: Any) -> None:
        """Handle asynchronous message delivery reports.

        Called once per message by the Kafka client library's background
        thread.  On failure the error is logged and the internal error
        counter is incremented.

        Args:
            err: ``None`` on success, otherwise a :class:`KafkaError`.
            msg: The :class:`confluent_kafka.Message` that was delivered
                 (or failed).
        """
        if err is not None:
            self._error_count += 1
            logger.error(
                "Message delivery failed: topic=%s partition=%s error=%s",
                msg.topic(),
                msg.partition(),
                err,
            )
        else:
            events_ingested_total.labels(
                event_type="produced",
                status="success",
            ).inc()

    # ------------------------------------------------------------------
    # Serialisation
    # ------------------------------------------------------------------

    def _serialize_value(self, event: dict[str, Any]) -> bytes:
        """Serialise an event dictionary to bytes.

        Uses Avro serialisation when a Schema Registry connection is
        available; otherwise falls back to UTF-8 encoded JSON.

        Args:
            event: The event payload conforming to the ``UserEvent``
                   Avro schema.

        Returns:
            The serialised byte string.
        """
        if self._avro_serializer is not None:
            try:
                from confluent_kafka.serialization import (
                    SerializationContext,
                    MessageField,
                )

                ctx = SerializationContext(self._TOPIC, MessageField.VALUE)
                return self._avro_serializer(event, ctx)
            except Exception:
                logger.warning(
                    "Avro serialisation failed; falling back to JSON.",
                    exc_info=True,
                )
        return json.dumps(event, default=str).encode("utf-8")

    # ------------------------------------------------------------------
    # Produce
    # ------------------------------------------------------------------

    def produce_batch(self, events: list[dict[str, Any]]) -> None:
        """Publish a batch of events to the ``raw-events`` Kafka topic.

        Each event is keyed by its ``user_id`` to ensure all events for
        a given user land on the same partition.  If the internal
        producer buffer is full (:class:`BufferError`), the method
        flushes and retries once.

        Args:
            events: A list of event dictionaries to publish.
        """
        for event in events:
            key: bytes = event["user_id"].encode("utf-8")
            value: bytes = self._serialize_value(event)
            try:
                self._producer.produce(
                    topic=self._TOPIC,
                    key=key,
                    value=value,
                    callback=self._delivery_callback,
                )
                self._produced_count += 1
            except BufferError:
                logger.warning(
                    "Producer buffer full -- flushing and retrying.",
                )
                self._producer.flush(timeout=5.0)
                # Retry the single message after flushing.
                try:
                    self._producer.produce(
                        topic=self._TOPIC,
                        key=key,
                        value=value,
                        callback=self._delivery_callback,
                    )
                    self._produced_count += 1
                except BufferError:
                    self._error_count += 1
                    logger.error(
                        "Producer buffer still full after flush -- "
                        "dropping event %s.",
                        event.get("event_id", "unknown"),
                    )
            except KafkaException as exc:
                self._error_count += 1
                logger.error(
                    "Kafka produce error: %s",
                    exc,
                    exc_info=True,
                )

        # Trigger delivery-report callbacks without blocking.
        self._producer.poll(0)

    # ------------------------------------------------------------------
    # Main loop
    # ------------------------------------------------------------------

    def run(self) -> None:
        """Execute the main event-generation loop.

        Generates events at the configured rate
        (``events_per_second``), publishing them in batches of
        ``batch_size``.  Throughput statistics are logged every
        10 seconds.

        The loop runs until :meth:`stop` is called (typically via a
        signal handler).
        """
        self._running = True
        logger.info(
            "Starting event producer: rate=%d events/s, batch_size=%d, "
            "topic=%s",
            self._events_per_second,
            self._batch_size,
            self._TOPIC,
        )

        interval: float = self._batch_size / max(self._events_per_second, 1)
        last_log_time: float = time.monotonic()
        last_log_count: int = 0

        while self._running:
            loop_start: float = time.monotonic()

            # Generate and publish a batch.
            batch: list[dict[str, Any]] = generate_batch(
                size=self._batch_size,
                timestamp=datetime.now(timezone.utc),
            )
            self.produce_batch(batch)

            # Periodic throughput logging (every 10 seconds).
            now: float = time.monotonic()
            elapsed_since_log: float = now - last_log_time
            if elapsed_since_log >= 10.0:
                produced_in_window: int = (
                    self._produced_count - last_log_count
                )
                throughput: float = produced_in_window / elapsed_since_log
                logger.info(
                    "Throughput: %.1f events/s (produced=%d, errors=%d)",
                    throughput,
                    self._produced_count,
                    self._error_count,
                )
                last_log_time = now
                last_log_count = self._produced_count

            # Sleep to maintain the target rate.
            elapsed: float = time.monotonic() - loop_start
            sleep_time: float = max(0.0, interval - elapsed)
            if sleep_time > 0:
                time.sleep(sleep_time)

        # Final flush on exit.
        logger.info("Flushing remaining messages...")
        self._producer.flush(timeout=10.0)
        logger.info(
            "Producer stopped. Total produced=%d, errors=%d.",
            self._produced_count,
            self._error_count,
        )

    # ------------------------------------------------------------------
    # Shutdown
    # ------------------------------------------------------------------

    def stop(self) -> None:
        """Signal the producer loop to shut down gracefully."""
        logger.info("Stop requested -- finishing current batch.")
        self._running = False


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def main() -> None:
    """CLI entry point for the event producer.

    Ensures required Kafka topics exist, installs signal handlers for
    ``SIGINT`` and ``SIGTERM``, then starts the producer run-loop.
    """
    # Assign a correlation ID for structured log tracing.
    set_correlation_id(str(uuid.uuid4()))

    logger.info("Initialising event producer...")

    # Create required topics if they do not exist.
    try:
        ensure_topics_exist()
        logger.info("Kafka topics verified.")
    except Exception:
        logger.error(
            "Failed to ensure Kafka topics exist.",
            exc_info=True,
        )
        sys.exit(1)

    producer = EventProducer()

    # Register signal handlers for graceful shutdown.
    def _handle_signal(signum: int, frame: FrameType | None) -> None:
        sig_name: str = signal.Signals(signum).name
        logger.info("Received %s -- initiating shutdown.", sig_name)
        producer.stop()

    signal.signal(signal.SIGINT, _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)

    try:
        producer.run()
    except KeyboardInterrupt:
        logger.info("KeyboardInterrupt received.")
        producer.stop()
    except Exception:
        logger.critical("Unhandled exception in producer.", exc_info=True)
        sys.exit(1)

    logger.info("Event producer exited cleanly.")


if __name__ == "__main__":
    main()
