# Client Requirements Review — Two Instruction Documents

**Reviewed documents**

1. `EXECUTIVE ACCOUNT DEVEL SPECIALIST DASHBOARD INSTRUCTIONS.docx`  
   → Executive Account Development Specialist (rep) **CRM / leads dashboard**
2. `PRIORITY 2 Assessment and Prospect and Client Dashborad Instru.docx`  
   → **Assessment + Prospect/Client dashboard** upgrades

**Date:** 2026-11-13  
**Purpose:** Explain what the client wants now, map it to what we already have, propose modules, and estimate effort. No implementation in this document.

---

## Plain-language: client kya maang raha hai?

### Document A — Account Development Specialist CRM (new product surface)

Account reps ke liye **simple CRM**:

- Leads enter karo (company, decision maker, gatekeeper, revenue, etc.)
- Call / activity history likho (dated, author preserved)
- Lead status pipeline (New Lead → … → Client Won / Not Interested / Not Qualified / Do Not Contact)
- Follow-ups schedule + complete; overdue highlight
- Dashboard totals (Active Leads, Follow-Ups Due Today, Overdue, Upcoming Appointments) — click → filtered list
- Search / filters / CSV export
- Duplicate warning (company / website / phone)
- **Rep only sees own assigned leads**; Master Admin sees/assigns all

Ye **paying-client engagement dashboard nahi** hai. Ye **sales outreach / lead hunting CRM** hai.

### Document B — Priority 2 Assessment + Prospect/Client dashboards

Existing “dashboard” design reuse karke:

1. **Staff on-behalf assessment** (footer se) — Master Admin = anyone; **Implementation Specialist** = only assigned people. Form: first/last name, company, email + assessment answers.
2. Submit pe **email se account find/create**:
   - Existing → save assessment to their dashboard (password/access same)
   - New → auto **Prospect** account + dashboard; assign to submitting specialist if applicable
   - Submit se prospect **paying client nahi** banta
3. Results save: overall + 3 pillars + 3 lowest areas (+ tie rules); **history** keep, latest first
4. **Auto email results** (subject fixed) — full results in email + login link; new prospect gets temp password + must change on first login; fail pe Resend (no duplicate account/assessment)
5. Submit ke baad staff ke liye us person ka dashboard auto-open (meeting review)
6. **Prospect dashboard** — branding same, sirf assessment results + print + 3 overview links (Sales Performance / Systems / Leadership); **hide** engagement KPIs/timeline/manage engagement/sample data
7. **Client dashboard** — existing features real data se; assessment results section + history; company name, engagement dates, print includes assessment; Manage Engagement for Admin + assigned specialist only; replace sample notice once configured
8. Preserve 5 implementation steps (Where are we? … Are we getting results?) — new assessment must **not** wipe KPIs/actions
9. Three area links: Prospect = static overview; Client = that client’s implementation/KPIs for area
10. Master Admin: **Prospect → Client** conversion (keep login, assessments, assigned specialist); then enter scope/dates/KPIs to unlock full client features
11. Permissions: own dashboard only for prospect/client; Admin all; Implementation Specialist only assigned; **dashboard login ≠ full website** (website access still separate)

---

## Gap vs current North-Landing build

| Area                          | Already have (approx.)                                     | Client still wants                                                                         |
| ----------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Roles                         | `SUPER_ADMIN`, `SALES_REPRESENTATIVE`, `USER` (+ approval) | Distinct **Prospect** vs **Client**; **Implementation Specialist** + assignment            |
| Assessment authoring          | Full admin CMS                                             | Keep / reuse                                                                               |
| Assessment complete           | Client self + Zoom one-time token (rep/admin)              | Staff footer flow with **name/company/email**, assignment rules, auto account              |
| Results email                 | Not after assessment                                       | Auto email + temp password + resend                                                        |
| Prospect dashboard            | No                                                         | Stripped dashboard                                                                         |
| Client dashboard (6 sections) | Live engagement API for USER                               | Wire **overview UI** (static sample today) to real data; history; print; specialist manage |
| CRM leads                     | None                                                       | Full Doc A CRM                                                                             |
| Prospect→Client               | Approve access ≈ client                                    | Explicit conversion + engagement config gate                                               |
| Website vs dashboard access   | Proxy role routing                                         | Keep separate (already directionally true)                                                 |

**Bottom line:** Doc B = large enhancement of auth + assessment completion + dashboards. Doc A = **new CRM product module** (almost greenfield).

---

## Proposed modules (build units)

### Priority 2 (Document B) — suggested modules

| #   | Module                            | What it delivers                                                                                                   |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| B1  | **Identity model upgrade**        | Prospect vs Client account states; Implementation Specialist role; assignment table (specialist ↔ prospect/client) |
| B2  | **Staff assessment submit**       | Footer entry + form (identity fields + questions); Admin anyone / Specialist assigned-only                         |
| B3  | **Find-or-create + save results** | Email match; create prospect; history of assessments; pillar + lowest-area payload                                 |
| B4  | **Results email + resend**        | Template, temp password, login link, success/fail UI                                                               |
| B5  | **Prospect dashboard**            | Stripped UI, print results, 3 overview links                                                                       |
| B6  | **Client dashboard hardening**    | Replace sample overview with real engagement + assessment history; print; Manage Engagement for Admin/Specialist   |
| B7  | **Prospect → Client conversion**  | Admin action + engagement bootstrap before full client features                                                    |
| B8  | **Permissions & routing**         | Specialist scopes; dashboard ≠ website; guards/proxy updates                                                       |

_(Existing pieces to reuse: assessment document/scoring, engagement CRUD, client read APIs, mail service, auth cookies.)_

### CRM (Document A) — suggested modules

| #   | Module                          | What it delivers                                                                                             |
| --- | ------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| A1  | **Lead data model + APIs**      | All fields, statuses, validation (Not Qualified reason, Follow-Up fields, etc.)                              |
| A2  | **Activity / follow-up engine** | Append-only notes; complete follow-up; overdue logic                                                         |
| A3  | **Rep CRM UI**                  | Totals, list, filters, search, open/update, add lead                                                         |
| A4  | **Admin CRM controls**          | See all, assign rep, same UI elevated                                                                        |
| A5  | **Duplicates + export**         | Match warnings; CSV export                                                                                   |
| A6  | **Appointments link**           | “Upcoming Appointments” totals — either reuse booking module or lead.appointment field (clarify with client) |

---

## Effort estimate (calendar / focused engineering)

Assumptions: 1 strong full-stack engineer familiar with this repo; Nest + Next patterns reuse; design largely “reuse existing dashboard”; QA + small revisions included; **not** including production infra/ops beyond app work. Parallel designers/PMs not counted.

| Workstream                                            | Estimate          | Notes                                                                                                              |
| ----------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| **B — Priority 2 (Assessment + Prospect/Client)**     | **3–5 weeks**     | Heaviest: roles/assignment, staff submit, email/password, two dashboard modes, conversion, replace sample overview |
| **A — Executive Account Dev CRM**                     | **3–4 weeks**     | New domain end-to-end (schema, APIs, rep UI, admin assign, export, duplicates)                                     |
| **Integration / polish / client Zoom clarifications** | **0.5–1 week**    | Edge cases, permissions matrix, appointment definition                                                             |
| **Total if both docs required**                       | **~6.5–10 weeks** | Can parallelize A + B with 2 engineers → wall-clock ~4–6 weeks                                                     |

**If only Priority 2 first (recommended):** plan **~1 month** with buffer.

**If only CRM first:** plan **~3–4 weeks**.

These are planning ranges, not fixed quotes — clarify open questions below before locking a sprint plan.

---

## Open questions for Zoom with client

1. **Implementation Specialist** = new role, or rename/extend today’s `SALES_REPRESENTATIVE`?
2. Doc B “footer assessment” vs current **Zoom one-time token** — replace, or both keep?
3. **Prospect** login: same `/login` + category, or separate entry?
4. CRM **Upcoming Appointments** = website booking appointments, or a field on the lead only?
5. Priority order: **B before A** (doc title says Priority 2) — confirm CRM is Priority 1/3?
6. “Authorized delivery staff” permissions to preserve — who exactly?

---

## Recommended delivery order

1. Confirm role model (Prospect / Client / Specialist)
2. Ship **B2–B5** (staff submit → account → email → prospect dashboard) — demoable meeting flow
3. Ship **B6–B7** (real client overview + conversion)
4. Ship **B8** hardening
5. Then **A1–A6** CRM (or parallel track if second engineer)

---

## One-sentence summary

Client ab do cheezein chahta hai: (1) **rep CRM for hunting leads**, (2) **staff-driven assessment that creates/updates prospect/client dashboards with emailed results and a real (non-sample) client engagement overview** — mostly beyond today’s Zoom-token + approved-USER engagement stack, with Priority 2 as the closer match to our current codebase and CRM as a new major module.
