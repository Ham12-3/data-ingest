"""
Kafka infrastructure helpers: topic management, producer/consumer factories.

Every factory function reads its connection parameters from
:func:`config.settings.get_settings` so callers never need to pass
raw broker addresses around.
"""

from __future__ import annotations

import logging
from typing import Any

from confluent_kafka import Consumer, Producer
from confluent_kafka.admin import AdminClient, NewTopic
from confluent_kafka.schema_registry import SchemaRegistryClient

from config.settings import get_settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Topic catalogue
# ---------------------------------------------------------------------------

TOPICS: dict[str, str] = {
    "raw_events": "raw-events",
    "validated_events": "validated-events",
    "computed_features": "computed-features",
    "dead_letter_events": "dead-letter-events",
}
"""Logical name -> Kafka topic name mapping used throughout the pipeline."""


# ---------------------------------------------------------------------------
# Schema Registry
# ---------------------------------------------------------------------------


def get_schema_registry_client() -> SchemaRegistryClient:
    """Create and return a :class:`SchemaRegistryClient` instance.

    The registry URL is pulled from application settings automatically.
    """
    settings = get_settings()
    return SchemaRegistryClient({"url": settings.kafka.schema_registry_url})


# ---------------------------------------------------------------------------
# Producer helpers
# ---------------------------------------------------------------------------


def get_producer_config() -> dict[str, Any]:
    """Return a confluent-kafka producer configuration dictionary.

    The configuration enables:
    * ``acks=all`` -- wait for full ISR acknowledgement.
    * ``enable.idempotence=true`` -- exactly-once producer semantics.
    * ``retries=5`` with back-off for transient failures.
    * Snappy compression to reduce network and disk usage.
    """
    settings = get_settings()
    return {
        "bootstrap.servers": settings.kafka.bootstrap_servers,
        "acks": "all",
        "enable.idempotence": True,
        "retries": 5,
        "retry.backoff.ms": 200,
        "compression.type": "snappy",
        "linger.ms": 10,
        "batch.num.messages": settings.producer.batch_size,
        "queue.buffering.max.messages": 100_000,
        "queue.buffering.max.kbytes": 1_048_576,  # 1 GiB
    }


def create_producer() -> Producer:
    """Instantiate a ready-to-use :class:`Producer`.

    The returned producer is configured for idempotent, compressed writes
    with ``acks=all``.
    """
    config = get_producer_config()
    logger.info(
        "Creating Kafka producer for brokers=%s",
        config["bootstrap.servers"],
    )
    return Producer(config)


# ---------------------------------------------------------------------------
# Consumer helpers
# ---------------------------------------------------------------------------


def get_consumer_config(group_id: str) -> dict[str, Any]:
    """Return a confluent-kafka consumer configuration dictionary.

    Args:
        group_id: Consumer-group identifier for this consumer instance.

    The configuration uses:
    * ``auto.offset.reset=earliest`` -- start from the beginning when no
      committed offset exists.
    * ``enable.auto.commit=false`` -- offsets must be committed manually
      so that at-least-once semantics are under application control.
    """
    settings = get_settings()
    return {
        "bootstrap.servers": settings.kafka.bootstrap_servers,
        "group.id": group_id,
        "auto.offset.reset": "earliest",
        "enable.auto.commit": False,
        "session.timeout.ms": 30_000,
        "heartbeat.interval.ms": 10_000,
        "max.poll.interval.ms": 300_000,
        "fetch.min.bytes": 1,
        "fetch.wait.max.ms": 500,
    }


def create_consumer(group_id: str) -> Consumer:
    """Instantiate a ready-to-use :class:`Consumer`.

    Args:
        group_id: Consumer-group identifier for this consumer instance.

    Offsets are **not** auto-committed; the caller is responsible for
    calling ``consumer.commit()`` after processing each batch.
    """
    config = get_consumer_config(group_id)
    logger.info(
        "Creating Kafka consumer group=%s for brokers=%s",
        group_id,
        config["bootstrap.servers"],
    )
    return Consumer(config)


# ---------------------------------------------------------------------------
# Admin helpers
# ---------------------------------------------------------------------------


def create_admin_client() -> AdminClient:
    """Instantiate a Kafka :class:`AdminClient` for topic management."""
    settings = get_settings()
    return AdminClient({"bootstrap.servers": settings.kafka.bootstrap_servers})


def ensure_topics_exist() -> None:
    """Create pipeline topics if they do not already exist.

    Each topic is created with the number of partitions and replication
    factor specified in :class:`~config.settings.KafkaSettings`.  Topics
    that already exist are silently skipped.
    """
    settings = get_settings()
    admin = create_admin_client()

    # Discover existing topics (timeout keeps startup fast).
    cluster_metadata = admin.list_topics(timeout=10)
    existing_topics: set[str] = set(cluster_metadata.topics.keys())

    new_topics: list[NewTopic] = []
    for logical_name, topic_name in TOPICS.items():
        if topic_name in existing_topics:
            logger.debug(
                "Topic '%s' (%s) already exists -- skipping.",
                topic_name,
                logical_name,
            )
            continue
        new_topics.append(
            NewTopic(
                topic=topic_name,
                num_partitions=settings.kafka.num_partitions,
                replication_factor=settings.kafka.replication_factor,
            )
        )

    if not new_topics:
        logger.info("All pipeline topics already exist.")
        return

    logger.info(
        "Creating %d topic(s): %s",
        len(new_topics),
        ", ".join(t.topic for t in new_topics),
    )

    futures = admin.create_topics(new_topics, operation_timeout=30)
    for topic_name, future in futures.items():
        try:
            future.result()  # Block until the broker responds.
            logger.info("Created topic '%s'.", topic_name)
        except Exception:
            logger.exception("Failed to create topic '%s'.", topic_name)
            raise
