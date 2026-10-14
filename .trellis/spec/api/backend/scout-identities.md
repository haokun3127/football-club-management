# Scout Identities

## 1. Scope / Trigger
SC01 / REQ-ORG-003: club scout registration and deduplication. This contract covers the standalone library; event roster edits now follow [temporary-rosters.md](./temporary-rosters.md). Enrollment and privileged identity correction remain separate work. No automatic team/guardian/financial relationship follows registration.

## 2. Signatures
GET/POST `/clubs/:clubId/app-clients/:clientId/coach/scout-players`; GET `.../scout-players/:studentId`. POST accepts only name and identityNumber. Responses whitelist student identity, masked document, birth date and status. GET detail lists only activities owned by or in a team accessible to the active coach. Activity membership is not proof of attendance.
`ScoutPlayerRepository.create` returns `{ created, student, player }`; memory projection updates only after transaction commit. Migration 0028 separates global person, keyed digest aliases, club student association and scout profile.

## 3. Contracts
Explicit Bearer, current active coach role/profile and active app-client coach entrypoint required. Club and actor come from authenticated route context. Natural identity uniqueness makes retries return the same student; generic HTTP idempotency caching is disabled for this POST so revocation is rechecked and sensitive-body fingerprints are not retained there. Name conflicts and legacy external_ref/raw-or-SHA256 document matches require review; never merge by name or create another legacy student automatically.
SCOUT_IDENTITY_KEYRING is server-only JSON: activeVersion and keys array containing version plus independent digestKey/encryptionKey (256-bit hex). HMAC-SHA256 identifies documents; AES-256-GCM with fresh nonce and person/version AAD encrypts them. Keep all registered historical versions unchanged when adding a new active key. Existing ciphertext is not rewritten during rotation. Fingerprint mismatch or missing historical key fails startup; missing entire config disables creation. Back up keys separately from database, never print values, use distinct develop/trial keys. Identity validation covers GB 11643 structure/date/checksum; not authentic identity verification or historical address-code verification.
Client does not store entered documents in persistent storage. Clear them after confirmed result or deliberate exit; preserve input on failure. Verify returned name/masked suffix/id before success. Ignore stale/unloaded callbacks. Render no invented observation/participation records.

## 4. Validation / Error Matrix
No Bearer or revoked/wrong-client session: 401. Pending/wrong role: 403. Invalid input/extra actor field: 400. Identity mismatch or legacy review: 409. Missing configuration: 503. SQL failure: generic 500 scout_create_failed and full transaction rollback. Created: 201; natural retry: 200 created=false. Search supports name and exact four-character document suffix; bounded pagination.

## 5. Good / Base / Bad Cases
Good: retry same document/name returns existing club student and no new membership. Base: another club uses separate student/profile, same internal person; no cross-club profile is returned. Bad: log raw document, cache it locally, silently merge same-name students, infer actual attendance from a roster, or reuse develop keys in production.

## 6. Required Tests
scout-identities.test.ts: public standard sample validation, concurrent repeat, encryption/masking, club separation, unchanged team/guardian/ledger, failure rollback, file restart and additive key rotation. scout-player-routes.test.ts: Bearer/role/client boundaries, actor spoof, SQL failure/no memory write, natural retry, revoked-token retry, pagination and filtered history. Mini scout/index.test.mjs: stale requests, paging/search, failed input preservation, matching response, discard and unload. verify-scout-library.cjs: actual native layout and interactions with synthetic local transport only; not real-account E2E.

## 7. Wrong vs Correct
Wrong: accept identityNumber as a student URL or login credential. Correct: use opaque club student IDs; expose only masked identity, with active authorization on every operation. No production migration or formal WeChat release is authorized by this contract.
