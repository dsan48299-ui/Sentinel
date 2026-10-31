# Sentinel Fusion 1.0 Product Design Specification

**Status:** Approved product direction; implementation details remain subject to plan review.
**Product position:** Unified Intelligence, Operational Risk & Decision Support.
**Initial release:** Commercial pilot for maritime intelligence, port operations, and critical-infrastructure risk.

## Product outcomes
Sentinel Fusion helps authorized analysts collect, assess, correlate, and communicate operational risk information with traceable evidence and human review. It is decision support, not an autonomous command or targeting system.

## Initial workflows
1. Monitor authorized open-source maritime, port, weather, earthquake, and disruption sources.
2. Normalize and validate incoming records; preserve source provenance and collection health.
3. Correlate events, entities, locations, and infrastructure dependencies without presenting correlation as causation.
4. Support analyst investigations, evidence review, timelines, assessments, and source-linked reports.
5. Present geospatial information accurately; preserve missing coordinates rather than substituting zeroes.
6. Route alerts and assessments through human review.

## Approved architecture direction
- Azure-first deployment.
- Python and FastAPI backend.
- Next.js and TypeScript frontend.
- PostgreSQL with PostGIS; Azure Database for PostgreSQL in hosted environments.
- Azure Blob Storage for private evidence objects.
- Azure Functions or a separately deployed worker for ingestion.
- Microsoft Entra ID for hosted identity.
- Azure Key Vault for secrets.
- Azure Monitor and Application Insights for observability.
- GitHub-based CI/CD.
- Azure Bicep or Terraform for infrastructure as code; select one in the foundation plan.
- Monorepo structure.

## Monorepo layout
```text
sentinel/
├── apps/
│   ├── web/
│   └── api/
├── services/
│   └── ingestion/
├── infrastructure/
│   └── azure/
├── packages/
│   └── shared/
├── docs/
│   ├── architecture/
│   ├── security/
│   ├── operations/
│   └── superpowers/
│       ├── specs/
│       └── plans/
└── tests/
```

## First-release capabilities
### Intelligence dashboard
Operational overview, events, geographic risk visualization, source health, analyst alerts/review queues, and search.

### Maritime and port intelligence
Authorized open-source feed ingestion, vessel/port-related data, event monitoring, geospatial correlation, port/logistics risk indicators, and timelines with provenance.

### Critical-infrastructure risk
Public alerts, weather, earthquakes, disruptions, infrastructure/logistics dependencies, and risk summaries.

### Evidence and provenance
Preserve original source/URL, collection and publication timestamps, collection method, record/document reference, verification status, analyst notes, confidence level and reasons. Evidence objects remain private; integrity is independently verifiable. Audit records use trusted server-side writes and tamper-evident design.

### Analyst workspace
Investigations, links among events/entities/sources/evidence, timelines, assessments, source-linked reports, and review/approval history.

### Defensive security and resilience
Authorized vulnerability/security monitoring integrations, triage, resilience assessments, and human-reviewed incident workflows. No autonomous security actions or operational targeting decisions in release 1.

## Data integrity and analytical rules
- Verification states: Unverified, Reported, Corroborated, Verified, Disputed, Rejected, Synthetic/test data.
- Distinguish source reliability from analytical confidence.
- Missing coordinates remain missing; never silently convert them to 0,0.
- Correlation is not causation; show supporting sources and uncertainty.
- Separate observed facts, source claims, and analyst assessments.
- Do not promote synthetic/demo records to real intelligence.

## Initial data domains
Users/organizations; roles/permissions; cases/investigations; events/incidents; entities/geospatial locations; data sources/ingestion jobs; evidence/provenance; timelines/analyst assessments; audit events; reports; alerts/review queues.

## Security and privacy requirements
- Least privilege and server-enforced authorization.
- Tenant isolation on every tenant-scoped read and write.
- Secure authentication/session handling.
- Private evidence storage and controlled retrieval.
- Encryption in transit and at rest.
- Secrets external to source code.
- Append-only audit architecture with trusted server-side writes.
- Input validation and safe error responses.
- Dependency and vulnerability scanning.
- Automated authorization and security tests.
- Documented incident response, backup, and recovery.
- Use lawful, authorized data sources and respect provider terms and privacy obligations.

## Government/defense readiness boundary
Government compliance is a separate evidence-driven workstream. Do not claim FedRAMP, an Authority to Operate (ATO), CUI authorization, FIPS validation, certification, or government readiness unless the exact system, services, data scope, controls, assessment, and authorization support that claim. Cloud-provider authorization does not authorize this application.

## Acceptance criteria
1. Authentication and authorized access work.
2. Backend enforces role and tenant boundaries.
3. Analysts create cases and associate events, sources, and evidence.
4. Authorized feeds ingest with provenance and source-health visibility.
5. Geospatial rendering is correct and does not fabricate coordinates.
6. Timelines distinguish source facts from analyst assessments.
7. Reports preserve source references and confidence explanations.
8. Evidence integrity can be independently checked.
9. Audit events are written by trusted server-side services.
10. Automated tests cover critical security and workflows.
11. Backup and restore are tested.
12. Deployment and operations documentation exists.

## Delivery sequence
1. Foundation: repository structure, app skeletons, database, migrations, configuration, CI, tests.
2. Identity/security: authentication, authorization, tenant boundaries, audit architecture, secure evidence handling.
3. Intelligence core: cases, events, entities, sources, timelines, evidence, analyst workflows.
4. Ingestion: source registry, scheduled collection, validation, provenance, deduplication, source-health monitoring.
5. UX: dashboard, interactive map, investigation workspace, evidence viewer, reporting.
6. Pilot verification: security/operational tests, recovery exercises, documentation, controlled evaluation.

## Non-goals for release 1
Autonomous intervention, automated targeting, covert access, unauthorized surveillance, unapproved data acquisition, and claims of government authorization or certification.
