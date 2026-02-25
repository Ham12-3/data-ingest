"""Windowed aggregation classes for the real-time data ingestion pipeline.

Implements three complementary windowing strategies commonly used in
stream-processing systems:

* **TumblingWindowAggregator** -- fixed, non-overlapping time windows.
* **SlidingWindowAggregator**  -- overlapping windows that advance by a
  configurable slide interval.
* **SessionWindowAggregator**  -- dynamic windows driven by per-user
  inactivity gaps.

All classes are designed to be embedded in a single-threaded consumer loop.
They maintain in-memory state and expose eviction helpers to bound memory
growth in long-running processes.
"""

from __future__ import annotations

import logging
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

logger: logging.Logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Tumbling Window
# ---------------------------------------------------------------------------


class TumblingWindowAggregator:
    """Fixed-size, non-overlapping time-window aggregator.

    Events are bucketed into discrete windows of *window_seconds* width.
    Within each window, per-user statistics are accumulated incrementally.

    Args:
        window_seconds: The duration of each tumbling window in seconds.
    """

    def __init__(self, window_seconds: int) -> None:
        self._window_seconds: int = window_seconds
        # window_key -> user_id -> aggregation state
        self._windows: dict[str, dict[str, dict[str, Any]]] = {}

    # -- internal helpers ----------------------------------------------------

    def _window_key(self, ts_epoch: int | float) -> str:
        """Return the canonical key for the window that contains *ts_epoch*.

        The key is the string representation of the window's start epoch,
        computed via floor division.

        Args:
            ts_epoch: Unix epoch timestamp (seconds).

        Returns:
            A string key identifying the tumbling window.
        """
        window_start: int = int(ts_epoch) // self._window_seconds * self._window_seconds
        return str(window_start)

    def _ensure_user_state(self, window_key: str, user_id: str) -> dict[str, Any]:
        """Lazily initialise aggregation state for *user_id* in *window_key*.

        Returns:
            The mutable state dict for the user within the window.
        """
        if window_key not in self._windows:
            self._windows[window_key] = {}
        user_states: dict[str, dict[str, Any]] = self._windows[window_key]
        if user_id not in user_states:
            user_states[user_id] = {
                "event_count": 0,
                "unique_pages": set(),
                "purchase_count": 0,
                "total_spend": 0.0,
                "timestamps": [],
            }
        return user_states[user_id]

    # -- public API ----------------------------------------------------------

    def add_event(self, user_id: str, event: dict[str, Any]) -> None:
        """Ingest a single transformed event into the appropriate window.

        Args:
            user_id: The user who generated the event.
            event: A flat, transformed event dict (must contain at least
                ``timestamp_epoch``, ``event_type``, ``page_url``, and
                ``amount``).
        """
        ts_epoch: int | float = event["timestamp_epoch"]
        window_key: str = self._window_key(ts_epoch)
        state: dict[str, Any] = self._ensure_user_state(window_key, user_id)

        state["event_count"] += 1
        state["timestamps"].append(ts_epoch)

        page_url: str | None = event.get("page_url")
        if page_url is not None and page_url != "":
            state["unique_pages"].add(page_url)

        if event.get("event_type") == "purchase":
            state["purchase_count"] += 1
            amount: float = float(event.get("amount", 0.0) or 0.0)
            state["total_spend"] += amount

    def get_window_result(
        self, user_id: str, ts_epoch: int | float
    ) -> dict[str, Any]:
        """Return the current aggregate for *user_id* in the window containing
        *ts_epoch*.

        Args:
            user_id: The target user.
            ts_epoch: A Unix epoch timestamp used to identify the window.

        Returns:
            A dict with keys ``event_count``, ``unique_pages`` (count),
            ``purchase_count``, ``total_spend``, ``window_start``, and
            ``window_end``.
        """
        window_key: str = self._window_key(ts_epoch)
        window_start: int = int(window_key)
        window_end: int = window_start + self._window_seconds

        user_states: dict[str, dict[str, Any]] = self._windows.get(window_key, {})
        state: dict[str, Any] | None = user_states.get(user_id)

        if state is None:
            return {
                "event_count": 0,
                "unique_pages": 0,
                "purchase_count": 0,
                "total_spend": 0.0,
                "window_start": window_start,
                "window_end": window_end,
            }

        return {
            "event_count": state["event_count"],
            "unique_pages": len(state["unique_pages"]),
            "purchase_count": state["purchase_count"],
            "total_spend": state["total_spend"],
            "window_start": window_start,
            "window_end": window_end,
        }

    def evict_old_windows(
        self, current_epoch: int | float, keep_seconds: int
    ) -> None:
        """Remove windows whose end time falls before the retention horizon.

        Args:
            current_epoch: The current Unix epoch timestamp.
            keep_seconds: Number of seconds of history to retain.  Windows
                older than ``current_epoch - keep_seconds`` are discarded.
        """
        cutoff: float = float(current_epoch) - keep_seconds
        keys_to_remove: list[str] = [
            key
            for key in self._windows
            if (int(key) + self._window_seconds) < cutoff
        ]
        for key in keys_to_remove:
            del self._windows[key]
        if keys_to_remove:
            logger.debug(
                "Evicted %d tumbling window(s) older than epoch %s.",
                len(keys_to_remove),
                cutoff,
            )


# ---------------------------------------------------------------------------
# Sliding Window
# ---------------------------------------------------------------------------


class SlidingWindowAggregator:
    """Overlapping sliding-window aggregator.

    Maintains a per-user event buffer and computes aggregates over the most
    recent *window_seconds*.  Old events outside the window are pruned on
    every :meth:`compute` call.

    Args:
        window_seconds: The total duration of the sliding window in seconds.
        slide_seconds: The slide / advance interval in seconds (informational;
            callers control when to invoke :meth:`compute`).
    """

    def __init__(self, window_seconds: int, slide_seconds: int) -> None:
        self._window_seconds: int = window_seconds
        self._slide_seconds: int = slide_seconds
        # user_id -> list of events (each must contain timestamp_epoch)
        self._events: defaultdict[str, list[dict[str, Any]]] = defaultdict(list)

    # -- public API ----------------------------------------------------------

    def add_event(self, user_id: str, event: dict[str, Any]) -> None:
        """Buffer a transformed event for later sliding-window computation.

        Args:
            user_id: The user who generated the event.
            event: A flat, transformed event dict (must contain at least
                ``timestamp_epoch``, ``event_type``, and ``amount``).
        """
        self._events[user_id].append(event)

    def compute(
        self, user_id: str, current_epoch: int | float
    ) -> dict[str, Any]:
        """Compute sliding-window aggregates for *user_id* as of *current_epoch*.

        Events older than the window are pruned from the internal buffer as a
        side-effect.

        Args:
            user_id: The target user.
            current_epoch: The current Unix epoch timestamp defining the
                window's right edge.

        Returns:
            A dict with keys:

            * **event_count** (*int*)
            * **purchase_rate** (*float*) -- fraction of events that are
              purchases (0.0 if no events)
            * **avg_time_between_events** (*float*) -- mean gap in seconds
              between consecutive events (0.0 if fewer than two events)
            * **window_start** (*int*)
            * **window_end** (*int*)
        """
        window_start_epoch: float = float(current_epoch) - self._window_seconds
        window_end_epoch: int = int(current_epoch)

        # Filter to events within the window
        all_events: list[dict[str, Any]] = self._events.get(user_id, [])
        in_window: list[dict[str, Any]] = [
            e for e in all_events if float(e["timestamp_epoch"]) > window_start_epoch
        ]

        # Prune old events from the buffer
        self._events[user_id] = in_window

        event_count: int = len(in_window)

        # Purchase rate
        purchase_count: int = sum(
            1 for e in in_window if e.get("event_type") == "purchase"
        )
        purchase_rate: float = (
            purchase_count / event_count if event_count > 0 else 0.0
        )

        # Average time between consecutive events
        avg_time_between: float = 0.0
        if event_count >= 2:
            sorted_ts: list[float] = sorted(
                float(e["timestamp_epoch"]) for e in in_window
            )
            gaps: list[float] = [
                sorted_ts[i + 1] - sorted_ts[i]
                for i in range(len(sorted_ts) - 1)
            ]
            avg_time_between = sum(gaps) / len(gaps) if gaps else 0.0

        return {
            "event_count": event_count,
            "purchase_rate": purchase_rate,
            "avg_time_between_events": avg_time_between,
            "window_start": int(window_start_epoch),
            "window_end": window_end_epoch,
        }


# ---------------------------------------------------------------------------
# Session Window
# ---------------------------------------------------------------------------


class SessionWindowAggregator:
    """Gap-driven session-window aggregator.

    A session is a sequence of events from the same user where no two
    consecutive events are separated by more than *gap_seconds*.  When a
    gap is detected the previous session is finalised and returned.

    Args:
        gap_seconds: Maximum allowed inactivity gap (in seconds) before a
            session boundary is declared.  Defaults to 1800 (30 minutes).
    """

    def __init__(self, gap_seconds: int = 1800) -> None:
        self._gap_seconds: int = gap_seconds
        # user_id -> current session state
        self._sessions: dict[str, dict[str, Any]] = {}

    # -- internal helpers ----------------------------------------------------

    @staticmethod
    def _new_session(event: dict[str, Any]) -> dict[str, Any]:
        """Create a fresh session state seeded with *event*.

        Args:
            event: The first event of the new session.

        Returns:
            A mutable session-state dict.
        """
        ts: float = float(event["timestamp_epoch"])
        page_url: str | None = event.get("page_url")
        pages: set[str] = set()
        if page_url is not None and page_url != "":
            pages.add(page_url)

        return {
            "events": [event],
            "start_time": ts,
            "last_event_time": ts,
            "has_purchase": event.get("event_type") == "purchase",
            "pages": pages,
        }

    @staticmethod
    def _finalize_session(session: dict[str, Any]) -> dict[str, Any]:
        """Convert raw session state into a result dict.

        Args:
            session: The internal session-state dict.

        Returns:
            A dict with ``session_duration``, ``session_event_count``,
            ``session_purchase_flag``, ``session_pages_visited``,
            ``start_time``, and ``end_time``.
        """
        return {
            "session_duration": session["last_event_time"] - session["start_time"],
            "session_event_count": len(session["events"]),
            "session_purchase_flag": session["has_purchase"],
            "session_pages_visited": len(session["pages"]),
            "start_time": session["start_time"],
            "end_time": session["last_event_time"],
        }

    # -- public API ----------------------------------------------------------

    def add_event(
        self, user_id: str, event: dict[str, Any]
    ) -> dict[str, Any] | None:
        """Ingest an event and detect session boundaries.

        If the event's timestamp exceeds the gap threshold since the last
        event from the same user the previous session is finalised and
        returned.  Otherwise the event is accumulated into the current
        session.

        Args:
            user_id: The user who generated the event.
            event: A flat, transformed event dict (must contain
                ``timestamp_epoch``, ``event_type``, and ``page_url``).

        Returns:
            The finalised session dict if a session boundary was detected,
            otherwise ``None``.
        """
        ts: float = float(event["timestamp_epoch"])
        finalized: dict[str, Any] | None = None

        existing: dict[str, Any] | None = self._sessions.get(user_id)

        if existing is not None:
            gap: float = ts - existing["last_event_time"]
            if gap > self._gap_seconds:
                # Finalize the old session
                finalized = self._finalize_session(existing)
                # Start a brand-new session
                self._sessions[user_id] = self._new_session(event)
            else:
                # Accumulate into existing session
                existing["events"].append(event)
                existing["last_event_time"] = ts
                if event.get("event_type") == "purchase":
                    existing["has_purchase"] = True
                page_url: str | None = event.get("page_url")
                if page_url is not None and page_url != "":
                    existing["pages"].add(page_url)
        else:
            # First event for this user
            self._sessions[user_id] = self._new_session(event)

        return finalized

    def flush_expired(
        self, current_epoch: int | float
    ) -> list[tuple[str, dict[str, Any]]]:
        """Finalize and return all sessions that have exceeded the gap.

        Useful for periodic sweeps (e.g. on a timer) to ensure sessions
        are not left dangling indefinitely.

        Args:
            current_epoch: The current Unix epoch timestamp.

        Returns:
            A list of ``(user_id, session_result)`` tuples for every
            expired session.
        """
        expired: list[tuple[str, dict[str, Any]]] = []
        users_to_remove: list[str] = []

        for user_id, session in self._sessions.items():
            gap: float = float(current_epoch) - session["last_event_time"]
            if gap > self._gap_seconds:
                expired.append((user_id, self._finalize_session(session)))
                users_to_remove.append(user_id)

        for user_id in users_to_remove:
            del self._sessions[user_id]

        if expired:
            logger.debug(
                "Flushed %d expired session(s).", len(expired)
            )

        return expired
