export interface ApiResponse<T> {
  data: T;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

export interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime_seconds: number;
}

export interface ComponentStatus {
  status: "healthy" | "unhealthy";
  message?: string;
  brokers?: number;
  topics?: number;
}

export interface ComponentsHealthResponse {
  status: "healthy" | "degraded";
  components: {
    redis: ComponentStatus;
    kafka: ComponentStatus;
    postgresql: ComponentStatus;
  };
  timestamp: string;
}

export interface ReplayResult {
  replayed_count: number;
  total_available: number;
  timestamp: string;
}
