# Client Dashboard — Backend and Frontend Rendering Flow

## Purpose

This document records the complete implementation flow for the paying-client
dashboard: the backend data model and APIs, the admin authoring/publishing
surface, and the frontend rendering of everything the client is allowed to
see. It is a working status document divided into chunks so implementation can
proceed one verified slice at a time.

**Status legend:** ✅ complete · 🟡 partially complete · ⬜ pending · ⚠️ external setup/verification

Source requirements: `CLIENT DASHBOARD for NPSG` client document (information
access spec) and the agreed account/access policy in
`AUTH-IMPLEMENTATION-FLOW.md` / `AUTH-FRONTEND-BACKEND-WORKFLOW.md`.

## What the client must see (own data only)

1. Sales Alignment Assessment and results.
2. Sales performance baseline measurements.
3. Agreed improvements being implemented.
4. KPI measurements and performance progress.
5. Implementation schedule and assigned responsibilities.
6. Engagement reports, recommendations, and results.

The client completes their own assessment from their dashboard. A representative
may complete it on the client's behalf **only during a live Zoom meeting** that
the Master Admin arranges (the Master Admin adds the rep and holds the meeting
with the client). There is **no standing rep-to-client assignment**. Items 2–6
are maintained by NPSG and are **read-only** for the client; only the assessment
is client-writable. Each client sees **only their own** results.

## What must never reach the client

- Internal assessment methods and scoring procedures.
- Proprietary evaluation and implementation procedures.
- Internal worksheets, instructions, implementation playbooks.
- Internal working notes and analysis.
- The complete proprietary website.
- Other clients' dashboards or information.
- Any of the above via direct links **or downloadable files**.

## Completed foundations (do not rebuild)

| Foundation                                                                                         | Status                       | Where                                                                         |
| -------------------------------------------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------- |
| Secure individual login, category match, approval gate, dual httpOnly tokens, per-request re-check | ✅                           | auth module; see auth flow docs                                               |
| Role routing: `USER` → `/dashboard` only; reps → private website; Super Admin → all                | ✅                           | `frontend/north_sales/proxy.ts`                                               |
| Crawler protection: robots, `X-Robots-Tag`, `Cache-Control: no-store`, prod Swagger off            | ✅                           | `app/layout.tsx`, `app/page.tsx`, `next.config.ts`, `app/robots.ts`           |
| Admin assessment authoring UI (list, editor, preview, publish/draft/archive)                       | 🟡 UI only                   | `components/admin/admin-assessments.tsx`, `admin-assessment-editor.tsx`       |
| Assessment persistence                                                                             | 🟡 browser localStorage only | `lib/admin-assessment-store.ts` (`north_admin_assessments_v1`)                |
| Public assessment page                                                                             | 🟡 static config, no submit  | `components/assessment/sales-alignment-assessment.tsx`, `config/site.ts`      |
| Client dashboard                                                                                   | ✅ six sections              | `components/client/client-dashboard.tsx` + `lib/client-dashboard.ts`          |
| Backend assessment module (model, migration, admin CRUD/publish, public GET, seed)                 | ✅                           | `src/modules/assessments`, `prisma/migrations/20261109000000_add_assessments` |
| Backend engagement data (baselines/KPIs/improvements/schedule/reports)                             | ✅                           | Prisma models + `src/modules/engagement` client/admin APIs (Chunk 4–5)        |

## End-to-end flow (target)

```
Super Admin / rep                      Backend (NestJS + Prisma)              Client browser
─────────────────                      ─────────────────────────              ──────────────
author assessment document  ────────►  Assessment(status, document JSON)
publish (status=Published)  ────────►  set publishedAt + revalidate tag
                                       │
                                       ├─► public lead-gen page (published only, server fetch)
                                       │
client self-starts OR admin      ────────►  AssessmentInstance(clientId, status)
creates instance for a Zoom meeting        │
enter baselines / KPIs /               │
improvements / schedule /   ────────►  client-scoped engagement tables
reports (client edition)               │
                                       │
                                       ◄────────  client login (approved, category=CLIENT)
                                       ◄────────  GET /client/dashboard  (session-scoped aggregate)
                                       ◄────────  GET /client/assessment (own instance, client edition)
                                       ◄────────  POST submit answers
                                       ────────►  score SERVER-SIDE, store result, audit completedBy
                                       ◄────────  result appears on dashboard card
Master Admin arranges Zoom + issues one-time link;
rep completes on behalf     ────────►  same instance, onBehalfOf=clientId, audit completedBy=repId
                                       ◄────────  GET /client/reports/:id/download (guarded stream)
```

## Data model (target)

All client-owned rows carry `clientId`; every client query is scoped from the
authenticated session, never from a client-supplied id.

| Model                     | Key fields                                                                                                                                                           | Notes                                                                                                                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Assessment`              | id, slug, title, status(Draft/Published/Archived), document JSON, publishedAt, updatedAt                                                                             | One row per authored assessment; `document` is the editor's whole object (sections/questions/settings/resultText)                                                                |
| `AssessmentInstance`      | id, assessmentId, clientId, status(Pending/InProgress/Completed), answers JSON, result JSON, completedBy, onBehalfOf, submittedAt, onBehalfTokenHash, tokenExpiresAt | One per client (self-started or admin-created for a Zoom meeting); result holds only client-safe output; on-behalf uses a one-time admin-issued token, not a standing assignment |
| `BaselineMetric`          | id, clientId, metricKey, label, value, unit, measuredAt, source                                                                                                      | The "before" snapshot (item 2)                                                                                                                                                   |
| `Improvement`             | id, clientId, title, description, ownerName, ownerSide(NPSG/Client), status(Agreed/InProgress/Done), targetDate, agreedAt                                            | Item 3                                                                                                                                                                           |
| `KpiMeasurement`          | id, clientId, metricKey, value, measuredAt, target                                                                                                                   | Item 4; same metricKey as baseline for delta/trend                                                                                                                               |
| `ImplementationMilestone` | id, clientId, title, startDate, dueDate, ownerName, ownerSide, status                                                                                                | Item 5                                                                                                                                                                           |
| `EngagementReport`        | id, clientId, title, type, period, publishedAt, fileKey, summary                                                                                                     | Item 6; `fileKey` points to private storage, client edition only                                                                                                                 |
| `AuditLog`                | actorId, action, targetType, targetId, clientId, at                                                                                                                  | Completion, publish, download, access decisions                                                                                                                                  |

Scoring configuration (scale bounds, weights, result bands) lives **server-side**
with the assessment document and is never sent to a client bundle. The public
lead-gen page may keep its presentational client-side scoring; client instances
must not.

## API surface (target)

Admin (`SUPER_ADMIN` only — there is no rep-to-client assignment):

- `POST/PATCH/DELETE /api/v1/admin/assessments`, `PATCH /api/v1/admin/assessments/:id/status`
- `POST /api/v1/admin/clients/:clientId/instances` (create instance for a Zoom meeting)
- `POST /api/v1/admin/instances/:id/on-behalf` (issue one-time Zoom completion link)
- CRUD `/api/v1/admin/clients/:clientId/{baselines,improvements,kpis,milestones,reports}`
- `POST /api/v1/admin/reports/:id/publish`

Client (`USER`, session-scoped, no client-supplied owner id):

- `GET /api/v1/client/dashboard` (aggregate of items 1–6, client edition)
- `GET /api/v1/client/assessment` (own instance + questions, no scoring internals)
- `POST /api/v1/client/assessment/:instanceId/submit`
- `GET /api/v1/client/reports/:id/download` (guarded stream or short-lived signed URL)

Rep on-behalf (Zoom meeting only; no standing assignment):

- `GET /api/v1/on-behalf/:token` (rep or admin session; one-time token issued by Master Admin)
- `POST /api/v1/on-behalf/:token/submit` (consumes token, audited)

Public (published only, no auth):

- `GET /api/v1/assessments/:slug` (filters `status=Published` server-side)

## Frontend rendering flow (target)

1. **Admin publish → public render.** Editor saves via API (localStorage store
   removed, same function signatures). Publish flips status and triggers
   `revalidateTag("assessment:<slug>")` / `revalidatePath`. Public page is a
   Server Component that fetches the published document and passes it as props
   to a data-driven renderer (question-type switch, progress, results).
2. **Client dashboard render.** `/dashboard` server-fetches the session-scoped
   aggregate and renders six read-only sections plus an assessment card
   (Pending → Start, Completed → score/pillars/closer-review).
3. **Client self-completion.** Card links to `/dashboard/assessment` (nested
   under `/dashboard` so the existing `USER` proxy gate allows it without
   opening a new public route). Renderer shows the client edition; submit posts
   to the session-scoped endpoint; server scores; result returns to the card.
4. **Rep on-behalf (Zoom only).** Master Admin arranges the Zoom meeting and
   issues a one-time completion link for that client's instance. During the
   meeting the rep opens the link and completes it; submit records
   `completedBy=repId`, `onBehalfOf=clientId` and consumes the token. No standing
   rep-to-client assignment exists; the client sees the same result.
5. **Reports.** List with date/type/title; view in-app or download through the
   guarded endpoint. Never placed in `public/`.
6. **Fallbacks.** Unpublished/missing document → static config fallback or a
   clean "coming soon" state; fetch failure → error boundary + retry; skeletons
   only for client-side navigation.

## Chunk 0 — Requirements and access policy ✅

- Client information-access spec reviewed and recorded (six visible items,
  six private items, four access rules).
- Confirmed: items 2–6 read-only for client; assessment writable by client or
  rep on-behalf (Zoom meeting only); confidentiality extends to direct links
  and downloads.
- Depends on: nothing.

## Chunk 1 — Assessment backend module ✅

- Prisma models `Assessment` (+ migration), JSONB document, slug, status.
- Admin CRUD + status/publish endpoints, Super Admin guarded.
- Public `GET /assessments/:slug` returning Published only.
- Seed from existing `config/admin-assessment-seeds.ts` server-side.
- Acceptance: create/edit/publish/archive via API; draft never returned publicly.
- Depends on: Chunk 0.
- **Landed:** `AssessmentStatus` enum + `Assessment` model (`assessments` table,
  migration `20261109000000_add_assessments`); `src/modules/assessments` (admin
  controller guarded by `JwtAuthGuard` + `SuperAdminGuard`, public controller,
  services, validated DTOs); idempotent server-side seed (`prisma/assessments-seed.ts`,
  10 assessments ported from the frontend config). Verified end-to-end: admin
  create/edit/publish/archive/delete, duplicate-slug 409, invalid-document 400,
  public 200 for Published and 404 for Draft/Archived, 401 without auth.

## Chunk 2 — Admin authoring wired to API ✅

- Replace `lib/admin-assessment-store.ts` localStorage bodies with API calls,
  keeping exported signatures so editor/list components stay unchanged (housed in `lib/admin-assessments.ts`).
- Publish action triggers on-demand revalidation via `revalidateAssessment` action.
- Remove `window.localStorage` usage (SSR-safe, shared across admins/devices).
- Acceptance: two browsers/admins see the same data; publish reaches public page.
- Depends on: Chunk 1.
- **Landed:** Admin authoring fully API-backed (`lib/admin-assessments.ts`), debounced auto-save with serialized queue (`saveChainRef`), and Next.js cache revalidation triggers on publish and save.

## Chunk 3 — Public published-assessment rendering ✅

- Convert `/sales-alignment-assessment` page to async Server Component fetching
  the published document; pass as props.
- Data-driven renderer: sections/questions by type, progress, results, retake.
- Add `slug`/public-path mapping; keep existing URL (`/sales-alignment-assessment` <-> `sales-alignment`).
- Keep the page **private** (reps + Super Admin only, per confirmed decision).
  The client-facing version is a client-scoped instance at `/dashboard/assessment`,
  not this URL; do not add it to `PUBLIC_PATHS`.
- Acceptance: publish → public renders immediately; draft → fallback/404.
- Depends on: Chunks 1–2.
- **Landed:** Server Component in `app/(main)/sales-alignment-assessment/page.tsx` guarded by `requireRepresentative()`; tag-cached server-side fetcher & path mapping in `lib/published-assessments.ts`; data-driven renderer supporting all question types (`scale`, `five-point-scale`, `yes-no`, `multiple-choice`, `short-answer`), section averages, overall scores, closer review, retake, and clean draft/unavailable fallback.

## Chunk 4 — Client engagement data model ✅

- Prisma models + migration: `BaselineMetric`, `Improvement`, `KpiMeasurement`,
  `ImplementationMilestone`, `EngagementReport`, `AuditLog`.
- All carry `clientId`; private storage bucket/prefix for report files.
- Acceptance: migration applies; constraints enforce ownership and statuses.
- Depends on: Chunk 0.

## Chunk 5 — Client-scoped read/write APIs ✅

- `GET /client/dashboard` aggregate; per-section client endpoints.
- Admin CRUD for items 2–6 under `/admin/clients/:clientId/...`.
- Every client query derived from session; reject client-supplied owner ids.
- Acceptance: client A cannot read client B by URL/body/query/storage tampering.
- Depends on: Chunk 4.
- **Landed:** `ClientEngagementController` (`JwtAuthGuard` + `ClientUserGuard`)
  scopes all reads from `user.id`; admin CRUD under
  `admin/clients/:clientId/{baselines,improvements,kpis,milestones,reports}` with
  `SuperAdminGuard`; `POST admin/reports/:id/publish`; create DTOs no longer accept
  body `clientId` (`forbidNonWhitelisted`); legacy `/engagement/*` + `x-client-id`
  routes removed; mutations write `AuditLog` (incl. `PUBLISH`); client report reads
  are published-only; `assessment: null` reserved on the aggregate until Chunk 7.
  Migration `20261112120000_chunk5_report_publish_audit` makes `publishedAt`
  nullable and adds `AuditAction.PUBLISH`.

## Chunk 6 — Client dashboard UI (six sections) ✅

- Replace stub with real dashboard: assessment card + baseline table +
  improvements list + KPI cards/trend + schedule table + reports list.
- Read-only for client; empty/loading/error states; mobile + desktop.
- Acceptance: all six sections render own data only; no internal fields leak.
- Depends on: Chunk 5.
- **Landed:** `/dashboard` server-fetches `GET /client/dashboard` via
  `lib/client-dashboard.ts` and renders six read-only sections in
  `components/client/client-dashboard.tsx`. Assessment card shows pending until
  Chunk 7; reports list omits `fileKey` (downloads in Chunk 8); empty + error +
  retry states included.

## Chunk 7 — Assessment instance + completion flow ✅

- `AssessmentInstance` model; client self-start plus admin-created instance for
  a Zoom meeting.
- `/dashboard/assessment` renderer (client edition, no scoring internals).
- Session-scoped submit; **server-side scoring**; result stored; card updates.
- Rep on-behalf submit via the Master Admin's one-time Zoom link (token check,
  no standing assignment) + `completedBy`/`onBehalfOf` audit.
- Acceptance: client completes end-to-end; rep completes on behalf; result
  identical shape; scoring config never in client payload/bundle.
- Depends on: Chunks 1, 4, 5, 6.
- **Landed:** Prisma `AssessmentInstance` + migration
  `20261112140000_chunk7_assessment_instances`; server scorer
  (`assessment-scoring.service.ts`); client APIs
  `GET/POST /client/assessment` + submit; admin
  `POST /admin/clients/:clientId/instances` and
  `POST /admin/instances/:id/on-behalf`; on-behalf
  `GET/POST /on-behalf/:token` (rep or Super Admin); dashboard aggregate
  includes assessment summary; UI at `/dashboard/assessment` + card CTA;
  proxy allows `/dashboard/*` for USER.

## Chunk 8 — Reports and guarded downloads ✅

- Upload client-edition report to private storage; metadata in `EngagementReport`.
- Guarded download: authenticated stream or short-lived signed URL; audit log.
- In-app view + download; never `public/`; no internal edition reachable.
- Acceptance: anonymous/other-client direct link denied; owner downloads work.
- Depends on: Chunks 4–6.
- **Landed:** private local storage (`ReportStorageService`,
  `REPORTS_UPLOAD_DIR` / `storage/client-reports`); admin multipart
  `POST /admin/clients/:clientId/reports/upload`; client
  `GET /client/reports/:id` + guarded
  `GET /client/reports/:id/download` (session owner + published only,
  `StreamableFile`, `AuditAction.DOWNLOAD`); `fileKey` stripped from client
  payloads; dashboard reports list has View summary + Download.

## Chunk 9 — Admin entry surface for items 2–6 ✅

- Admin/rep forms and lists for baselines, improvements, KPIs, milestones,
  reports (create/edit/delete, status transitions, publish report).
- Optimistic updates, detail drawer, undo on destructive actions.
- Acceptance: entered data appears on the correct client dashboard only.
- Depends on: Chunks 5, 8.
- **Landed:** Super Admin UI at `/engagement`
  (`components/admin/admin-client-engagement.tsx` + `lib/admin-engagement.ts`).
  Approved-client picker; tabs for baselines / improvements / KPIs / schedule /
  reports; create + status transitions + optimistic delete with Undo; report
  multipart upload + publish. Sidebar link added. (Reps remain website-only per
  confirmed policy — this surface is Super Admin.)

## Chunk 10 — Permissions and audit ✅

- Reps get the **private website only**; internal playbooks/worksheets and
  authoring stay **Super Admin-only** (no rep-to-client assignment exists).
  Enforce on internal-material and admin endpoints.
- Audit log for publish, completion, on-behalf, download, access decisions.
- Acceptance: rep denied internal materials; audit trail complete.
- Depends on: Chunks 5, 7, 8.
- **Landed:** Shared `AuditService` (`common/audit`); `AuditAction` extended with
  `ON_BEHALF`, `ACCESS_ALLOW`, `ACCESS_DENY` (migration
  `20261112200000_chunk10_audit_actions`). Role guards write `ACCESS_DENY` when
  an authenticated non-privileged actor hits Super Admin / client / on-behalf
  routes. Assessment + report **publish**, instance **complete**, on-behalf
  token issue (`ON_BEHALF`), guarded **download** (+ deny), and client access
  approve/reject/revoke/restore + unapproved login denials are audited.
  Published assessment API returns **client-edition** document only. Admin
  trail query: `GET /api/v1/admin/audit-logs`. Frontend proxy +
  `requireSuperAdmin` already keep reps off authoring surfaces.

## Chunk 11 — Routing, SEO and origin hardening ✅

- Client assessment nested under `/dashboard` (no new public route).
- `/sales-alignment-assessment` stays **private** (reps + Super Admin only);
  keep it out of `PUBLIC_PATHS` and align `protected-routes`/robots.
- Add apex origin to backend CORS allowlist or force apex→www consistently.
- Acceptance: intended audience reaches intended pages; no silent CORS failures.
- Depends on: Chunks 3, 6, 7.
- **Landed:** Client assessment remains `/dashboard/assessment` only; proxy
  compile-time guard keeps `/sales-alignment-assessment` out of `PUBLIC_PATHS`.
  `protected-routes` + `robots.ts` + `next.config` `X-Robots-Tag`/`no-store`
  cover exact and nested private paths (incl. on-behalf, assessment-results,
  appointment token links). Backend `resolveAllowedOrigins` auto-expands
  apex↔www for CORS + cookie Origin checks; optional frontend
  `CANONICAL_HOST` permanent redirect for host canonicalization.

## Chunk 12 — Operational setup and verification ⚠️

- Apply migrations before deploy; configure private storage + env per environment.
- Verify prod: publish→render, client isolation, guarded downloads, on-behalf.
- Real-device responsive pass; console clean; repeated-interaction stability.
- Depends on: all prior chunks.

## Confirmed decisions (client response)

1. **`/sales-alignment-assessment` stays private** — reps + Super Admin only.
   The client completes a client-scoped instance at `/dashboard/assessment`,
   not this URL. It is not added to `PUBLIC_PATHS`.
2. **No rep-to-client assignment exists.** A rep may complete a client's
   assessment **only during a live Zoom meeting** that the Master Admin
   arranges (Master Admin adds the rep and holds the meeting with the client).
   The Master Admin issues a **one-time completion link** for that client's
   instance; the rep opens it in the meeting and submits. There is no standing
   assignment table or endpoint.
3. **Client self-completion.** The client can complete their own assessment
   from their dashboard instance. Both paths (self-start and admin-created for
   Zoom) write to the same per-client instance.
4. **Own results only.** Each client sees **only their own** assessment results
   and engagement data; no cross-client access.
5. **Items 2–6 are maintained by NPSG (Super Admin)** and are **read-only** for
   the client; only the assessment is client-writable.
6. **Reps = private website only.** No admin panel, no playbook/worksheet
   access; internal materials and authoring remain Super Admin-only.

## Open decisions still to confirm

1. Reports: in-app view, PDF download, or both?
2. Client history: all past assessments/retakes or latest only?
3. Improvement status workflow: who marks Agreed / InProgress / Done?

## Post–Chunk 10 UI follow-ups ✅

- Zoom on-behalf completion page: `/on-behalf/[token]` (rep or Super Admin;
  proxy + `requireRepresentative`; login `?next=` return).
- Admin completed results + Zoom tools: `/assessment-results` (list instances,
  view client-safe scores, create instance, issue/copy one-time link).
- Admin APIs: `GET /admin/clients/:clientId/instances`,
  `GET /admin/instances/:id`; on-behalf issue returns frontend `path`.

## Current next steps

1. Confirm the three remaining open decisions (working defaults: reports in-app
   - guarded PDF; latest result + history list; Super Admin sets improvement
     statuses). All access/assignment decisions above are confirmed.
2. Chunks 1–11 (+ follow-up UI) have landed; next is Chunk 12 (operational
   setup and verification).
3. Proceed chunk-by-chunk; keep migrations applied before verifying.
