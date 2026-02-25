"""Pydantic v2 models for the data ingestion pipeline.

Provides strict validation, serialisation helpers, and derived models for
user events flowing through Kafka, the feature store, and the dead-letter
queue.
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any, Optional

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------


class EventType(str, Enum):
    """Allowable categories of user interaction."""

    PAGE_VIEW = "page_view"
    PURCHASE = "purchase"
    CLICK = "click"
    SIGNUP = "signup"


class DeviceType(str, Enum):
    """Device form factors recognised by the pipeline."""

    MOBILE = "mobile"
    DESKTOP = "desktop"
    TABLET = "tablet"


# ---------------------------------------------------------------------------
# Nested value-objects
# ---------------------------------------------------------------------------


class EventProperties(BaseModel):
    """Contextual properties attached to a user event."""

    model_config = ConfigDict(strict=False)

    page_url: Optional[str] = Field(
        default=None,
        description="URL of the page where the event occurred.",
    )
    session_id: str = Field(
        ...,
        min_length=1,
        description="Identifier for the user session.",
    )
    device: DeviceType = Field(
        ...,
        description="Device form factor that generated the event.",
    )
    amount: Optional[float] = Field(
        default=None,
        gt=0,
        description="Monetary amount (must be positive when present).",
    )
    currency: Optional[str] = Field(
        default=None,
        min_length=3,
        max_length=3,
        description="ISO-4217 three-letter currency code.",
    )

    @field_validator("currency")
    @classmethod
    def _currency_uppercase(cls, value: Optional[str]) -> Optional[str]:
        """Normalise and validate the currency code."""
        if value is None:
            return value
        normalised = value.upper()
        if not re.fullmatch(r"[A-Z]{3}", normalised):
            raise ValueError("currency must be exactly three ASCII letters")
        return normalised


class EventMetadata(BaseModel):
    """Request-level metadata captured at ingestion time."""

    model_config = ConfigDict(strict=False)

    ip_address: str = Field(
        ...,
        min_length=1,
        description="Client IP address.",
    )
    user_agent: str = Field(
        ...,
        min_length=1,
        description="User-Agent header from the originating request.",
    )
    country: str = Field(
        ...,
        min_length=2,
        max_length=3,
        description="ISO-3166 country code (2 or 3 characters).",
    )

    @field_validator("country")
    @classmethod
    def _country_uppercase(cls, value: str) -> str:
        """Normalise the country code to uppercase."""
        normalised = value.upper()
        if not re.fullmatch(r"[A-Z]{2,3}", normalised):
            raise ValueError("country must be 2-3 ASCII letters")
        return normalised


# ---------------------------------------------------------------------------
# Core event model
# ---------------------------------------------------------------------------

_USER_ID_PATTERN = re.compile(r"^user_\d+$")


class UserEvent(BaseModel):
    """Canonical representation of a user event entering the pipeline.

    Validates structure, cross-field constraints (e.g. purchase events
    must carry ``amount`` and ``currency``), and temporal sanity.
    """

    model_config = ConfigDict(strict=False)

    event_id: str = Field(
        ...,
        min_length=1,
        description="Globally unique event identifier.",
    )
    user_id: str = Field(
        ...,
        pattern=r"^user_\d+$",
        description="User identifier matching the pattern user_<digits>.",
    )
    event_type: EventType = Field(
        ...,
        description="Category of user interaction.",
    )
    timestamp: datetime = Field(
        ...,
        description="ISO-8601 event timestamp (must not be in the future).",
    )
    properties: EventProperties = Field(
        ...,
        description="Event-specific contextual properties.",
    )
    metadata: EventMetadata = Field(
        ...,
        description="Infrastructure and request metadata.",
    )

    @field_validator("timestamp")
    @classmethod
    def _timestamp_not_in_future(cls, value: datetime) -> datetime:
        """Reject events with timestamps in the future."""
        now = datetime.now(tz=timezone.utc)
        # Allow a small clock-skew tolerance of 60 seconds.
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        if value > now.replace(microsecond=0) + timedelta(seconds=60):
            raise ValueError("timestamp must not be in the future")
        return value

    @model_validator(mode="after")
    def _purchase_requires_amount_and_currency(self) -> "UserEvent":
        """Ensure purchase events always carry amount and currency."""
        if self.event_type == EventType.PURCHASE:
            if self.properties.amount is None:
                raise ValueError(
                    "purchase events require a non-null amount in properties"
                )
            if self.properties.currency is None:
                raise ValueError(
                    "purchase events require a non-null currency in properties"
                )
        return self


# ---------------------------------------------------------------------------
# Flattened / enriched event for downstream consumers
# ---------------------------------------------------------------------------


class ValidatedEvent(BaseModel):
    """Flattened, enriched representation of a validated user event.

    Suitable for feature computation and analytical storage.
    """

    model_config = ConfigDict(strict=False)

    # --- identifiers ---
    event_id: str
    user_id: str
    event_type: EventType
    timestamp: datetime

    # --- properties (flattened) ---
    page_url: Optional[str] = None
    session_id: str
    device: DeviceType
    amount: Optional[float] = None
    currency: Optional[str] = None

    # --- metadata (flattened) ---
    ip_address: str
    user_agent: str
    country: str

    # --- derived fields ---
    hour_of_day: int = Field(
        ...,
        ge=0,
        le=23,
        description="Hour component extracted from the event timestamp (UTC).",
    )
    day_of_week: int = Field(
        ...,
        ge=0,
        le=6,
        description="Day of the week (0=Monday .. 6=Sunday).",
    )
    is_weekend: bool = Field(
        ...,
        description="True when the event falls on Saturday or Sunday.",
    )

    @classmethod
    def from_user_event(cls, event: UserEvent) -> "ValidatedEvent":
        """Construct a ``ValidatedEvent`` from a validated ``UserEvent``.

        Args:
            event: A fully validated ``UserEvent`` instance.

        Returns:
            A new ``ValidatedEvent`` with flattened fields and computed
            temporal features.
        """
        ts = event.timestamp
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)

        hour_of_day: int = ts.hour
        day_of_week: int = ts.weekday()  # 0=Monday .. 6=Sunday
        is_weekend: bool = day_of_week >= 5

        return cls(
            event_id=event.event_id,
            user_id=event.user_id,
            event_type=event.event_type,
            timestamp=ts,
            page_url=event.properties.page_url,
            session_id=event.properties.session_id,
            device=event.properties.device,
            amount=event.properties.amount,
            currency=event.properties.currency,
            ip_address=event.metadata.ip_address,
            user_agent=event.metadata.user_agent,
            country=event.metadata.country,
            hour_of_day=hour_of_day,
            day_of_week=day_of_week,
            is_weekend=is_weekend,
        )


# ---------------------------------------------------------------------------
# Dead-letter queue model
# ---------------------------------------------------------------------------


class DeadLetterEvent(BaseModel):
    """Captures events that failed validation or processing.

    Provides enough context for debugging, replay, and alerting.
    """

    model_config = ConfigDict(strict=False)

    original_event: dict[str, Any] = Field(
        ...,
        description="Raw event payload that could not be processed.",
    )
    error_message: str = Field(
        ...,
        min_length=1,
        description="Human-readable description of the failure.",
    )
    error_field: Optional[str] = Field(
        default=None,
        description="Dot-path of the field that caused the error, if known.",
    )
    failed_at: datetime = Field(
        default_factory=lambda: datetime.now(tz=timezone.utc),
        description="UTC timestamp when the failure was recorded.",
    )
    correlation_id: Optional[str] = Field(
        default=None,
        description="Optional correlation ID for distributed tracing.",
    )


# ---------------------------------------------------------------------------
# Computed feature vector
# ---------------------------------------------------------------------------


class ComputedFeatures(BaseModel):
    """Aggregated feature vector produced by the feature-engineering stage.

    Contains windowed counters, session-level signals, and long-term user
    statistics used by downstream ML and rule-based systems.
    """

    model_config = ConfigDict(strict=False)

    # --- key ---
    user_id: str = Field(
        ...,
        description="User for whom the features were computed.",
    )

    # --- window boundaries ---
    window_start: datetime = Field(
        ...,
        description="Inclusive start of the computation window (UTC).",
    )
    window_end: datetime = Field(
        ...,
        description="Exclusive end of the computation window (UTC).",
    )

    # --- 1-minute window features ---
    event_count_1m: int = Field(
        default=0,
        ge=0,
        description="Total events in the last 1-minute window.",
    )
    unique_pages_1m: int = Field(
        default=0,
        ge=0,
        description="Distinct page URLs visited in the last 1-minute window.",
    )

    # --- 5-minute window features ---
    event_count_5m: int = Field(
        default=0,
        ge=0,
        description="Total events in the last 5-minute window.",
    )
    purchase_count_5m: int = Field(
        default=0,
        ge=0,
        description="Number of purchase events in the last 5-minute window.",
    )
    total_spend_5m: float = Field(
        default=0.0,
        ge=0.0,
        description="Sum of purchase amounts in the last 5-minute window.",
    )

    # --- 1-hour window features ---
    event_count_1h: int = Field(
        default=0,
        ge=0,
        description="Total events in the last 1-hour window.",
    )
    purchase_rate_1h: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Fraction of events that are purchases in the last hour.",
    )
    avg_time_between_events_1h: float = Field(
        default=0.0,
        ge=0.0,
        description="Mean seconds between consecutive events in the last hour.",
    )

    # --- session-level features ---
    session_duration: float = Field(
        default=0.0,
        ge=0.0,
        description="Current session duration in seconds.",
    )
    session_event_count: int = Field(
        default=0,
        ge=0,
        description="Number of events in the current session.",
    )
    session_purchase_flag: bool = Field(
        default=False,
        description="Whether the current session contains a purchase.",
    )

    # --- long-term / user-level features ---
    purchase_frequency: float = Field(
        default=0.0,
        ge=0.0,
        description="Average purchases per day over the user's history.",
    )
    avg_purchase_amount: float = Field(
        default=0.0,
        ge=0.0,
        description="Mean purchase amount across the user's lifetime.",
    )
    user_activity_score: float = Field(
        default=0.0,
        ge=0.0,
        description="Composite activity score for the user.",
    )
    is_power_user: bool = Field(
        default=False,
        description="Flag indicating whether the user qualifies as a power user.",
    )

    # --- housekeeping ---
    computed_at: datetime = Field(
        default_factory=lambda: datetime.now(tz=timezone.utc),
        description="UTC timestamp when the feature vector was computed.",
    )
