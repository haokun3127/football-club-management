# Backoffice Authentication and Browser Boundary

## 1. Scope / Trigger
X16 and B3: a browser must authenticate independently from WeChat app-client Bearer sessions. Initial browser implementation provides login and five read-only business catalogs; it is not completion of the four administrative modules.

## 2. Signatures
- `BACKOFFICE_PUBLIC_URL=https://host/__env/develop/backoffice` (trial substitutes trial; release uses `/backoffice`). Absent configuration disables the browser boundary. Develop alone permits localhost HTTP.
- Migration `0030_backoffice_sessions.sql`: credentials, opaque session hashes and durable rate-limit buckets in the environment-owned database.
- POST `/backoffice/api/login` `{clubId,username,password}`; GET `/backoffice/api/session`; POST `/backoffice/api/logout`.
- GET `/backoffice/api/catalog/:table?search=&offset=`; table enum students/scouts/teams/coaches/events, pages of 20, club derived from the authenticated session.
- `node apps/api/dist/ops/provision-backoffice-command.js --apply` reads private `{clubId,userId,username,password}` JSON from stdin. Existing backed-up develop/trial DB, configured URL and `FCM_IDENTITY_BACKUP_ATTESTED=1` required. `--rotate` explicitly replaces an existing password.

## 3. Contracts
Browser API requests require matching `X-FCM-Environment` and Referer origin/path. Mutations additionally require exact configured Origin. This branch is limited to `/backoffice`; existing mini-program headers and official Referer checks remain unchanged elsewhere. Never derive trusted origins from Host or forward `X-User-Id` as authentication.

Passwords are scrypt N=32768/r=8/p=1 with independent random salts; provisioning requires 16–128 characters. Only existing active owner/admin/operator memberships can sign in. Provisioning never creates users, expands roles, migrates or seeds; reset revokes all previous sessions. Password rotation racing login cannot mint a session from an obsolete hash.

Cookies are environment-named, host-only, path-scoped, HttpOnly, SameSite=Strict, Secure on HTTPS, fixed eight-hour lifetime. Store only SHA-256 token hashes. Every request rechecks the active user, exact membership and administrative role. App-client Bearers cannot authenticate a browser request; browser cookies cannot authenticate mini-program routes. Duplicate cookies are rejected. No generic idempotency replay, ETag or private-cache reuse on this boundary; all browser responses use no-store. No credentials or tokens in JSON responses/localStorage.

Rate limits reserve before password work, persist for 15 minutes: 10 attempts per club/account and 100 per server-observed IP. With the current proxy and no trustProxy configuration, the latter is an aggregate proxy limit; never blindly trust forwarded IP headers. Static HTML uses same-origin Referer policy and a self-only CSP; data is inserted as text, never HTML. Catalogs explicitly whitelist fields, keep active scout-only records separate from formal students, and expose no raw documents/contact/finance fields.

## 4. Validation & Error Matrix
Wrong/missing browser environment/source or disabled runtime boundary: 403 before storage writes. Invalid body/table/query: 400. Invalid password, inactive/non-admin/revoked/expired session: generic 401. Attempt limit: 429 with Retry-After. Missing auth dependency in isolated builders: 503. Storage failure: generic 500, no cookie or leaked SQL. Unknown static asset: 404; no arbitrary file serving.

## 5. Good / Base / Bad Cases
Good: same-environment browser login restores after reload/restart and reads only its club catalog. Base: an empty table is an actual empty result. Bad: relaxing the WeChat Referer guard globally, accepting debug identity, exposing physical database tables, or displaying a local synthetic session as deployed user acceptance.

## 6. Required Tests
`backoffice-auth.test.ts`: no writes on environment mismatch, password failure/rate limit, role revocation, cookie attributes, no raw tokens, duplicate/foreign credentials, file restart, password rotation/expiry/logout, no cached replay, strict catalog whitelist, generic SQL failure and rollback. Existing environment-isolation suite must remain green. Local `verify-backoffice-server.ts` uses a disposable synthetic database and fixed prefix proxy; browser evidence covers actual login, reload, search, logout and subsequent reload. Remote account provisioning, container switch and real-user acceptance are separate pending checks.

## 7. Wrong vs Correct
Wrong: fake `servicewechat.com` Referer or inject an admin user header for a web page. Correct: configure the isolated browser origin/path, authenticate with a password-derived session, reauthorize every business request, and keep mini-program routing protections intact.
