"""Feast data source definitions for the user-features pipeline.

Defines the Kafka source for real-time computed features and the Parquet
file source used as the offline store backing for batch materialization
and historical retrieval.
"""

from __future__ import annotations

from feast import FileSource
from feast.data_format import JsonFormat
from feast.infra.offline_stores.contrib.postgres_offline_store.postgres_source import (
    PostgreSQLSource,
)
from feast.stream_feature_view import KafkaSource

# ---------------------------------------------------------------------------
# Kafka source -- real-time computed features
# ---------------------------------------------------------------------------

computed_features_kafka_source: KafkaSource = KafkaSource(
    name="computed_features_kafka",
    kafka_bootstrap_servers="localhost:9092",
    topic="computed-features",
    timestamp_field="computed_at",
    batch_source=FileSource(
        name="computed_features_batch_fallback",
        path="data/computed_features.parquet",
        timestamp_field="computed_at",
    ),
    message_format=JsonFormat(
        schema_json=(
            '{"type": "record", "name": "ComputedFeatures", "fields": ['
            '{"name": "user_id", "type": "string"},'
            '{"name": "event_count_1m", "type": "long"},'
            '{"name": "unique_pages_1m", "type": "long"},'
            '{"name": "event_count_5m", "type": "long"},'
            '{"name": "purchase_count_5m", "type": "long"},'
            '{"name": "total_spend_5m", "type": "double"},'
            '{"name": "event_count_1h", "type": "long"},'
            '{"name": "purchase_rate_1h", "type": "double"},'
            '{"name": "avg_time_between_events_1h", "type": "double"},'
            '{"name": "session_duration", "type": "long"},'
            '{"name": "session_event_count", "type": "long"},'
            '{"name": "session_purchase_flag", "type": "boolean"},'
            '{"name": "purchase_frequency", "type": "double"},'
            '{"name": "avg_purchase_amount", "type": "double"},'
            '{"name": "user_activity_score", "type": "double"},'
            '{"name": "is_power_user", "type": "boolean"},'
            '{"name": "computed_at", "type": "string"}'
            "]}"
        )
    ),
    watermark_delay_threshold=None,
    description="Real-time computed features from the Flink-style consumer.",
)

# ---------------------------------------------------------------------------
# Offline file source -- Parquet-backed historical features
# ---------------------------------------------------------------------------

offline_features_source: FileSource = FileSource(
    name="offline_features_source",
    path="data/offline_features.parquet",
    timestamp_field="computed_at",
    description="Parquet file source for offline / historical feature retrieval.",
)
