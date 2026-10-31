# Analyst Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the analyst-facing dashboard, map, investigation workspace, evidence viewer, review queue, and source-linked reporting experience.

**Architecture:** Next.js pages consume typed API contracts and never make authorization decisions client-side. Server APIs enforce access. Map layers render only validated coordinates and clearly label uncertain or synthetic records.

**Tech Stack:** Next.js, TypeScript, React, accessible component library, MapLibre GL JS, TanStack Query, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-31-sentinel-fusion-1-0.md`

## Global Constraints
- Client UI is not an authorization boundary; backend enforces all access.
- Missing coordinates are not plotted at 0,0.
- Display source status, verification status, confidence, and provenance.
- Distinguish observations, reported claims, and analyst assessments.
- Synthetic/test data is visibly labeled.
- Support keyboard navigation, semantic controls, and readable contrast.

## Review Focus
- Empty case or source list: helpful empty state, not fake data; test.
- API error/timeout: actionable non-sensitive error state; test.
- Long titles/source URLs: layout remains usable; test.
- Missing geometry: record remains in list/timeline but not map; test.
- Low-confidence/disputed event: uncertainty is visually explicit; test.

---

### Task 1: UI foundation and typed API client

**Files:**
- Create: `apps/web/src/lib/api/client.ts`, `contracts.ts`
- Create: `apps/web/src/components/layout/AppShell.tsx`
- Create: `apps/web/src/app/(workspace)/layout.tsx`
- Create: `apps/web/src/lib/api/client.test.ts`

**Interfaces:**
- `apiRequest<T>(path: string, options?: RequestOptions): Promise<T>`.
- Typed contracts mirror backend schemas; no duplicated ad hoc shapes.

- [ ] Write client tests for success, 401, 403, timeout, and malformed response.
- [ ] Run Vitest and verify failures before implementation.
- [ ] Implement typed client and authenticated app shell.
- [ ] Run `pnpm test && pnpm lint && pnpm typecheck`.
- [ ] Commit: `feat: add authenticated analyst app shell`.

### Task 2: Intelligence dashboard and source health

**Files:**
- Create: `apps/web/src/app/(workspace)/dashboard/page.tsx`
- Create: `apps/web/src/features/dashboard/*`
- Create: `apps/web/src/features/sources/*`
- Create: `apps/web/src/features/dashboard/dashboard.test.tsx`

**Interfaces:**
- Dashboard query returns counts, recent events, review queue summary, and source health.
- Every displayed metric is API-derived and time-bounded.

- [ ] Write tests for empty state, degraded source warning, and API failure.
- [ ] Run tests to verify failure.
- [ ] Implement dashboard cards and source-health view with explicit last-updated timestamps.
- [ ] Run dashboard tests and accessibility checks.
- [ ] Commit: `feat: add intelligence dashboard and source health`.

### Task 3: Geospatial intelligence map

**Files:**
- Create: `apps/web/src/features/map/IntelligenceMap.tsx`, `map-data.ts`
- Create: `apps/web/src/features/map/map-data.test.ts`

**Interfaces:**
- `toMapFeature(record: GeoRecord) -> Feature | null`.
- A feature is emitted only when both coordinates exist and pass WGS84 bounds.
- Popups show event status, source, observed time, and confidence.

- [ ] Write tests proving null, partial, out-of-range, and 0,0 coordinates are handled according to record validity rather than treated as missing by assumption.
- [ ] Run tests to verify failure.
- [ ] Implement MapLibre layer and feature conversion.
- [ ] Run map tests and browser test for popup keyboard access.
- [ ] Commit: `feat: add provenance-aware geospatial map`.

### Task 4: Investigation workspace and evidence review

**Files:**
- Create: `apps/web/src/app/(workspace)/cases/[caseId]/page.tsx`
- Create: `apps/web/src/features/cases/*`
- Create: `apps/web/src/features/evidence/*`
- Create: `apps/web/src/features/cases/case-workspace.test.tsx`

**Interfaces:**
- Case view composes events, entities, timeline, assessments, evidence references, and audit history.
- Evidence bytes are retrieved through short-lived authorized server-mediated access only.

- [ ] Write tests for unauthorized evidence, missing source, disputed claims, and empty timeline.
- [ ] Run tests to verify failure.
- [ ] Implement workspace and evidence viewer with visible provenance metadata.
- [ ] Run tests and Playwright case workflow.
- [ ] Commit: `feat: add investigation and evidence workspace`.

### Task 5: Review queue and source-linked reports

**Files:**
- Create: `apps/web/src/app/(workspace)/review/page.tsx`
- Create: `apps/web/src/features/reports/*`
- Create: `apps/web/src/features/review/*`
- Create: `apps/web/tests/e2e/analyst-report.spec.ts`

**Interfaces:**
- Review actions require explicit user confirmation and server-side permission.
- Report export includes source references, confidence rationale, verification state, and generation time.

- [ ] Write tests for permission-gated approval, report citations, and disputed-status preservation.
- [ ] Run tests to verify failure.
- [ ] Implement review queue and report preview/export.
- [ ] Run full Playwright analyst workflow and accessibility checks.
- [ ] Commit: `feat: add analyst review and source-linked reporting`.
