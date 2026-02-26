export type FeatureView = 'realtime' | 'hourly' | 'session' | 'derived';

export interface Feature {
  name: string;
  value: number | string | boolean;
  last_updated: string;
  feature_view: FeatureView;
}

export interface UserFeatures {
  user_id: string;
  total_events: number;
  last_active: string;
  risk_score: number;
  features: Feature[];
}

export interface FeatureDataPoint {
  timestamp: string;
  value: number;
}

export interface FeatureHistory {
  user_id: string;
  feature_name: string;
  history: FeatureDataPoint[];
}

export interface FeatureRow {
  user_id: string;
  feature_name: string;
  current_value: number | string | boolean;
  last_updated: string;
  feature_view: FeatureView;
}
