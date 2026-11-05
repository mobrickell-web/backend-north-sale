# Authentication Workflow — Frontend and Backend

This document tracks the requested authentication and account-access flow across
the Next.js frontend and NestJS/Prisma backend. It is a working status document
and can be updated as requirements are confirmed.

**Status:** ✅ complete · 🟡 partially complete · ⬜ pending · ⚠️ external setup/verification

## Agreed account and access rules

| Account type          | Creation / access rule                                                                         | Current intended access                                                              |
| --------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Guest (`OTHER`)       | No account required; continue to the public cover page.                                        | Public cover page only.                                                              |
| Consultation prospect | Submits a public consultation request; does not receive a website account just for booking.    | Public site and consultation process.                                                |
| Client (`USER`)       | Requests an account, verifies email (or Google identity), then waits for Super Admin approval. | Separate client dashboard sign-in; client-specific data/features remain future work. |
| Sales representative  | Created and deactivated by the Super Admin; no self-registration.                              | Private website access.                                                              |
| Super Admin           | Existing seeded account; no public registration or role promotion.                             | Reviews client requests and manages representatives.                                 |

The login category is a routing hint, not proof of authorization. The backend
must validate the stored role, active state, email verification, and client
approval before issuing or accepting a session. Google verifies identity; it
does not grant client approval.

## Private website routing

- `/` is the public cover page. It contains the consultation scheduler,
  company contact information, and separate client and representative login
  links.
- `/` shows the public cover page when unauthenticated. A server-side
  `GET /api/v1/auth/me` role check shows the existing private website at the
  same `/` URL to sales representatives and Super Admins, and redirects
  clients to `/dashboard`. The access cookie uses `/` path scope so it
  reaches both page requests and API requests. Only Super Admins can view
  admin routes.
- `/login` provides one role selector for clients, sales representatives,
  Master Admins, and guests. Both login links on the public cover open the same
  `/login` URL; the visitor selects their role there. Approved clients are sent to
  `/dashboard`, which renders the matching client or Super Admin dashboard
  according to the authenticated role. The client dashboard currently provides
  a minimal signed-in
  account landing page; client-specific records and tools have not been added.
- Appointment cancel/reschedule links remain public so recipients can manage
  an existing appointment without exposing the private website.

## End-to-end flow

```text
Public visitor
  ├─ Guest / Other ───────────────────────────> Public cover page
  ├─ Consultation form ───────────────────────> Prospect booking; no account
  └─ Request client access
       ├─ Email/password ─> Verify email code ─┐
       └─ Google identity ─────────────────────┤
                                               v
                                    Pending client request
                                               |
                                  Super Admin reviews request
                                      ├─ Reject -> no access
                                      └─ Approve
                                           |
                                           v
                              Client may sign in (email or Google)
                                      -> Client dashboard

Super Admin creates representative -> representative signs in
                                    -> Private website access
                                    -> Super Admin can deactivate access

Authenticated account -> HttpOnly access-token and refresh-token cookies
                     -> protected API routes
```

## Chunk 0 — Requirements and access policy ✅

- ✅ Four login choices are represented in the frontend: Clients, Sales
  Representatives, Master Admin, and Other (Guest).
- ✅ A consultation prospect is distinct from a client account.
- ✅ Client account requests require Super Admin approval before protected
  access is granted.
- ✅ Sales representatives are created and removed by the Super Admin.
- ✅ The existing seeded Super Admin is retained; public flows cannot grant
  Super Admin privileges.
- 🟡 Define the exact client dashboard contents, which records belong to a
  client, and any future representative-only permissions before implementing
  those areas.

## Chunk 1 — Database schema and migrations ✅

- ✅ Prisma schema includes account roles, active/email-verification state,
  Google identities, verification codes, password-reset tokens, refresh
  tokens, and client-access requests.
- ✅ Client request state is tracked as `PENDING`, `APPROVED`, or `REJECTED`,
  including reviewer and review timestamps.
- ✅ Migrations exist for the authentication schema.
- ✅ The client-access migration was applied to the configured local database;
  Prisma reported the schema up to date.
- ⚠️ Apply and verify all pending migrations in each deployed environment
  before deploying code that uses the new tables.

## Chunk 2 — Backend authentication and session APIs ✅

- ✅ `POST /api/v1/auth/signup` creates a pending client request and sends an
  email verification code.
- ✅ `POST /api/v1/auth/verify-code` verifies signup or password-reset codes.
- ✅ `POST /api/v1/auth/resend-code` resends a code subject to backend
  cooldown/attempt limits.
- ✅ `POST /api/v1/auth/login` validates email/password and the selected
  account category.
- ✅ `POST /api/v1/auth/google` verifies a Google ID token; new client
  identities become pending requests and cannot bypass approval.
- ✅ Login and Google sign-in return no tokens in the response body; access
  and refresh tokens are set as HttpOnly, Secure, SameSite cookies.
- ✅ `POST /api/v1/auth/refresh` rotates both auth cookies; logout revokes the
  refresh-token cookie and clears both cookies.
- ✅ JWT authentication accepts the HttpOnly access-token cookie, and frontend
  API requests include credentials without storing either token in JavaScript.
- ✅ State-changing requests reject untrusted browser origins; cookie-bearing
  requests without an `Origin` header are rejected. The allowlist includes the
  configured frontend and API origins.
- ✅ Swagger protected routes document the HttpOnly access-cookie scheme
  instead of incorrectly advertising Bearer authorization.
- ✅ `GET /api/v1/auth/me` returns the authenticated account profile.
- ✅ Passwords are hashed; verification and reset tokens have expiry and
  single-use/attempt protections.
- ✅ Pending, rejected, inactive, or unverified client accounts do not receive
  approved client access.

## Chunk 3 — Frontend login, signup, and email verification 🟡

- ✅ `/login` provides the four category choices, email/password login, and
  Google sign-in.
- ✅ Guest selection routes to the public website without authenticating.
- ✅ `/signup` submits client signup to the backend and routes to the
  verification-code page.
- ✅ `/verification-code` submits and resends signup codes. It explains that
  verified client requests still await Super Admin approval.
- ✅ Google Identity Services is wired to the backend sign-in endpoint.
- ⚠️ Google sign-in still depends on correct client-ID configuration and
  authorized local/deployed origins in Google Cloud.
- ⚠️ Test a complete signup, approval, email/password login, and Google login
  against the configured deployed environment.

## Chunk 4 — Super Admin access management ✅

- ✅ Super Admin-only backend endpoints list all client requests and
  approve/reject pending requests.
- ✅ Access Management lists all client requests, including pending, approved,
  rejected, and approved accounts with access revoked.
- ✅ Super Admin can remove and restore access for approved clients; removing
  access revokes active sessions without deleting the client or approval
  history.
- ✅ Approval is blocked until the applicant's email is verified.
- ✅ The frontend Access Management screen lists requests and supports
  approve/reject actions.
- ✅ Super Admin-only endpoints and UI list, create, and deactivate sales
  representative accounts.
- ✅ Representative deactivation revokes active refresh sessions.
- ✅ Admin management endpoints require both authentication and the Super
  Admin role.

## Chunk 5 — Password recovery frontend/backend ✅

- ✅ Backend has forgot-password, verification-code, and update-password
  endpoints. Reset updates the password and revokes existing refresh sessions.
- ✅ Verification UI supports both signup and password-reset code purposes.
- ✅ `/forgot-password` requests a reset code before navigating to verification.
- ✅ Password-reset verification stores the returned `resetToken` in
  tab-scoped `sessionStorage`, not in the URL.
- ✅ `/update-password` submits the new password and clears the reset token
  after a successful update.
- ✅ Recovery screens handle loading, success, and error states.
- ✅ Signup-code resend now reports the 60-second cooldown instead of returning
  a success response without sending a new code. Expired codes no longer block
  resend, and the code lifetime starts after the mail provider accepts it.
- ✅ Auth email delivery fails explicitly when mail is in dry-run mode; SMTP
  connection, greeting, and socket waits have bounded timeouts.
- ✅ Re-submitting the same successfully consumed signup code is idempotent,
  so a browser refresh does not turn a completed verification into a confusing
  expired-code error.
- ⚠️ SMTP authentication and frontend flow were smoke-tested, but end-to-end
  email delivery and password reset with a real inbox/code remain unverified;
  no test inbox was provided.

## Chunk 6 — Client dashboard and account-scoped data ⬜

- ⬜ Build the private client dashboard only after its content and data
  ownership rules are confirmed.
- ⬜ Associate client-owned assessment, consultation, and profile data with
  the authenticated account.
- ⬜ Derive the account ID from the authenticated backend session; never trust
  a client-supplied owner/account ID.
- ⬜ Add tests proving one client cannot read or modify another client's data
  by changing a URL, query, request body, or browser storage.
- ⬜ Define the post-login destination and permissions for approved clients.

## Chunk 7 — Representative access scope 🟡

- ✅ Super Admin can add and deactivate representatives.
- ✅ Deactivated representatives can be reactivated from Access Management
  without creating a duplicate account; their existing password remains
  unchanged.
- ✅ Representatives can authenticate using the Sales Representatives
  category.
- ✅ Deactivation revokes refresh sessions and invalidates their associated
  access tokens. The website checks active sessions every 10 seconds and logs
  out revoked sessions.
- 🟡 Current access is not a separately defined representative workspace.
- ⬜ Define representative permissions and dashboard/content scope before
  building role-specific screens or APIs.

## Chunk 8 — Operational setup and verification ⚠️

- ⚠️ Google sign-in configuration is present, but a successful sign-in remains
  unverified. The browser returned a provider 403 because no identity-provider
  session was available; test with an authorized Google account and origin.
- ⚠️ SMTP authentication succeeded locally. Actual inbox delivery remains
  unverified; verify it in each target environment using an explicitly
  provided test inbox. Do not put backend secrets in frontend variables.
- ⚠️ Configure API URL, CORS, and production secrets for the deployed
  frontend/backend.
- ⬜ Add automated backend tests for signup/code expiry and reuse, approval
  gates, role/category mismatch, representative deactivation, refresh-token
  rotation/revocation, and password reset.
- ⬜ Add frontend tests for auth form flows, route transitions, error states,
  and access-management actions.
- ⬜ Run the complete flow against a non-production environment before
  release; do not use real users or send test emails unexpectedly.

## Current next steps

1. Complete a password-reset test using a supplied inbox and verify a successful
   Google sign-in with an authorized account/origin.
2. Confirm client dashboard and representative access requirements before
   starting Chunks 6–7.
3. Configure and verify deployment settings in Chunk 8.
4. Add regression tests before making broad auth or schema refactors.
