# Authorized Data Ingestion Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ingest approved public/authorized feeds into Sentinel Fusion with validation, provenance, deduplication, source-health monitoring, and human-visible failure states.

**Architecture:** A worker service consumes source registry definitions and runs isolated connector adapters. Every connector declares allowed methods, schedule, rate limits, and terms. Normalized records enter the intelligence core through idempotent service interfaces.

**Tech Stack:** Python 3.12+, httpx, Pydantic, SQLAlchemy, PostgreSQL, pytest, Azure Functions or container worker.

**Spec:** `docs/superpowers/specs/2026-10-31-sentinel-fusion-1-0.md`

## Global Constraints
- Only use lawful, authorized sources and collection methods.
- Respect source terms, rate limits, robots/access rules, and privacy obligations.
- Preserve source URL/identifier, collection timestamp, publication timestamp, method, and raw-record hash.
- Never fabricate missing fields or coordinates.
- Distinguish synthetic/test data from real feed records.
- Do not bypass access controls, authentication, paywalls, or technical restrictions.

## Review Focus
- Feed timeout or provider outage: bounded retries and visible degraded status; test.
- Malformed or schema-drifted payload: quarantine with reason, not silent coercion; test.
- Duplicate delivery: idempotent persistence; test repeated payload.
- Rate limit response: honor Retry-After/backoff; test.
- Timestamp/coordinate ambiguity: preserve original value and mark unresolved; test.

---

### Task 1: Connector contract and source policy

**Files:**
- Create: `services/ingestion/ingestion/contracts.py`, `policy.py`
- Create: `services/ingestion/tests/test_connector_contract.py`

**Interfaces:**
- `SourceConfig` includes source ID, terms URL, permitted method, endpoint, schedule, rate limit, enabled flag.
- `Connector.fetch(window) -> list[RawRecord]`.
- `RawRecord` preserves raw payload, source reference, published time, fetched time, and content hash.

- [ ] Write tests that reject disabled sources, missing terms/policy, and disallowed collection methods.
- [ ] Run tests to verify expected failure.
- [ ] Implement contracts and policy enforcement before network access.
- [ ] Run `pytest services/ingestion/tests/test_connector_contract.py -q`.
- [ ] Commit: `feat: define authorized ingestion connector contract`.

### Task 2: Connector runtime and retry behavior

**Files:**
- Create: `services/ingestion/ingestion/runtime.py`, `http.py`
- Create: `services/ingestion/tests/test_runtime_retries.py`

**Interfaces:**
- `run_connector(config, connector, window) -> IngestionRunResult`.
- Retry transient network errors and 5xx with bounded exponential backoff; honor Retry-After for 429.
- Never retry policy denials or permanent 4xx errors.

- [ ] Write tests for timeout, 5xx, 429 Retry-After, permanent 403, and retry exhaustion.
- [ ] Run tests to verify expected failures.
- [ ] Implement bounded runtime and structured outcomes.
- [ ] Run `pytest services/ingestion/tests/test_runtime_retries.py -q`.
- [ ] Commit: `feat: add bounded connector runtime`.

### Task 3: Normalization, validation, and provenance

**Files:**
- Create: `services/ingestion/ingestion/normalize.py`, `validate.py`
- Create: `services/ingestion/tests/test_normalization.py`

**Interfaces:**
- `normalize_record(raw: RawRecord) -> NormalizedRecord`.
- `validate_record(record: NormalizedRecord) -> ValidationResult`.
- Normalized output retains raw hash, source reference, timestamps, original coordinate text, normalized geometry only when valid.

- [ ] Write tests for missing coordinates, invalid ranges, timezone-naive timestamps, malformed payload, and schema drift.
- [ ] Run tests to verify failures.
- [ ] Implement strict validation and quarantine invalid records with structured reasons.
- [ ] Run `pytest services/ingestion/tests/test_normalization.py -q`.
- [ ] Commit: `feat: normalize records with provenance validation`.

### Task 4: Idempotent persistence and source health

**Files:**
- Create: `services/ingestion/ingestion/persist.py`, `health.py`
- Create: `services/ingestion/tests/test_idempotency_health.py`

**Interfaces:**
- `persist_record(record: NormalizedRecord) -> PersistResult` uses source ID plus stable source record ID/content hash for idempotency.
- `record_source_health(source_id, outcome, latency_ms, observed_at) -> SourceHealth`.
- Health states include healthy, degraded, disabled, and failing.

- [ ] Write tests for duplicate payloads, changed payloads, failure streaks, latency, and disabled sources.
- [ ] Run tests to verify failure.
- [ ] Implement persistence and source-health aggregation.
- [ ] Run `pytest services/ingestion/tests/test_idempotency_health.py -q`.
- [ ] Commit: `feat: persist idempotent feed records and source health`.

### Task 5: Initial connectors and scheduled jobs

**Files:**
- Create: `services/ingestion/ingestion/connectors/nws.py`, `usgs.py`
- Create: `services/ingestion/ingestion/scheduler.py`
- Create: `services/ingestion/tests/test_public_connectors.py`

**Interfaces:**
- Initial connectors: National Weather Service public alerts and USGS earthquake feed.
- Connectors implement shared contract and have explicit terms/endpoint/rate-limit configuration.
- Scheduled runs produce auditable ingestion-run records.

- [ ] Write fixture-based tests for representative NWS and USGS payloads, including provider schema changes.
- [ ] Run tests to verify failure.
- [ ] Implement connectors without hardcoded secrets and add opt-in live smoke tests.
- [ ] Run fixture tests; live tests must be separately marked and disabled by default.
- [ ] Commit: `feat: add NWS and USGS authorized public feed connectors`.
