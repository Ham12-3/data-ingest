export interface UserFeatures {
  user_id: string;
  features: FeatureValues;
  retrieved_at: string;
}

export interface FeatureValues {
  event_count_1m: number;
  unique_pages_1m: number;
  event_count_5m: number;
  purchase_count_5m: number;
  total_spend_5m: number;
  event_count_1h: number;
  purchase_rate_1h: number;
  avg_time_between_events_1h: number;
  session_duration: number;
  session_event_count: number;
  session_purchase_flag: boolean;
  purchase_frequency: number;
  avg_purchase_amount: number;
  user_activity_score: number;
  is_power_user: boolean;
}

export interface FeatureHistoryEntry {
  user_id: string;
  event_timestamp: string;
  event_count_1m: number;
  unique_pages_1m: number;
  event_count_5m: number;
  purchase_count_5m: number;
  total_spend_5m: number;
  event_count_1h: number;
  purchase_rate_1h: number;
  avg_time_between_events_1h: number;
  session_duration: number;
  session_event_count: number;
  session_purchase_flag: boolean;
  purchase_frequency: number;
  avg_purchase_amount: number;
  user_activity_score: number;
  is_power_user: boolean;
}

export interface FeatureHistoryResponse {
  user_id: string;
  hours: number;
  features: FeatureHistoryEntry[];
  retrieved_at: string;
}

export type FeatureView = "realtime" | "hourly" | "session" | "derived";

export interface FeatureTableRow {
  user_id: string;
  feature_name: string;
  current_value: string | number | boolean;
  last_updated: string;
  feature_view: FeatureView;
}
