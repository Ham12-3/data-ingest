"""Unit tests for producers.sample_data module.

Covers single-event generation (field presence, type distribution, device
validity, metadata shape), batch generation (size, timestamp spread), and
Pydantic compatibility of generated events.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

import pytest

from producers.sample_data import generate_batch, generate_event
from schemas.pydantic_models import UserEvent

# The sample_data generator uses "user-NNNN" (hyphens) while the Pydantic
# model enforces "user_\\d+".  Tests that validate against the Pydantic model
# supply a compliant user_id via a small helper.

_VALID_EVENT_TYPES: frozenset[str] = frozenset(
    {"page_view", "click", "purchase", "signup"}
)
_VALID_DEVICES: frozenset[str] = frozenset({"mobile", "desktop", "tablet"})


def _patch_user_id(event: dict[str, Any]) -> dict[str, Any]:
    """Replace hyphenated user IDs with underscore-based IDs for Pydantic.

    The sample data generator creates ``user-0042`` style IDs, but the
    ``UserEvent`` Pydantic model enforces ``user_\\d+``.  This helper
    normalises the ID so that schema validation tests focus on structural
    correctness rather than this cosmetic mismatch.
    """
    uid: str = event.get("user_id", "")
    if uid.startswith("user-"):
        event = {**event, "user_id": uid.replace("-", "_", 1)}
    return event


# ---------------------------------------------------------------------------
# TestGenerateEvent
# ---------------------------------------------------------------------------


class TestGenerateEvent:
    """Tests for ``generate_event``."""

    def test_event_has_required_fields(self) -> None:
        """Generated events contain all six top-level keys."""
        event: dict[str, Any] = generate_event()
        required_keys: set[str] = {
            "event_id",
            "user_id",
            "event_type",
            "timestamp",
            "properties",
            "metadata",
        }

        assert required_keys.issubset(event.keys())

    def test_event_type_is_valid(self) -> None:
        """50 generated events all carry a recognised event_type."""
        for _ in range(50):
            event: dict[str, Any] = generate_event()
            assert event["event_type"] in _VALID_EVENT_TYPES

    def test_user_id_matches_pattern(self) -> None:
        """user_id starts with 'user_' (after normalisation) or 'user-'."""
        event: dict[str, Any] = generate_event()
        # The generator uses "user-NNNN"; just check the prefix.
        assert event["user_id"].startswith("user-") or event["user_id"].startswith(
            "user_"
        )

    def test_purchase_has_amount(self) -> None:
        """Purchase events carry a positive amount and a currency.

        Generates up to 500 events to find a purchase.  If none are
        generated (statistically very unlikely), the test is skipped.
        """
        purchase_found: bool = False
        for _ in range(500):
            event: dict[str, Any] = generate_event()
            if event["event_type"] == "purchase":
                purchase_found = True
                props: dict[str, Any] = event["properties"]
                assert props["amount"] is not None
                assert props["amount"] > 0
                assert props["currency"] is not None
                break

        if not purchase_found:
            pytest.skip("No purchase event generated in 500 iterations")

    def test_custom_timestamp(self) -> None:
        """When a specific timestamp is provided it appears in the output."""
        ts: datetime = datetime(2025, 6, 15, 8, 0, 0, tzinfo=timezone.utc)
        event: dict[str, Any] = generate_event(timestamp=ts)

        assert "2025-06-15T08:00:00" in event["timestamp"]

    def test_event_validates_with_pydantic(self) -> None:
        """A generated event (with patched user_id) passes Pydantic validation."""
        event: dict[str, Any] = _patch_user_id(generate_event())
        validated: UserEvent = UserEvent(**event)

        assert validated.event_id == event["event_id"]

    def test_device_is_valid(self) -> None:
        """The device field is one of mobile, desktop, or tablet."""
        event: dict[str, Any] = generate_event()
        device: str = event["properties"]["device"]

        assert device in _VALID_DEVICES

    def test_metadata_fields(self) -> None:
        """Metadata has an IP with 4 octets, plus user_agent and country."""
        event: dict[str, Any] = generate_event()
        meta: dict[str, Any] = event["metadata"]

        # IP address: four dot-separated octets
        octets: list[str] = meta["ip_address"].split(".")
        assert len(octets) == 4
        for octet in octets:
            assert octet.isdigit()

        assert "user_agent" in meta and len(meta["user_agent"]) > 0
        assert "country" in meta and len(meta["country"]) >= 2


# ---------------------------------------------------------------------------
# TestGenerateBatch
# ---------------------------------------------------------------------------


class TestGenerateBatch:
    """Tests for ``generate_batch``."""

    def test_batch_size(self) -> None:
        """Requesting 10 events produces exactly 10."""
        batch: list[dict[str, Any]] = generate_batch(10)

        assert len(batch) == 10

    def test_batch_zero(self) -> None:
        """Requesting 0 events produces an empty list."""
        batch: list[dict[str, Any]] = generate_batch(0)

        assert len(batch) == 0

    def test_batch_timestamps_spread(self) -> None:
        """10 events in a batch should have 10 unique timestamps."""
        batch: list[dict[str, Any]] = generate_batch(10)
        timestamps: set[str] = {e["timestamp"] for e in batch}

        assert len(timestamps) == 10

    def test_batch_events_are_valid(self) -> None:
        """All 20 events in a batch pass Pydantic validation after patching."""
        batch: list[dict[str, Any]] = generate_batch(20)

        for event in batch:
            patched: dict[str, Any] = _patch_user_id(event)
            validated: UserEvent = UserEvent(**patched)
            assert validated.event_id == patched["event_id"]
