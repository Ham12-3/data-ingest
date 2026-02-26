Thrilled to share a project we have just finished building -- a real-time data ingestion and feature engineering pipeline.

It takes raw user events from Kafka, validates them with Great Expectations, and computes ML-ready features using windowed aggregations in PyFlink. Features are then stored in Feast for both online and offline serving.

We built a full monitoring dashboard with Next.js, complete with live metrics, dead-letter queue management, and data quality tracking.

The stack includes FastAPI, Redis, PostgreSQL, Prometheus, and Grafana.

Would love to hear your thoughts. #DataEngineering #MachineLearning #Python #Kafka
