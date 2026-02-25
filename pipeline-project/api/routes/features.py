"""Feature retrieval endpoints for the data ingestion pipeline API.

Exposes online and historical feature lookups backed by the Feast
feature store.  Online features are served from the Redis online store;
historical features are retrieved from the PostgreSQL offline store.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException

from api.dependencies import get_feast_store
from feast import FeatureStore
from monitoring.logger import get_api_logger

logger = get_api_logger()

router = APIRouter(prefix="/features", tags=["features"])

# ---------------------------------------------------------------------------
# Feature references
# ---------------------------------------------------------------------------

ONLINE_FEATURES: list[str] = [
    # user_realtime_features (1-minute window)
    "user_realtime_features:event_count_1m",
    "user_realtime_features:unique_pages_1m",
    # user_realtime_features (5-minute window)
    "user_realtime_features:event_count_5m",
    "user_realtime_features:purchase_count_5m",
    "user_realtime_features:total_spend_5m",
    # user_hourly_features (1-hour window)
    "user_hourly_features:event_count_1h",
    "user_hourly_features:purchase_rate_1h",
    "user_hourly_features:avg_time_between_events_1h",
    # user_session_features (session-level)
    "user_session_features:session_duration",
    "user_session_features:session_event_count",
    "user_session_features:session_purchase_flag",
    # user_profile_features (long-term / user-level)
    "user_profile_features:purchase_frequency",
    "user_profile_features:avg_purchase_amount",
    "user_profile_features:user_activity_score",
    "user_profile_features:is_power_user",
]
"""All 15 feature references across the 4 feature views served online."""


# ---------------------------------------------------------------------------
# Online features
# ---------------------------------------------------------------------------


@router.get("/{user_id}")
async def get_user_features(
    user_id: str,
    store: FeatureStore = Depends(get_feast_store),
) -> dict[str, Any]:
    """Retrieve the latest online features for a single user.

    Args:
        user_id: The user identifier (e.g. ``"user_42"``).
        store: Injected Feast ``FeatureStore`` instance.

    Returns:
        A JSON object containing the ``user_id``, a ``features`` dict
        with scalar values, and a ``retrieved_at`` UTC timestamp.

    Raises:
        HTTPException: 500 if the feature store lookup fails.
    """
    try:
        entity_rows: list[dict[str, Any]] = [{"user_id": user_id}]
        online_response = store.get_online_features(
            features=ONLINE_FEATURES,
            entity_rows=entity_rows,
        )

        feature_dict: dict[str, Any] = online_response.to_dict()

        # Feast returns each value as a single-element list when queried
        # for one entity row.  Unwrap to scalar for a cleaner API.
        features: dict[str, Any] = {}
        for key, values in feature_dict.items():
            if key == "user_id":
                continue
            if isinstance(values, list) and len(values) == 1:
                features[key] = values[0]
            else:
                features[key] = values

        return {
            "user_id": user_id,
            "features": features,
            "retrieved_at": datetime.now(tz=timezone.utc).isoformat(),
        }

    except Exception as exc:
        logger.error(
            "Failed to retrieve online features for user_id=%s: %s",
            user_id,
            exc,
        )
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve features for user {user_id}: {exc}",
        ) from exc


# ---------------------------------------------------------------------------
# Historical features
# ---------------------------------------------------------------------------


@router.get("/{user_id}/history")
async def get_user_feature_history(
    user_id: str,
    hours: int = 24,
    store: FeatureStore = Depends(get_feast_store),
) -> dict[str, Any]:
    """Retrieve historical features for a user over a time window.

    Args:
        user_id: The user identifier.
        hours: Number of hours of history to retrieve (default 24).
        store: Injected Feast ``FeatureStore`` instance.

    Returns:
        A JSON object containing the ``user_id``, ``hours`` queried,
        a list of ``features`` records, and a ``retrieved_at`` UTC
        timestamp.

    Raises:
        HTTPException: 500 if the historical feature retrieval fails.
    """
    try:
        now = datetime.now(tz=timezone.utc)
        event_timestamp = now - timedelta(hours=hours)

        entity_df = pd.DataFrame(
            {
                "user_id": [user_id],
                "event_timestamp": [event_timestamp],
            },
        )

        historical_response = store.get_historical_features(
            entity_df=entity_df,
            features=ONLINE_FEATURES,
        )

        result_df: pd.DataFrame = historical_response.to_df()

        # Convert timestamps to ISO-8601 strings for JSON serialisation.
        for col in result_df.columns:
            if pd.api.types.is_datetime64_any_dtype(result_df[col]):
                result_df[col] = result_df[col].dt.strftime(
                    "%Y-%m-%dT%H:%M:%S.%fZ",
                )

        records: list[dict[str, Any]] = result_df.to_dict(orient="records")

        return {
            "user_id": user_id,
            "hours": hours,
            "features": records,
            "retrieved_at": now.isoformat(),
        }

    except Exception as exc:
        logger.error(
            "Failed to retrieve historical features for user_id=%s: %s",
            user_id,
            exc,
        )
        raise HTTPException(
            status_code=500,
            detail=(
                f"Failed to retrieve feature history for user {user_id}: {exc}"
            ),
        ) from exc
