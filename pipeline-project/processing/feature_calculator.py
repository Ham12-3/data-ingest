"""Derived ML feature computation for the real-time data ingestion pipeline.

The :class:`FeatureCalculator` maintains lightweight running totals per user
and combines multi-resolution window aggregates with session-level signals
to produce a single, flat feature vector suitable for downstream ML models
or a feature store.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

# ---------------------------------------------------------------------------
# Threshold and weight constants
# ---------------------------------------------------------------------------

POWER_USER_EVENT_THRESHOLD_1H: int = 50
"""Minimum 1-hour event count to qualify as a power user."""

POWER_USER_PURCHASE_THRESHOLD_1H: int = 3
"""Minimum 1-hour purchase count to qualify as a power user."""

POWER_USER_MIN_SCORE: float = 0.7
"""Minimum activity score to qualify as a power user."""

RECENCY_WEIGHT: float = 0.3
"""Weight of the recency component in the RFM activity score."""

FREQUENCY_WEIGHT: float = 0.4
"""Weight of the frequency component in the RFM activity score."""

MONETARY_WEIGHT: float = 0.3
"""Weight of the monetary component in the RFM activity score."""


class FeatureCalculator:
    """Stateful calculator that derives ML features from windowed aggregates.

    Maintains per-user running totals (purchase amounts, purchase counts,
    and total event counts) that survive across successive invocations of
    :meth:`compute_features`, enabling lifetime metrics such as purchase
    frequency and average purchase amount.
    """

    def __init__(self) -> None:
        self._user_purchase_totals: dict[str, float] = {}
        self._user_purchase_counts: dict[str, int] = {}
        self._user_event_totals: dict[str, int] = {}

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _compute_purchase_frequency(self, user_id: str) -> float:
        """Return the ratio of purchases to total events for *user_id*.

        Args:
            user_id: The target user.

        Returns:
            A float in the range ``[0.0, 1.0]``, or ``0.0`` when no events
            have been recorded.
        """
        total_events: int = self._user_event_totals.get(user_id, 0)
        if total_events == 0:
            return 0.0
        purchase_count: int = self._user_purchase_counts.get(user_id, 0)
        return purchase_count / total_events

    def _compute_avg_purchase_amount(self, user_id: str) -> float:
        """Return the average monetary value per purchase for *user_id*.

        Args:
            user_id: The target user.

        Returns:
            A non-negative float, or ``0.0`` when no purchases have been
            recorded.
        """
        purchase_count: int = self._user_purchase_counts.get(user_id, 0)
        if purchase_count == 0:
            return 0.0
        total_spend: float = self._user_purchase_totals.get(user_id, 0.0)
        return total_spend / purchase_count

    def _compute_activity_score(
        self,
        user_id: str,
        window_1h: dict[str, Any],
        window_5m: dict[str, Any],
    ) -> float:
        """Compute an RFM-inspired activity score in ``[0.0, 1.0]``.

        The score is a weighted sum of three normalised components:

        * **Recency**  (weight 0.3) -- ``min(1, event_count_1h / 10)``
        * **Frequency** (weight 0.4) -- ``min(1, event_count_5m / 20)``
        * **Monetary**  (weight 0.3) -- ``min(1, total_spend / 200)``

        where ``total_spend`` comes from the lifetime running total.

        Args:
            user_id: The target user.
            window_1h: The 1-hour sliding-window result dict.
            window_5m: The 5-minute tumbling-window result dict.

        Returns:
            A float between 0.0 and 1.0 inclusive.
        """
        recency: float = min(1.0, window_1h.get("event_count", 0) / 10.0)
        frequency: float = min(1.0, window_5m.get("event_count", 0) / 20.0)
        total_spend: float = self._user_purchase_totals.get(user_id, 0.0)
        monetary: float = min(1.0, total_spend / 200.0)

        score: float = (
            RECENCY_WEIGHT * recency
            + FREQUENCY_WEIGHT * frequency
            + MONETARY_WEIGHT * monetary
        )
        return score

    @staticmethod
    def _compute_is_power_user(
        window_1h: dict[str, Any],
        activity_score: float,
    ) -> bool:
        """Determine whether the user qualifies as a *power user*.

        A user is considered a power user if **any** of the following
        conditions hold:

        * 1-hour event count >= 50
        * 1-hour purchase count >= 3
        * Activity score >= 0.7

        Args:
            window_1h: The 1-hour sliding-window result dict.
            activity_score: The pre-computed activity score.

        Returns:
            ``True`` if the user qualifies as a power user.
        """
        event_count_1h: int = window_1h.get("event_count", 0)
        purchase_count_1h: int = 0
        # purchase_count may come from different window types
        if "purchase_count" in window_1h:
            purchase_count_1h = window_1h["purchase_count"]
        else:
            # Sliding window stores purchase info via purchase_rate
            purchase_rate: float = window_1h.get("purchase_rate", 0.0)
            purchase_count_1h = int(purchase_rate * event_count_1h)

        return (
            event_count_1h >= POWER_USER_EVENT_THRESHOLD_1H
            or purchase_count_1h >= POWER_USER_PURCHASE_THRESHOLD_1H
            or activity_score >= POWER_USER_MIN_SCORE
        )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def compute_features(
        self,
        user_id: str,
        window_1m: dict[str, Any],
        window_5m: dict[str, Any],
        window_1h: dict[str, Any],
        session: dict[str, Any],
    ) -> dict[str, Any]:
        """Produce a complete ML feature vector for *user_id*.

        Running totals are updated from *window_5m* on every call.  The
        caller is responsible for ensuring that window dicts are not
        double-counted (i.e., each unique window should be passed only
        once).

        Args:
            user_id: The target user.
            window_1m: Result from :class:`TumblingWindowAggregator`
                (1-minute window).
            window_5m: Result from :class:`TumblingWindowAggregator`
                (5-minute window).
            window_1h: Result from :class:`SlidingWindowAggregator`
                (1-hour window).
            session: Session features dict (from
                :func:`extract_session_features` or
                :class:`SessionWindowAggregator`).

        Returns:
            A flat dict containing all computed features:

            * Identifiers: ``user_id``
            * Window boundaries: ``window_start``, ``window_end`` (ISO-8601)
            * 1-min window: ``event_count_1m``, ``unique_pages_1m``
            * 5-min window: ``event_count_5m``, ``purchase_count_5m``,
              ``total_spend_5m``
            * 1-hour window: ``event_count_1h``, ``purchase_rate_1h``,
              ``avg_time_between_events_1h``
            * Session: ``session_duration``, ``session_event_count``,
              ``session_purchase_flag``
            * Derived: ``purchase_frequency``, ``avg_purchase_amount``,
              ``user_activity_score``, ``is_power_user``
            * Meta: ``computed_at`` (ISO-8601 UTC)
        """
        # -- Update running totals from the 5-minute window ----------------
        event_count_5m: int = window_5m.get("event_count", 0)
        purchase_count_5m: int = window_5m.get("purchase_count", 0)
        total_spend_5m: float = window_5m.get("total_spend", 0.0)

        self._user_event_totals[user_id] = (
            self._user_event_totals.get(user_id, 0) + event_count_5m
        )
        self._user_purchase_counts[user_id] = (
            self._user_purchase_counts.get(user_id, 0) + purchase_count_5m
        )
        self._user_purchase_totals[user_id] = (
            self._user_purchase_totals.get(user_id, 0.0) + total_spend_5m
        )

        # -- Derived features ----------------------------------------------
        purchase_frequency: float = self._compute_purchase_frequency(user_id)
        avg_purchase_amount: float = self._compute_avg_purchase_amount(user_id)
        activity_score: float = self._compute_activity_score(
            user_id, window_1h, window_5m
        )
        is_power_user: bool = self._compute_is_power_user(
            window_1h, activity_score
        )

        # -- Window boundaries (ISO strings) --------------------------------
        window_start_epoch: int | float = window_5m.get("window_start", 0)
        window_end_epoch: int | float = window_5m.get("window_end", 0)
        window_start_iso: str = datetime.fromtimestamp(
            float(window_start_epoch), tz=timezone.utc
        ).isoformat()
        window_end_iso: str = datetime.fromtimestamp(
            float(window_end_epoch), tz=timezone.utc
        ).isoformat()

        # -- Assemble the feature vector ------------------------------------
        return {
            # Identifiers
            "user_id": user_id,
            # Window boundaries
            "window_start": window_start_iso,
            "window_end": window_end_iso,
            # 1-minute tumbling window features
            "event_count_1m": window_1m.get("event_count", 0),
            "unique_pages_1m": window_1m.get("unique_pages", 0),
            # 5-minute tumbling window features
            "event_count_5m": event_count_5m,
            "purchase_count_5m": purchase_count_5m,
            "total_spend_5m": total_spend_5m,
            # 1-hour sliding window features
            "event_count_1h": window_1h.get("event_count", 0),
            "purchase_rate_1h": window_1h.get("purchase_rate", 0.0),
            "avg_time_between_events_1h": window_1h.get(
                "avg_time_between_events", 0.0
            ),
            # Session features
            "session_duration": session.get("session_duration", 0.0),
            "session_event_count": session.get("session_event_count", 0),
            "session_purchase_flag": session.get("session_purchase_flag", False),
            # Derived lifetime / cross-window features
            "purchase_frequency": purchase_frequency,
            "avg_purchase_amount": avg_purchase_amount,
            "user_activity_score": activity_score,
            "is_power_user": is_power_user,
            # Metadata
            "computed_at": datetime.now(timezone.utc).isoformat(),
        }
