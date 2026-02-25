"""
Feast feature-store configuration helpers.

Provides the canonical path to the Feast feature repository and a
factory for building the ``RepoConfig`` dictionary expected by
:class:`feast.FeatureStore`.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from config.settings import get_settings

# ---------------------------------------------------------------------------
# Feature repository path
# ---------------------------------------------------------------------------

FEATURE_REPO_PATH: Path = (
    Path(__file__).resolve().parent.parent / "feature_store" / "feature_repo"
)
"""Absolute path to the Feast feature-repo directory."""


# ---------------------------------------------------------------------------
# Repo config builder
# ---------------------------------------------------------------------------


def get_feast_repo_config() -> dict[str, Any]:
    """Return a Feast ``RepoConfig``-compatible dictionary.

    The configuration wires up:
    * **Online store** -- Redis, for low-latency feature serving.
    * **Offline store** -- PostgreSQL, for batch feature retrieval and
      point-in-time joins.
    * **Registry** -- a local SQLite file inside the feature repo
      directory, suitable for single-node and Docker Compose deployments.

    Returns:
        A dictionary that can be unpacked into
        ``feast.repo_config.RepoConfig(**get_feast_repo_config())``.
    """
    settings = get_settings()

    return {
        "project": "data_ingest_pipeline",
        "provider": "local",
        "registry": str(FEATURE_REPO_PATH / "registry.db"),
        "online_store": {
            "type": "redis",
            "connection_string": settings.redis.connection_string,
        },
        "offline_store": {
            "type": "postgres",
            "host": settings.postgres.host,
            "port": settings.postgres.port,
            "database": settings.postgres.db,
            "db_schema": "public",
            "user": settings.postgres.user,
            "password": settings.postgres.password,
        },
        "entity_key_serialization_version": 2,
        "flags": {
            "alpha_features": True,
            "on_demand_transforms": True,
        },
    }
