"""FastAPI dependency-injection providers for the data ingestion pipeline.

Exposes lazy-initialised singletons for Redis, the Feast feature store,
and the dead-letter queue handler.  All heavy resources are created on
first access so that importing the module is side-effect-free.

Usage in route handlers::

    from api.dependencies import get_redis, get_feast_store, get_dlq_handler

    @router.get("/ping")
    async def ping(redis: aioredis.Redis = Depends(get_redis)):
        await redis.ping()
"""

from __future__ import annotations

from typing import Optional

import redis.asyncio as aioredis
from feast import FeatureStore

from config.settings import get_settings
from monitoring.logger import get_api_logger
from quality.dead_letter import DeadLetterHandler

logger = get_api_logger()

# ---------------------------------------------------------------------------
# Module-level singletons (lazily initialised)
# ---------------------------------------------------------------------------

_redis_pool: Optional[aioredis.Redis] = None
_feast_store: Optional[FeatureStore] = None
_dlq_handler: Optional[DeadLetterHandler] = None


# ---------------------------------------------------------------------------
# Dependency providers
# ---------------------------------------------------------------------------


async def get_redis() -> aioredis.Redis:
    """Return a shared async Redis connection pool.

    The pool is created lazily on first call using the connection string
    and parameters defined in application settings.  Subsequent calls
    return the same pool instance.

    Returns:
        An ``aioredis.Redis`` client backed by a connection pool.
    """
    global _redis_pool  # noqa: PLW0603

    if _redis_pool is None:
        settings = get_settings()
        _redis_pool = aioredis.from_url(
            settings.redis.connection_string,
            decode_responses=True,
            max_connections=20,
        )
        logger.info(
            "Initialised async Redis pool: %s",
            settings.redis.connection_string,
        )

    return _redis_pool


def get_feast_store() -> FeatureStore:
    """Return a shared Feast ``FeatureStore`` instance.

    The store is initialised lazily from the
    ``feature_store/feature_repo`` directory on first call.

    Returns:
        A ``FeatureStore`` configured from the local feature repository.
    """
    global _feast_store  # noqa: PLW0603

    if _feast_store is None:
        _feast_store = FeatureStore(repo_path="feature_store/feature_repo")
        logger.info(
            "Initialised Feast FeatureStore from feature_store/feature_repo",
        )

    return _feast_store


def get_dlq_handler() -> DeadLetterHandler:
    """Return a shared ``DeadLetterHandler`` singleton.

    The handler is created lazily on first call and reused thereafter.

    Returns:
        The process-wide ``DeadLetterHandler`` instance.
    """
    global _dlq_handler  # noqa: PLW0603

    if _dlq_handler is None:
        _dlq_handler = DeadLetterHandler()
        logger.info("Initialised DeadLetterHandler singleton")

    return _dlq_handler


# ---------------------------------------------------------------------------
# Shutdown helper
# ---------------------------------------------------------------------------


async def shutdown_resources() -> None:
    """Release shared resources during application shutdown.

    Closes the Redis connection pool (if initialised) and logs the
    teardown.  Safe to call multiple times.
    """
    global _redis_pool  # noqa: PLW0603

    if _redis_pool is not None:
        await _redis_pool.aclose()
        _redis_pool = None
        logger.info("Closed async Redis connection pool")

    logger.info("All shared resources have been cleaned up")
