"""Unit tests for processing.transformers module.

Covers timestamp normalisation, temporal feature extraction, device
categorisation, session feature computation, and end-to-end event
transformation.
"""

from __future__ import annotations

from datetime import datetime, timezone

import pytest

from processing.transformers import (
    categorize_device,
    extract_session_features,
    extract_time_features,
    normalize_timestamp,
    transform_event,
)


# ---------------------------------------------------------------------------
# TestNormalizeTimestamp
# ---------------------------------------------------------------------------


class TestNormalizeTimestamp:
    """Tests for ``normalize_timestamp``."""

    def test_iso_with_z_suffix(self) -> None:
        """Trailing Z is recognised as UTC; hour and minute are preserved."""
        result: datetime = normalize_timestamp("2025-01-15T10:30:00Z")

        assert result.hour == 10
        assert result.minute == 30
        assert result.tzinfo is not None

    def test_iso_with_offset(self) -> None:
        """A +05:00 offset is converted to UTC (10:30 +05:00 -> 05:30 UTC)."""
        result: datetime = normalize_timestamp("2025-01-15T10:30:00+05:00")

        assert result.hour == 5
        assert result.tzinfo is not None

    def test_naive_timestamp(self) -> None:
        """A naive ISO string (no timezone) is assumed UTC and made aware."""
        result: datetime = normalize_timestamp("2025-01-15T10:30:00")

        assert result.tzinfo is not None
        assert result.hour == 10
        assert result.minute == 30

    def test_invalid_timestamp_raises(self) -> None:
        """Non-ISO strings raise ``ValueError``."""
        with pytest.raises(ValueError):
            normalize_timestamp("not-a-timestamp")


# ---------------------------------------------------------------------------
# TestExtractTimeFeatures
# ---------------------------------------------------------------------------


class TestExtractTimeFeatures:
    """Tests for ``extract_time_features``."""

    def test_weekday(self) -> None:
        """2025-01-15 is a Wednesday: hour=14, day=2, not weekend."""
        ts: datetime = datetime(2025, 1, 15, 14, 0, 0, tzinfo=timezone.utc)
        features: dict = extract_time_features(ts)

        assert features["hour_of_day"] == 14
        assert features["day_of_week"] == 2  # Wednesday
        assert features["is_weekend"] is False

    def test_weekend(self) -> None:
        """2025-01-18 is a Saturday: is_weekend=True, day=5."""
        ts: datetime = datetime(2025, 1, 18, 12, 0, 0, tzinfo=timezone.utc)
        features: dict = extract_time_features(ts)

        assert features["is_weekend"] is True
        assert features["day_of_week"] == 5  # Saturday

    def test_midnight(self) -> None:
        """Midnight should yield hour_of_day=0."""
        ts: datetime = datetime(2025, 1, 15, 0, 0, 0, tzinfo=timezone.utc)
        features: dict = extract_time_features(ts)

        assert features["hour_of_day"] == 0


# ---------------------------------------------------------------------------
# TestCategorizeDevice
# ---------------------------------------------------------------------------


class TestCategorizeDevice:
    """Tests for ``categorize_device``."""

    def test_mobile(self) -> None:
        """Lowercase 'mobile' is recognised as mobile only."""
        result: dict = categorize_device("mobile")

        assert result["is_mobile"] is True
        assert result["is_desktop"] is False
        assert result["is_tablet"] is False

    def test_desktop(self) -> None:
        """Lowercase 'desktop' is recognised as desktop only."""
        result: dict = categorize_device("desktop")

        assert result["is_desktop"] is True
        assert result["is_mobile"] is False
        assert result["is_tablet"] is False

    def test_case_insensitive(self) -> None:
        """Upper-case input 'MOBILE' is still categorised as mobile."""
        result: dict = categorize_device("MOBILE")

        assert result["is_mobile"] is True
        assert result["device"] == "mobile"


# ---------------------------------------------------------------------------
# TestExtractSessionFeatures
# ---------------------------------------------------------------------------


class TestExtractSessionFeatures:
    """Tests for ``extract_session_features``."""

    def test_empty_session(self) -> None:
        """An empty event list produces zeroed-out session features."""
        result: dict = extract_session_features([])

        assert result["session_event_count"] == 0
        assert result["session_duration"] == 0.0
        assert result["session_purchase_flag"] is False
        assert result["session_pages_visited"] == 0

    def test_single_event(self) -> None:
        """A single event yields count=1, duration=0, no purchase, 1 page."""
        events: list[dict] = [
            {
                "timestamp_epoch": 1000,
                "event_type": "page_view",
                "page_url": "/home",
            },
        ]
        result: dict = extract_session_features(events)

        assert result["session_event_count"] == 1
        assert result["session_duration"] == 0.0
        assert result["session_purchase_flag"] is False
        assert result["session_pages_visited"] == 1

    def test_multi_event_with_purchase(self) -> None:
        """Two events 300s apart with a purchase: count=2, duration=300, flag=True."""
        events: list[dict] = [
            {
                "timestamp_epoch": 1000,
                "event_type": "page_view",
                "page_url": "/products",
            },
            {
                "timestamp_epoch": 1300,
                "event_type": "purchase",
                "page_url": "/checkout",
            },
        ]
        result: dict = extract_session_features(events)

        assert result["session_event_count"] == 2
        assert result["session_duration"] == 300.0
        assert result["session_purchase_flag"] is True
        assert result["session_pages_visited"] == 2


# ---------------------------------------------------------------------------
# TestTransformEvent
# ---------------------------------------------------------------------------


class TestTransformEvent:
    """Tests for ``transform_event``."""

    def test_basic_transform(self) -> None:
        """A page_view event is flattened with all expected fields."""
        raw_event: dict = {
            "event_id": "evt-001",
            "user_id": "user_123",
            "event_type": "page_view",
            "timestamp": "2025-01-15T10:30:00Z",
            "properties": {
                "page_url": "/products",
                "session_id": "sess-abc",
                "device": "mobile",
                "amount": None,
                "currency": None,
            },
            "metadata": {
                "ip_address": "192.168.1.1",
                "user_agent": "Mozilla/5.0",
                "country": "US",
            },
        }
        result: dict = transform_event(raw_event)

        # Core fields present
        assert result["event_id"] == "evt-001"
        assert result["user_id"] == "user_123"
        assert result["event_type"] == "page_view"

        # Timestamp enrichment
        assert result["hour_of_day"] == 10
        assert "timestamp_epoch" in result
        assert isinstance(result["timestamp_epoch"], int)

        # Device features
        assert result["is_mobile"] is True
        assert result["is_desktop"] is False
        assert result["is_tablet"] is False

        # Flattened properties
        assert result["page_url"] == "/products"
        assert result["session_id"] == "sess-abc"

        # Flattened metadata
        assert result["ip_address"] == "192.168.1.1"
        assert result["country"] == "US"

    def test_purchase_event(self) -> None:
        """A purchase event carries amount, currency, and correct time features."""
        raw_event: dict = {
            "event_id": "evt-002",
            "user_id": "user_456",
            "event_type": "purchase",
            "timestamp": "2025-01-15T20:15:00Z",
            "properties": {
                "page_url": "/checkout",
                "session_id": "sess-xyz",
                "device": "desktop",
                "amount": 49.99,
                "currency": "USD",
            },
            "metadata": {
                "ip_address": "10.0.0.1",
                "user_agent": "Safari/17.0",
                "country": "GB",
            },
        }
        result: dict = transform_event(raw_event)

        assert result["amount"] == 49.99
        assert result["currency"] == "USD"
        assert result["hour_of_day"] == 20
        assert result["is_desktop"] is True
        assert result["is_mobile"] is False
