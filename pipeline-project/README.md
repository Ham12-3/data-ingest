# Real-Time Data Ingestion & Feature Engineering Pipeline

A streaming data pipeline that ingests raw user events via Apache Kafka, validates and transforms them in real time, computes ML-ready features through windowed aggregations, and stores them in a Feast feature store for online and offline serving.

## Architecture

```
                                    ┌─────────────────────────────────────────────┐
                                    │              Monitoring Layer                │
                                    │   Prometheus ◄── Grafana (dashboards)       │
                                    │       ▲                                      │
                                    │       │ /metrics/prometheus                  │
                                    └───────┼─────────────────────────────────────┘
                                            │
┌──────────┐    ┌──────────────┐    ┌───────┴──────┐    ┌────────────────┐
│  Event   │    │              │    │              │    │                │
│ Producer ├───►│  Kafka       │    │  FastAPI     │    │  Feast         │
│ (sim)    │    │  raw-events  │    │  API Server  │    │  Feature Store │
└──────────┘    │  (6 parts)   │    │  :8000       │    │                │
                └──────┬───────┘    └──────────────┘    │  ┌──────────┐ │
                       │                                │  │  Redis   │ │
                       ▼                                │  │ (online) │ │
                ┌──────────────┐                        │  └──────────┘ │
                │  Validation  │                        │  ┌──────────┐ │
                │  & Quality   │                        │  │ Postgres │ │
                │  Checks      │                        │  │(offline) │ │
                └──┬───────┬───┘                        │  └──────────┘ │
                   │       │                            └───────▲───────┘
                   │       ▼                                    │
                   │  ┌──────────────┐                          │
                   │  │  Dead Letter │                          │
                   │  │  Queue       │                          │
                   │  └──────────────┘                          │
                   ▼                                            │
            ┌──────────────┐    ┌──────────────┐    ┌───────────┴──┐
            │  Flink-Style │    │  computed-    │    │  Feast       │
            │  Consumer    ├───►│  features     ├───►│  Writer      │
            │  (transform  │    │  topic        │    │  (online +   │
            │  + aggregate)│    └──────────────┘    │   offline)   │
            └──────────────┘                        └──────────────┘

Data Flow:
  Producer → raw-events → Validator → Flink Consumer → computed-features → Feast Writer → Redis/Postgres
                                  └─► dead-letter-events (failures)
```

## Quick Start

### Prerequisites

- Docker & Docker Compose v2+
- 8 GB+ RAM available for Docker

### 1. Clone and configure

```bash
cd pipeline-project
cp .env.example .env
# Edit .env if you need to customize settings
```

### 2. Start all services

```bash
docker compose up -d
```

This starts: Zookeeper, 3 Kafka brokers, Schema Registry, Redis, PostgreSQL, Prometheus, Grafana, the API server, event producer, Flink consumer, and Feast writer.

### 3. Verify the pipeline is running

```bash
# Check service health
curl http://localhost:8000/health

# Check individual components
curl http://localhost:8000/health/components

# View pipeline metrics
curl http://localhost:8000/metrics

# Retrieve features for a user
curl http://localhost:8000/features/user_42

# View recent dead-letter events
curl http://localhost:8000/dead-letter/recent?limit=5
```

### 4. Access dashboards

- **API docs**: http://localhost:8000/docs
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/admin)

### 5. Stop the pipeline

```bash
docker compose down
# To also remove volumes:
docker compose down -v
```

## Project Structure

```
pipeline-project/
├── docker-compose.yml          # Full infrastructure stack
├── Dockerfile                  # Python application image
├── requirements.txt            # Python dependencies
├── .env.example                # Environment variable template
├── config/                     # Configuration modules
│   ├── settings.py             # Pydantic BaseSettings (loads .env)
│   ├── kafka_config.py         # Kafka producer/consumer/admin setup
│   ├── flink_config.py         # PyFlink environment & SQL DDL
│   └── feast_config.py         # Feast repo configuration
├── schemas/                    # Data contracts
│   ├── avro/user_event.avsc    # Avro schema for Schema Registry
│   └── pydantic_models.py      # Pydantic validation models
├── producers/                  # Event generation
│   ├── event_producer.py       # Kafka producer with Avro serialization
│   └── sample_data.py          # Realistic event simulator
├── consumers/                  # Stream processing
│   └── flink_consumer.py       # Windowed aggregation pipeline
├── processing/                 # Feature engineering
│   ├── transformers.py         # Event normalization & enrichment
│   ├── aggregations.py         # Tumbling/Sliding/Session windows
│   └── feature_calculator.py   # Derived ML feature computation
├── feature_store/              # Feast integration
│   ├── feature_repo/           # Feast repository
│   │   ├── feature_store.yaml  # Feast configuration
│   │   ├── user_features.py    # Feature view definitions
│   │   └── data_sources.py     # Data source definitions
│   └── feast_writer.py         # Kafka → Feast writer with retries
├── quality/                    # Data quality
│   ├── expectations/           # Great Expectations suite
│   ├── validator.py            # Batch validation runner
│   └── dead_letter.py          # DLQ handler
├── api/                        # FastAPI service
│   ├── main.py                 # Application entry point
│   ├── routes/                 # Endpoint modules
│   │   ├── health.py           # Health checks
│   │   ├── features.py         # Feature retrieval
│   │   └── metrics.py          # Metrics & DLQ endpoints
│   └── dependencies.py         # Dependency injection
├── monitoring/                 # Observability
│   ├── prometheus_metrics.py   # Custom Prometheus counters/gauges
│   ├── prometheus.yml          # Prometheus scrape config
│   └── logger.py               # Structured JSON logging
└── tests/                      # Test suite
    ├── test_transformers.py    # Transformer unit tests
    ├── test_validator.py       # Validator unit tests
    ├── test_producer.py        # Producer unit tests
    └── test_integration.py     # End-to-end pipeline tests
```

## Configuration

All configuration is via environment variables (see `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `KAFKA_BOOTSTRAP_SERVERS` | `kafka-1:9092,...` | Kafka broker addresses |
| `KAFKA_SCHEMA_REGISTRY_URL` | `http://schema-registry:8081` | Schema Registry URL |
| `PRODUCER_EVENTS_PER_SECOND` | `100` | Event generation rate |
| `PRODUCER_BATCH_SIZE` | `50` | Producer batch size |
| `FLINK_PARALLELISM` | `2` | Processing parallelism |
| `FLINK_WATERMARK_LATENESS_SECONDS` | `30` | Late event tolerance |
| `POSTGRES_HOST` | `postgres` | PostgreSQL host |
| `REDIS_HOST` | `redis` | Redis host |
| `API_PORT` | `8000` | FastAPI listen port |
| `LOG_LEVEL` | `INFO` | Logging level |
| `LOG_FORMAT` | `json` | Log format (json or plain) |
| `VALIDATION_INTERVAL_SECONDS` | `30` | Micro-batch validation interval |
| `DLQ_FAILURE_THRESHOLD` | `0.1` | Alert when failure rate exceeds 10% |
| `MIN_EVENTS_PER_MINUTE` | `10` | Minimum throughput threshold |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Pipeline health status |
| GET | `/health/components` | Per-component health (Kafka, Redis, Postgres) |
| GET | `/metrics` | Pipeline throughput, latency, error rates |
| GET | `/metrics/prometheus` | Raw Prometheus exposition format |
| GET | `/features/{user_id}` | Online features from Feast |
| GET | `/features/{user_id}/history?hours=24` | Historical features from offline store |
| GET | `/dead-letter/recent?limit=10` | Recent dead-letter events |
| POST | `/pipeline/replay` | Replay DLQ events back to raw-events |

## Feature Definitions

### Real-time Features (1m/5m windows)
- `event_count_1m` — Events in the last 1-minute tumbling window
- `unique_pages_1m` — Distinct pages visited in 1 minute
- `event_count_5m` — Events in the last 5-minute window
- `purchase_count_5m` — Purchases in the last 5 minutes
- `total_spend_5m` — Total purchase amount in 5 minutes

### Hourly Features (1h sliding window, 5m slide)
- `event_count_1h` — Events in the last hour
- `purchase_rate_1h` — Fraction of events that are purchases
- `avg_time_between_events_1h` — Mean inter-event gap in seconds

### Session Features (30-minute gap)
- `session_duration` — Session length in seconds
- `session_event_count` — Events in the session
- `session_purchase_flag` — Whether a purchase occurred

### Derived Features
- `purchase_frequency` — Lifetime purchases / total events ratio
- `avg_purchase_amount` — Running average purchase amount
- `user_activity_score` — RFM-weighted score (0.0–1.0)
- `is_power_user` — Boolean flag based on activity thresholds

## Testing

```bash
# Install dev dependencies
pip install -r requirements.txt

# Run unit tests
pytest tests/ -v

# Run only integration tests
pytest tests/test_integration.py -v -m integration

# Run with coverage
pytest tests/ --cov=processing --cov=quality --cov=schemas -v
```

## Troubleshooting

**Kafka brokers not ready**: Wait 30–60 seconds after `docker compose up`. Check with:
```bash
docker compose logs kafka-1 | tail -20
```

**Schema Registry connection errors**: The producer falls back to JSON serialization if Schema Registry is unavailable. Check:
```bash
curl http://localhost:8081/subjects
```

**Redis/Postgres connection failures**: The Feast writer uses circuit breakers — it will retry with exponential backoff and stop attempting writes after 5 consecutive failures. Check:
```bash
docker compose logs feast-writer | tail -20
```

**High dead-letter queue count**: Check recent failures via the API:
```bash
curl http://localhost:8000/dead-letter/recent?limit=20
```
Then replay after fixing the root cause:
```bash
curl -X POST http://localhost:8000/pipeline/replay
```

**Consumer lag growing**: Check Kafka consumer group status:
```bash
docker compose exec kafka-1 kafka-consumer-groups --bootstrap-server kafka-1:9092 --describe --group flink-feature-pipeline
```

## Performance Benchmarks

| Metric | Target | Notes |
|--------|--------|-------|
| Ingestion throughput | 100–1000 events/sec | Configurable via `PRODUCER_EVENTS_PER_SECOND` |
| End-to-end latency | < 5 seconds | From event generation to feature availability |
| Validation throughput | > 5000 events/sec | Pydantic + rule-based validation |
| Feature write latency | < 100ms (online) | Redis online store writes |
| Feature write latency | < 500ms (offline) | PostgreSQL offline store writes |

_Actual benchmarks depend on hardware. Run the integration test load simulation to measure on your environment._
