"""Dead-letter queue handler for the data ingestion pipeline.

Provides the :class:`DeadLetterHandler` which routes failed events to a
dedicated Kafka dead-letter topic (``dead-letter-events``).  A bounded
in-memory deque of recent failures is maintained for quick inspection via
the REST API or monitoring dashboards.

Typical usage::

    from quality.dead_letter import DeadLetterHandler

    dlq = DeadLetterHandler()
    dlq.send_to_dlq(event, errors, correlation_id="req-abc-123")
    recent = dlq.get_recent_failures(limit=5)
"""

from __future__ import annotations

import json
import time
from collections import deque
from datetime import datetime, timezone
from typing import Any, Optional

from config.kafka_config import TOPICS, create_producer
from monitoring.logger import get_correlation_id, get_validator_logger
from monitoring.prometheus_metrics import METRICS

# ---------------------------------------------------------------------------
# Module-level constants
# ---------------------------------------------------------------------------

MAX_RECENT_DLQ: int = 1000
"""Maximum number of recent failures retained in the in-memory deque."""

logger = get_validator_logger()


# ---------------------------------------------------------------------------
# Handler
# ---------------------------------------------------------------------------


class DeadLetterHandler:
    """Routes failed events to the Kafka dead-letter topic and maintains
    an in-memory buffer of recent failures for operational visibility.

    The handler is safe to use from a single thread.  If concurrent
    access is required, callers should synchronise externally or use
    one handler per thread.
    """

    def __init__(self) -> None:
        """Initialise the handler with a Kafka producer and an empty
        recent-failures deque."""
        self._producer = create_producer()
        self._recent_failures: deque[dict[str, Any]] = deque(
            maxlen=MAX_RECENT_DLQ
        )
        self._total_count: int = 0

    # -- Public interface ---------------------------------------------------

    def send_to_dlq(
        self,
        event: dict[str, Any],
        errors: list[dict[str, Any]],
        correlation_id: Optional[str] = None,
    ) -> None:
        """Send a single failed event to the dead-letter Kafka topic.

        The event, its validation errors, and contextual metadata are
        serialised as JSON and produced to the ``dead-letter-events``
        topic.  The message is keyed by ``event_id`` (if present) for
        deterministic partitioning.

        Args:
            event: The original event dictionary that failed validation.
            errors: A list of error detail dictionaries produced by the
                validator (each typically containing ``field``, ``rule``,
                and ``message`` keys).
            correlation_id: Optional correlation ID for distributed
                tracing.  Falls back to the context-var value when
                ``None``.
        """
        effective_correlation_id: Optional[str] = (
            correlation_id or get_correlation_id()
        )

        dlq_record: dict[str, Any] = {
            "original_event": event,
            "errors": errors,
            "failed_at": datetime.now(tz=timezone.utc).isoformat(),
            "correlation_id": effective_correlation_id,
        }

        topic: str = TOPICS["dead_letter_events"]
        key: Optional[str] = event.get("event_id")
        key_bytes: Optional[bytes] = (
            key.encode("utf-8") if key is not None else None
        )
        value_bytes: bytes = json.dumps(dlq_record, default=str).encode(
            "utf-8"
        )

        self._producer.produce(
            topic=topic,
            key=key_bytes,
            value=value_bytes,
            callback=self._delivery_callback,
        )

        # Update in-memory tracking
        self._recent_failures.append(dlq_record)
        self._total_count += 1
        METRICS.dead_letter_queue_size.inc()

        logger.warning(
            "Event sent to DLQ: event_id=%s, errors=%d, correlation_id=%s",
            key,
            len(errors),
            effective_correlation_id,
            extra={
                "event_id": key,
                "component": "dead_letter",
            },
        )

    def send_batch_to_dlq(
        self,
        failures: list[tuple[dict[str, Any], list[dict[str, Any]]]],
    ) -> None:
        """Send multiple failed events to the dead-letter topic and flush.

        This is a convenience wrapper around :meth:`send_to_dlq` that
        processes an entire list of ``(event, errors)`` tuples and
        flushes the producer once at the end.

        Args:
            failures: A list of ``(event, errors)`` tuples as returned
                by :meth:`~quality.validator.EventValidator.validate_batch`.
        """
        for event, errors in failures:
            self.send_to_dlq(event, errors)
        self.flush()

    def get_recent_failures(
        self,
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        """Return the most recent dead-letter entries, newest first.

        Args:
            limit: Maximum number of entries to return.  Defaults to 10.

        Returns:
            A list of dead-letter record dictionaries ordered from
            newest to oldest, capped at *limit* entries.
        """
        recent: list[dict[str, Any]] = list(self._recent_failures)
        recent.reverse()
        return recent[:limit]

    @property
    def total_count(self) -> int:
        """Return the total number of events sent to the DLQ since initialisation."""
        return self._total_count

    # -- Kafka helpers ------------------------------------------------------

    def _delivery_callback(self, err: Any, msg: Any) -> None:
        """Kafka producer delivery report callback.

        Logs an error when delivery fails or a debug message on success.

        Args:
            err: A ``KafkaError`` instance if delivery failed, else ``None``.
            msg: The ``Message`` object that was (or failed to be) delivered.
        """
        if err is not None:
            logger.error(
                "DLQ delivery failed: %s (topic=%s, partition=%s)",
                err,
                msg.topic() if msg else "unknown",
                msg.partition() if msg else "unknown",
                extra={"component": "dead_letter", "error_type": str(err)},
            )
        else:
            logger.debug(
                "DLQ delivery confirmed: topic=%s, partition=%s, offset=%s",
                msg.topic(),
                msg.partition(),
                msg.offset(),
                extra={
                    "component": "dead_letter",
                    "topic": msg.topic(),
                    "partition": msg.partition(),
                    "offset": msg.offset(),
                },
            )

    def flush(self, timeout: float = 10.0) -> None:
        """Flush the Kafka producer, blocking until all buffered messages
        are delivered or the timeout expires.

        Args:
            timeout: Maximum number of seconds to block.  Defaults to
                10.0 seconds.
        """
        remaining: int = self._producer.flush(timeout=timeout)
        if remaining > 0:
            logger.warning(
                "Kafka producer flush timed out with %d message(s) remaining.",
                remaining,
                extra={"component": "dead_letter"},
            )
