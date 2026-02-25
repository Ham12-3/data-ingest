"""Integration tests for the data ingestion pipeline.

Exercises the full pipeline path: event generation -> validation ->
transformation -> aggregation -> feature computation.  Marked with
``pytest.mark.integration`` so they can be run selectively.
"""

from __future__ import annotations

import json
import time
from datetime import datetime, timedelta, timezone
from typing import Any

import pytest

from processing.aggregations import (
    SessionWindowAggregator,
    SlidingWindowAggregator,
    TumblingWindowAggregator,
)
from processing.transformers import transform_event
from producers.sample_data import generate_batch, generate_event
from quality.validator import EventValidator
from schemas.pydantic_models import ComputedFeatures, DeadLetterEvent, UserEvent


def _patch_user_id(event: dict[str, Any]) -> dict[str, Any]:
    """Normalise ``user-NNNN`` to ``user_NNNN`` for Pydantic compatibility."""
    uid: str = event.get("user_id", "")
    if uid.startswith("user-"):
        event = {**event, "user_id": uid.replace("-", "_", 1)}
    return event


pytestmark = pytest.mark.integration


class TestPipelineIntegration:
    """End-to-end pipeline integration tests."""

    def test_event_generation_and_validation(self) -> None:
        """Generate 100 events, validate all, expect >= 95 % pass rate."""
        raw_events: list[dict[str, Any]] = [
            _patch_user_id(generate_event()) for _ in range(100)
        ]

        validator: EventValidator = EventValidator()
        result = validator.validate_batch(raw_events)

        total: int = len(result.passed) + len(result.failed)
        assert total == 100

        pass_rate: float = len(result.passed) / total
        assert pass_rate >= 0.95, (
            f"Pass rate {pass_rate:.2%} is below 95 % threshold. "
            f"Passed: {len(result.passed)}, Failed: {len(result.failed)}"
        )

    def test_transform_and_aggregate(self) -> None:
        """Generate events, transform, feed a TumblingWindowAggregator(60).

        Verifies that at least one user window contains event_count > 0.
        """
        raw_events: list[dict[str, Any]] = generate_batch(50)

        # Transform all events
        transformed: list[dict[str, Any]] = [
            transform_event(e) for e in raw_events
        ]

        # Feed into tumbling window aggregator
        aggregator: TumblingWindowAggregator = TumblingWindowAggregator(
            window_seconds=60
        )
        for event in transformed:
            user_id: str = event["user_id"]
            aggregator.add_event(user_id, event)

        # Verify at least one window result has event_count > 0
        found_nonempty: bool = False
        for event in transformed:
            result: dict[str, Any] = aggregator.get_window_result(
                event["user_id"], event["timestamp_epoch"]
            )
            if result["event_count"] > 0:
                found_nonempty = True
                break

        assert found_nonempty, "Expected at least one non-empty window result"

    def test_feature_computation(self) -> None:
        """Generate and transform events, feed all aggregators, compute features.

        Verifies that all feature fields are present and have reasonable values:
        - user_activity_score in [0, 1]
        - event counts >= 0
        - window boundaries are set
        """
        raw_events: list[dict[str, Any]] = generate_batch(30)
        transformed: list[dict[str, Any]] = [
            transform_event(e) for e in raw_events
        ]

        # Set up all three aggregators
        tumbling: TumblingWindowAggregator = TumblingWindowAggregator(
            window_seconds=60
        )
        sliding: SlidingWindowAggregator = SlidingWindowAggregator(
            window_seconds=300, slide_seconds=60
        )
        session: SessionWindowAggregator = SessionWindowAggregator(
            gap_seconds=1800
        )

        # Feed events
        for event in transformed:
            uid: str = event["user_id"]
            tumbling.add_event(uid, event)
            sliding.add_event(uid, event)
            session.add_event(uid, event)

        # Pick the first user to compute features for
        target_user: str = transformed[0]["user_id"]
        target_epoch: float = float(transformed[0]["timestamp_epoch"])

        # Gather window results
        tumbling_result: dict[str, Any] = tumbling.get_window_result(
            target_user, target_epoch
        )
        sliding_result: dict[str, Any] = sliding.compute(
            target_user, target_epoch
        )

        # Compute a feature vector
        now: datetime = datetime.now(tz=timezone.utc)
        features: ComputedFeatures = ComputedFeatures(
            user_id=target_user,
            window_start=now - timedelta(minutes=5),
            window_end=now,
            event_count_1m=tumbling_result["event_count"],
            unique_pages_1m=tumbling_result["unique_pages"],
            event_count_5m=sliding_result["event_count"],
            purchase_count_5m=tumbling_result["purchase_count"],
            total_spend_5m=tumbling_result["total_spend"],
            event_count_1h=sliding_result["event_count"],
            purchase_rate_1h=sliding_result["purchase_rate"],
            avg_time_between_events_1h=sliding_result["avg_time_between_events"],
            session_duration=0.0,
            session_event_count=tumbling_result["event_count"],
            session_purchase_flag=tumbling_result["purchase_count"] > 0,
            purchase_frequency=0.0,
            avg_purchase_amount=0.0,
            user_activity_score=min(
                1.0, tumbling_result["event_count"] / 100.0
            ),
            is_power_user=tumbling_result["event_count"] > 50,
        )

        # Validate feature fields
        assert features.user_id == target_user
        assert 0.0 <= features.user_activity_score <= 1.0
        assert features.event_count_1m >= 0
        assert features.event_count_5m >= 0
        assert features.event_count_1h >= 0
        assert features.purchase_count_5m >= 0
        assert features.total_spend_5m >= 0.0
        assert features.unique_pages_1m >= 0
        assert features.session_event_count >= 0
        assert features.session_duration >= 0.0
        assert features.window_start is not None
        assert features.window_end is not None
        assert features.computed_at is not None

    def test_dead_letter_serialization(self) -> None:
        """A ``DeadLetterEvent`` is JSON-serialisable."""
        dead_letter: DeadLetterEvent = DeadLetterEvent(
            original_event={"event_id": "broken-001", "corrupt": True},
            error_message="Validation failed: missing required field user_id",
            error_field="user_id",
        )

        # Pydantic v2 .model_dump() produces a plain dict; verify JSON round-trip
        serialised: str = json.dumps(
            dead_letter.model_dump(), default=str
        )
        assert isinstance(serialised, str)
        assert len(serialised) > 0

        # Verify key fields survive serialisation
        loaded: dict[str, Any] = json.loads(serialised)
        assert loaded["original_event"]["event_id"] == "broken-001"
        assert "user_id" in loaded["error_message"]
        assert loaded["error_field"] == "user_id"
        assert loaded["failed_at"] is not None

    def test_load_simulation(self) -> None:
        """Generate 1000 events in a single batch and verify it completes < 2 s."""
        start: float = time.perf_counter()
        batch: list[dict[str, Any]] = generate_batch(1000)
        elapsed: float = time.perf_counter() - start

        assert len(batch) == 1000
        assert elapsed < 2.0, (
            f"Batch generation took {elapsed:.3f}s, exceeding the 2s budget"
        )
