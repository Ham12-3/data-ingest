"""Realistic synthetic event data generator for the ingestion pipeline.

Generates user-interaction events (page views, clicks, purchases, sign-ups)
that follow realistic temporal and behavioural distributions.  Events conform
to the ``UserEvent`` Avro schema defined in ``schemas/avro/user_event.avsc``.

Usage::

    from producers.sample_data import generate_event, generate_batch

    single = generate_event()
    batch  = generate_batch(size=50)
"""

from __future__ import annotations

import random
import uuid
from collections import OrderedDict
from datetime import datetime, timedelta, timezone
from typing import Any

# ---------------------------------------------------------------------------
# Constants & lookup tables
# ---------------------------------------------------------------------------

EVENT_TYPE_WEIGHTS: dict[str, float] = {
    "page_view": 0.50,
    "click": 0.25,
    "purchase": 0.15,
    "signup": 0.10,
}

HOUR_PURCHASE_MULTIPLIER: dict[int, float] = {
    0: 0.3,
    1: 0.2,
    2: 0.2,
    3: 0.2,
    4: 0.3,
    5: 0.4,
    6: 0.5,
    7: 0.6,
    8: 0.7,
    9: 0.8,
    10: 0.9,
    11: 1.0,
    12: 1.1,
    13: 1.0,
    14: 0.9,
    15: 0.9,
    16: 1.0,
    17: 1.1,
    18: 1.2,
    19: 1.4,
    20: 1.5,
    21: 1.4,
    22: 1.0,
    23: 0.6,
}

DEVICE_WEIGHTS: dict[str, float] = {
    "mobile": 0.45,
    "desktop": 0.40,
    "tablet": 0.15,
}

PAGES: list[str] = [
    "/",
    "/products",
    "/products/shoes",
    "/products/electronics",
    "/products/clothing",
    "/cart",
    "/checkout",
    "/account",
    "/search",
    "/deals",
    "/about",
    "/support",
]

COUNTRIES: list[str] = [
    "US", "GB", "DE", "FR", "CA", "AU", "JP", "BR", "IN", "MX",
]

USER_AGENTS: list[str] = [
    (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2_1) "
        "AppleWebKit/605.1.15 (KHTML, like Gecko) "
        "Version/17.2 Safari/605.1.15"
    ),
    (
        "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.6099.144 Mobile Safari/537.36"
    ),
    (
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) "
        "AppleWebKit/605.1.15 (KHTML, like Gecko) "
        "Version/17.2 Mobile/15E148 Safari/604.1"
    ),
    (
        "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) "
        "Gecko/20100101 Firefox/121.0"
    ),
]

# ---------------------------------------------------------------------------
# Session management
# ---------------------------------------------------------------------------

MAX_ACTIVE_SESSIONS: int = 200
USER_POOL_SIZE: int = 500

_SESSION_TIMEOUT_SECONDS: int = 30 * 60  # 30 minutes

# Pre-generate a stable pool of user IDs so that sessions recur realistically.
_user_pool: list[str] = [f"user-{i:04d}" for i in range(USER_POOL_SIZE)]

# Active session pool: maps ``user_id`` -> session info dict.
# Implemented as an :class:`OrderedDict` for efficient LRU eviction.
_active_sessions: OrderedDict[str, dict[str, Any]] = OrderedDict()


def _pick_event_type(hour: int) -> str:
    """Select an event type using time-of-day-adjusted weights.

    The base ``EVENT_TYPE_WEIGHTS`` are modified so that *purchase* events
    become more or less likely depending on the hour of the day, as
    dictated by ``HOUR_PURCHASE_MULTIPLIER``.  All other event types
    share the remaining probability proportionally.

    Args:
        hour: Hour of the day in the range ``[0, 23]``.

    Returns:
        One of ``"page_view"``, ``"click"``, ``"purchase"``, or ``"signup"``.
    """
    multiplier: float = HOUR_PURCHASE_MULTIPLIER.get(hour, 1.0)
    adjusted_weights: dict[str, float] = dict(EVENT_TYPE_WEIGHTS)

    # Scale the purchase weight by the hour multiplier.
    adjusted_weights["purchase"] = EVENT_TYPE_WEIGHTS["purchase"] * multiplier

    # Normalise so that total weight sums to 1.0.
    total: float = sum(adjusted_weights.values())
    normalised: dict[str, float] = {
        k: v / total for k, v in adjusted_weights.items()
    }

    types: list[str] = list(normalised.keys())
    weights: list[float] = list(normalised.values())
    return random.choices(types, weights=weights, k=1)[0]


def _get_or_create_session(
    user_id: str,
    now: datetime | None = None,
) -> dict[str, Any]:
    """Return an existing session for *user_id* or create a fresh one.

    Sessions expire after 30 minutes of inactivity.  When the active
    session pool exceeds ``MAX_ACTIVE_SESSIONS``, the least-recently-used
    session is evicted to make room.

    Args:
        user_id: The user identifier to look up.
        now:     Optional current timestamp; defaults to ``datetime.now(UTC)``.

    Returns:
        A dictionary with keys ``"session_id"`` (:class:`str`) and
        ``"last_active"`` (:class:`datetime`).
    """
    if now is None:
        now = datetime.now(timezone.utc)

    if user_id in _active_sessions:
        session: dict[str, Any] = _active_sessions[user_id]
        elapsed = (now - session["last_active"]).total_seconds()
        if elapsed < _SESSION_TIMEOUT_SECONDS:
            # Refresh: move to end of OrderedDict (most recently used).
            _active_sessions.move_to_end(user_id)
            session["last_active"] = now
            return session
        # Session expired -- remove and fall through to create a new one.
        del _active_sessions[user_id]

    # Evict oldest sessions if we have reached the cap.
    while len(_active_sessions) >= MAX_ACTIVE_SESSIONS:
        _active_sessions.popitem(last=False)

    new_session: dict[str, Any] = {
        "session_id": str(uuid.uuid4()),
        "last_active": now,
    }
    _active_sessions[user_id] = new_session
    return new_session


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _random_ip() -> str:
    """Generate a random public-ish IPv4 address string."""
    return ".".join(str(random.randint(1, 254)) for _ in range(4))


def _weighted_choice(options: dict[str, float]) -> str:
    """Pick a key from *options* proportional to its weight."""
    keys: list[str] = list(options.keys())
    weights: list[float] = list(options.values())
    return random.choices(keys, weights=weights, k=1)[0]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def generate_event(timestamp: datetime | None = None) -> dict[str, Any]:
    """Generate a single realistic user event matching the ``UserEvent`` schema.

    If *timestamp* is omitted the current UTC time is used.  Purchase
    events receive a random ``amount`` in the range ``[5.00, 500.00]``
    (currency ``USD``) and are placed on ``/checkout``.  Sign-up events
    are placed on ``/signup``.

    Args:
        timestamp: Optional event timestamp.  Defaults to ``datetime.now(UTC)``.

    Returns:
        A plain :class:`dict` whose shape matches the Avro ``UserEvent``
        schema -- ready for serialisation and publishing.
    """
    if timestamp is None:
        timestamp = datetime.now(timezone.utc)

    hour: int = timestamp.hour
    event_type: str = _pick_event_type(hour)
    user_id: str = random.choice(_user_pool)
    session: dict[str, Any] = _get_or_create_session(user_id, now=timestamp)
    device: str = _weighted_choice(DEVICE_WEIGHTS)

    # Determine page URL based on event type.
    if event_type == "purchase":
        page_url: str | None = "/checkout"
    elif event_type == "signup":
        page_url = "/signup"
    else:
        page_url = random.choice(PAGES)

    # Build monetary fields for purchase events only.
    amount: float | None = None
    currency: str | None = None
    if event_type == "purchase":
        amount = round(random.uniform(5.0, 500.0), 2)
        currency = "USD"

    event: dict[str, Any] = {
        "event_id": str(uuid.uuid4()),
        "user_id": user_id,
        "event_type": event_type,
        "timestamp": timestamp.isoformat(),
        "properties": {
            "page_url": page_url,
            "session_id": session["session_id"],
            "device": device,
            "amount": amount,
            "currency": currency,
        },
        "metadata": {
            "ip_address": _random_ip(),
            "user_agent": random.choice(USER_AGENTS),
            "country": random.choice(COUNTRIES),
        },
    }
    return event


def generate_batch(
    size: int,
    timestamp: datetime | None = None,
) -> list[dict[str, Any]]:
    """Generate a batch of realistic user events.

    Timestamps within the batch are spread evenly over a one-second
    window starting from *timestamp* (or ``datetime.now(UTC)``),
    simulating sub-second event arrival.

    Args:
        size:      Number of events to generate (must be >= 1).
        timestamp: Base timestamp for the batch.  Defaults to
                   ``datetime.now(UTC)``.

    Returns:
        A list of event dictionaries whose length equals *size*.
    """
    if timestamp is None:
        timestamp = datetime.now(timezone.utc)

    events: list[dict[str, Any]] = []
    for i in range(size):
        # Spread events across one second; avoid division by zero.
        offset_seconds: float = i / max(size, 1)
        event_ts: datetime = timestamp + timedelta(seconds=offset_seconds)
        events.append(generate_event(timestamp=event_ts))
    return events
