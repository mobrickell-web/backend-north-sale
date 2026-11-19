# Priority 2 + CRM — Chunked Frontend & Backend Flow

**Source requirements**

1. `CLIENT-REQUIREMENTS-REVIEW-TWO-DOCUMENTS.md` (internal review of the two client instruction docs)
2. Client Doc A — Executive Account Development Specialist CRM
3. Client Doc B — Priority 2 Assessment + Prospect / Client dashboards

**Purpose:** Split the agreed work into **buildable chunks**, with **backend** and **frontend** ownership clear for each chunk.  
**Status of this file:** Planning doc — decisions below are **client-confirmed** (2026-11-16 / 17 / 18 / 19).  
**Last updated:** 2026-11-19

**Status legend:** ⬜ pending · 🟡 in progress · ✅ done · ⏸️ deferred (client said not now) · 🔒 decision locked

**Workstream A baseline (A1–A6):** ✅ **Complete** (2026-11-18) — lead CRM + Admin assign + duplicates/CSV + website booking pending queue.  
**Workstream A EADS alignment (A7–A11):** ✅ **Done** (naming, statuses, dispositions, multi-contact, assignment/list polish).  
**Workstream A gap fill (A12–A14):** ✅ **Complete** — company fields, appointment completed, Do Not Contact. **Next: Workstream B.**

---

## How to use this document

- Work **Workstream A (CRM) first**, then **Workstream B (Assessment / client dashboard)** — **client confirmed**.
- Inside a workstream, ship chunks **in order** unless marked _parallel-safe_ or _deferred_.
- Each chunk lists: **Goal**, **Backend**, **Frontend**, **Done when**, **Depends on**.

---

## Client decisions locked (2026-11-16/17)

| #   | Topic                                   | Client answer                                                                                                                                                                                                                                                                                                                             | Build impact                            |
| --- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| 1   | Implementation Specialist role          | Term only for now. Can use **client** and **sales rep** credentials to see those dashboards. **No new role / no specialist assignment system now.** Not priority.                                                                                                                                                                         | **B1 specialist work → deferred**       |
| 2   | Staff assessment after Submit           | Admin or Sales Rep fills assessment in a meeting → **Submit** → system **auto-creates client dashboard** → staff is **redirected to that client dashboard** showing **assessment results** (other features locked).                                                                                                                       | **B2–B4 + post-submit redirect**        |
| 3   | CRM Upcoming Appointments               | **Sales rep CRM:** only entries they **manually add**. **Website booking form** appointments: show **separately on Admin CRM** for approve/accept.                                                                                                                                                                                        | **A2 / A6 split**                       |
| 4   | Delivery order                          | **Option B: CRM first, then Priority 2**                                                                                                                                                                                                                                                                                                  | **A before B**                          |
| 5   | Other authorized delivery staff         | **No other for now**                                                                                                                                                                                                                                                                                                                      | Admin + Sales Rep only for meeting flow |
| 5b  | Assign Prospects/Clients to specialists | **Not needed now.** Specialist uses existing client/sales-rep logins.                                                                                                                                                                                                                                                                     | No assignment table in v1               |
| 6   | Temp password                           | **No forced password change.** They may keep temp or change later. **Simple password, no expiry.**                                                                                                                                                                                                                                        | Soften B4                               |
| 7   | Print results                           | **Browser print only** — no PDF download for now                                                                                                                                                                                                                                                                                          | No PDF chunk                            |
| 8   | Client Won / account create             | On Zoom, Admin/Sales Rep submits assessment → **automatically creates new client dashboard** (not a separate manual convert step as the primary path).                                                                                                                                                                                    | **Submit = create dashboard**           |
| —   | Working sequence (client)               | Prospect on Zoom → Admin/Sales Rep logged into **their own** account → fill assessment → on Submit: client dashboard created → **password emailed** to the **same email** entered on the form → staff **redirected** to that dashboard → **assessment results unlocked**; other features **locked** until engagement is configured later. | Core B flow                             |
| —   | Scoring / questions                     | Stay as currently approved                                                                                                                                                                                                                                                                                                                | Reuse                                   |
| —   | Dashboard ≠ full website                | Yes                                                                                                                                                                                                                                                                                                                                       | Keep proxy separation                   |
| —   | Own data only                           | Yes                                                                                                                                                                                                                                                                                                                                       | Session-scoped                          |
| —   | Assessment history                      | Keep; **newest first**                                                                                                                                                                                                                                                                                                                    | History ordering                        |
| —   | New assessment vs KPIs                  | Must **not** wipe KPIs; old assessments stay linked to client login                                                                                                                                                                                                                                                                       | Preserve engagement                     |

### Client clarifications locked (2026-11-18) — EADS CRM alignment

| #   | Topic              | Client answer                                                                                                                               | Build impact     |
| --- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| E1  | Status list        | Keep the **11** statuses previously provided. One **Current Status** on the dashboard. No separate pipeline system.                         | **A8**           |
| E2  | Call disposition   | Each call saves disposition **permanently in call history**. Updating Current Status must **not** overwrite past dispositions.              | **A9**           |
| E3  | Company / contacts | One company/prospect + **multiple contacts** (name, title, phone, email). Calls tied to a contact; full history also on the company record. | **A10**          |
| E4  | Assignment         | Specialist Add Prospect → **auto-assign to self**. Admin may create (incl. **unassigned**), assign, reassign; reassign keeps full history.  | **A7** / **A11** |
| E5  | Naming / accounts  | Specialist = **Executive Account Development Specialist**. Keep `/crm` + `/leads`. Admin creates specialist accounts in Access Management.  | **A7**           |
| E6  | Scope              | Keep simple: who contacted, what happened, current status, next follow-up. Extend **existing** dashboards — do not rebuild.                 | All A7+          |

### Client additional CRM instructions (2026-11-19) — gap fill only

**Rule:** Add **only what is missing**. Do **not** duplicate or rebuild existing CRM. Keep simple and cost-effective.

| #   | Topic                           | Client ask                                                                                                                                       | Gap vs current CRM                                                 | Build impact      |
| --- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | ----------------- |
| G1  | Dashboard Totals                | Four clickable: Active Leads, Follow-Ups Due Today, Overdue Follow-Ups, Upcoming Appointments                                                    | ✅ Already shipped (A2/A3)                                         | —                 |
| G2  | Company Information             | Annual Gross Revenue (Reported / Estimated / Unknown), Existing Sales Force (Yes / No / Unknown), # Sales Reps, Company Website, Lead Source     | ✅ Shipped (A12)                                                   | **A12**           |
| G3  | Appointment Tracking            | Schedule with date/time **and mark completed**                                                                                                   | ✅ Shipped (A13)                                                   | **A13**           |
| G4  | Follow-Up Tracking              | Mark follow-ups completed; auto-highlight overdue                                                                                                | ✅ Already shipped (A2/A3)                                         | —                 |
| G5  | Additional Statuses             | **Appointment Completed** + **Do Not Contact** (keep in DB; exclude from active calling lists)                                                   | ✅ Shipped (A13 + A14)                                             | **A13** + **A14** |
| G6  | Duplicate Warning               | Alert if same company name already exists                                                                                                        | ✅ Already shipped (A5)                                            | —                 |
| G7  | Master Admin `/crm` vs `/leads` | `/crm` = oversee EADS accounts, view CRM records, assign/reassign only. EADS uses `/leads` for prospecting. No personal CRM inside Master Admin. | ✅ Already matches (A4/A7/A11). Locked clarification — no rebuild. | 🔒 locked         |

---

## Confirmed meeting flow (Priority 2 — build target)

```
Prospect on Zoom call
        │
Admin OR Sales Rep (own login)
        │
Fill assessment (identity email + answers)
        │
     [Submit]
        │
        ├─► Create / attach client dashboard account
        ├─► Save assessment result (history, newest first)
        ├─► Email simple password to form email (no force-change, no expiry)
        └─► Redirect staff → that client dashboard
                    │
                    ├─ Assessment results: UNLOCKED
                    └─ Other engagement features: LOCKED (until configured later)
```

---

## Current platform baseline (reuse — do not rebuild)

| Area                                                                               | Already in North-Landing |
| ---------------------------------------------------------------------------------- | ------------------------ |
| Auth cookies, roles (`SUPER_ADMIN`, `SALES_REPRESENTATIVE`, `USER`), approval gate | Auth module + proxy      |
| Assessment CMS (author / publish / archive)                                        | Admin assessments        |
| Client primary assessment (`isClientPrimary`)                                      | Assessments module       |
| Paying-client engagement APIs                                                      | Engagement module        |
| Client self-assessment + Zoom on-behalf instance                                   | Assessment instances     |
| Client dashboard (main UI + `GET /client/dashboard`)                               | FE client dashboard      |
| Leads CRM (EADS `/leads`)                                                          | Extend for Doc A CRM     |

---

# Workstream A — Account Development Specialist CRM (**FIRST**)

**Outcome:** Specialists manage prospects they own; Master Admin sees all + website-form appointment approvals; search, filters, export, duplicates.  
**Phase 1 (A1–A6):** ✅ shipped baseline. **Phase 2 (A7–A11):** ✅ done.  
**Phase 3 (A12–A14):** ✅ **Done** — company fields, appointment completed, Do Not Contact.

```
Lead CRUD (rep manual) ──► Activity notes ──► Follow-ups ──► Dashboard totals
        │
        └── Duplicate warnings

Website booking form ──► Admin CRM (separate queue) ──► Approve / Accept

Phase 2:
  ✅ A7 · ✅ A8 · ✅ A9 · ✅ A10 · ✅ A11 assignment + list polish

Phase 3 (gap fill):
  ✅ A12 company fields · ✅ A13 appointment completed · ✅ A14 Do Not Contact
```

**Note:** This is **not** the paying-client engagement dashboard. Do not merge CRM tables into engagement modules.  
**Phase 3 rule:** Extend existing `/crm` + `/leads` only — no second CRM, no rebuild.

---

## Chunk A1 — Lead data model + APIs

**Goal:** Persist leads with Doc A fields and statuses.

**Status:** ✅ **Done** (2026-11-17) — backend + FE API client

### Backend ✅

- Expanded `Lead` model + `LeadStatus` enum + migration `20261117000000_crm_lead_model_a1`
- Create requires `companyName`; Admin must set `ownerId`; rep defaults to self; status default `NEW_LEAD`
- Status rules: `NOT_QUALIFIED` → reason; `FOLLOW_UP_NEEDED` → `followUpAt`; `APPOINTMENT_SCHEDULED` → `appointmentAt`
- CRUD + get-by-id + list (`q` / `status` / Admin `ownerId`); `GET /leads/assignees` for Admin
- Scope: reps **own only**; Master Admin **all** + reassign `ownerId`
- Guard: `CrmStaffGuard` (Admin or any Sales Representative)

### Frontend ✅

- API client types + fetch helpers in `lib/leads-api.ts` (full Doc A fields, status labels, list filters, assignees, get-by-id)
- Existing `/leads` form/list updated for required `companyName` so create/list/update keep working

**Done when:** Admin/rep can create/list/update leads via API with correct scoping.

**Depends on:** —

---

## Chunk A2 — Activity + follow-up engine

**Goal:** Dated activity history and follow-up scheduling for **manually managed** CRM work.

**Status:** ✅ **Done** (2026-11-17) — backend + FE

### Backend ✅

- Append-only `LeadActivity` (NOTE/CALL/EMAIL/MEETING + system follow-up events); author id + name snapshot
- `LeadFollowUp` schedule + complete; syncs `lead.followUpAt` / promotes early statuses to `FOLLOW_UP_NEEDED`
- Overdue / due-today computed in UTC day bounds; inactive statuses excluded from active + follow-up counts
- `GET /leads/totals` → Active Leads, Follow-Ups Due Today, Overdue, Upcoming Appointments
- Upcoming appointments count uses **manual** `Lead.appointmentAt` only (never website `Appointment` table)
- Migration `20261117140000_crm_lead_activity_follow_up_a2`

### Frontend ✅

- `lib/leads-api.ts` helpers for activities, follow-ups, totals
- Lead CRM panel: activity list + add note/call/email/meeting
- Follow-up schedule + complete (overdue / due-today highlight)
- Manual appointment save/clear on the lead (website bookings excluded from totals)
- Dashboard totals wired to `GET /leads/totals`

**Done when:** Notes and follow-ups work; rep totals exclude website booking form submissions.

**Depends on:** A1

---

## Chunk A3 — Rep CRM UI

**Goal:** Daily CRM surface for the sales rep / Account Development Specialist.

**Status:** ✅ **Done** (2026-11-17) — backend + FE

### Backend ✅

- List API search (`q`) expanded: company, names, email, phone, website, address, notes
- Existing `status` / Admin `ownerId` filters kept
- Click-through `filter` query param matching totals cards:
  - `active` · `follow_ups_due_today` · `follow_ups_overdue` · `upcoming_appointments`
- Same inactive-status / manual-appointment rules as `GET /leads/totals` (no website bookings)

### Frontend ✅

- Totals cards click → filtered list (`filter` query); click again to clear
- API-backed search (`q`) + status filter dropdown
- Lead list open/update/add; CRM panel for activities / follow-ups / manual appointments
- Edit dialog supports status + required status fields
- Overdue / due-today row highlighting
- Appointment totals/list exclude website booking form submissions

**Done when:** Rep can run daily lead workflow without Admin.

**Depends on:** A1, A2

---

## Chunk A4 — Admin CRM controls

**Goal:** Master Admin oversight of leads + website booking intake.

**Status:** ✅ **Done** (2026-11-17) — backend + FE

### Backend ✅

- Admin already lists **all** leads (`GET /leads`, optional `ownerId` / filters / search) with same validation as reps
- `GET /leads/assignees` — active Sales Representatives for assignment
- `POST /leads/:id/assign` — Master Admin only (`SuperAdminGuard`); body `{ ownerId }`
- Reassign also via `PATCH /leads/:id` `{ ownerId }` (Admin only)
- Admin create requires `ownerId`; writes `REASSIGNED` timeline activity on assign/reassign/create
- Migration `20261117160000_crm_lead_reassign_a4` (`LeadActivityType.REASSIGNED`)
- Website booking intake remains **A6** (separate Admin queue)

### Frontend ✅

- Admin CRM at `/crm` (sidebar entry) — all leads, totals click-through, search, status + owner filters
- **Assign** control per lead (`assignLead`) + create lead requires assignee
- Reuses CRM panel / edit / delete from A3
- After assign, rep sees the lead on `/leads`

**Done when:** Admin assigns lead to rep; rep then sees it.

**Depends on:** A3

---

## Chunk A5 — Duplicates + CSV export

**Goal:** Warn on likely duplicates; export lists.

### Backend ✅

- `GET /leads/duplicates` — soft preview (company / website / phone; org-wide)
- `POST /leads` + `PATCH /leads/:id` — `409 LEAD_DUPLICATES` unless `acknowledgeDuplicates=true`
- `GET /leads/export` — CSV (reps: own; Admin: all; same list filters)

### Frontend ✅

- Duplicate warning UI on add/edit (`LEAD_DUPLICATES` → list + Save/Add anyway)
- Export CSV button on `/leads` + `/crm` (current filters)

**Done when:** Obvious duplicates warned; CSV scoped correctly.

**Depends on:** A3, A4

---

## Chunk A6 — Website booking appointments (Admin CRM only)

**Goal:** Form-submitted appointments appear for Admin to approve/accept — **separate from** rep manual CRM entries.

### Backend ✅

- Website form create → `AppointmentStatus.PENDING` (no confirmation email yet); holds slot
- Migration `20261118010000_appointment_pending_a6` (`PENDING`, `ACCEPTED_BY_ADMIN`, `REJECTED_BY_ADMIN`)
- `GET /admin/appointments?status=pending` — website booking queue (Master Admin)
- `POST /admin/appointments/:id/accept` → `CONFIRMED` + booking confirmation emails
- `POST /admin/appointments/:id/reject` → `CANCELLED` (optional reason)
- Existing `PATCH .../status` (COMPLETED/CANCELLED) blocked for `PENDING` (use accept/reject)
- Rep CRM / `Lead.appointmentAt` unchanged — website bookings stay in Appointments module only

### Frontend ✅

- `/crm` — **Website booking queue** (pending Accept/Reject) above leads list
- `/appointments` — **Pending** tab (default) + list Accept/Reject; detail Accept/Reject
- Rep `/leads` unchanged — no website booking mix-in

**Done when:** Rep CRM shows only manual work; Admin CRM can approve/accept website form appointments.

**Depends on:** A4; existing booking/appointments module as source

**Status:** ✅ **Done** (2026-11-18) — backend + FE

---

## Chunk A7 — EADS naming + Access Management ✅ done

**Goal:** Specialist title matches client language; Admin can create **Executive Account Development Specialist** accounts.

### Backend ✅

- Enum rename: `ACCOUNT_EXECUTIVE` → `EXECUTIVE_ACCOUNT_DEVELOPMENT_SPECIALIST` (migration `20261118020000_eads_rename_a7`; existing rows remapped)
- `STAFF_POSITION_LABELS` + login categories include EADS display name **Executive Account Development Specialist**
- Access Management create DTO / Swagger describe EADS position; role stays `SALES_REPRESENTATIVE`
- `EadsGuard` (alias `AccountExecutiveGuard`) checks EADS position

### Frontend ✅

- Access Management position dropdown + list labels (STAFF_POSITION_LABELS)
- `/leads` shell / sidebar: **Executive Account Development Specialist**
- Login Access Type: `EXECUTIVE_ACCOUNT_DEVELOPMENT_SPECIALIST`
- `isEads` / proxy / server-auth gate on EADS position

**Done when:** Admin can create an EADS account for the client; specialist UI says EADS.

**Depends on:** A4  
**Status:** ✅ done (2026-11-18)

---

## Chunk A8 — Eleven prospect statuses ✅ done

**Goal:** Replace current `LeadStatus` set with the client’s **11** statuses; one Current Status on the dashboard.

**Statuses (locked):**

1. New Prospect (`NEW_PROSPECT`)
2. No Answer (`NO_ANSWER`)
3. Gatekeeper Reached (`GATEKEEPER_REACHED`)
4. Decision Maker Reached (`DECISION_MAKER_REACHED`)
5. Callback Required (`CALLBACK_REQUIRED`)
6. Interested (`INTERESTED`)
7. Zoom Scheduled (`ZOOM_SCHEDULED`)
8. Proposal Sent (`PROPOSAL_SENT`)
9. Client Acquired (`CLIENT_ACQUIRED`)
10. Not Interested (`NOT_INTERESTED`)
11. Not Qualified (`NOT_QUALIFIED`)

**Old → new mapping (migration** `20261118030000_lead_status_eleven_a8`**):**

| Old                     | New                 |
| ----------------------- | ------------------- |
| `NEW_LEAD`              | `NEW_PROSPECT`      |
| `ATTEMPTING_CONTACT`    | `NO_ANSWER`         |
| `FOLLOW_UP_NEEDED`      | `CALLBACK_REQUIRED` |
| `APPOINTMENT_SCHEDULED` | `ZOOM_SCHEDULED`    |
| `QUALIFIED`             | `INTERESTED`        |
| `PROPOSAL_SENT`         | `PROPOSAL_SENT`     |
| `CLIENT_WON`            | `CLIENT_ACQUIRED`   |
| `NOT_INTERESTED`        | `NOT_INTERESTED`    |
| `NOT_QUALIFIED`         | `NOT_QUALIFIED`     |
| `DO_NOT_CONTACT`        | `NOT_INTERESTED`    |

### Backend ✅

- Migrated `LeadStatus` enum to the 11 values above; default `NEW_PROSPECT`
- Validation: `NOT_QUALIFIED` → reason; `CALLBACK_REQUIRED` → `followUpAt`; `ZOOM_SCHEDULED` → `appointmentAt`
- Inactive (totals/active filter): `CLIENT_ACQUIRED`, `NOT_INTERESTED`, `NOT_QUALIFIED`
- Follow-up schedule may promote early statuses → `CALLBACK_REQUIRED`; upcoming appointments use `ZOOM_SCHEDULED`
- `LEAD_STATUS_LABELS` exported from `lead.dto.ts`

### Frontend ✅

- `leads-api` statuses/labels match the 11 values
- Edit form + list filter + CRM panel use Current Status; callback/zoom field rules wired
- List column labeled **Current Status** (no second pipeline)

**Done when:** Only the 11 statuses exist in API + UI; Current Status editable without wiping history.

**Depends on:** A3, A4  
**Status:** ✅ done (2026-11-18)

---

## Chunk A9 — Call disposition in history (separate from Current Status) ✅ done

**Goal:** Recording a call saves disposition + notes + next follow-up into **permanent call history**; Current Status can change later without losing past dispositions.

### Backend ✅

- Extended `LeadActivity` with `disposition` (LeadStatus), `nextFollowUpAt`, nullable `contactId` (A10)
- Migration `20261118100000_lead_call_disposition_a9`
- `POST /leads/:id/calls` — append-only call log (`CreateLeadCallDto`: disposition, notes, optional followUpAt, optional `updateCurrentStatus`)
- `GET /leads/:id/calls` — company-level call history (CALL rows with disposition; newest first)
- Optional Current Status update from disposition; Zoom-as-status blocked here (use appointment form); past call rows never overwritten
- Optional follow-up creates `LeadFollowUp` + syncs `lead.followUpAt`

### Frontend ✅

- CRM panel **Log call** section: disposition, notes, next follow-up, optional “also update Current Status”
- Chronological call history list (permanent); activity section no longer used for call dispositions
- Current Status can still be edited on the prospect without deleting history rows

**Done when:** Past call dispositions remain visible after status changes.

**Depends on:** A8 (status/disposition vocabulary); A10 for contact association (can ship company-only first, then attach contact)  
**Status:** ✅ done (2026-11-18)

---

## Chunk A10 — Multi-contact under company ✅ done

**Goal:** One company/prospect record with **multiple contacts** (e.g. receptionist, sales manager, president); each has name, title, phone, email; calls tied to a contact; company shows full history.

### Backend ✅

- `LeadContact` model + migration `20261118110000_lead_contacts_a10`
- Backfill from legacy gatekeeper / decision-maker / general name fields
- CRUD: `GET|POST /leads/:id/contacts`, `PATCH|DELETE /leads/:id/contacts/:contactId` (scoped like leads)
- `POST /leads/:id/calls` accepts optional `contactId` (must belong to lead); call history returns nested contact
- Delete contact sets linked call `contactId` null (history kept)

### Frontend ✅

- CRM panel **Contacts** section: add / edit / delete (name, title, phone, email)
- **Log call**: optional “Contact spoken to” picker
- Call history shows contact name when set; company timeline still lists all calls

**Done when:** Multi-contact works on `/leads` + `/crm`; reassigned specialist still sees full history.

**Depends on:** A1–A4; pairs with A9  
**Status:** ✅ done (2026-11-18)

---

## Chunk A11 — Assignment polish + dashboard columns ✅

**Goal:** Assignment rules + list columns match client brief; keep UX simple.

### Backend ✅

- `ownerId` nullable (migration `20261118120000_lead_owner_nullable_a11`; `ON DELETE SET NULL`)
- EADS create → always self-owned
- Admin create: omit `ownerId` → unassigned; set `ownerId` → assigned (+ REASSIGNED activity)
- `POST /leads/:id/assign` supports unassigned → specialist and reassign; only updates `ownerId` (history preserved)
- Admin `PATCH` may clear owner with empty `ownerId` (unassign)
- CSV shows “Unassigned” when no owner
- List payload includes `primaryContact` + `lastContactAt` for dashboard columns

### Frontend ✅

- Admin Add Prospect: optional assignee (Unassigned allowed)
- List columns: Company, Contact Person, Phone, Current Status, Last Contact, Next Follow-Up (+ Admin Assigned; search, status filter, Add Prospect)
- Follow-up buckets remain: Overdue / Today / Upcoming / None
- No forecasting/charts/automation

**Done when:** Unassigned + assign/reassign work; list matches client columns; history preserved on reassign.

**Depends on:** A7, A10 (contact person column)  
**Status:** ✅ done

---

### Workstream A — chunk map

| Chunk | Status  | Backend focus                               | Frontend focus                 |
| ----- | ------- | ------------------------------------------- | ------------------------------ |
| A1    | ✅ done | Lead schema + CRUD + scope                  | API client                     |
| A2    | ✅ done | Notes, follow-ups, manual schedule          | Activity / follow-up UI        |
| A3    | ✅ done | Filters/search                              | Full rep CRM UI                |
| A4    | ✅ done | Assign all leads                            | Admin CRM UI                   |
| A5    | ✅ done | Duplicate check + CSV                       | Warnings + export              |
| A6    | ✅ done | Website booking queue + approve             | Admin appointment intake UI    |
| A7    | ✅ done | EADS naming / position                      | Access Mgmt + `/leads` labels  |
| A8    | ✅ done | 11 prospect statuses                        | Status dropdowns / filters     |
| A9    | ✅ done | Call disposition in history                 | Log-call UI + history          |
| A10   | ✅ done | Multi-contact model + APIs                  | Contacts on company record     |
| A11   | ✅ done | Unassigned + assign polish                  | List columns + Admin create UX |
| A12   | ✅ done | Structured company fields + Lead Source     | Create/edit form + CRM summary |
| A13   | ✅ done | Appointment Completed status + mark done    | Appointment complete UI        |
| A14   | ✅ done | Do Not Contact status + active-list exclude | Status + filters + DNC badge   |

**Suggested Phase 2 order:** **A7 → A8 → A9 → A10 → A11** (✅ done).  
**Suggested Phase 3 order (before B):** **A12 → A13 → A14**.

---

## Chunk A12 — Company information fields ✅ done

**Goal:** Capture the client’s company fields on the existing lead create/edit forms. Extend current Lead model — **do not** rebuild CRM.

**Status:** ✅ **Done** (2026-11-19) — backend + frontend

**Already present (reuse):** free-text `annualRevenue`, `salesForceSize`, `website` on `Lead` (schema/API). Duplicate company-name warning already shipped (A5).

### Backend ✅

- Kept `annualRevenue` as Annual Gross Revenue **amount** (free-text)
- Added `annualGrossRevenueKind`: `REPORTED` | `ESTIMATED` | `UNKNOWN`
- Added `existingSalesForce`: `YES` | `NO` | `UNKNOWN`
- Added `numberOfSalesRepresentatives` (optional int; preferred); legacy `salesForceSize` kept + synced when int set; numeric legacy sizes backfilled in migration
- `website` already on create/update DTOs
- Added `leadSource` (free-text VarChar 150)
- Migration `20261119140000_lead_company_fields_a12` + DTO validation + list/detail select + CSV columns + Swagger enums/labels

### Frontend ✅

- Add/Edit Prospect dialogs (`lead-dialogs.tsx`): website, revenue amount + kind, existing sales force, # sales reps, lead source
- `leads-api.ts` types + create/update payloads + labels
- CRM panel: read-only **Company information** summary (edit via Edit Prospect)

**Done when:** Specialist can save all five company-info items on create/edit; values persist and show on detail/list/CSV as needed.

**Depends on:** A1, A3  
**Parallel-safe with:** A13 / A14 (after status enum work lands, FE can ship together)

---

## Chunk A13 — Appointment completed tracking ✅ done

**Goal:** Specialists can schedule appointments (already) **and mark them completed**. Add **Appointment Completed** as a Current Status.

**Status:** ✅ **Done** (2026-11-19) — backend + frontend

**Already present (reuse):** `Lead.appointmentAt` / `appointmentNotes`; required when status = `ZOOM_SCHEDULED`; Upcoming Appointments total; website booking “mark completed” is a **separate** Admin Appointments module — do **not** merge into lead CRM.

### Backend ✅

- Added `LeadStatus.APPOINTMENT_COMPLETED` + `LeadActivityType.APPOINTMENT_COMPLETED` (migration `20261119150000_lead_appointment_completed_a13`)
- Added `appointmentCompletedAt` (keeps `appointmentAt` for history)
- `POST /leads/:id/appointment/complete` (optional notes) → status + stamp + timeline activity
- PATCH rules: completing stamps `appointmentCompletedAt`; clearing schedule / setting Zoom Scheduled / leaving completed clears it
- Inactive for Active Leads / follow-up totals (closed outcome)
- CSV column + status labels updated; call disposition cannot set Appointment Completed via `updateCurrentStatus`

### Frontend ✅

- CRM **Manual appointment**: **Mark completed** (+ completed banner; Reschedule via Save)
- Status dropdowns / Lead Status dialog / Edit Prospect include **Appointment Completed**
- Call log blocks setting Appointment Completed via “update Current Status”
- `leads-api`: status + `completeLeadAppointment` + activity label

**Done when:** Specialist can schedule an appointment and mark it completed; status shows Appointment Completed; list/filters work.

**Depends on:** A2, A8  
**Shipped with:** A14 (Do Not Contact)

---

## Chunk A14 — Do Not Contact status ✅ done

**Goal:** Distinct **Do Not Contact** status. Prospect stays in the database but is **excluded from active calling lists** (Active Leads + follow-up due buckets).

**Status:** ✅ **Done** (2026-11-19) — backend + frontend

**Already present (reuse):** A8 had mapped old `DO_NOT_CONTACT` → `NOT_INTERESTED`. A14 restores a **distinct** status. No auto-migrate of existing Not Interested rows.

### Backend ✅

- Added `LeadStatus.DO_NOT_CONTACT` (migration `20261119160000_lead_do_not_contact_a14`)
- Added to `INACTIVE_LEAD_STATUSES` (Active Leads + follow-up due buckets exclude DNC)
- Still listable via status filter / search / Admin overview (not deleted)
- Labels updated; CSV exports status value; no extra required fields
- Does **not** auto-migrate `NOT_INTERESTED` → DNC

### Frontend ✅

- Status dropdowns + filters include **Do Not Contact** (`LEAD_STATUSES`)
- Active totals driven by BE inactive set
- Subtle **DNC** badge on list rows + CRM panel header

**Done when:** DNC selectable; record remains in DB; excluded from active calling totals/lists; visible when filtering by that status.

**Depends on:** A8, A2 (totals)  
**Shipped after:** A13

---

# Workstream B — Priority 2 Assessment + Client Dashboard (**SECOND**)

**Outcome:** During Zoom, Admin/Sales Rep submits assessment → client dashboard auto-created → password emailed → staff redirected to dashboard with results unlocked and other features locked.

```
Staff submit ──► Create client dashboard ──► Save result (newest first)
                      │
                      ├─► Email simple password (no force-change, no expiry)
                      └─► Redirect staff → client dashboard (results unlocked; rest locked)
```

---

## Chunk B0 — Decisions lock

**Status:** 🔒 **Locked** — see **Client decisions locked** table above.

**Done when:** ✅ Client answers recorded (this update).

---

## Chunk B1 — Identity / specialist model

**Status:** ⏸️ **Deferred (not priority now)**

### Client direction

- “Implementation Specialist” is a **term only** for now
- No new role, no specialist↔client assignment table in this phase
- They may use existing **client** and **sales rep** credentials when needed
- Access for meeting flow: **Master Admin** and **Sales Representative**

### Later (if client asks)

- Dedicated Implementation Specialist role / dual-dashboard access
- Assignment ownership rules

**Depends on:** Explicit future request

---

## Chunk B2 — Staff assessment entry (meeting)

**Goal:** Admin or Sales Rep, logged into **their own** account, completes assessment for the person on the Zoom call.

### Backend

- Staff submit path with identity fields (at least email used for account + password mail) + answers
- Permission: `SUPER_ADMIN` and `SALES_REPRESENTATIVE` (no specialist ACL in v1)
- Reuse published assessment + **server-side** scoring

### Frontend

- Meeting assessment UI with clear **Submit** control
- Identity fields (email must match where password will be sent)
- After Submit: hand off to B3/B4 redirect (no dead-end success page only)

**Done when:** Admin/Sales Rep can submit a meeting assessment for a person.

**Depends on:** B0 ✅

---

## Chunk B3 — Auto-create client dashboard + save history

**Goal:** On Submit, create (or attach) client dashboard account and store assessment results.

### Backend

- Find by email or create client dashboard account
- Save result: overall, pillars, lowest areas (+ tie rules)
- Keep history; **newest first**
- Must **not** wipe engagement KPIs / implementation records when a later assessment is added
- Primary create path is **Submit assessment** (not a separate “Client Won → create account” as the main flow)

### Frontend

- Staff feedback if create vs existing account
- Prepare navigation target for redirect (B8 / post-submit)

**Done when:** Submit always leaves a client login with that assessment linked.

**Depends on:** B2

---

## Chunk B4 — Password email (simple, no force-change)

**Goal:** Email credentials to the **same email** entered on the assessment form.

### Backend

- Generate **simple** temporary password
- **No expiry** (per client)
- **No forced** password change on first login (optional change later is fine)
- Email login link + password after successful save
- Resend if send fails (without duplicating account/assessment) — keep if already planned

### Frontend

- Staff visibility: email sent / failed
- Resend control if needed
- Login allows temp password without mandatory change gate

**Done when:** Prospect/client can log in with emailed password without forced reset.

**Depends on:** B3

---

## Chunk B5 — Locked client dashboard (results-first)

**Goal:** New dashboard after meeting Submit shows **assessment results unlocked**; other engagement features **locked** until configured later.

### Backend

- Dashboard payload flags: `assessmentUnlocked`, engagement sections locked/empty until configured
- Results + history (newest first) available to the account owner

### Frontend

- Client dashboard: assessment results visible
- Engagement / KPI / schedule / manage areas shown locked or hidden until engagement is set up
- **Browser print** of on-screen results only — **no PDF** for now

**Done when:** Fresh post-meeting dashboard matches “results only unlocked” rule.

**Depends on:** B3, B4

---

## Chunk B6 — Client dashboard hardening (engagement unlock later)

**Goal:** When engagement is configured, unlock full client features without losing assessment history.

### Backend

- Engagement bootstrap (baselines, KPIs, schedule, reports) unlocks locked sections
- Print bundle can include assessment + engagement when both exist
- Preserve five implementation steps; new assessment never clears KPIs

### Frontend

- Wire real engagement data when present
- Keep assessment history accessible (newest first)

**Done when:** Configured clients see full dashboard; history intact.

**Depends on:** B5; existing engagement module

---

## Chunk B7 — Conversion / Client Won (secondary)

**Status:** Adjusted by client

### Client direction

- Primary account creation is **assessment Submit on Zoom**, not CRM “Client Won → auto account”
- CRM **Client Won** handoff to dashboard account is **not** the main path for now
- If CRM later needs a link to an existing dashboard account, treat as a **follow-up** decision

### Build note

- Do **not** block B2–B5 on Client Won auto-provisioning
- Optional later: link CRM Client Won to existing client account manually

**Depends on:** Product follow-up if CRM must drive account create

---

## Chunk B8 — Post-submit redirect + permissions

**Goal:** After Submit, Admin/Sales Rep land on the new client dashboard with results visible.

### Backend

- Return dashboard URL / client id after staff submit
- Guards: client sees only own data; staff may open that dashboard for meeting review after submit
- Dashboard login still does **not** unlock full proprietary website

### Frontend

- On successful Submit → **automatic redirect** to that client dashboard (assessment results view)
- Proxy / routes: website vs dashboard separation unchanged
- No Implementation Specialist routing in v1

**Done when:** Submit → redirect → results unlocked demo works end-to-end.

**Depends on:** B3, B4, B5

---

### Workstream B — chunk map

| Chunk | Status      | Backend focus                | Frontend focus                          |
| ----- | ----------- | ---------------------------- | --------------------------------------- |
| B0    | 🔒 locked   | Decisions                    | Decisions                               |
| B1    | ⏸️ deferred | Specialist role / assignment | —                                       |
| B2    | ⬜          | Staff submit API             | Meeting assessment + Submit             |
| B3    | ⬜          | Auto-create client + history | Create/existing feedback                |
| B4    | ⬜          | Simple password email        | Email status / resend                   |
| B5    | ⬜          | Locked vs unlocked flags     | Results-first dashboard + browser print |
| B6    | ⬜          | Engagement unlock            | Full client polish                      |
| B7    | ⏸️ / later  | Client Won link (optional)   | —                                       |
| B8    | ⬜          | Guards + redirect payload    | Auto-redirect after Submit              |

---

# Suggested delivery order (**client confirmed**)

1. **A1 → A6** — ✅ CRM baseline (rep manual CRM + Admin website-appointment approve queue) — **done**
2. **A7 → A11** — ✅ EADS alignment (naming, 11 statuses, call dispositions, multi-contact, assignment/list polish) — **done**
3. **A12 → A14** — ✅ CRM gap fill (company fields, appointment completed, Do Not Contact) — **done**
4. **B2 → B3 → B4 → B5 → B8** — Zoom meeting demo (submit → create dashboard → email password → redirect → results unlocked)
5. **B6** — engagement unlock / hardening
6. **B1 / B7** — only if client later prioritizes specialist role or CRM Client Won linking

**Rough planning ranges** (not a fixed quote):

- Workstream A Phase 1 (A1–A6): ✅ shipped
- Workstream A Phase 2 (A7–A11): ✅ shipped
- Workstream A Phase 3 (A12–A14): ✅ shipped
- Workstream B (Assessment / dashboard): ~3–5 weeks
- Integration / polish: ~0.5–1 week

---

## Related docs

- `CLIENT-REQUIREMENTS-REVIEW-TWO-DOCUMENTS.md` — original gap analysis
- `NPSG-Implementation-Timeline-Assessment-Prospect-Client-and-CRM.md` — client-facing timeline (may still say B-before-A; **this file overrides delivery order** per client)
- `CLIENT-DASHBOARD-IMPLEMENTATION-FLOW.md` — current paying-client baseline
- Auth flow docs — login, approval, category routing

---

## One-line summary

**CRM A1–A14 is done** on `/crm` + `/leads` (incl. Phase 3 gap fill). **Next: Workstream B** — Zoom staff assessment **Submit** → auto-create **client dashboard** → email **simple password** → redirect with **results unlocked**. Implementation Specialist assignment and PDF export remain **out of scope for now**.
