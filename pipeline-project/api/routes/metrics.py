"""Pipeline metrics and dead-letter queue management endpoints.

Exposes Prometheus metrics in both JSON and text/plain exposition
formats, provides inspection of recent dead-letter events, and offers
a replay mechanism to re-inject failed events back into the pipeline.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from confluent_kafka import Producer
from fastapi import APIRouter, Depends, Query, Response

from api.dependencies import get_dlq_handler
from config.settings import get_settings
from monitoring.logger import get_api_logger
from monitoring.prometheus_metrics import METRICS, REGISTRY
from prometheus_client import generate_latest
from quality.dead_letter import DeadLetterHandler

logger = get_api_logger()

router = APIRouter(tags=["metrics"])


# ---------------------------------------------------------------------------
# Prometheus metrics
# ---------------------------------------------------------------------------


@router.get("/metrics")
async def get_metrics() -> dict[str, Any]:
    """Return all pipeline counter and gauge values as a JSON dictionary.

    Counters and gauges are extracted from the ``METRICS`` singleton.
    Histogram observations are not included here -- use the
    ``/metrics/prometheus`` endpoint for the full exposition format.

    Returns:
        A JSON object mapping metric names to their current values,
        plus a UTC ``timestamp``.
    """
    return {
        "events_ingested_total": METRICS.events_ingested_total._value.get(),
        "events_validated_total": {
            "passed": METRICS.events_validated_total.labels(
                status="passed",
            )._value.get(),
            "failed": METRICS.events_validated_total.labels(
                status="failed",
            )._value.get(),
        },
        "events_processed_total": METRICS.events_processed_total._value.get(),
        "dead_letter_queue_size": METRICS.dead_letter_queue_size._value.get(),
        "validation_pass_rate": METRICS.validation_pass_rate._value.get(),
        "pipeline_uptime_seconds": METRICS.pipeline_uptime_seconds._value.get(),
        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
    }


@router.get("/metrics/prometheus")
async def prometheus_metrics() -> Response:
    """Return metrics in the Prometheus text exposition format.

    This endpoint is designed to be scraped directly by a Prometheus
    server.  The ``Content-Type`` is set to ``text/plain; version=0.0.4``
    as required by the Prometheus HTTP API.

    Returns:
        A ``Response`` containing the encoded metric families.
    """
    body: bytes = generate_latest(REGISTRY)
    return Response(
        content=body,
        media_type="text/plain; version=0.0.4; charset=utf-8",
    )


# ---------------------------------------------------------------------------
# Dead-letter queue inspection
# ---------------------------------------------------------------------------


@router.get("/dead-letter/recent")
async def get_recent_dead_letters(
    limit: int = Query(default=10, ge=1, le=100),
    dlq: DeadLetterHandler = Depends(get_dlq_handler),
) -> dict[str, Any]:
    """Return the most recent dead-letter events.

    Args:
        limit: Maximum number of events to return (1--100, default 10).
        dlq: Injected ``DeadLetterHandler`` singleton.

    Returns:
        A JSON object containing ``total_count``, the number of events
        actually ``returned``, the ``events`` list, and a UTC
        ``timestamp``.
    """
    recent_events = dlq.get_recent(limit=limit)

    events_serialised: list[dict[str, Any]] = [
        {
            "original_event": event.original_event,
            "error_message": event.error_message,
            "error_field": event.error_field,
            "failed_at": event.failed_at.isoformat(),
            "correlation_id": event.correlation_id,
        }
        for event in recent_events
    ]

    return {
        "total_count": dlq.count,
        "returned": len(events_serialised),
        "events": events_serialised,
        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# Event replay
# ---------------------------------------------------------------------------


@router.post("/pipeline/replay")
async def replay_dead_letter_events(
    dlq: DeadLetterHandler = Depends(get_dlq_handler),
) -> dict[str, Any]:
    """Replay dead-letter events back into the raw-events Kafka topic.

    Retrieves up to 1 000 recent DLQ events and produces each event's
    ``original_event`` payload to the ``raw-events`` topic for
    reprocessing.

    Args:
        dlq: Injected ``DeadLetterHandler`` singleton.

    Returns:
        A JSON object with ``replayed_count``, ``total_available``,
        and a UTC ``timestamp``.
    """
    settings = get_settings()
    events = dlq.get_recent(limit=1000)
    total_available: int = dlq.count

    if not events:
        return {
            "replayed_count": 0,
            "total_available": total_available,
            "timestamp": datetime.now(tz=timezone.utc).isoformat(),
        }

    producer = Producer(
        {"bootstrap.servers": settings.kafka.bootstrap_servers},
    )

    replayed_count: int = 0
    for event in events:
        try:
            payload: bytes = json.dumps(
                event.original_event, default=str,
            ).encode("utf-8")
            producer.produce(
                topic="raw-events",
                value=payload,
            )
            replayed_count += 1
        except Exception as exc:
            logger.error(
                "Failed to replay dead-letter event: %s", exc,
            )

    # Flush outstanding messages (block until delivered or timeout).
    producer.flush(timeout=10)

    logger.info(
        "Replayed %d / %d dead-letter events to raw-events",
        replayed_count,
        total_available,
    )

    return {
        "replayed_count": replayed_count,
        "total_available": total_available,
        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
    }
