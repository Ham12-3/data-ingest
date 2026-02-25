"""Feature transformation logic for the real-time data ingestion pipeline.

Provides pure-function transformers that normalise timestamps, extract
temporal and device features, compute per-session aggregates, and flatten
nested event payloads into enriched, analysis-ready dictionaries.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

# ---------------------------------------------------------------------------
# Compiled regex for ISO-8601 offset parsing (e.g. +05:30, -0800)
# ---------------------------------------------------------------------------
_OFFSET_RE = re.compile(
    r"([+-])(\d{2}):?(\d{2})$",
)

# Device-category lookup sets (lowercase)
_MOBILE_DEVICES: frozenset[str] = frozenset({"mobile", "phone", "smartphone"})
_DESKTOP_DEVICES: frozenset[str] = frozenset({"desktop", "laptop", "pc"})
_TABLET_DEVICES: frozenset[str] = frozenset({"tablet", "ipad"})


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------


def normalize_timestamp(ts_string: str) -> datetime:
    """Parse an ISO-8601 timestamp string and return a UTC-aware *datetime*.

    Handles the following variants:

    * Trailing ``Z`` suffix  (``2024-01-15T10:30:00Z``)
    * Explicit UTC offsets   (``2024-01-15T10:30:00+05:30``)
    * Naive (no timezone)    (``2024-01-15T10:30:00``) -- assumed UTC

    Args:
        ts_string: An ISO-8601 formatted timestamp string.

    Returns:
        A timezone-aware :class:`datetime` in UTC.

    Raises:
        ValueError: If *ts_string* cannot be parsed as ISO-8601.
    """
    cleaned: str = ts_string.strip()

    # Replace trailing Z with explicit UTC offset
    if cleaned.endswith("Z") or cleaned.endswith("z"):
        cleaned = cleaned[:-1] + "+00:00"

    try:
        dt = datetime.fromisoformat(cleaned)
    except ValueError as exc:
        raise ValueError(
            f"Unable to parse timestamp '{ts_string}' as ISO-8601."
        ) from exc

    # If the result is naive, assume UTC
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        # Convert to UTC regardless of original offset
        dt = dt.astimezone(timezone.utc)

    return dt


def extract_time_features(ts: datetime) -> dict[str, Any]:
    """Derive temporal features from a *datetime* object.

    Args:
        ts: A :class:`datetime` instance (ideally UTC-aware).

    Returns:
        A dict with keys:

        * **hour_of_day** (*int*) -- 0-23
        * **day_of_week** (*int*) -- 0 = Monday .. 6 = Sunday
        * **is_weekend** (*bool*) -- ``True`` when Saturday or Sunday
    """
    day_of_week: int = ts.weekday()  # 0=Mon
    return {
        "hour_of_day": ts.hour,
        "day_of_week": day_of_week,
        "is_weekend": day_of_week >= 5,
    }


def categorize_device(device: str) -> dict[str, Any]:
    """Classify a device string into mobile / desktop / tablet categories.

    The comparison is case-insensitive.  If the device string does not match
    any known category the boolean flags are all ``False``.

    Args:
        device: Free-form device identifier (e.g. ``"mobile"``, ``"Desktop"``).

    Returns:
        A dict with keys:

        * **device** (*str*) -- lower-cased device name
        * **is_mobile** (*bool*)
        * **is_desktop** (*bool*)
        * **is_tablet** (*bool*)
    """
    device_lower: str = device.strip().lower()
    return {
        "device": device_lower,
        "is_mobile": device_lower in _MOBILE_DEVICES,
        "is_desktop": device_lower in _DESKTOP_DEVICES,
        "is_tablet": device_lower in _TABLET_DEVICES,
    }


def extract_session_features(events: list[dict[str, Any]]) -> dict[str, Any]:
    """Compute aggregate features for a list of events sharing the same session.

    Args:
        events: A list of event dicts.  Each event must contain at least
            ``timestamp_epoch`` (*int | float*), ``event_type`` (*str*),
            and ``page_url`` (*str | None*).

    Returns:
        A dict with keys:

        * **session_duration** (*float*) -- seconds between earliest and
          latest event timestamp
        * **session_event_count** (*int*)
        * **session_purchase_flag** (*bool*) -- ``True`` if any event
          has ``event_type == "purchase"``
        * **session_pages_visited** (*int*) -- count of distinct non-null
          page URLs
    """
    if not events:
        return {
            "session_duration": 0.0,
            "session_event_count": 0,
            "session_purchase_flag": False,
            "session_pages_visited": 0,
        }

    timestamps: list[float] = [
        float(e["timestamp_epoch"]) for e in events if "timestamp_epoch" in e
    ]
    session_duration: float = (
        (max(timestamps) - min(timestamps)) if len(timestamps) >= 2 else 0.0
    )

    has_purchase: bool = any(
        e.get("event_type") == "purchase" for e in events
    )

    pages: set[str] = {
        e["page_url"]
        for e in events
        if e.get("page_url") is not None and e.get("page_url") != ""
    }

    return {
        "session_duration": session_duration,
        "session_event_count": len(events),
        "session_purchase_flag": has_purchase,
        "session_pages_visited": len(pages),
    }


def transform_event(event: dict[str, Any]) -> dict[str, Any]:
    """Flatten a nested event payload and enrich it with derived features.

    The input *event* is expected to follow the Avro ``UserEvent`` schema:

    .. code-block:: json

        {
            "event_id": "...",
            "user_id": "...",
            "event_type": "page_view",
            "timestamp": "2024-01-15T10:30:00Z",
            "properties": {
                "page_url": "...",
                "session_id": "...",
                "device": "mobile",
                "amount": null,
                "currency": null
            },
            "metadata": {
                "ip_address": "...",
                "user_agent": "...",
                "country": "US"
            }
        }

    Args:
        event: A nested event dictionary matching the ``UserEvent`` schema.

    Returns:
        A flat dictionary containing:

        * Core fields: ``event_id``, ``user_id``, ``event_type``
        * Timestamp fields: ``timestamp`` (ISO string), ``timestamp_epoch``
        * Properties (flattened): ``page_url``, ``session_id``, ``amount``,
          ``currency``
        * Metadata (flattened): ``ip_address``, ``country``
        * Time features: ``hour_of_day``, ``day_of_week``, ``is_weekend``
        * Device features: ``device``, ``is_mobile``, ``is_desktop``,
          ``is_tablet``
    """
    # --- Timestamp normalisation & epoch ---
    raw_ts: str = event.get("timestamp", "")
    ts: datetime = normalize_timestamp(raw_ts)
    timestamp_epoch: int = int(ts.timestamp())

    # --- Time features ---
    time_features: dict[str, Any] = extract_time_features(ts)

    # --- Flatten nested dicts ---
    properties: dict[str, Any] = event.get("properties", {})
    metadata: dict[str, Any] = event.get("metadata", {})

    # --- Device features ---
    raw_device: str = properties.get("device", "unknown")
    device_features: dict[str, Any] = categorize_device(raw_device)

    # --- Assemble the flat, enriched output ---
    return {
        # Core identifiers
        "event_id": event.get("event_id"),
        "user_id": event.get("user_id"),
        "event_type": event.get("event_type"),
        # Timestamps
        "timestamp": ts.isoformat(),
        "timestamp_epoch": timestamp_epoch,
        # Flattened properties
        "page_url": properties.get("page_url"),
        "session_id": properties.get("session_id"),
        "amount": properties.get("amount"),
        "currency": properties.get("currency"),
        # Flattened metadata
        "ip_address": metadata.get("ip_address"),
        "country": metadata.get("country"),
        # Time features
        "hour_of_day": time_features["hour_of_day"],
        "day_of_week": time_features["day_of_week"],
        "is_weekend": time_features["is_weekend"],
        # Device features
        "device": device_features["device"],
        "is_mobile": device_features["is_mobile"],
        "is_desktop": device_features["is_desktop"],
        "is_tablet": device_features["is_tablet"],
    }
