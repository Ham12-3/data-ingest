"""
PyFlink environment and Flink SQL DDL helpers.

Provides factory functions for creating a properly configured
``StreamExecutionEnvironment`` / ``StreamTableEnvironment`` pair, as well
as DDL generators for Kafka-backed source and sink tables.
"""

from __future__ import annotations

import textwrap

from pyflink.common import RestartStrategies
from pyflink.datastream import (
    CheckpointingMode,
    StreamExecutionEnvironment,
)
from pyflink.table import EnvironmentSettings, StreamTableEnvironment

from config.settings import get_settings


# ---------------------------------------------------------------------------
# Environment factories
# ---------------------------------------------------------------------------


def get_flink_env() -> tuple[StreamExecutionEnvironment, StreamTableEnvironment]:
    """Create and configure a PyFlink streaming environment pair.

    Returns:
        A 2-tuple of ``(StreamExecutionEnvironment, StreamTableEnvironment)``
        ready for job submission.

    The returned environments are configured with:
    * Exactly-once checkpointing at the interval defined in settings.
    * The parallelism specified in settings.
    * A fixed-delay restart strategy (3 attempts, 10 s delay).
    """
    settings = get_settings()

    # -- Stream execution environment --------------------------------------
    env = StreamExecutionEnvironment.get_execution_environment()
    env.set_parallelism(settings.flink.parallelism)

    # Checkpointing
    env.enable_checkpointing(
        settings.flink.checkpoint_interval_ms,
        CheckpointingMode.EXACTLY_ONCE,
    )
    checkpoint_config = env.get_checkpoint_config()
    checkpoint_config.set_min_pause_between_checkpoints(
        settings.flink.checkpoint_interval_ms // 2
    )
    checkpoint_config.set_checkpoint_timeout(
        settings.flink.checkpoint_interval_ms * 2
    )

    # Restart strategy
    env.set_restart_strategy(
        RestartStrategies.fixed_delay_restart(3, 10_000)
    )

    # -- Table environment --------------------------------------------------
    table_env = StreamTableEnvironment.create(
        env,
        environment_settings=EnvironmentSettings.in_streaming_mode(),
    )

    # Propagate parallelism into table config.
    table_env.get_config().set(
        "parallelism.default",
        str(settings.flink.parallelism),
    )

    return env, table_env


# ---------------------------------------------------------------------------
# Kafka source DDL
# ---------------------------------------------------------------------------


def get_kafka_source_ddl(topic: str, group_id: str) -> str:
    """Generate a Flink SQL ``CREATE TABLE`` DDL for a Kafka source.

    The DDL defines columns that match the raw event schema and includes
    a ``WATERMARK`` declaration for event-time processing.

    Args:
        topic: Kafka topic to consume from.
        group_id: Consumer-group identifier.

    Returns:
        A complete Flink SQL DDL string.
    """
    settings = get_settings()
    watermark_seconds = settings.flink.watermark_lateness_seconds

    # Sanitise the topic name so it can be used as a SQL identifier.
    table_name = topic.replace("-", "_")

    ddl = textwrap.dedent(f"""\
        CREATE TABLE {table_name} (
            event_id        STRING,
            user_id         STRING,
            event_type      STRING,
            event_value     DOUBLE,
            ip_address      STRING,
            user_agent      STRING,
            page_url        STRING,
            session_id      STRING,
            event_timestamp TIMESTAMP(3),
            processing_time AS PROCTIME(),
            WATERMARK FOR event_timestamp AS event_timestamp - INTERVAL '{watermark_seconds}' SECOND
        ) WITH (
            'connector'                  = 'kafka',
            'topic'                      = '{topic}',
            'properties.bootstrap.servers' = '{settings.kafka.bootstrap_servers}',
            'properties.group.id'        = '{group_id}',
            'scan.startup.mode'          = 'earliest-offset',
            'format'                     = 'json',
            'json.fail-on-missing-field' = 'false',
            'json.ignore-parse-errors'   = 'true'
        )
    """)
    return ddl


# ---------------------------------------------------------------------------
# Kafka sink DDL
# ---------------------------------------------------------------------------


def get_kafka_sink_ddl(topic: str) -> str:
    """Generate a Flink SQL ``CREATE TABLE`` DDL for a Kafka sink.

    The sink schema contains all computed feature columns produced by the
    streaming feature-engineering job.

    Args:
        topic: Kafka topic to write computed features into.

    Returns:
        A complete Flink SQL DDL string.
    """
    settings = get_settings()

    table_name = topic.replace("-", "_")

    ddl = textwrap.dedent(f"""\
        CREATE TABLE {table_name} (
            user_id                     STRING,
            window_start                TIMESTAMP(3),
            window_end                  TIMESTAMP(3),
            event_count                 BIGINT,
            total_event_value           DOUBLE,
            avg_event_value             DOUBLE,
            min_event_value             DOUBLE,
            max_event_value             DOUBLE,
            distinct_event_types        BIGINT,
            distinct_pages              BIGINT,
            distinct_sessions           BIGINT,
            first_event_timestamp       TIMESTAMP(3),
            last_event_timestamp        TIMESTAMP(3)
        ) WITH (
            'connector'                  = 'kafka',
            'topic'                      = '{topic}',
            'properties.bootstrap.servers' = '{settings.kafka.bootstrap_servers}',
            'format'                     = 'json',
            'sink.partitioner'           = 'default',
            'sink.delivery-guarantee'    = 'at-least-once'
        )
    """)
    return ddl
