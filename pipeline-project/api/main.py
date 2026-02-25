"""FastAPI application entry-point for the data ingestion pipeline API.

Configures the ASGI application with a lifespan context manager that
handles startup logging and graceful resource teardown, registers all
route modules, and provides a ``main()`` helper for running the server
directly.

Usage::

    python -m api.main
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, AsyncIterator

import uvicorn
from fastapi import FastAPI

from api.dependencies import shutdown_resources
from api.routes import features, health, metrics
from config.settings import get_settings
from monitoring.logger import get_api_logger

logger = get_api_logger()


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Manage application startup and shutdown lifecycle.

    On startup the function logs that the service is ready.  On shutdown
    it drains shared resources (Redis pool, etc.) via
    :func:`shutdown_resources`.
    """
    logger.info(
        "Data Ingestion Pipeline API starting up at %s",
        datetime.now(tz=timezone.utc).isoformat(),
    )
    yield
    logger.info("Data Ingestion Pipeline API shutting down")
    await shutdown_resources()


# ---------------------------------------------------------------------------
# Application instance
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Data Ingestion Pipeline API",
    description=(
        "REST API for the real-time data ingestion pipeline. "
        "Provides health checks, feature retrieval, pipeline metrics, "
        "dead-letter queue inspection, and event replay capabilities."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# Register routers
app.include_router(health.router)
app.include_router(features.router)
app.include_router(metrics.router)


# ---------------------------------------------------------------------------
# Root endpoint
# ---------------------------------------------------------------------------


@app.get("/")
async def root() -> dict[str, Any]:
    """Return basic service information and a link to the API docs.

    Returns:
        A JSON object with the service name, version, description,
        and the ``docs_url`` path.
    """
    return {
        "service": "Data Ingestion Pipeline API",
        "version": "1.0.0",
        "description": (
            "Real-time data ingestion pipeline with feature engineering, "
            "quality monitoring, and dead-letter queue management."
        ),
        "docs_url": "/docs",
    }


# ---------------------------------------------------------------------------
# CLI entry-point
# ---------------------------------------------------------------------------


def main() -> None:
    """Launch the API server via Uvicorn.

    Host and port are read from the application settings so they can be
    overridden with environment variables (``API_HOST``, ``API_PORT``).
    """
    settings = get_settings()
    uvicorn.run(
        "api.main:app",
        host=settings.api.host,
        port=settings.api.port,
        reload=settings.api.debug,
        log_level="info",
    )


if __name__ == "__main__":
    main()
