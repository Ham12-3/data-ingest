"""Great Expectations validation runner for the data ingestion pipeline.

Provides the :class:`EventValidator` which validates batches of user events
against the ``user_event_suite`` expectation suite.  When the full Great
Expectations checkpoint path is unavailable (e.g. no active GE context or
missing backend), the validator falls back to lightweight rule-based checks
that mirror the expectations defined in the JSON suite.

Typical usage::

    from quality.validator import EventValidator

    validator = EventValidator()
    passed, failed = validator.validate_batch(events)
"""

from __future__ import annotations

import json
import math
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import pandas as pd

try:
    import great_expectations as gx
    from great_expectations.core import ExpectationSuite

    _GE_AVAILABLE = True
except ImportError:  # pragma: no cover
    _GE_AVAILABLE = False

from config.settings import get_settings
from monitoring.logger import get_validator_logger
from monitoring.prometheus_metrics import METRICS

# ---------------------------------------------------------------------------
# Module-level constants
# ---------------------------------------------------------------------------

_SUITE_DIR: Path = Path(__file__).resolve().parent / "expectations"
_SUITE_FILE: Path = _SUITE_DIR / "user_event_suite.json"

_ALLOWED_EVENT_TYPES: frozenset[str] = frozenset(
    {"page_view", "purchase", "click", "signup"}
)
_ALLOWED_DEVICES: frozenset[str] = frozenset({"mobile", "desktop", "tablet"})
_USER_ID_REGEX: re.Pattern[str] = re.compile(r"^user_\d+$")

_STATISTICAL_SAMPLE_THRESHOLD: int = 100
_STATISTICAL_STDDEV_MULTIPLIER: float = 2.0

logger = get_validator_logger()


# ---------------------------------------------------------------------------
# Custom exception
# ---------------------------------------------------------------------------


class ValidationError(Exception):
    """Raised when one or more events fail validation.

    Attributes:
        failed_expectations: A list of dictionaries describing each
            individual expectation failure.
    """

    def __init__(
        self,
        message: str,
        failed_expectations: Optional[list[dict[str, Any]]] = None,
    ) -> None:
        super().__init__(message)
        self.failed_expectations: list[dict[str, Any]] = (
            failed_expectations or []
        )


# ---------------------------------------------------------------------------
# Validator
# ---------------------------------------------------------------------------


class EventValidator:
    """Validates batches of user events using Great Expectations and
    rule-based fallback checks.

    The validator keeps lightweight in-memory statistics (e.g. historical
    purchase amounts) so that statistical outlier detection improves over
    time without requiring an external data store.
    """

    def __init__(self) -> None:
        """Initialise the validator, loading the expectation suite and
        setting up internal counters."""
        self._settings = get_settings()
        self._suite: dict[str, Any] = self._load_suite()
        self._ge_context: Optional[Any] = None

        # Metrics bookkeeping
        self._passed_count: int = 0
        self._failed_count: int = 0

        # Historical amounts for statistical outlier detection
        self._historical_amounts: list[float] = []

        # Attempt to bootstrap a GE data context
        if _GE_AVAILABLE:
            try:
                self._ge_context = gx.get_context()
                logger.info("Great Expectations context loaded successfully.")
            except Exception:
                logger.warning(
                    "Could not initialise Great Expectations context; "
                    "falling back to rule-based validation."
                )
                self._ge_context = None

    # -- Suite loading ------------------------------------------------------

    @staticmethod
    def _load_suite() -> dict[str, Any]:
        """Load the expectation suite from the on-disk JSON file.

        Returns:
            A dictionary representation of the
            ``user_event_suite.json`` expectation suite.

        Raises:
            FileNotFoundError: If the suite file does not exist.
        """
        if not _SUITE_FILE.exists():
            raise FileNotFoundError(
                f"Expectation suite not found at {_SUITE_FILE}"
            )
        with _SUITE_FILE.open("r", encoding="utf-8") as fh:
            suite_data: dict[str, Any] = json.load(fh)
        logger.info(
            "Loaded expectation suite '%s' with %d expectations.",
            suite_data.get("expectation_suite_name", "unknown"),
            len(suite_data.get("expectations", [])),
        )
        return suite_data

    # -- Flattening ---------------------------------------------------------

    @staticmethod
    def _flatten_event(event: dict[str, Any]) -> dict[str, Any]:
        """Flatten a nested event dictionary to a single level.

        Nested dictionaries under ``properties`` and ``metadata`` are
        promoted so that their keys appear at the top level.  Collisions
        are resolved in favour of the nested value.

        Args:
            event: A raw event dictionary, potentially with nested
                ``properties`` and ``metadata`` sub-objects.

        Returns:
            A new dictionary with all keys at the top level.
        """
        flat: dict[str, Any] = {}

        for key, value in event.items():
            if key in ("properties", "metadata") and isinstance(value, dict):
                for nested_key, nested_value in value.items():
                    flat[nested_key] = nested_value
            else:
                flat[key] = value

        return flat

    # -- Batch validation ---------------------------------------------------

    def validate_batch(
        self,
        events: list[dict[str, Any]],
    ) -> tuple[list[dict[str, Any]], list[tuple[dict[str, Any], list[dict[str, Any]]]]]:
        """Validate a batch of events, returning passed and failed events.

        The method first attempts to run a Great Expectations checkpoint
        against the batch as a Pandas DataFrame.  If that fails (missing
        context, import error, runtime error), it falls back to
        individual rule-based validation via :meth:`_validate_individually`.

        Args:
            events: A list of raw event dictionaries to validate.

        Returns:
            A two-element tuple:

            * **passed** -- events that satisfied all expectations.
            * **failed** -- a list of ``(event, errors)`` tuples where
              *errors* is a list of error detail dictionaries.
        """
        if not events:
            return [], []

        # -- Attempt GE checkpoint-based validation -------------------------
        if self._ge_context is not None and _GE_AVAILABLE:
            try:
                return self._validate_with_ge(events)
            except Exception as exc:
                logger.warning(
                    "GE checkpoint validation failed (%s); "
                    "falling back to rule-based checks.",
                    exc,
                )

        # -- Fallback: individual rule-based validation ---------------------
        return self._validate_individually(events)

    # -- GE checkpoint validation -------------------------------------------

    def _validate_with_ge(
        self,
        events: list[dict[str, Any]],
    ) -> tuple[list[dict[str, Any]], list[tuple[dict[str, Any], list[dict[str, Any]]]]]:
        """Run Great Expectations checkpoint validation against a batch.

        Args:
            events: Batch of raw event dictionaries.

        Returns:
            Tuple of (passed_events, failed_events_with_errors).

        Raises:
            Exception: Re-raised if GE validation encounters an
                unrecoverable error (caller falls back to rule-based).
        """
        flat_events: list[dict[str, Any]] = [
            self._flatten_event(e) for e in events
        ]
        df = pd.DataFrame(flat_events)

        suite = ExpectationSuite(**self._suite)

        datasource = self._ge_context.sources.add_or_update_pandas(
            name="runtime_pandas",
        )
        data_asset = datasource.add_dataframe_asset(
            name="event_batch",
        )
        batch_request = data_asset.build_batch_request(dataframe=df)

        checkpoint = self._ge_context.add_or_update_checkpoint(
            name="event_validation_checkpoint",
            validations=[
                {
                    "batch_request": batch_request,
                    "expectation_suite_name": suite.expectation_suite_name,
                },
            ],
        )

        result = checkpoint.run()

        if result.success:
            self._update_metrics(len(events), 0)
            # Track amounts for statistical analysis
            for evt in flat_events:
                if evt.get("amount") is not None:
                    self._historical_amounts.append(float(evt["amount"]))
            return events, []

        # GE reports batch-level failures; fall back to per-event checks
        # to identify which specific events failed.
        return self._validate_individually(events)

    # -- Individual rule-based validation -----------------------------------

    def _validate_individually(
        self,
        events: list[dict[str, Any]],
    ) -> tuple[list[dict[str, Any]], list[tuple[dict[str, Any], list[dict[str, Any]]]]]:
        """Validate each event individually using rule-based checks.

        Args:
            events: A list of raw event dictionaries.

        Returns:
            Tuple of (passed_events, failed_events_with_errors).
        """
        passed: list[dict[str, Any]] = []
        failed: list[tuple[dict[str, Any], list[dict[str, Any]]]] = []

        for event in events:
            errors = self._check_event(event)
            if errors:
                failed.append((event, errors))
            else:
                passed.append(event)
                # Track amounts for statistical analysis
                flat = self._flatten_event(event)
                if flat.get("amount") is not None:
                    self._historical_amounts.append(float(flat["amount"]))

        self._update_metrics(len(passed), len(failed))
        return passed, failed

    # -- Single-event rule checks -------------------------------------------

    def _check_event(self, event: dict[str, Any]) -> list[dict[str, Any]]:
        """Apply rule-based validation to a single event.

        The rules mirror the expectations defined in the JSON suite file
        and add a statistical outlier check for purchase amounts.

        Args:
            event: A raw event dictionary (may be nested).

        Returns:
            A list of error dictionaries.  An empty list indicates the
            event is valid.  Each error dict contains keys ``field``,
            ``rule``, and ``message``.
        """
        errors: list[dict[str, Any]] = []
        flat: dict[str, Any] = self._flatten_event(event)

        # -- Required fields ------------------------------------------------
        required_fields: list[str] = [
            "event_id",
            "user_id",
            "event_type",
            "timestamp",
        ]
        for field in required_fields:
            if flat.get(field) is None:
                errors.append(
                    {
                        "field": field,
                        "rule": "not_null",
                        "message": f"Required field '{field}' is missing or null.",
                    }
                )

        # -- event_type in allowed set --------------------------------------
        event_type: Optional[str] = flat.get("event_type")
        if event_type is not None and event_type not in _ALLOWED_EVENT_TYPES:
            errors.append(
                {
                    "field": "event_type",
                    "rule": "allowed_values",
                    "message": (
                        f"event_type '{event_type}' is not in the allowed set: "
                        f"{sorted(_ALLOWED_EVENT_TYPES)}."
                    ),
                }
            )

        # -- timestamp: valid ISO and not in the future ---------------------
        timestamp_raw: Any = flat.get("timestamp")
        if timestamp_raw is not None:
            parsed_ts: Optional[datetime] = None
            if isinstance(timestamp_raw, datetime):
                parsed_ts = timestamp_raw
            elif isinstance(timestamp_raw, str):
                try:
                    parsed_ts = datetime.fromisoformat(timestamp_raw)
                except (ValueError, TypeError):
                    errors.append(
                        {
                            "field": "timestamp",
                            "rule": "valid_iso_format",
                            "message": (
                                f"timestamp '{timestamp_raw}' is not a valid "
                                "ISO-8601 string."
                            ),
                        }
                    )

            if parsed_ts is not None:
                if parsed_ts.tzinfo is None:
                    parsed_ts = parsed_ts.replace(tzinfo=timezone.utc)
                now = datetime.now(tz=timezone.utc)
                if parsed_ts > now:
                    errors.append(
                        {
                            "field": "timestamp",
                            "rule": "not_in_future",
                            "message": (
                                f"timestamp '{parsed_ts.isoformat()}' is in "
                                "the future."
                            ),
                        }
                    )

        # -- user_id regex --------------------------------------------------
        user_id: Optional[str] = flat.get("user_id")
        if user_id is not None and not _USER_ID_REGEX.match(str(user_id)):
            errors.append(
                {
                    "field": "user_id",
                    "rule": "regex_match",
                    "message": (
                        f"user_id '{user_id}' does not match the required "
                        "pattern '^user_\\d+$'."
                    ),
                }
            )

        # -- purchase events require positive amount ------------------------
        if event_type == "purchase":
            amount: Any = flat.get("amount")
            if amount is None or not isinstance(amount, (int, float)) or amount <= 0:
                errors.append(
                    {
                        "field": "amount",
                        "rule": "purchase_requires_positive_amount",
                        "message": (
                            "Purchase events must include a positive 'amount'."
                        ),
                    }
                )

        # -- Statistical outlier check on amount ----------------------------
        amount_val: Any = flat.get("amount")
        if (
            amount_val is not None
            and isinstance(amount_val, (int, float))
            and len(self._historical_amounts) > _STATISTICAL_SAMPLE_THRESHOLD
        ):
            mean: float = sum(self._historical_amounts) / len(
                self._historical_amounts
            )
            variance: float = sum(
                (x - mean) ** 2 for x in self._historical_amounts
            ) / len(self._historical_amounts)
            stddev: float = math.sqrt(variance)

            if stddev > 0:
                lower_bound: float = mean - (
                    _STATISTICAL_STDDEV_MULTIPLIER * stddev
                )
                upper_bound: float = mean + (
                    _STATISTICAL_STDDEV_MULTIPLIER * stddev
                )
                if not (lower_bound <= float(amount_val) <= upper_bound):
                    errors.append(
                        {
                            "field": "amount",
                            "rule": "statistical_outlier",
                            "message": (
                                f"amount {amount_val} is outside "
                                f"{_STATISTICAL_STDDEV_MULTIPLIER} standard "
                                f"deviations of the historical mean "
                                f"({mean:.2f} +/- {stddev:.2f})."
                            ),
                        }
                    )

        # -- session_id required --------------------------------------------
        session_id: Optional[str] = flat.get("session_id")
        if session_id is None:
            errors.append(
                {
                    "field": "session_id",
                    "rule": "not_null",
                    "message": "Required field 'session_id' is missing or null.",
                }
            )

        return errors

    # -- Freshness check ----------------------------------------------------

    def check_freshness(self, events: list[dict[str, Any]]) -> bool:
        """Check whether the most recent event is within the freshness threshold.

        The threshold is read from
        ``settings.quality.freshness_threshold_seconds``.

        Args:
            events: A list of event dictionaries (nested or flattened)
                containing a ``timestamp`` field.

        Returns:
            ``True`` if the newest event's timestamp is within the
            configured freshness window, ``False`` otherwise.
        """
        if not events:
            return False

        threshold_seconds: int = (
            self._settings.quality.freshness_threshold_seconds
        )
        now = datetime.now(tz=timezone.utc)

        most_recent: Optional[datetime] = None
        for event in events:
            flat: dict[str, Any] = self._flatten_event(event)
            ts_raw: Any = flat.get("timestamp")
            if ts_raw is None:
                continue

            ts: Optional[datetime] = None
            if isinstance(ts_raw, datetime):
                ts = ts_raw
            elif isinstance(ts_raw, str):
                try:
                    ts = datetime.fromisoformat(ts_raw)
                except (ValueError, TypeError):
                    continue
            else:
                continue

            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            if most_recent is None or ts > most_recent:
                most_recent = ts

        if most_recent is None:
            return False

        age_seconds: float = (now - most_recent).total_seconds()
        is_fresh: bool = age_seconds <= threshold_seconds

        if not is_fresh:
            logger.warning(
                "Freshness check failed: most recent event is %.1f seconds old "
                "(threshold: %d seconds).",
                age_seconds,
                threshold_seconds,
            )

        return is_fresh

    # -- Volume check -------------------------------------------------------

    def check_volume(
        self,
        event_count: int,
        window_seconds: float,
    ) -> bool:
        """Check that event throughput meets the minimum volume requirement.

        The minimum events-per-minute threshold is read from
        ``settings.quality.min_events_per_minute``.

        Args:
            event_count: Number of events observed in the window.
            window_seconds: Duration of the observation window in seconds.

        Returns:
            ``True`` if the computed events-per-minute rate meets or
            exceeds the configured minimum, ``False`` otherwise.
        """
        if window_seconds <= 0:
            return False

        min_per_minute: int = self._settings.quality.min_events_per_minute
        events_per_minute: float = (event_count / window_seconds) * 60.0
        meets_threshold: bool = events_per_minute >= min_per_minute

        if not meets_threshold:
            logger.warning(
                "Volume check failed: %.1f events/min "
                "(minimum: %d events/min).",
                events_per_minute,
                min_per_minute,
            )

        return meets_threshold

    # -- Metrics bookkeeping ------------------------------------------------

    def _update_metrics(self, passed: int, failed: int) -> None:
        """Update Prometheus counters and the pass-rate gauge.

        Args:
            passed: Number of events that passed validation.
            failed: Number of events that failed validation.
        """
        self._passed_count += passed
        self._failed_count += failed

        METRICS.events_validated_total.labels(status="passed").inc(passed)
        METRICS.events_validated_total.labels(status="failed").inc(failed)

        total: int = self._passed_count + self._failed_count
        if total > 0:
            rate: float = self._passed_count / total
            METRICS.validation_pass_rate.set(rate)
