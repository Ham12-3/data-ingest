import axios from "axios";
import { API_BASE_URL, API_ENDPOINTS } from "./constants";
import type {
  PipelineHealth,
  ComponentHealth,
  PipelineMetrics,
} from "@/types/metrics";
import type { UserFeatures, FeatureHistory } from "@/types/features";
import type { DeadLetterPage, ReplayResult } from "@/types/api";
import type { QualityResults, QualityTrend } from "@/types/quality";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10_000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      "An unexpected error occurred";
    return Promise.reject(new Error(message));
  }
);

export const api = {
  getHealth: () =>
    apiClient.get<PipelineHealth>(API_ENDPOINTS.health).then((r) => r.data),

  getComponentHealth: () =>
    apiClient
      .get<ComponentHealth[]>(API_ENDPOINTS.healthComponents)
      .then((r) => r.data),

  getMetrics: () =>
    apiClient.get<PipelineMetrics>(API_ENDPOINTS.metrics).then((r) => r.data),

  getFeatures: (userId: string) =>
    apiClient
      .get<UserFeatures>(API_ENDPOINTS.features(userId))
      .then((r) => r.data),

  getFeatureHistory: (
    userId: string,
    start: string,
    end: string,
    featureName?: string
  ) =>
    apiClient
      .get<FeatureHistory>(API_ENDPOINTS.featuresHistory(userId), {
        params: { start, end, feature_name: featureName },
      })
      .then((r) => r.data),

  getDeadLetter: (limit = 20, offset = 0, errorType?: string) =>
    apiClient
      .get<DeadLetterPage>(API_ENDPOINTS.deadLetter, {
        params: { limit, offset, error_type: errorType },
      })
      .then((r) => r.data),

  replayEvents: (eventIds: string[]) =>
    apiClient
      .post<ReplayResult>(API_ENDPOINTS.deadLetterReplay, {
        event_ids: eventIds,
      })
      .then((r) => r.data),

  getQualityResults: () =>
    apiClient
      .get<QualityResults>(API_ENDPOINTS.qualityResults)
      .then((r) => r.data),

  getQualityTrend: (hours = 24) =>
    apiClient
      .get<QualityTrend>(API_ENDPOINTS.qualityTrend, { params: { hours } })
      .then((r) => r.data),
};
