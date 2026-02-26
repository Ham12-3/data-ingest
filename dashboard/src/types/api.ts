export interface ApiError {
  code: number;
  message: string;
  detail?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

export interface DeadLetterEvent {
  event_id: string;
  user_id: string;
  error_type: string;
  error_message: string;
  original_timestamp: string;
  failed_at: string;
  original_event: Record<string, unknown>;
  stack_trace?: string;
}

export type DeadLetterPage = PaginatedResponse<DeadLetterEvent>;

export interface ReplayResult {
  replayed: number;
  failed: number;
  event_ids: string[];
}

export interface SSEConnectionState {
  connected: boolean;
  reconnecting: boolean;
  error: string | null;
  retryCount: number;
}
