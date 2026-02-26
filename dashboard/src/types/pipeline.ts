export interface PipelineStage {
  id: string;
  name: string;
  type: "producer" | "kafka" | "validator" | "flink" | "feast" | "store";
  status: "healthy" | "degraded" | "error" | "unknown";
  throughput: number;
  x: number;
  y: number;
}

export interface PipelineConnection {
  from: string;
  to: string;
  status: "healthy" | "degraded" | "error";
}

export interface KafkaTopicInfo {
  name: string;
  partitions: number;
  messagesPerSecIn: number;
  messagesPerSecOut: number;
  consumerLag: number;
  sizeBytes: number;
}

export interface FlinkJobInfo {
  jobId: string;
  name: string;
  status: "RUNNING" | "STOPPED" | "FAILED" | "RESTARTING";
  parallelism: number;
  recordsPerSec: number;
  lastCheckpoint: string;
  checkpointDuration: number;
  uptime: number;
}
