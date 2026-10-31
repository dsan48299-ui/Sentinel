# Foundation and Security Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a tested monorepo foundation and secure identity, authorization, tenant isolation, audit, and evidence-storage boundaries.

**Architecture:** A pnpm-managed Next.js app and Python FastAPI services share versioned API contracts. PostgreSQL/PostGIS is the system of record; local development uses Docker Compose, while Azure deployment is described as code. Identity and storage adapters keep hosted Azure dependencies out of domain logic.

**Tech Stack:** Python 3.12+, FastAPI, Pydantic, SQLAlchemy 2, Alembic, PostgreSQL/PostGIS, pytest, Next.js, TypeScript, pnpm, Vitest, Playwright, Docker, GitHub Actions, Azure Bicep.

**Spec:** `docs/superpowers/specs/2026-10-31-sentinel-fusion-1-0.md`

## Global Constraints
- Use least privilege and server-enforced authorization.
- Enforce tenant isolation on every tenant-scoped read and write.
- Keep secrets out of source code and committed environment files.
- Keep evidence objects private and retrieval authorized.
- Audit writes must originate from trusted server-side services.
- Use synthetic/test data only for fixtures and label it explicitly.
- Do not claim FedRAMP, ATO, CUI authorization, FIPS validation, or certification.

## Review Focus
- Missing or malformed tenant context: deny by default; test every repository boundary.
- Cross-tenant object identifiers: return no data and do not reveal object existence.
- Expired, absent, or invalid identity: reject protected requests.
- Oversized, malformed, or content-type-mismatched evidence: reject before persistence.
- Audit storage outage: fail closed for actions requiring an audit record; test transaction behavior.

---

### Task 1: Monorepo and developer environment

**Files:**
- Create: `apps/api/pyproject.toml`, `apps/api/app/main.py`
- Create: `apps/web/package.json`, `apps/web/src/app/page.tsx`
- Create: `services/ingestion/pyproject.toml`
- Create: `packages/shared/README.md`
- Create: `docker-compose.yml`, `.env.example`, `.gitignore`
- Create: `.github/workflows/ci.yml`, `docs/architecture/system-overview.md`

**Interfaces:**
- API exposes `GET /health/live` and `GET /health/ready`.
- Web app exposes a minimal Sentinel Fusion landing/dashboard shell.
- Local PostgreSQL service is named `db`; database name `sentinel`.

- [ ] Write API health tests asserting live returns 200 and ready returns 503 when DB is unavailable.
- [ ] Run `cd apps/api && pytest -q`; verify the readiness test fails before implementation.
- [ ] Implement FastAPI app factory, settings validation, and health endpoints.
- [ ] Add web shell and ingestion package skeleton with pinned runtime/tool versions.
- [ ] Add Docker Compose Postgres/PostGIS and non-secret example configuration.
- [ ] Add CI jobs for API lint/tests and web lint/typecheck/tests.
- [ ] Run `docker compose config`, `cd apps/api && pytest -q`, and `cd apps/web && pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck`; all must pass.
- [ ] Commit: `chore: establish Sentinel monorepo foundation`.

### Task 2: Database and migration baseline

**Files:**
- Create: `apps/api/app/db/session.py`, `apps/api/app/db/base.py`
- Create: `apps/api/alembic.ini`, `apps/api/migrations/env.py`
- Create: `apps/api/tests/db/test_migrations.py`

**Interfaces:**
- `get_session() -> Iterator[Session]` yields and closes a SQLAlchemy session.
- Alembic migrations run from `apps/api`.

- [ ] Write migration smoke test that upgrades an empty database to head and verifies PostGIS extension availability.
- [ ] Run the test and verify failure on the empty scaffold.
- [ ] Implement SQLAlchemy engine/session configuration and Alembic baseline migration.
- [ ] Run `cd apps/api && pytest tests/db/test_migrations.py -q`; verify upgrade and downgrade behavior.
- [ ] Commit: `feat: add PostgreSQL and PostGIS migration baseline`.

### Task 3: Identity and authorization contracts

**Files:**
- Create: `apps/api/app/auth/principal.py`, `apps/api/app/auth/dependencies.py`
- Create: `apps/api/app/auth/policies.py`
- Create: `apps/api/tests/auth/test_authentication.py`, `test_authorization.py`

**Interfaces:**
- `Principal(user_id: UUID, tenant_id: UUID, roles: frozenset[str])`.
- `get_current_principal(request) -> Principal` validates the configured identity token.
- `require_permission(permission: str)` is a FastAPI dependency; missing identity or permission is denied.
- Hosted identity adapter validates Microsoft Entra issuer, audience, signature, expiry, and tenant claims; local test identity is disabled outside test configuration.

- [ ] Write tests for missing token, invalid signature, expired token, wrong audience, and missing permission.
- [ ] Run auth tests and verify they fail before the adapter/policy exists.
- [ ] Implement token validation and permission dependency with deny-by-default behavior.
- [ ] Run `pytest apps/api/tests/auth -q`; all negative cases must return 401/403 as specified.
- [ ] Commit: `feat: add verified identity and permission policies`.

### Task 4: Tenant-scoped persistence

**Files:**
- Create: `apps/api/app/db/tenant.py`, `apps/api/app/repositories/base.py`
- Create: `apps/api/tests/security/test_tenant_isolation.py`

**Interfaces:**
- `TenantContext(tenant_id: UUID)`.
- Every tenant-owned repository method requires tenant context as an explicit argument.
- No API route may accept tenant identity from an untrusted request body as authority.

- [ ] Write tests proving tenant A cannot read, update, or delete tenant B records, including guessed UUIDs.
- [ ] Run tests and verify cross-tenant cases fail against the initial repository scaffold.
- [ ] Implement tenant-filtered repository base and database constraints where appropriate.
- [ ] Run `pytest apps/api/tests/security/test_tenant_isolation.py -q`; verify no cross-tenant leakage.
- [ ] Commit: `feat: enforce tenant-scoped data access`.

### Task 5: Append-only audit and private evidence foundation

**Files:**
- Create: `apps/api/app/audit/models.py`, `apps/api/app/audit/service.py`
- Create: `apps/api/app/evidence/models.py`, `apps/api/app/evidence/service.py`
- Create: `apps/api/app/storage/interface.py`, `apps/api/app/storage/local_private.py`
- Create: `apps/api/tests/security/test_audit_integrity.py`, `test_evidence_access.py`

**Interfaces:**
- `record_audit_event(actor: Principal, action: str, resource_type: str, resource_id: str, payload: dict) -> AuditEvent`.
- `store_evidence(actor: Principal, tenant_id: UUID, stream, metadata: EvidenceMetadata) -> EvidenceRecord`.
- `verify_evidence(evidence_id: UUID, tenant_id: UUID) -> IntegrityResult`.
- Evidence metadata stores SHA-256, byte size, media type, capture time, source reference, and tenant ID. Blob access is never public.

- [ ] Write tests for hash verification, tamper detection, tenant-bound retrieval, denied anonymous access, and audit append-only behavior.
- [ ] Run tests and verify expected failures before implementing services.
- [ ] Implement transactional audit-chain writes and private storage adapter; use a per-tenant serialized chain or database locking to prevent concurrent chain forks.
- [ ] Run `pytest apps/api/tests/security -q`; verify tampering and unauthorized reads are rejected.
- [ ] Commit: `feat: add tamper-evident audit and private evidence storage`.

### Task 6: Security CI and operational baseline

**Files:**
- Modify: `.github/workflows/ci.yml`
- Create: `docs/security/threat-model.md`, `docs/operations/backup-restore.md`
- Create: `apps/api/tests/security/test_security_headers.py`

**Interfaces:**
- CI runs dependency audit, secret scanning, static checks, and test suites.
- API security headers and safe error responses are configured centrally.

- [ ] Write tests for safe error serialization and required security headers.
- [ ] Run tests and verify failure before middleware is added.
- [ ] Implement security middleware, dependency scanning, and secret scanning workflow steps.
- [ ] Document trust boundaries, assets, threats, backup schedule, restore procedure, and recovery verification.
- [ ] Run full CI locally and perform a documented database restore exercise.
- [ ] Commit: `chore: add security gates and recovery documentation`.
