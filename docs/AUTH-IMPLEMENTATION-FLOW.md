# Authentication and Account-Access Flow

## Purpose

This document records the requested account and access policy and the auth
flows implemented so far. The private client dashboard and client-owned data
queries remain future work.

## Account types and access boundaries

| Account type           | How access is obtained                                                  | Intended access                                                                                                                   |
| ---------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Guest / `OTHER`        | No account or sign-in                                                   | Only the public, global landing website.                                                                                          |
| Prospective client     | Submits a consultation request; no login credentials are issued         | Public website and their consultation process. A prospect never receives website credentials.                                     |
| Client / paying client | Requests access and is explicitly approved by the Super Admin           | Authenticated client access; the private dashboard and account-scoped data are future work.                                       |
| Sales representative   | Account is created and removed by the Super Admin; no self-registration | Access to the current website. Further representative permissions will be decided later.                                          |
| Super Admin            | One existing, seeded account                                            | Reviews client access requests and manages representative accounts. No public registration or role selection may grant this role. |

`CLIENT` means an approved paying client, not every visitor or consultation
prospect. A Google account is only an identity/sign-in method; Google
verification does not itself make someone an approved client or grant private
website access.

## Login options and Google sign-in

The login interface provides a category dropdown with these options:

- **Clients** — only previously approved client accounts may sign in.
- **Sales Representatives** — only accounts created by the Super Admin may
  sign in and access the current website.
- **Master Admin** — the existing seeded Super Admin account only. The option
  is not a way to register or grant Master Admin privileges.
- **Other** — guests who continue to the public landing website; this category
  does not grant an authenticated or private account.

Users with an authorized account may authenticate using email/password, with
optional Google Sign-In. Google verifies identity only: it must not create
website authorization or bypass prior approval. The backend must confirm that
the account is active, belongs to the selected eligible category, and has
already been authorized before granting access. The selected dropdown value is
for login routing/presentation only; it is not proof of role and must never
override the account role or approval state stored and checked by the backend.

Prospective clients are not a login category and must not be issued website
credentials merely for submitting a consultation request.

## Required access-request flow

1. A visitor uses the public landing website and may submit a consultation
   request. That visitor is a prospect; do not issue website login credentials
   merely because a consultation was requested.
2. A person seeking client access creates a client account request using
   email/password or Google. Email/password sign-up requires email verification.
3. The request appears in the Super Admin's Access Management page. Until
   approval, no session or protected access is issued, whether the person uses
   email/password or Google.
4. The Super Admin accepts or rejects the request.
5. On rejection, access remains denied. On approval, the client may sign in.
6. If Google is used, it verifies the person's identity and email. It does not
   bypass the access request or approval decision.
7. The Super Admin creates and removes sales representative accounts from
   Access Management. Representatives are not clients and do not gain Super
   Admin privileges.

The approval state must be checked by the backend on every protected request.
Hiding a dashboard link or checking a role only in browser storage is not
authorization.

## Private client dashboard and data ownership

- The private client dashboard is not implemented yet.
- The initial client dashboard scope is limited to the approved client's own
  completed assessments, consultations, and personal information.
- Every assessment and consultation record exposed to a client must be
  associated with that client's account.
- The backend must derive the account identity from the authenticated session
  and scope every query to that account. It must not trust a client-supplied
  account ID to choose whose records are returned.
- A client must not see another client's dashboard or records, including by
  changing a URL, request body, query parameter, or browser storage.
- Other dashboard features stay unavailable until separately approved and
  implemented.
- Prospects do not receive website login credentials. Their consultation
  records remain prospect/CRM records until the business's approved account
  creation process links them to a client account.

## Privilege and role rules

- Keep the one existing seeded Super Admin account. No public signup, Google
  sign-in, request body, or user-editable profile may create or promote an
  account to Super Admin.
- Only the Super Admin can approve/reject client access requests and
  create/deactivate sales representatives. Deactivation revokes existing
  representative refresh sessions; inactive accounts are rejected by JWT
  authentication.
- Self-service signup and Google identity verification must never imply client
  approval. Before approval they create, at most, a pending identity/request
  with no private access.
- The Super Admin's existing login is retained for administration. The rule
  that nobody can sign up or select Super Admin means no _new public account_
  can obtain that role; it does not disable the existing seeded administrator.
- Guest/`OTHER` access is anonymous access to public pages, not an authenticated
  role with private permissions.
- Representative abilities beyond access to the current website remain
  undefined and must be specified separately.

## Current backend baseline

The backend already has NestJS/Prisma authentication primitives and a seeded
Super Admin. Existing work includes:

- Email/password public signup, six-digit signup verification and resend.
- Email/password login, forgot-password, code verification, and password
  update.
- Google ID-token verification and a frontend sign-in button.
- Access/refresh token issuance, refresh rotation, logout, and `/auth/me`.
- Super-Admin-only representative list/create/deactivate endpoints and an
  Access Management page.
- Client access-request persistence, email verification, and Super-Admin
  approve/reject decisions.
- Login category selection and backend category-to-role validation.

`USER` is the stored role for a client. `ClientAccessRequest` tracks
`PENDING`, `APPROVED`, or `REJECTED`; only `APPROVED` accounts may receive a
session. Prospects submitting consultation requests are not converted into
accounts.

The private client dashboard, assessment/consultation ownership links, and
account-scoped client data APIs are not implemented yet. Representative
accounts can authenticate and reach the current public website; a future
representative-only area has not been built.

## Existing auth endpoints

All endpoints use the `/api/v1` prefix unless noted. Every admin management
endpoint is protected by both JWT authentication and the Super Admin role.

| Method and path                                               | Current purpose                                                                                                                                   |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/v1/auth/signup`                                    | Create a pending client request and send an email verification code.                                                                              |
| `POST /api/v1/auth/verify-code`                               | Verify a signup or password-reset code.                                                                                                           |
| `POST /api/v1/auth/resend-code`                               | Invalidate old codes and send a replacement after cooldown.                                                                                       |
| `POST /api/v1/auth/login`                                     | Authenticate with email/password and a required account category; sets HttpOnly access and refresh cookies.                                       |
| `POST /api/v1/auth/google`                                    | Verify Google identity; new client identities become pending requests, not sessions; successful sign-in sets HttpOnly access and refresh cookies. |
| `POST /api/v1/auth/forgot-password`                           | Start password recovery with a generic response.                                                                                                  |
| `POST /api/v1/auth/update-password`                           | Use a valid reset token to update the password and revoke sessions.                                                                               |
| `POST /api/v1/auth/refresh`                                   | Rotate both HttpOnly auth cookies without returning tokens in the response body.                                                                  |
| `POST /api/v1/auth/logout`                                    | Revoke the current account's refresh token and clear both auth cookies.                                                                           |
| `GET /api/v1/auth/me`                                         | Return the authenticated account profile and role.                                                                                                |
| `GET /api/v1/auth/admin/representatives`                      | Super Admin lists representatives.                                                                                                                |
| `POST /api/v1/auth/admin/representatives`                     | Super Admin creates a representative.                                                                                                             |
| `DELETE /api/v1/auth/admin/representatives/:id`               | Super Admin deactivates a representative and revokes sessions.                                                                                    |
| `GET /api/v1/auth/admin/client-access-requests`               | Super Admin lists pending client requests.                                                                                                        |
| `POST /api/v1/auth/admin/client-access-requests/:id/decision` | Super Admin approves or rejects a pending request.                                                                                                |

The client access request is created by the existing signup or Google sign-in
flow. Only the Super Admin endpoints can make a pending request approved or
rejected.

## Email/password and Google identity behavior

Email verification proves control of an email address only. It must not
automatically approve a client access request.

Google sign-in must continue to validate the ID token's signature, issuer,
audience, expiry, and verified-email claim on the backend. The browser sends the
ID token; no browser-supplied role or approval status is trusted.

Under the requested policy, Google email verification does not grant client
access. A new Google client identity creates a pending request and receives no
session. Existing accounts must match the selected category and be approved
before a session is issued.

`GOOGLE_CLIENT_SECRET` is not used by the current ID-token verification flow
and must never be exposed to the frontend. The frontend client ID must match
the backend `GOOGLE_CLIENT_ID`; local and deployed frontend origins must be
authorized in Google Cloud Console.

## Security requirements for implementation

- Enforce account status and role on the backend for every protected route.
- Scope every client dashboard query to the authenticated account identity.
- Never accept client-controlled role, approval status, owner ID, or account ID
  as proof of authorization.
- Ensure rejected, pending, deactivated, and revoked accounts cannot keep
  private access through an existing access or refresh token.
- Maintain the current password hashing, OTP expiry/attempt/cooldown,
  single-use reset token, and refresh-token rotation protections.
- For state-changing requests, reject untrusted browser `Origin` headers and
  requests with auth cookies but no `Origin`; allow only configured frontend
  and API origins. Keep the allowed-origin list exact and environment-specific.
- Swagger documents the HttpOnly access cookie for protected routes. The
  browser sends the cookie after login; do not paste cookie values into
  Swagger's Authorize dialog.
- Never log passwords, OTPs, reset tokens, Google ID tokens, or session tokens.
- Ensure prospect consultation submission does not silently create an
  approved client account or send website credentials.

## Configuration and operational prerequisites

- Configure matching `GOOGLE_CLIENT_ID` and
  `NEXT_PUBLIC_GOOGLE_CLIENT_ID` values and authorize the frontend origins.
- Verify the sender domain in Resend before expecting production email
  delivery. Email template verification or email ownership is not client-access
  approval.
- Configure and publish the existing Resend email templates.
- Apply the new Prisma migration before deploying these auth changes.
- Configure and verify the sender domain in Resend for signup verification
  emails.

## Scope boundary

The approval-gated login flow and Super Admin request/representative
management are implemented in code. The private client dashboard, strict
per-account assessment/consultation isolation, and future representative-only
area remain out of scope until their data and permission requirements are
defined.
