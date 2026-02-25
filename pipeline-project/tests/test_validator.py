"""Unit tests for quality.validator and schemas.pydantic_models.

Validates Pydantic model constraints (type coercion, cross-field rules,
temporal sanity) and the batch ``EventValidator`` including freshness and
volume health checks.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import pytest

from quality.validator import EventValidator, ValidationResult
from schemas.pydantic_models import DeadLetterEvent, UserEvent


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def make_event(**overrides: Any) -> dict[str, Any]:
    """Build a valid event dict with sensible defaults.

    Any key in *overrides* replaces the corresponding top-level or nested
    value.  Nested dicts (``properties``, ``metadata``) are shallow-merged
    so callers can override individual sub-fields without repeating the
    entire nested structure.

    Returns:
        A ``dict`` suitable for ``UserEvent(**event)``.
    """
    base: dict[str, Any] = {
        "event_id": str(uuid.uuid4()),
        "user_id": "user_42",
        "event_type": "page_view",
        "timestamp": datetime.now(tz=timezone.utc) - timedelta(seconds=30),
        "properties": {
            "page_url": "/products",
            "session_id": "sess-001",
            "device": "mobile",
            "amount": None,
            "currency": None,
        },
        "metadata": {
            "ip_address": "192.168.1.100",
            "user_agent": "Mozilla/5.0 TestAgent",
            "country": "US",
        },
    }

    # Shallow-merge nested dicts so callers can set e.g. amount= without
    # having to repeat the full properties block.
    for key in ("properties", "metadata"):
        if key in overrides and isinstance(overrides[key], dict):
            base[key] = {**base[key], **overrides.pop(key)}

    base.update(overrides)
    return base


# ---------------------------------------------------------------------------
# TestPydanticValidation
# ---------------------------------------------------------------------------


class TestPydanticValidation:
    """Direct validation of ``UserEvent`` Pydantic model constraints."""

    def test_valid_page_view(self) -> None:
        """A well-formed page_view event validates successfully."""
        event: dict[str, Any] = make_event()
        validated: UserEvent = UserEvent(**event)

        assert validated.event_type.value == "page_view"

    def test_valid_purchase(self) -> None:
        """A purchase event with amount and currency validates."""
        event: dict[str, Any] = make_event(
            event_type="purchase",
            properties={
                "page_url": "/checkout",
                "session_id": "sess-002",
                "device": "desktop",
                "amount": 99.99,
                "currency": "USD",
            },
        )
        validated: UserEvent = UserEvent(**event)

        assert validated.event_type.value == "purchase"
        assert validated.properties.amount == 99.99
        assert validated.properties.currency == "USD"

    def test_invalid_event_type(self) -> None:
        """An unrecognised event_type is rejected."""
        event: dict[str, Any] = make_event(event_type="invalid_type")

        with pytest.raises(Exception):
            UserEvent(**event)

    def test_future_timestamp_rejected(self) -> None:
        """A timestamp one hour in the future is rejected."""
        future_ts: datetime = datetime.now(tz=timezone.utc) + timedelta(hours=1)
        event: dict[str, Any] = make_event(timestamp=future_ts)

        with pytest.raises(Exception):
            UserEvent(**event)

    def test_invalid_user_id_pattern(self) -> None:
        """A user_id not matching ``user_<digits>`` is rejected."""
        event: dict[str, Any] = make_event(user_id="bad_user_id")

        with pytest.raises(Exception):
            UserEvent(**event)

    def test_negative_amount_rejected(self) -> None:
        """A negative amount in properties is rejected."""
        event: dict[str, Any] = make_event(
            event_type="purchase",
            properties={
                "page_url": "/checkout",
                "session_id": "sess-003",
                "device": "mobile",
                "amount": -10.0,
                "currency": "USD",
            },
        )

        with pytest.raises(Exception):
            UserEvent(**event)

    def test_purchase_without_amount_rejected(self) -> None:
        """A purchase event missing amount is rejected by cross-field validator."""
        event: dict[str, Any] = make_event(
            event_type="purchase",
            properties={
                "page_url": "/checkout",
                "session_id": "sess-004",
                "device": "tablet",
                "amount": None,
                "currency": None,
            },
        )

        with pytest.raises(Exception):
            UserEvent(**event)


# ---------------------------------------------------------------------------
# TestEventValidator
# ---------------------------------------------------------------------------


class TestEventValidator:
    """Tests for the ``EventValidator`` batch validation and health checks."""

    @pytest.fixture()
    def validator(self) -> EventValidator:
        """Provide a fresh ``EventValidator`` instance per test."""
        return EventValidator()

    def test_valid_batch(self, validator: EventValidator) -> None:
        """A batch of 5 valid events should all pass."""
        events: list[dict[str, Any]] = [make_event() for _ in range(5)]
        result: ValidationResult = validator.validate_batch(events)

        assert len(result.passed) == 5
        assert len(result.failed) == 0

    def test_mixed_batch(self, validator: EventValidator) -> None:
        """One valid + one invalid event yields 1 passed and 1 failed."""
        valid_event: dict[str, Any] = make_event()
        invalid_event: dict[str, Any] = make_event(event_type="bogus")

        result: ValidationResult = validator.validate_batch(
            [valid_event, invalid_event]
        )

        assert len(result.passed) == 1
        assert len(result.failed) == 1

    def test_empty_batch(self, validator: EventValidator) -> None:
        """An empty list produces zero passed and zero failed."""
        result: ValidationResult = validator.validate_batch([])

        assert len(result.passed) == 0
        assert len(result.failed) == 0

    def test_missing_required_field(self, validator: EventValidator) -> None:
        """Removing ``event_id`` causes the event to fail validation."""
        event: dict[str, Any] = make_event()
        del event["event_id"]

        result: ValidationResult = validator.validate_batch([event])

        assert len(result.failed) == 1
        assert len(result.passed) == 0

    def test_freshness_check_fresh(self, validator: EventValidator) -> None:
        """A timestamp of *now* is fresh within the default window."""
        now: datetime = datetime.now(tz=timezone.utc)
        assert validator.check_freshness(now) is True

    def test_freshness_check_stale(self, validator: EventValidator) -> None:
        """A timestamp 10 minutes old exceeds a 5-minute freshness window."""
        stale: datetime = datetime.now(tz=timezone.utc) - timedelta(minutes=10)
        assert validator.check_freshness(stale, max_delay_seconds=300.0) is False

    def test_volume_check_sufficient(self, validator: EventValidator) -> None:
        """100 events in 60 seconds exceeds the default 10 events/s minimum."""
        assert validator.check_volume(
            event_count=100,
            window_seconds=60.0,
            min_rate=1.0,
        ) is True

    def test_volume_check_insufficient(self, validator: EventValidator) -> None:
        """1 event in 60 seconds is below the 10 events/s minimum."""
        assert validator.check_volume(
            event_count=1,
            window_seconds=60.0,
            min_rate=10.0,
        ) is False


# ---------------------------------------------------------------------------
# TestDeadLetterEvent
# ---------------------------------------------------------------------------


class TestDeadLetterEvent:
    """Tests for ``DeadLetterEvent`` construction and defaults."""

    def test_create_dead_letter(self) -> None:
        """All fields are set correctly and ``failed_at`` is auto-populated."""
        original: dict[str, Any] = {"event_id": "bad-event", "data": "corrupt"}
        dead_letter: DeadLetterEvent = DeadLetterEvent(
            original_event=original,
            error_message="Validation failed: missing user_id",
            error_field="user_id",
        )

        assert dead_letter.original_event == original
        assert dead_letter.error_message == "Validation failed: missing user_id"
        assert dead_letter.error_field == "user_id"
        assert dead_letter.failed_at is not None
        assert dead_letter.failed_at.tzinfo is not None
