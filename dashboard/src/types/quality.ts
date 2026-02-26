export type ExpectationStatus = 'pass' | 'fail' | 'warning';

export interface ValidationExpectation {
  id: string;
  name: string;
  expectation_type: string;
  status: ExpectationStatus;
  observed_value: string | number;
  expected_range: string;
  checked_at: string;
  details?: Record<string, unknown>;
}

export interface QualityResults {
  overall_score: number;
  total_checks: number;
  passed: number;
  failed: number;
  warning: number;
  pass_rate: number;
  last_check_time: string;
  next_scheduled: string;
  expectations: ValidationExpectation[];
}

export interface QualityTrendPoint {
  timestamp: string;
  pass_count: number;
  fail_count: number;
  warning_count: number;
  pass_rate: number;
}

export interface QualityTrend {
  data: QualityTrendPoint[];
  hours: number;
}
