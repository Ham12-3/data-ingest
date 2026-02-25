export interface QualityResults {
  overall_score: number;
  total_checks: number;
  passed: number;
  failed: number;
  pass_rate: number;
  last_check_time: string;
  next_scheduled: string;
  expectations: ExpectationResult[];
}

export interface ExpectationResult {
  id: string;
  name: string;
  status: "pass" | "fail";
  observed_value: number | string;
  expected_range: string;
  checked_at: string;
  details?: string;
  type: string;
}

export interface QualityTrendPoint {
  timestamp: string;
  pass_count: number;
  fail_count: number;
  pass_rate: number;
}

export interface DeadLetterEvent {
  original_event: {
    event_id: string;
    user_id: string;
    event_type: string;
    timestamp: string;
    properties: Record<string, unknown>;
    metadata: Record<string, unknown>;
  };
  error_message: string;
  error_field?: string;
  failed_at: string;
  correlation_id?: string;
}

export interface DeadLetterResponse {
  total_count: number;
  returned: number;
  events: DeadLetterEvent[];
  timestamp: string;
}
