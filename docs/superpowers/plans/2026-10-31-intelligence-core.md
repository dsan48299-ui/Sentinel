# Intelligence Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the core analyst data model and workflows for cases, events, entities, sources, evidence references, timelines, assessments, and reports.

**Architecture:** Domain services sit behind FastAPI routes and tenant-scoped repositories. PostgreSQL/PostGIS stores normalized records. Each claim and assessment links to provenance; observations and analyst judgments remain distinct.

**Tech Stack:** Python 3.12+, FastAPI, Pydantic, SQLAlchemy 2, Alembic, PostgreSQL/PostGIS, pytest.

**Spec:** `docs/superpowers/specs/2026-10-31-sentinel-fusion-1-0.md`

## Global Constraints
- Every tenant-owned record is tenant-scoped and server-authorized.
- Verification states are Unverified, Reported, Corroborated, Verified, Disputed, Rejected, Synthetic/test data.
- Source reliability and analytical confidence are separate fields.
- Missing coordinates remain null; never substitute 0,0.
- Correlation must not be represented as causation.
- Preserve source references and distinguish facts, claims, and assessments.

## Review Focus
- Duplicate source records: idempotent linking and no duplicate evidence; test stable deduplication.
- Conflicting claims: preserve both with disputed status; test conflict workflow.
- Missing or invalid geometry: retain null geometry and reject out-of-range coordinates; test both.
- Deleted or inaccessible source: preserve provenance snapshot and mark source unavailable; test report rendering.
- Low-confidence inference: label as assessment with reasons, never as verified fact; test serialization and UI contract.

---

### Task 1: Domain enums and schema

**Files:**
- Create: `apps/api/app/intelligence/enums.py`, `models.py`, `schemas.py`
- Create: `apps/api/migrations/versions/*_intelligence_core.py`
- Create: `apps/api/tests/intelligence/test_schema_constraints.py`

**Interfaces:**
- Enums: `VerificationStatus`, `RecordKind`, `ConfidenceLevel`.
- Models: `Case`, `Event`, `Entity`, `DataSource`, `EvidenceLink`, `TimelineEntry`, `Assessment`, `Report`.
- All tenant-owned models include `tenant_id`, `created_at`, `updated_at`, and stable UUID identifiers.

- [ ] Write schema tests for valid enum values, tenant keys, coordinate bounds, and nullable coordinate pairs.
- [ ] Run tests to confirm schema tests fail before models/migrations exist.
- [ ] Implement models, Pydantic schemas, indexes, and migration.
- [ ] Run `pytest apps/api/tests/intelligence/test_schema_constraints.py -q` and migration upgrade/downgrade.
- [ ] Commit: `feat: define intelligence domain schema`.

### Task 2: Case and event workflows

**Files:**
- Create: `apps/api/app/intelligence/repositories.py`, `services.py`, `routes.py`
- Create: `apps/api/tests/intelligence/test_cases_events.py`

**Interfaces:**
- `create_case(principal, payload) -> Case`.
- `create_event(principal, payload) -> Event`.
- `link_event_to_case(principal, case_id, event_id) -> None`.
- Routes under `/api/v1/cases` and `/api/v1/events`.

- [ ] Write tests for create/read/update, permission denial, cross-tenant access, and event-case linking.
- [ ] Run tests to verify expected failures.
- [ ] Implement repository/service/routes using tenant context and permission checks.
- [ ] Run `pytest apps/api/tests/intelligence/test_cases_events.py -q`; verify all authorization tests pass.
- [ ] Commit: `feat: add case and event workflows`.

### Task 3: Entities, locations, and source registry

**Files:**
- Create: `apps/api/app/intelligence/entity_service.py`, `source_service.py`
- Create: `apps/api/tests/intelligence/test_entities_sources.py`

**Interfaces:**
- `upsert_entity(principal, payload) -> Entity`.
- `register_source(principal, payload) -> DataSource`.
- Coordinates use WGS84 latitude/longitude ranges; null is valid when location is unknown.
- Source record contains owner/operator, terms/reference URL, allowed collection method, schedule, status, and reliability notes.

- [ ] Write tests for coordinate validation, missing coordinates, source registration, and tenant access.
- [ ] Run tests to verify failures before implementation.
- [ ] Implement entity/source services and API routes.
- [ ] Run `pytest apps/api/tests/intelligence/test_entities_sources.py -q`.
- [ ] Commit: `feat: add entity and source registry`.

### Task 4: Evidence links and analyst timelines

**Files:**
- Create: `apps/api/app/intelligence/evidence_links.py`, `timeline_service.py`
- Create: `apps/api/tests/intelligence/test_timeline_provenance.py`

**Interfaces:**
- `attach_evidence(principal, record_type, record_id, evidence_id, relationship) -> EvidenceLink`.
- `append_timeline_entry(principal, case_id, entry_type, body, source_refs, observed_at) -> TimelineEntry`.
- Timeline entry types distinguish source observation, reported claim, analyst assessment, and workflow action.

- [ ] Write tests that timeline entries preserve source refs and separate source claims from assessments.
- [ ] Run tests to verify expected failures.
- [ ] Implement evidence-link and timeline services with append-only history where applicable.
- [ ] Run `pytest apps/api/tests/intelligence/test_timeline_provenance.py -q`.
- [ ] Commit: `feat: add provenance-linked analyst timelines`.

### Task 5: Confidence, corroboration, and reports

**Files:**
- Create: `apps/api/app/intelligence/assessment_service.py`, `report_service.py`
- Create: `apps/api/tests/intelligence/test_assessments_reports.py`

**Interfaces:**
- `create_assessment(principal, case_id, judgment, confidence, rationale, supporting_refs, contradicting_refs) -> Assessment`.
- `generate_report(principal, case_id, template) -> Report`.
- Report output preserves evidence/source references, status labels, confidence rationale, and generated timestamp.

- [ ] Write tests for confidence rationale, disputed claims, no causal overstatement, and report source preservation.
- [ ] Run tests to verify failure.
- [ ] Implement assessment and report services; require explicit human authorship and approval metadata.
- [ ] Run `pytest apps/api/tests/intelligence/test_assessments_reports.py -q`.
- [ ] Commit: `feat: add analyst assessments and traceable reports`.
