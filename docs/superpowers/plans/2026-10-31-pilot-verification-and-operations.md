# Pilot Verification and Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the first controlled commercial pilot deployable, observable, recoverable, and testable without representing it as government-authorized.

**Architecture:** Azure infrastructure is provisioned from reviewed IaC. CI/CD promotes immutable builds through environments. Operational runbooks, security evidence, recovery tests, and pilot acceptance checks are required before external use.

**Tech Stack:** Azure Bicep, Azure Container Apps or App Service (choose after deployment spike), Azure Database for PostgreSQL, Blob Storage, Key Vault, Entra ID, Azure Monitor, GitHub Actions, pytest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-31-sentinel-fusion-1-0.md`

## Global Constraints
- Do not claim FedRAMP, ATO, CUI authorization, FIPS validation, certification, or government readiness without applicable evidence.
- Keep production secrets in Key Vault or managed identity-backed configuration.
- Separate development, test, and production resources and data.
- Require human review for analyst approvals and consequential workflows.
- Record deployment, access, security, and recovery events.
- Backups must be restored and verified, not merely configured.

## Review Focus
- Partial infrastructure deployment: safe rerun/rollback; test idempotent IaC.
- Secret/configuration missing: deployment fails safely; test startup validation.
- Database restore mismatch: verify schema and record counts; exercise restore.
- Monitoring blind spot: alert on failed ingestion, elevated errors, and auth anomalies; test alert rules.
- Unreviewed build: block production promotion; test branch protection and CI conditions.

---

### Task 1: Deployment target and environment configuration

**Files:**
- Create: `infrastructure/azure/main.bicep`, `parameters/dev.bicepparam`
- Create: `docs/architecture/deployment-decision.md`
- Create: `docs/operations/environment-configuration.md`

**Interfaces:**
- Provision network boundary, app hosting, PostgreSQL, private blob storage, Key Vault, monitoring.
- Select Azure Container Apps or App Service after documenting operational fit, cost, networking, and worker requirements.

- [ ] Write a deployment validation script/test that checks required resources and secure defaults.
- [ ] Run it against an empty test subscription/config and verify it fails with actionable missing-resource output.
- [ ] Implement minimal Bicep modules and parameter validation.
- [ ] Run `az bicep build` and `az deployment group what-if`; review all planned changes before deployment.
- [ ] Commit: `infra: define secure pilot environment`.

### Task 2: CI/CD promotion gates

**Files:**
- Modify: `.github/workflows/ci.yml`
- Create: `.github/workflows/deploy.yml`
- Create: `docs/operations/release-process.md`

**Interfaces:**
- CI runs tests, lint/type checks, dependency and secret scanning, container scanning, and artifact build.
- Production deployment requires protected branch, successful checks, and explicit environment approval.

- [ ] Write workflow validation tests for branch/ref and environment protection rules.
- [ ] Verify test fails against current workflow.
- [ ] Implement immutable artifact build and gated deployment workflow using OIDC rather than stored long-lived Azure credentials.
- [ ] Validate workflow YAML and run CI on a test branch.
- [ ] Commit: `ci: add gated Azure deployment pipeline`.

### Task 3: Observability and operational alerts

**Files:**
- Create: `infrastructure/azure/monitoring.bicep`
- Create: `apps/api/app/observability/*`
- Create: `docs/operations/monitoring-alerts.md`

**Interfaces:**
- Track request latency/error rate, authentication failures, ingestion outcomes, source freshness, worker failures, and database health.
- Avoid logging secrets, raw sensitive evidence, or unnecessary personal data.

- [ ] Write tests for structured log redaction and health metrics.
- [ ] Run tests to verify failure.
- [ ] Implement instrumentation, dashboards, and alert rules.
- [ ] Verify test alerts in non-production environment.
- [ ] Commit: `feat: add operational telemetry and alerting`.

### Task 4: Recovery and security verification

**Files:**
- Create: `tests/acceptance/test_pilot_acceptance.py`
- Create: `docs/security/security-assessment.md`
- Modify: `docs/operations/backup-restore.md`

**Interfaces:**
- Acceptance suite verifies all 12 specification criteria.
- Recovery runbook includes RPO/RTO targets selected and approved before pilot.
- Security assessment records scope, findings, mitigations, owners, and residual risks.

- [ ] Write acceptance tests for auth, tenant isolation, cases/evidence, ingestion provenance, geospatial correctness, reporting, audit integrity, and backup restore.
- [ ] Run tests and capture baseline failures.
- [ ] Implement missing acceptance checks and resolve critical/high findings before pilot.
- [ ] Execute restore exercise and document measured recovery time and data integrity.
- [ ] Commit: `test: verify pilot security and operational readiness`.

### Task 5: Controlled pilot release

**Files:**
- Create: `docs/operations/pilot-runbook.md`, `docs/operations/known-limitations.md`
- Create: `docs/security/data-source-approval-register.md`

**Interfaces:**
- Pilot checklist includes named owner, approved users, permitted sources, retention, support contact, incident escalation, and rollback criteria.
- Every source is reviewed for ownership, terms, collection method, rate limits, and data handling.

- [ ] Write a pilot checklist test requiring source approval and documented user roles before activation.
- [ ] Verify it blocks an unapproved source and missing owner.
- [ ] Implement source approval register and operational runbook.
- [ ] Conduct tabletop incident and rollback exercises; record outcomes.
- [ ] Commit: `docs: prepare controlled pilot operations`.
