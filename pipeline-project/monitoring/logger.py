"""Structured JSON logging for the data ingestion pipeline.

Provides correlation-ID propagation via ``contextvars``, a custom
``JSONFormatter`` that emits machine-readable log lines, and convenience
factory functions for each pipeline component.

Typical usage::

    from monitoring.logger import get_consumer_logger, set_correlation_id

    logger = get_consumer_logger()
    set_correlation_id("req-abc-123")
    logger.info("batch consumed", extra={"batch_size": 50, "topic": "events"})

Environment
-----------
Set the environment variable ``LOG_FORMAT`` to ``"plain"`` to fall back to
the standard human-readable format (useful during local development).  Any
other value (or absence) defaults to structured JSON output.

Set ``LOG_LEVEL`` to control the root threshold (default: ``INFO``).
"""

from __future__ import annotations

import json
import logging
import os
import sys
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Any, Optional

# ---------------------------------------------------------------------------
# Correlation-ID context propagation
# ---------------------------------------------------------------------------

_correlation_id_var: ContextVar[Optional[str]] = ContextVar(
    "correlation_id", default=None
)


def get_correlation_id() -> Optional[str]:
    """Return the correlation ID bound to the current execution context.

    Returns:
        The active correlation ID string, or ``None`` if none has been set.
    """
    return _correlation_id_var.get()


def set_correlation_id(correlation_id: Optional[str]) -> None:
    """Bind a correlation ID to the current execution context.

    Args:
        correlation_id: An opaque string that will be attached to every log
            record emitted within the same context.  Pass ``None`` to clear.
    """
    _correlation_id_var.set(correlation_id)


# ---------------------------------------------------------------------------
# Recognised extra fields
# ---------------------------------------------------------------------------

_KNOWN_EXTRA_FIELDS: frozenset[str] = frozenset(
    {
        "event_id",
        "user_id",
        "topic",
        "partition",
        "offset",
        "batch_size",
        "latency_ms",
        "error_type",
        "component",
    }
)

# ---------------------------------------------------------------------------
# JSON formatter
# ---------------------------------------------------------------------------


class JSONFormatter(logging.Formatter):
    """Formats log records as single-line JSON objects.

    Emitted keys
    -------------
    timestamp
        ISO-8601 UTC timestamp with millisecond precision.
    level
        Uppercase log level name (e.g. ``INFO``, ``ERROR``).
    logger
        Name of the logger that produced the record.
    message
        The formatted log message.
    correlation_id
        Value from the ``ContextVar``, or ``null``.
    <extra>
        Any of the recognised extra fields (``event_id``, ``user_id``,
        ``topic``, ``partition``, ``offset``, ``batch_size``,
        ``latency_ms``, ``error_type``, ``component``) when supplied via
        ``extra={}`` on the logging call.
    """

    def format(self, record: logging.LogRecord) -> str:
        """Serialise *record* to a compact JSON string.

        Args:
            record: The ``LogRecord`` produced by the stdlib logging module.

        Returns:
            A single-line JSON string suitable for log aggregation systems.
        """
        log_entry: dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(
                record.created, tz=timezone.utc
            ).isoformat(timespec="milliseconds"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "correlation_id": get_correlation_id(),
        }

        # Attach recognised extra fields when present.
        for field in _KNOWN_EXTRA_FIELDS:
            value = getattr(record, field, None)
            if value is not None:
                log_entry[field] = value

        # Capture exception info if available.
        if record.exc_info and record.exc_info[1] is not None:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry, default=str)


# ---------------------------------------------------------------------------
# Logger setup
# ---------------------------------------------------------------------------


def setup_logging(name: str) -> logging.Logger:
    """Create (or retrieve) a named logger with the appropriate handler.

    The handler format is determined by the ``LOG_FORMAT`` environment
    variable:

    * ``"plain"`` -- standard ``%(asctime)s`` human-readable format.
    * anything else (including unset) -- structured JSON via
      ``JSONFormatter``.

    The log level is controlled by the ``LOG_LEVEL`` environment variable
    (default ``INFO``).

    Args:
        name: Dot-separated logger name (e.g. ``"pipeline.consumer"``).

    Returns:
        A fully configured ``logging.Logger`` instance.
    """
    logger = logging.getLogger(name)

    # Avoid adding duplicate handlers when called more than once for the
    # same logger name.
    if logger.handlers:
        return logger

    log_level: str = os.environ.get("LOG_LEVEL", "INFO").upper()
    logger.setLevel(getattr(logging, log_level, logging.INFO))

    handler = logging.StreamHandler(stream=sys.stdout)

    log_format: str = os.environ.get("LOG_FORMAT", "json").lower()
    if log_format == "plain":
        plain_fmt = (
            "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
        )
        handler.setFormatter(logging.Formatter(plain_fmt))
    else:
        handler.setFormatter(JSONFormatter())

    logger.addHandler(handler)
    logger.propagate = False

    return logger


# ---------------------------------------------------------------------------
# Pre-configured component loggers
# ---------------------------------------------------------------------------


def get_producer_logger() -> logging.Logger:
    """Return a logger pre-configured for the Kafka producer component.

    Returns:
        A ``logging.Logger`` named ``pipeline.producer``.
    """
    return setup_logging("pipeline.producer")


def get_consumer_logger() -> logging.Logger:
    """Return a logger pre-configured for the Kafka consumer component.

    Returns:
        A ``logging.Logger`` named ``pipeline.consumer``.
    """
    return setup_logging("pipeline.consumer")


def get_validator_logger() -> logging.Logger:
    """Return a logger pre-configured for the event validation component.

    Returns:
        A ``logging.Logger`` named ``pipeline.validator``.
    """
    return setup_logging("pipeline.validator")


def get_feature_logger() -> logging.Logger:
    """Return a logger pre-configured for the feature engineering component.

    Returns:
        A ``logging.Logger`` named ``pipeline.feature``.
    """
    return setup_logging("pipeline.feature")


def get_api_logger() -> logging.Logger:
    """Return a logger pre-configured for the REST API component.

    Returns:
        A ``logging.Logger`` named ``pipeline.api``.
    """
    return setup_logging("pipeline.api")
