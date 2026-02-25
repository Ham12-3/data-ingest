"""
Centralized application settings using Pydantic BaseSettings.

All configuration is loaded from environment variables with sensible defaults.
A ``.env`` file placed at the project root is automatically read when present.
Access the fully-resolved configuration via the ``get_settings()`` singleton.
"""

from __future__ import annotations

import threading
from pathlib import Path
from typing import Literal

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict

# ---------------------------------------------------------------------------
# Resolve the project root so .env discovery works regardless of the cwd.
# ---------------------------------------------------------------------------
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
_ENV_FILE = _PROJECT_ROOT / ".env"


# ---------------------------------------------------------------------------
# Individual settings groups
# ---------------------------------------------------------------------------


class KafkaSettings(BaseSettings):
    """Kafka broker and Schema Registry connection parameters."""

    model_config = SettingsConfigDict(
        env_prefix="KAFKA_",
        env_file=_ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    bootstrap_servers: str = Field(
        default="localhost:9092",
        description="Comma-separated list of Kafka broker addresses.",
    )
    schema_registry_url: str = Field(
        default="http://localhost:8081",
        description="URL of the Confluent Schema Registry.",
    )
    num_partitions: int = Field(
        default=6,
        ge=1,
        description="Default number of partitions for newly created topics.",
    )
    replication_factor: int = Field(
        default=1,
        ge=1,
        description="Replication factor for newly created topics.",
    )


class ProducerSettings(BaseSettings):
    """Synthetic event-producer tuning knobs."""

    model_config = SettingsConfigDict(
        env_prefix="PRODUCER_",
        env_file=_ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    events_per_second: int = Field(
        default=100,
        ge=1,
        description="Target throughput of the synthetic event producer.",
    )
    batch_size: int = Field(
        default=50,
        ge=1,
        description="Number of events buffered before flushing to Kafka.",
    )


class FlinkSettings(BaseSettings):
    """Apache Flink (PyFlink) cluster and job configuration."""

    model_config = SettingsConfigDict(
        env_prefix="FLINK_",
        env_file=_ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    jobmanager_host: str = Field(
        default="localhost",
        description="Hostname of the Flink JobManager.",
    )
    jobmanager_port: int = Field(
        default=8081,
        ge=1,
        le=65535,
        description="REST port of the Flink JobManager.",
    )
    parallelism: int = Field(
        default=2,
        ge=1,
        description="Default parallelism for Flink operators.",
    )
    checkpoint_interval_ms: int = Field(
        default=60_000,
        ge=1000,
        description="Interval in milliseconds between Flink checkpoints.",
    )
    watermark_lateness_seconds: int = Field(
        default=30,
        ge=0,
        description="Allowed out-of-order lateness for event-time watermarks.",
    )


class PostgresSettings(BaseSettings):
    """PostgreSQL connection parameters (used as the Feast offline store)."""

    model_config = SettingsConfigDict(
        env_prefix="POSTGRES_",
        env_file=_ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    host: str = Field(default="localhost", description="PostgreSQL hostname.")
    port: int = Field(default=5432, ge=1, le=65535, description="PostgreSQL port.")
    db: str = Field(default="feast_offline", description="Database name.")
    user: str = Field(default="feast", description="Database user.")
    password: str = Field(default="changeme", description="Database password. Override via POSTGRES_PASSWORD env var.")

    @computed_field  # type: ignore[prop-decorator]
    @property
    def connection_string(self) -> str:
        """Return a SQLAlchemy-compatible PostgreSQL connection string."""
        return (
            f"postgresql+psycopg2://{self.user}:{self.password}"
            f"@{self.host}:{self.port}/{self.db}"
        )


class RedisSettings(BaseSettings):
    """Redis connection parameters (used as the Feast online store)."""

    model_config = SettingsConfigDict(
        env_prefix="REDIS_",
        env_file=_ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    host: str = Field(default="localhost", description="Redis hostname.")
    port: int = Field(default=6379, ge=1, le=65535, description="Redis port.")
    db: int = Field(default=0, ge=0, description="Redis database index.")

    @computed_field  # type: ignore[prop-decorator]
    @property
    def connection_string(self) -> str:
        """Return a Redis connection string."""
        return f"redis://{self.host}:{self.port}/{self.db}"


class APISettings(BaseSettings):
    """FastAPI / Uvicorn serving configuration."""

    model_config = SettingsConfigDict(
        env_prefix="API_",
        env_file=_ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    host: str = Field(default="0.0.0.0", description="Bind address for the API server.")
    port: int = Field(default=8000, ge=1, le=65535, description="Listening port.")
    debug: bool = Field(default=False, description="Enable debug mode (hot-reload, verbose tracebacks).")


class MonitoringSettings(BaseSettings):
    """Observability and logging configuration."""

    model_config = SettingsConfigDict(
        env_prefix="MONITORING_",
        env_file=_ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    prometheus_port: int = Field(
        default=9090,
        ge=1,
        le=65535,
        description="Port for the Prometheus metrics exporter.",
    )
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = Field(
        default="INFO",
        description="Root log level.",
    )
    log_format: Literal["json", "text"] = Field(
        default="json",
        description="Log output format.",
    )


class QualitySettings(BaseSettings):
    """Data-quality gate thresholds and check intervals."""

    model_config = SettingsConfigDict(
        env_prefix="QUALITY_",
        env_file=_ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    validation_interval_seconds: int = Field(
        default=30,
        ge=1,
        description="How often (seconds) to run data-quality validations.",
    )
    dlq_failure_threshold: float = Field(
        default=0.1,
        ge=0.0,
        le=1.0,
        description="Fraction of events allowed to fail before alerting.",
    )
    freshness_threshold_seconds: int = Field(
        default=300,
        ge=1,
        description="Maximum acceptable age (seconds) for the newest event.",
    )
    min_events_per_minute: int = Field(
        default=10,
        ge=0,
        description="Minimum expected event throughput per minute.",
    )


# ---------------------------------------------------------------------------
# Aggregated settings
# ---------------------------------------------------------------------------


class Settings(BaseSettings):
    """Top-level configuration that aggregates every settings group.

    Use :func:`get_settings` to obtain the process-wide singleton.
    """

    model_config = SettingsConfigDict(
        env_file=_ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    kafka: KafkaSettings = Field(default_factory=KafkaSettings)
    producer: ProducerSettings = Field(default_factory=ProducerSettings)
    flink: FlinkSettings = Field(default_factory=FlinkSettings)
    postgres: PostgresSettings = Field(default_factory=PostgresSettings)
    redis: RedisSettings = Field(default_factory=RedisSettings)
    api: APISettings = Field(default_factory=APISettings)
    monitoring: MonitoringSettings = Field(default_factory=MonitoringSettings)
    quality: QualitySettings = Field(default_factory=QualitySettings)


# ---------------------------------------------------------------------------
# Thread-safe singleton accessor
# ---------------------------------------------------------------------------

_settings_lock = threading.Lock()
_settings_instance: Settings | None = None


def get_settings() -> Settings:
    """Return the process-wide :class:`Settings` singleton.

    The instance is created on first call and reused thereafter.  Access
    is guarded by a lock so the function is safe to call from multiple
    threads (e.g. inside FastAPI dependency injection).
    """
    global _settings_instance  # noqa: PLW0603
    if _settings_instance is None:
        with _settings_lock:
            # Double-checked locking pattern.
            if _settings_instance is None:
                _settings_instance = Settings()
    return _settings_instance
