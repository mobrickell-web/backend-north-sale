# NORTH POINT SALES GROUP

## Implementation Timeline & Requirements Confirmation

### Assessment / Prospect / Client Dashboards + Account Development Specialist CRM

**Prepared for:** NORTH POINT SALES GROUP  
**Prepared by:** Development team (Cyngro / North-Landing delivery)  
**Date:** November 13, 2026  
**Based on:**

1. _Executive Account Development Specialist Dashboard — Developer Instructions_
2. _Priority 2 — Assessment and Prospect / Client Dashboard_

This document summarizes our understanding of both instruction sets, separates **confirmed** requirements from items that still need your decision, and proposes a practical delivery timeline you can use for planning.

---

## 1. Purpose

You asked us to implement the capabilities described in the two instruction documents above. This note:

- Restates the requirements in plain language (so we can confirm alignment)
- Lists what is already available in the current platform vs what is new
- Provides a phased timeline with estimated durations
- Calls out **clarified** vs **uncleared** items that affect schedule and design

No development work is committed in this document until you confirm scope and the open questions in Section 6.

---

## 2. Scope at a glance

| Workstream                                                  | Source document                                       | Nature of work                                        |
| ----------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- |
| **Workstream B — Assessment, Prospect & Client Dashboards** | Priority 2 instructions                               | Extend the existing assessment and dashboard platform |
| **Workstream A — Account Development Specialist CRM**       | Executive Account Development Specialist instructions | Build a new lead / follow-up CRM for account reps     |

**Delivery sequence:** Workstream B first (closest to the current product and meeting workflow), then Workstream A.

---

## 3. Confirmed requirements (our understanding)

### 3.1 Workstream B — Assessment, Prospect & Client Dashboards

We understand you want the following:

**Staff-completed assessments**

- Master Admin and Implementation Specialists can open the Sales Alignment Assessment (via website footer) and complete it on behalf of a prospect or client.
- Master Admin may submit for any prospect or client.
- Implementation Specialists may submit only for people assigned to them.
- Required inputs: first name, last name, company name, email, and the existing assessment answers.
- Use the existing approved questions, scoring formula, and tied-score rules.

**Accounts after submit**

- Match by email to an existing prospect or client account when possible.
- If none exists, create a **prospect** account and dashboard automatically (and assign to the submitting specialist when applicable).
- Do not create duplicate accounts.
- Submitting an assessment does **not** convert a prospect into a paying client.
- Preserve passwords and access rules for existing accounts.

**Results storage**

- Store name, company, completion date, overall score, Sales Performance / Systems / Leadership scores, and the three lowest-scoring areas (plus tie-rule extras).
- Keep prior assessments; show the latest first.

**Automatic results email**

- After every submission, email results to the prospect or client (fixed subject line), including scores in the email body and a dashboard login link.
- New prospects also receive login email + temporary password + instruction to set a new password on first sign-in.
- Show the staff member whether save and email succeeded; if email fails, keep results and offer **Resend Results Email** (without creating another account or assessment).

**After submission for staff**

- Automatically open that person’s dashboard for the staff member who submitted (for live meeting review).
- The prospect/client uses the emailed link on their own device and lands on their dashboard when signed in.

**Prospect dashboard**

- Same branding/layout family as the existing dashboard.
- Show prospect label, name, company, assessment results, completion date, Print Results, and the three area links (Sales Performance, Sales Systems, Sales Leadership) to approved overview content.
- Hide engagement timeline, KPI cards, implementation table, Manage Engagement, and any sample/illustrative engagement data.

**Client dashboard**

- Keep the existing client dashboard concept.
- Add Sales Alignment Assessment Results near the top (latest + access to prior assessments).
- Show real company name, engagement dates, real KPI/action/timeline figures (not sample data).
- Print Report includes latest assessment results with the engagement report.
- Manage Engagement for Master Admin and assigned Implementation Specialists only (not clients).
- Timeline % = time elapsed in the engagement period (not work completed); do not label “On track” only because time passed.
- Duration heading must match agreed engagement length (e.g. 30 / 45 / 60–90 days).
- Preserve the five implementation steps and their records; a new assessment must not wipe KPIs or mark steps complete automatically.

**Prospect → Client**

- Master Admin can convert Prospect to Client when engagement begins, keeping login, contact info, assessment history, and assigned specialist.
- Full client features unlock after Master Admin or assigned specialist enters agreed scope, dates, responsibilities, and KPIs.

**Access**

- Prospects/clients see only their own dashboard and may print their results/reports.
- Master Admin: all dashboards, assign staff, submit for anyone.
- Implementation Specialists: assigned records only (submit, review, resend email, manage implementation).
- Dashboard login does **not** unlock the full proprietary website; website access remains controlled separately by Master Admin.

### 3.2 Workstream A — Account Development Specialist CRM

We understand you want a simple shared CRM where account reps can:

- Enter leads with the specified company / gatekeeper / decision-maker / revenue / sales-force fields
- Require only **Company Name** and **Assigned Account Rep** on create; default status **New Lead**
- Move leads through the defined status list (including required reason for **Not Qualified**, required follow-up details for **Follow-Up Needed**, required appointment date/time for **Appointment Scheduled**)
- Record dated activity history (calls, emails, notes) with author; never overwrite prior entries
- Schedule and complete follow-ups; highlight overdue unfinished follow-ups
- See dashboard totals (Active Leads, Follow-Ups Due Today, Overdue Follow-Ups, Upcoming Appointments) that open matching lists
- Search, filter, export CSV, and use Open/Update and Add Lead
- Receive duplicate warnings (company name, website, or phone) before creating a lead
- Keep **Do Not Contact** records but remove them from calling/follow-up lists
- See and update **only their assigned leads**; Master Admin sees, updates, and assigns all leads
- Persist everything in a shared database across devices
- Include short field help text using your specified wording

---

## 4. What already exists vs what is new

| Capability                                             | Current platform (approx.)                                     | Required by your docs                               |
| ------------------------------------------------------ | -------------------------------------------------------------- | --------------------------------------------------- |
| Assessment authoring & publish                         | Available                                                      | Reuse                                               |
| Client self-assessment & server scoring                | Available                                                      | Keep; extend with staff submit flow                 |
| Zoom-style one-time completion link                    | Available                                                      | Confirm whether to keep alongside footer staff flow |
| Approved client engagement data entry                  | Available (admin)                                              | Extend for specialists + real overview UI           |
| Distinct Prospect vs Client accounts                   | Not as specified                                               | **New**                                             |
| Implementation Specialist + assignment                 | Not as specified                                               | **New**                                             |
| Auto create prospect + temp password email             | Not as specified                                               | **New**                                             |
| Prospect-only dashboard                                | Not as specified                                               | **New**                                             |
| Replace sample “Overview” engagement UI with live data | Partially (separate client pages exist; overview still sample) | **Required**                                        |
| Full Account Development lead CRM                      | Not built                                                      | **New (Workstream A)**                              |

---

## 5. Proposed delivery timeline

Estimates assume: reuse of the current design system; one primary full-stack engineer familiar with this codebase; normal clarification turnaround; testing included. They exclude hosting changes outside the application and major redesigns.

Work is delivered **sequentially**: Assessment / Prospect / Client dashboards (Workstream B), then Account Development Specialist CRM (Workstream A).

| Phase                        | Focus                                                                                                                                             | Duration                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| **Phase 0**                  | Confirm uncleared items (Section 6); lock roles & priority order                                                                                  | **3–5 business days**        |
| **Phase 1**                  | Workstream B foundation: Prospect/Client model, Implementation Specialist + assignments, staff assessment submit, find-or-create, results history | **1.5–2 weeks**              |
| **Phase 2**                  | Results email + temp password + resend; staff auto-open dashboard; prospect dashboard + print                                                     | **1–1.5 weeks**              |
| **Phase 3**                  | Client dashboard live overview (remove sample), assessment history on client view, Manage Engagement for specialists, Prospect→Client conversion  | **1–1.5 weeks**              |
| **Phase 4**                  | Workstream A CRM: lead model, statuses, activities, follow-ups, rep UI, admin assign, duplicates, CSV export                                      | **3–4 weeks**                |
| **Phase 5**                  | End-to-end hardening, permission matrix, UAT fixes                                                                                                | **0.5–1 week**               |
| **Total (both workstreams)** |                                                                                                                                                   | **Approximately 8–11 weeks** |

### Suggested milestones for client demos

1. **Demo B1:** Staff submits assessment → prospect created → results on prospect dashboard + email
2. **Demo B2:** Convert to client → live engagement overview (no sample banner)
3. **Demo A1:** Rep CRM totals + lead create/update + follow-ups + export

---

## 6. Clarified vs uncleared requirements

### 6.1 Treated as clarified (proceed on this basis unless you correct us)

| #   | Topic                                | Working assumption                                                                                             |
| --- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| C1  | Two separate products                | Assessment/Prospect/Client dashboards and the Account Development CRM are both in scope unless you descope one |
| C2  | Reuse UI                             | Prefer existing dashboard branding and patterns; no full visual redesign                                       |
| C3  | Scoring                              | Reuse current approved Sales Alignment questions and scoring (including tie rules)                             |
| C4  | Dashboard ≠ full website             | Login to dashboard does not grant the full proprietary website                                                 |
| C5  | Own data only                        | Prospects/clients never see another person’s dashboard                                                         |
| C6  | Assessment history                   | Multiple assessments retained; latest shown first                                                              |
| C7  | New assessment ≠ wipe implementation | KPIs and implementation records remain when a new assessment is submitted                                      |
| C8  | Sample data                          | Sample/illustrative engagement content removed once a real client engagement is configured                     |
| C9  | CRM create rules                     | New lead needs Company Name + Assigned Account Rep; status starts at New Lead                                  |
| C10 | CRM privacy                          | Reps see only assigned leads; Master Admin sees all                                                            |
| C11 | Activity history                     | Append-only with date/time/author                                                                              |

### 6.2 Uncleared — decisions needed from NORTH POINT SALES GROUP

These items change design and timeline. Please answer before or during Kickoff (Phase 0).

| #   | Topic                              | Why it matters        | Options we need you to choose                                                                                  |
| --- | ---------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------- |
| U1  | **Implementation Specialist role** | Security model & UI   | New role vs reuse/rename today’s Sales Representative accounts                                                 |
| U2  | **Staff assessment entry path**    | Build one flow or two | Footer staff submit **only**, or keep the existing Zoom one-time link **as well**                              |
| U3  | **Prospect login experience**      | Auth screens          | Same login page with a Prospect category, or separate entry                                                    |
| U4  | **“Upcoming Appointments” in CRM** | CRM data model        | Lead’s own appointment field only, or also count existing website booking appointments                         |
| U5  | **Delivery priority**              | Schedule              | Confirm sequential order: Priority 2 (B) then CRM (A), or CRM first then Priority 2                            |
| U6  | **Authorized delivery staff**      | Permissions           | Who else besides Master Admin and Implementation Specialists must keep access?                                 |
| U7  | **Assignment ownership**           | Specialist workflow   | Who may assign/reassign prospects and clients to specialists—Master Admin only, or also specialists?           |
| U8  | **Temp password policy**           | Security/email        | Confirm length/expiry and whether first login must force password change (we assume yes, as written)           |
| U9  | **Print behavior**                 | Browser vs PDF        | Browser print of on-screen results is enough, or a downloadable PDF is required                                |
| U10 | **CRM ↔ Client Won**               | Handoff               | When a lead becomes Client Won, should the system auto-create/link a Client dashboard account, or stay manual? |

Until U1–U5 are answered, the timeline above remains a **planning estimate**, not a fixed commitment.

---

## 7. Out of scope (unless you add it later)

To keep the schedule predictable, the following are **not** included unless newly requested:

- Redesign of the public marketing website beyond footer access to the staff assessment
- Mobile native apps
- Third-party CRM sync (Salesforce, HubSpot, etc.)
- Automated dialer / SMS campaigns
- Changing the proprietary website access policy beyond “dashboard login does not unlock the full site”
- Rewriting assessment question content (we reuse the approved set)

---

## 8. How we will work with you

1. **Kickoff (Phase 0):** resolve Section 6.2 questions; confirm sequential order (B then A, or A then B)
2. **Weekly progress notes** with demo links where possible
3. **UAT checkpoints** at Demo B1, B2, and A1
4. **Change control:** new requirements after kickoff may extend the timeline; we will flag impact before building

---

## 9. Ask of NORTH POINT SALES GROUP

Please reply with:

1. Confirmation that Section 3 matches your intent (or mark corrections)
2. Answers to **U1–U10** (even brief answers help)
3. Preferred sequential order: **Priority 2 (B) then CRM (A)**, or **CRM (A) then Priority 2 (B)**
4. Target start date for Phase 0

Once we have that, we will return a locked milestone calendar with dates.

---

## 10. Closing

We are ready to implement both instruction sets in a structured way: first the assessment / prospect / client dashboard path that supports live meetings and emailed results, then the Account Development Specialist CRM for ongoing lead work—subject to your confirmation of the uncleared items above.

Respectfully,  
**Development team**  
Cyngro — North-Landing / NORTH POINT SALES GROUP platform delivery

---

_Internal file path (for our team): `backend/docs/NPSG-Implementation-Timeline-Assessment-Prospect-Client-and-CRM.md`_  
_You may share this file as PDF/Word export if preferred for client email._
