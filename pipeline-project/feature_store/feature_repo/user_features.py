"""Feast feature definitions for the user-features pipeline.

Defines the ``user_id`` entity and four feature views that capture
real-time, hourly, session-level, and derived user features.  All views
are backed by the offline Parquet source and materialised to the Redis
online store.
"""

from __future__ import annotations

from datetime import timedelta

from feast import Entity, FeatureView, Field
from feast.types import Bool, Float64, Int64

from feature_store.feature_repo.data_sources import offline_features_source

# ---------------------------------------------------------------------------
# Entity
# ---------------------------------------------------------------------------

user_entity: Entity = Entity(
    name="user_id",
    join_keys=["user_id"],
    description="Unique identifier for a pipeline user.",
)

# ---------------------------------------------------------------------------
# Real-time features (1-minute and 5-minute windows)
# ---------------------------------------------------------------------------

user_realtime_features: FeatureView = FeatureView(
    name="user_realtime_features",
    entities=[user_entity],
    ttl=timedelta(minutes=10),
    schema=[
        Field(name="event_count_1m", dtype=Int64),
        Field(name="unique_pages_1m", dtype=Int64),
        Field(name="event_count_5m", dtype=Int64),
        Field(name="purchase_count_5m", dtype=Int64),
        Field(name="total_spend_5m", dtype=Float64),
    ],
    online=True,
    source=offline_features_source,
    description="Sub-minute and 5-minute windowed counters for real-time serving.",
)

# ---------------------------------------------------------------------------
# Hourly features (1-hour window)
# ---------------------------------------------------------------------------

user_hourly_features: FeatureView = FeatureView(
    name="user_hourly_features",
    entities=[user_entity],
    ttl=timedelta(hours=2),
    schema=[
        Field(name="event_count_1h", dtype=Int64),
        Field(name="purchase_rate_1h", dtype=Float64),
        Field(name="avg_time_between_events_1h", dtype=Float64),
    ],
    online=True,
    source=offline_features_source,
    description="Hourly aggregated user engagement and purchase metrics.",
)

# ---------------------------------------------------------------------------
# Session features
# ---------------------------------------------------------------------------

user_session_features: FeatureView = FeatureView(
    name="user_session_features",
    entities=[user_entity],
    ttl=timedelta(hours=6),
    schema=[
        Field(name="session_duration", dtype=Int64),
        Field(name="session_event_count", dtype=Int64),
        Field(name="session_purchase_flag", dtype=Bool),
    ],
    online=True,
    source=offline_features_source,
    description="Session-scoped features derived from session window aggregation.",
)

# ---------------------------------------------------------------------------
# Derived / long-term features
# ---------------------------------------------------------------------------

user_derived_features: FeatureView = FeatureView(
    name="user_derived_features",
    entities=[user_entity],
    ttl=timedelta(hours=24),
    schema=[
        Field(name="purchase_frequency", dtype=Float64),
        Field(name="avg_purchase_amount", dtype=Float64),
        Field(name="user_activity_score", dtype=Float64),
        Field(name="is_power_user", dtype=Bool),
    ],
    online=True,
    source=offline_features_source,
    description="Derived lifetime user statistics and behavioural flags.",
)
