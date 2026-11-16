# Backend Manual Test Guide

Self-serve checklist to exercise every NestJS module end-to-end.
**No code changes required** — use Swagger + browser cookies (or a REST client that stores cookies).

## Setup (once)

1. Start Postgres (`north-sales-postgres` on port `5434` if you use the project Docker setup).
2. In `backend/`: apply migrations (`npx prisma migrate deploy`), then `npm run start:dev`.
3. Open Swagger: `http://localhost:3001/api-docs`
4. Base API prefix: `/api/v1`
5. Auth uses **httpOnly cookies**. In Swagger, after login, cookies are set on `localhost:3001`. Keep the same browser/Swagger tab for authenticated calls.
6. Seeded Super Admin (from `.env`): `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD` (defaults often `admin@northpointsales.com`).

**Roles you will use**

| Role                   | How you get it                                  | Typical login `category` |
| ---------------------- | ----------------------------------------------- | ------------------------ |
| `SUPER_ADMIN`          | Seeded Master Admin                             | `MASTER_ADMIN`           |
| `SALES_REPRESENTATIVE` | Super Admin creates it                          | `SALES_REPRESENTATIVE`   |
| `USER` (client)        | Signup → verify email → Super Admin **APPROVE** | `CLIENT`                 |

---

## Recommended test order

1. Health
2. Auth (full)
3. Appointments (public + admin)
4. Contact
5. Assessments (admin authoring + public published GET)
6. Engagement admin (items 2–6) + client dashboard reads
7. Client assessment self-complete
8. Zoom on-behalf (rep)
9. Reports upload / publish / download
10. Audit logs

---

# 1. Health module

**Purpose:** Liveness for monitors (paths are **outside** `/api/v1`).

| Method | Path            | Auth | Expect       |
| ------ | --------------- | ---- | ------------ |
| GET    | `/health`       | none | 200          |
| GET    | `/health/live`  | none | 200          |
| GET    | `/health/ready` | none | 200 if DB up |

**Flow:** Probe → process/DB status. No cookies.

---

# 2. Auth module (every flow)

**Purpose:** Account identity, email verification, dual cookies (access + refresh), client approval gate, Super Admin access management for clients + reps.

## 2.1 High-level auth flow

```
Guest
  │
  ├─ Signup (USER) ──► verify-code (SIGNUP) ──► PENDING access request
  │                                              │
  │                         Super Admin APPROVE ─┘──► can login as CLIENT
  │                         Super Admin REJECT  ──► login always 403
  │
  ├─ Login email/password + category match
  ├─ Google login (identity only; still needs approval if CLIENT)
  ├─ refresh (rotate refresh cookie, new access)
  ├─ logout (revoke refresh)
  ├─ forgot-password → verify-code (PASSWORD_RESET) → update-password
  │
  └─ Super Admin only:
       list/decide client access requests
       create/deactivate/restore representatives
       revoke/restore approved client access
```

## 2.2 Public / self-service endpoints

### A) Signup → verify email

| Step | Method | Path                       | Body (example)                                       | Expect                              |
| ---- | ------ | -------------------------- | ---------------------------------------------------- | ----------------------------------- |
| 1    | POST   | `/api/v1/auth/signup`      | `{ "name", "email", "password" }`                    | 202, code emailed (or dry-run mail) |
| 2    | POST   | `/api/v1/auth/verify-code` | `{ "email", "purpose": "SIGNUP", "code": "123456" }` | 200 verified                        |
| 3    | POST   | `/api/v1/auth/resend-code` | `{ "email", "purpose": "SIGNUP" }`                   | 202 (rate-limited)                  |

**Checks**

- Signup does **not** grant dashboard access.
- Login as `CLIENT` before approve → **403** (pending / not approved).
- Wrong category on login (e.g. client account + `MASTER_ADMIN`) → **403**.

### B) Login / session

| Step | Method | Path                   | Body                                                  | Expect                                      |
| ---- | ------ | ---------------------- | ----------------------------------------------------- | ------------------------------------------- |
| 1    | POST   | `/api/v1/auth/login`   | `{ "email", "password", "category": "MASTER_ADMIN" }` | 200 + cookies                               |
| 2    | GET    | `/api/v1/auth/me`      | —                                                     | 200 profile (`id`, `name`, `email`, `role`) |
| 3    | POST   | `/api/v1/auth/refresh` | cookies only                                          | 200 new cookies                             |
| 4    | POST   | `/api/v1/auth/logout`  | cookies                                               | 200 revoked                                 |

**Login categories (must match account role)**

- `CLIENT` ↔ `USER`
- `SALES_REPRESENTATIVE` ↔ `SALES_REPRESENTATIVE`
- `MASTER_ADMIN` ↔ `SUPER_ADMIN`

**Checks**

- Bad password → 401
- Inactive account → rejected
- After logout, `/auth/me` → 401
- Throttle: login capped (~5/min)

### C) Google login

| Method | Path                  | Body                        | Notes                                           |
| ------ | --------------------- | --------------------------- | ----------------------------------------------- |
| POST   | `/api/v1/auth/google` | `{ "idToken", "category" }` | Needs real Google ID token + `GOOGLE_CLIENT_ID` |

**Checks**

- Google proves identity only.
- New Google client still needs Super Admin approval before private access.
- Category mismatch still denied.

### D) Forgot / reset password

| Step | Method                  | Path                           | Body                                               | Expect                     |
| ---- | ----------------------- | ------------------------------ | -------------------------------------------------- | -------------------------- |
| 1    | POST                    | `/api/v1/auth/forgot-password` | `{ "email" }`                                      | 202 (always vague message) |
| 2    | POST                    | `/api/v1/auth/verify-code`     | `{ "email", "purpose": "PASSWORD_RESET", "code" }` | 200 + `resetToken`         |
| 3    | POST                    | `/api/v1/auth/update-password` | `{ "resetToken", "password" }`                     | 200                        |
| 4    | Login with new password | `/api/v1/auth/login`           | —                                                  | 200                        |

## 2.3 Super Admin access-management endpoints

Login first as Master Admin.

| Method | Path                                                     | Purpose                                                          |
| ------ | -------------------------------------------------------- | ---------------------------------------------------------------- |
| GET    | `/api/v1/auth/admin/client-access-requests`              | List pending/approved/rejected                                   |
| POST   | `/api/v1/auth/admin/client-access-requests/:id/decision` | Body `{ "decision": "APPROVE" \| "REJECT", "rejectionReason?" }` |
| DELETE | `/api/v1/auth/admin/clients/:id/access`                  | Revoke approved client (sessions killed)                         |
| POST   | `/api/v1/auth/admin/clients/:id/access/restore`          | Restore revoked approved client                                  |
| GET    | `/api/v1/auth/admin/representatives`                     | List reps                                                        |
| POST   | `/api/v1/auth/admin/representatives`                     | `{ "name", "email", "password" }` create rep                     |
| DELETE | `/api/v1/auth/admin/representatives/:id`                 | Deactivate rep + revoke sessions                                 |
| POST   | `/api/v1/auth/admin/representatives/:id/restore`         | Reactivate rep                                                   |

**Auth checks to run**

- Call any `/auth/admin/*` as client or rep → **403** (+ audit `ACCESS_DENY`).
- Approve client → client can login with `category: "CLIENT"`.
- Reject client → login stays 403.
- Deactivate client → existing cookies fail on `/me` / refresh.
- Create rep → login with `SALES_REPRESENTATIVE`.
- Deactivate rep → rep login fails / sessions revoked.

## 2.4 Auth acceptance matrix (quick)

| Scenario                        | Expected                                       |
| ------------------------------- | ---------------------------------------------- |
| Signup without verify           | Cannot usefully login as approved client       |
| Verified but pending            | Login 403 pending                              |
| Approved client                 | Login OK; role `USER`                          |
| Wrong category                  | 403 category mismatch                          |
| Rep hits admin API              | 403                                            |
| Client hits admin API           | 403                                            |
| Admin hits client API           | 403 (`ClientUserGuard`)                        |
| Refresh after logout            | 401                                            |
| Cookie from other origin (prod) | Origin middleware may 403 state-changing calls |

---

# 3. Appointments module

**Purpose:** Public booking + token manage/reschedule/cancel; Super Admin list/detail/status.

## Flow

```
Prospect POST /appointments
  → confirmation email (links use FRONTEND_URL)
  → admin sees in GET /admin/appointments
Prospect GET /appointments/manage/:token
Prospect PATCH /appointments/:token/reschedule
Prospect DELETE /appointments/:token/cancel
Prospect GET /appointments/:token/calendar.ics
Admin PATCH /admin/appointments/:id/status → COMPLETED | CANCELLED
```

## Test steps

1. **Unauthenticated** `POST /api/v1/appointments` with valid booking body (see Swagger schema).
2. Copy `rescheduleToken` / `cancelToken` from response or admin detail.
3. `GET /api/v1/appointments/manage/{token}` → appointment summary.
4. Reschedule once; cancel another booking; try cancel twice → expect conflict/error.
5. Login as Super Admin → `GET /api/v1/admin/appointments` (tabs via query if present).
6. `GET /api/v1/admin/appointments/:id` → history/logs.
7. `PATCH .../status` with `{ "status": "COMPLETED" }` then try invalid transitions per API errors.
8. Call admin appointments as client/rep → 403.

---

# 4. Contact module

**Purpose:** Public contact form email.

| Method | Path              | Auth |
| ------ | ----------------- | ---- |
| POST   | `/api/v1/contact` | none |

**Test:** Valid body → 200/202; invalid validation → 400. Check SMTP / `MAIL_DRY_RUN`.

---

# 5. Assessments module (authoring + published)

**Purpose:** Super Admin authors assessment JSON; only `PUBLISHED` is readable by slug; client edition strips scoring internals.

## Flow

```
Admin create DRAFT → edit document → PATCH status PUBLISHED
  → GET /assessments/:slug returns client-safe published doc
Admin archive/draft → public GET → 404
```

## Admin endpoints (Super Admin cookie)

| Method | Path                                   |
| ------ | -------------------------------------- |
| POST   | `/api/v1/admin/assessments`            |
| GET    | `/api/v1/admin/assessments`            |
| GET    | `/api/v1/admin/assessments/:id`        |
| PATCH  | `/api/v1/admin/assessments/:id`        |
| PATCH  | `/api/v1/admin/assessments/:id/status` |
| DELETE | `/api/v1/admin/assessments/:id`        |

## Public / published

| Method | Path                        | Auth                                  |
| ------ | --------------------------- | ------------------------------------- |
| GET    | `/api/v1/assessments/:slug` | none (published only, client-edition) |

**Test**

1. Create assessment `slug: "sales-alignment"` if missing (seed may already exist).
2. Publish → GET by slug → 200.
3. Set DRAFT → GET slug → 404.
4. Rep/client must **not** get admin CRUD (403).

---

# 6. Assessment instances (client + Zoom + admin results)

**Purpose:** Per-client instance; self submit or Zoom on-behalf; admin views results / issues token.

## Flows

### A) Client self-complete

```
Client GET /client/assessment
Client POST /client/assessment/start  { "slug": "sales-alignment" }
Client POST /client/assessment/:instanceId/submit  { "answers": { ... } }
  → server scores → COMPLETE → appears on GET /client/dashboard
```

### B) Admin Zoom path

```
Admin POST /admin/clients/:clientId/instances  { "slug": "sales-alignment" }
Admin POST /admin/instances/:id/on-behalf
  → { token, path: "/on-behalf/..." }
Rep (or Admin) GET /on-behalf/:token
Rep POST /on-behalf/:token/submit { answers }
  → token consumed; client dashboard shows same result
```

### C) Admin results APIs

| Method | Path                                        |
| ------ | ------------------------------------------- |
| GET    | `/api/v1/admin/clients/:clientId/instances` |
| GET    | `/api/v1/admin/instances/:id`               |
| POST   | `/api/v1/admin/clients/:clientId/instances` |
| POST   | `/api/v1/admin/instances/:id/on-behalf`     |

**On-behalf**

| Method | Path                              | Auth                   |
| ------ | --------------------------------- | ---------------------- |
| GET    | `/api/v1/on-behalf/:token`        | Rep **or** Super Admin |
| POST   | `/api/v1/on-behalf/:token/submit` | Rep **or** Super Admin |

**Checks**

- Client cannot call on-behalf (403).
- Reuse token after submit → invalid/expired.
- Duplicate instance create for same client+assessment → 409.
- Completed instance cannot get new on-behalf token (conflict).
- `GET /admin/instances/:id` shows score when `COMPLETED`.

---

# 7. Engagement module (items 2–6)

**Purpose:** Super Admin writes client-scoped baselines / improvements / KPIs / milestones / reports; client reads own published data only.

## Admin flow (per approved `clientId`)

Under `/api/v1/admin/clients/:clientId/`:

| Resource       | Methods                                                                |
| -------------- | ---------------------------------------------------------------------- |
| `baselines`    | GET, POST, GET/:id, PATCH/:id, DELETE/:id                              |
| `improvements` | GET, POST, GET/:id, PATCH/:id, DELETE/:id                              |
| `kpis`         | GET, POST, GET/:id, PATCH/:id, DELETE/:id                              |
| `milestones`   | GET, POST, GET/:id, PATCH/:id, DELETE/:id                              |
| `reports`      | GET, POST `reports/upload` (multipart), GET/:id, PATCH/:id, DELETE/:id |

Publish report:

| Method | Path                                |
| ------ | ----------------------------------- |
| POST   | `/api/v1/admin/reports/:id/publish` |

## Client flow (USER cookie; no clientId in URL)

| Method | Path                                  |
| ------ | ------------------------------------- |
| GET    | `/api/v1/client/dashboard`            | aggregate 1–6       |
| GET    | `/api/v1/client/baselines`            |
| GET    | `/api/v1/client/improvements`         |
| GET    | `/api/v1/client/kpis`                 |
| GET    | `/api/v1/client/milestones`           |
| GET    | `/api/v1/client/reports`              |
| GET    | `/api/v1/client/reports/:id`          |
| GET    | `/api/v1/client/reports/:id/download` | guarded file stream |

**Checks**

1. Create baseline/KPI/etc. for client A as admin.
2. Login as client A → see data on `/client/dashboard`.
3. Login as client B → **must not** see A’s data.
4. Unpublished report → client list omits it; download → 404 + deny audit.
5. Publish → client can download.
6. Rep cannot hit `/admin/clients/...` (403).
7. Do not send `clientId` in body (forbidden by validation).

---

# 8. Audit module

**Purpose:** Immutable trail of sensitive actions.

| Method | Path                                       | Auth        |
| ------ | ------------------------------------------ | ----------- |
| GET    | `/api/v1/admin/audit-logs?clientId=&take=` | Super Admin |

**Actions you should see after earlier tests**

- `ACCESS_ALLOW` / `ACCESS_DENY` (approve/reject/revoke/login deny / wrong-role)
- `PUBLISH` (assessment status / report)
- `CREATE` / `UPDATE` / `DELETE` (engagement + instances)
- `ON_BEHALF` (token issue)
- `COMPLETE` (submit)
- `DOWNLOAD` (report download)

**Check:** Rep/client cannot list audit logs (403).

---

# 9. Webhooks module (optional)

| Method | Path                 | Notes                                                           |
| ------ | -------------------- | --------------------------------------------------------------- |
| POST   | `/webhooks/sendgrid` | Outside `/api/v1`; needs valid SendGrid signature if configured |

Skip in local unless you have webhook signing keys.

---

# End-to-end “golden path” (one sitting)

Use three browser profiles or clear cookies between roles.

1. **Admin login** → create rep → approve a new signup client.
2. **Admin** publish `sales-alignment` if needed.
3. **Admin** add baseline + improvement + KPI + milestone for that client; upload + publish a report.
4. **Client login** → `GET /client/dashboard` shows items 2–6; download report.
5. **Client** start + submit assessment → score on dashboard.
6. **Admin** open `GET /admin/instances/:id` → same score.
7. (Optional retake / new client) Admin create instance → issue on-behalf → **Rep login** → GET/POST on-behalf → complete.
8. **Admin** `GET /admin/audit-logs` → confirm publish/complete/on-behalf/download/access rows.
9. Negative: client tries `/admin/*` → 403; rep tries `/client/*` → 403; client B cannot download A’s report.

---

# Swagger tips

- Prefer **Authorize / cookie session** by calling login in the same origin as Swagger (`localhost:3001`).
- For multipart report upload, use Swagger’s file field on `POST .../reports/upload`.
- If you get **429**, wait 60s (login/signup throttles) or use `/auth/me` (skip-throttled).
- If **Failed to fetch**, confirm backend is up and CORS allowlist includes your frontend origin (local: `http://localhost:3000`).

---

# Module map (cheat sheet)

| Module               | Who                                          | Core idea                              |
| -------------------- | -------------------------------------------- | -------------------------------------- |
| Health               | Anyone                                       | Process/DB alive                       |
| Auth                 | All roles                                    | Identity, cookies, approval, admin IAM |
| Appointments         | Public + Admin                               | Book/manage meetings                   |
| Contact              | Public                                       | Lead email                             |
| Assessments          | Admin + published GET                        | Author & publish forms                 |
| Assessment instances | Client / Rep+Admin on-behalf / Admin results | Complete & score                       |
| Engagement           | Admin write / Client read                    | Baselines→reports                      |
| Audit                | Admin read                                   | Who did what                           |
| Webhooks             | Provider                                     | Email events                           |

---

# Related docs

- `AUTH-IMPLEMENTATION-FLOW.md` — policy & account rules
- `CLIENT-DASHBOARD-IMPLEMENTATION-FLOW.md` — dashboard chunks 0–12
- Swagger UI — live request/response contracts

When a check fails, note **status code + message + which role/cookie** you used; that usually pinpoints guard vs validation vs business conflict (`400`/`403`/`404`/`409`).
