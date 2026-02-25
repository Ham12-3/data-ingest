"""Health-check endpoints for the data ingestion pipeline API.

Provides a lightweight liveness probe and a detailed component-level
readiness probe that verifies connectivity to Redis, Kafka, and
PostgreSQL.
"""

from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Any

import asyncpg
from confluent_kafka.admin import AdminClient
from fastapi import APIRouter, Depends
from redis.asyncio import Redis

from api.dependencies import get_redis
from config.settings import get_settings
from monitoring.logger import get_api_logger

logger = get_api_logger()

router = APIRouter(prefix="/health", tags=["health"])

# Captured once at import time so uptime can be derived.
_start_time: float = time.monotonic()


# ---------------------------------------------------------------------------
# Liveness probe
# ---------------------------------------------------------------------------


@router.get("")
async def health_check() -> dict[str, Any]:
    """Return basic service health information.

    This endpoint is intentionally dependency-free so that orchestrators
    (Kubernetes, ECS, etc.) can distinguish *liveness* from *readiness*.

    Returns:
        A JSON object containing ``status``, ``timestamp`` (ISO-8601 UTC),
        and ``uptime_seconds``.
    """
    return {
        "status": "healthy",
        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
        "uptime_seconds": round(time.monotonic() - _start_time, 2),
    }


# ---------------------------------------------------------------------------
# Readiness / component probe
# ---------------------------------------------------------------------------


async def _check_redis(redis: Redis) -> dict[str, Any]:
    """Ping Redis and return a component-health dict."""
    try:
        await redis.ping()
        return {"status": "healthy", "message": "PONG received"}
    except Exception as exc:
        logger.warning("Redis health-check failed: %s", exc)
        return {"status": "unhealthy", "message": str(exc)}


def _check_kafka() -> dict[str, Any]:
    """List Kafka topics via the AdminClient and report broker/topic counts."""
    try:
        settings = get_settings()
        admin = AdminClient(
            {"bootstrap.servers": settings.kafka.bootstrap_servers},
        )
        cluster_metadata = admin.list_topics(timeout=5)
        broker_count: int = len(cluster_metadata.brokers)
        topic_count: int = len(cluster_metadata.topics)
        return {
            "status": "healthy",
            "brokers": broker_count,
            "topics": topic_count,
        }
    except Exception as exc:
        logger.warning("Kafka health-check failed: %s", exc)
        return {"status": "unhealthy", "message": str(exc)}


async def _check_postgres() -> dict[str, Any]:
    """Open a short-lived asyncpg connection and execute ``SELECT 1``."""
    try:
        settings = get_settings()
        conn = await asyncpg.connect(
            host=settings.postgres.host,
            port=settings.postgres.port,
            user=settings.postgres.user,
            password=settings.postgres.password,
            database=settings.postgres.db,
        )
        try:
            result = await conn.fetchval("SELECT 1")
            return {
                "status": "healthy",
                "message": f"SELECT 1 returned {result}",
            }
        finally:
            await conn.close()
    except Exception as exc:
        logger.warning("PostgreSQL health-check failed: %s", exc)
        return {"status": "unhealthy", "message": str(exc)}


@router.get("/components")
async def component_health(
    redis: Redis = Depends(get_redis),
) -> dict[str, Any]:
    """Verify connectivity to every infrastructure dependency.

    Checks Redis (async ping), Kafka (AdminClient.list_topics), and
    PostgreSQL (asyncpg SELECT 1).  Returns an overall status of
    ``"healthy"`` when all components pass, or ``"degraded"`` if any
    component is unreachable.

    Args:
        redis: Injected async Redis client.

    Returns:
        A JSON object with ``status``, per-component results, and a
        UTC ``timestamp``.
    """
    redis_result = await _check_redis(redis)
    kafka_result = _check_kafka()
    postgres_result = await _check_postgres()

    components: dict[str, Any] = {
        "redis": redis_result,
        "kafka": kafka_result,
        "postgresql": postgres_result,
    }

    all_healthy: bool = all(
        c.get("status") == "healthy" for c in components.values()
    )

    return {
        "status": "healthy" if all_healthy else "degraded",
        "components": components,
        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
    }
