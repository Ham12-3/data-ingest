"""Custom Prometheus metrics for the data ingestion pipeline.

All metrics are registered against a dedicated ``CollectorRegistry`` so they
can be exposed independently of the default process / platform collectors.
This makes testing deterministic and avoids collisions when the pipeline is
embedded inside a larger application.

Typical usage::

    from monitoring.prometheus_metrics import METRICS, REGISTRY
    from prometheus_client import generate_latest

    METRICS.events_ingested_total.inc()
    METRICS.processing_latency_seconds.observe(0.042)
    print(generate_latest(REGISTRY).decode())
"""

from __future__ import annotations

from dataclasses import dataclass

from prometheus_client import CollectorRegistry, Counter, Gauge, Histogram

# ---------------------------------------------------------------------------
# Custom registry
# ---------------------------------------------------------------------------

REGISTRY = CollectorRegistry()
"""Dedicated collector registry for all pipeline metrics."""


# ---------------------------------------------------------------------------
# Histogram bucket definitions
# ---------------------------------------------------------------------------

_PROCESSING_LATENCY_BUCKETS: tuple[float, ...] = (
    0.01,
    0.025,
    0.05,
    0.075,
    0.1,
    0.25,
    0.5,
    0.75,
    1.0,
    2.5,
    5.0,
    7.5,
    10.0,
)

_FEATURE_WRITE_LATENCY_BUCKETS: tuple[float, ...] = (
    0.005,
    0.01,
    0.025,
    0.05,
    0.075,
    0.1,
    0.25,
    0.5,
    0.75,
    1.0,
)


# ---------------------------------------------------------------------------
# Metric container
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class PipelineMetrics:
    """Strongly-typed container holding every Prometheus metric used by the
    data ingestion pipeline.

    Attributes are created once at import time and should be treated as
    module-level singletons.
    """

    # -- Counters ----------------------------------------------------------

    events_ingested_total: Counter
    """Total number of raw events received from the ingestion source."""

    events_validated_total: Counter
    """Total events that passed or failed validation (label: status)."""

    events_processed_total: Counter
    """Total events successfully processed end-to-end."""

    features_written_total: Counter
    """Total feature vectors written to a store (label: store)."""

    # -- Histograms --------------------------------------------------------

    processing_latency_seconds: Histogram
    """End-to-end processing latency per event in seconds."""

    feature_write_latency_seconds: Histogram
    """Latency for writing features to a store (label: store)."""

    # -- Gauges ------------------------------------------------------------

    dead_letter_queue_size: Gauge
    """Current number of events sitting in the dead-letter queue."""

    kafka_consumer_lag: Gauge
    """Consumer lag in messages (labels: topic, partition)."""

    validation_pass_rate: Gauge
    """Rolling ratio of events that pass validation (0.0 - 1.0)."""

    pipeline_uptime_seconds: Gauge
    """Seconds since the pipeline process started."""


def _build_metrics() -> PipelineMetrics:
    """Instantiate and register all pipeline metrics.

    Returns:
        A frozen ``PipelineMetrics`` dataclass whose fields are ready to use.
    """
    return PipelineMetrics(
        # Counters
        events_ingested_total=Counter(
            name="pipeline_events_ingested_total",
            documentation="Total number of raw events received from the ingestion source.",
            registry=REGISTRY,
        ),
        events_validated_total=Counter(
            name="pipeline_events_validated_total",
            documentation="Total events that passed or failed validation.",
            labelnames=("status",),
            registry=REGISTRY,
        ),
        events_processed_total=Counter(
            name="pipeline_events_processed_total",
            documentation="Total events successfully processed end-to-end.",
            registry=REGISTRY,
        ),
        features_written_total=Counter(
            name="pipeline_features_written_total",
            documentation="Total feature vectors written to a store.",
            labelnames=("store",),
            registry=REGISTRY,
        ),
        # Histograms
        processing_latency_seconds=Histogram(
            name="pipeline_processing_latency_seconds",
            documentation="End-to-end processing latency per event in seconds.",
            buckets=_PROCESSING_LATENCY_BUCKETS,
            registry=REGISTRY,
        ),
        feature_write_latency_seconds=Histogram(
            name="pipeline_feature_write_latency_seconds",
            documentation="Latency for writing features to a store in seconds.",
            labelnames=("store",),
            buckets=_FEATURE_WRITE_LATENCY_BUCKETS,
            registry=REGISTRY,
        ),
        # Gauges
        dead_letter_queue_size=Gauge(
            name="pipeline_dead_letter_queue_size",
            documentation="Current number of events sitting in the dead-letter queue.",
            registry=REGISTRY,
        ),
        kafka_consumer_lag=Gauge(
            name="pipeline_kafka_consumer_lag",
            documentation="Consumer lag in messages.",
            labelnames=("topic", "partition"),
            registry=REGISTRY,
        ),
        validation_pass_rate=Gauge(
            name="pipeline_validation_pass_rate",
            documentation="Rolling ratio of events that pass validation (0.0 - 1.0).",
            registry=REGISTRY,
        ),
        pipeline_uptime_seconds=Gauge(
            name="pipeline_uptime_seconds",
            documentation="Seconds since the pipeline process started.",
            registry=REGISTRY,
        ),
    )


# ---------------------------------------------------------------------------
# Module-level singleton
# ---------------------------------------------------------------------------

METRICS: PipelineMetrics = _build_metrics()
"""Pre-built, import-ready metrics instance for the entire pipeline."""
