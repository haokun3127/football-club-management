# Backoffice Management Contracts

## 1. Scope / Trigger
The Ant Design Pro application in `apps/backoffice` manages shared club facts through a dedicated browser boundary. It supplements the existing Fastify/SQLite/domain architecture. A menu entry alone is not a completed business workflow.

## 2. Signatures
- GET `/backoffice/api/resources` and GET/POST `/backoffice/api/resources/<fixed-resource>`; GET/PUT `.../:id`. Descriptors in `application/backoffice-resources.ts` are the sole SQL table/field allowlist. OpenAPI consumes the same schemas as routes.
- POST/PUT body: `{values, expectedRevision: string | null, requestId: UUID}`. GET list includes allowed fields, `canWrite`, `canCreate`, total, offset, rows and snapshot. Detail includes the current record and the latest 100 changes.
- GET/PUT `/backoffice/api/grants` uses a grant-set revision. Capabilities: sensitive, export, assessment, assessment_entry, service, finance.
- GET/POST `/backoffice/api/scouts`; POST `.../:id/enroll`. Natural identity deduplication, server keyring and opaque club IDs are reused. Only masked identities enter response/history.
- GET/PUT `/backoffice/api/training-records` reuses the same optimistic training facts as parent/coach clients.
- Migration 0031: purpose-specific location/term/content/drill catalogs, audit, grants, mutation receipts and inactive assignment preservation.

## 3. Contracts
Club and actor come from the active HttpOnly backoffice session. The existing Origin/Referer/environment boundary remains mandatory. No X-User-Id or WeChat token bridge. Operator reads do not authorize writes. Transaction-time membership and active user checks prevent an admin demoted while queued from writing.
Sensitive fields are trimmed before search, response and history. Sensitive resources and finance require explicit grants. Ordinary view permission does not grant export. Replays recheck current permissions and trim their response again. Receipts are scoped by club, actor and UUID; a reused UUID with a different body is rejected.
Writes, audit and replay receipts commit in the shared SQLite queue. Memory projections update after commit. Document projections decode fields explicitly, keep absent coordinates absent, and preserve inherited drill recording capabilities. Inactive locations remain resolvable for historical events; the parent location directory and new-reference options exclude them. Draft/unpublished/expired edited articles do not enter public content.
Calendar subtype is immutable. Training and match extensions save in the same transaction; unprovided required subtype information is rejected. Training correction never writes the credit ledger. Credit rows are append-only; manual corrections append another entry. Assignments are deactivated instead of erased. Club settings update the single authenticated club only.

## 4. Validation & Error Matrix
- Unconfigured browser boundary -> 503; missing/revoked session -> 401.
- Unknown fields, malformed date/UUID, invalid or foreign reference, invalid time range -> 400.
- Missing grant, system catalog mutation, immutable ledger edit -> 403.
- Stale revision -> 409 with a permitted latest projection; reused UUID with changed input -> 409.
- Storage/audit failure -> generic 500, no SQL diagnostics or private request bodies; complete rollback.
- Owner assignment requires owner authority; self-admin access cannot be removed through role edits.

## 5. Good / Base / Bad Cases
Good: edit a student, audit and receipt commit, reload sees the same fact, replay makes no second history row. Base: preserve a historical inactive reference when editing an unrelated field. Bad: overwrite after 409, retain a sensitive replay after revocation, update memory before COMMIT, or count training by debiting a financial ledger.

## 6. Tests Required
`backoffice-management.test.ts`: strict projections and body boundaries, history, idempotency, stale revision, audit rollback, revoked sensitive fields, foreign references, file close/reopen, private draft content, canonical training/match extensions, encrypted scout natural retry/enrollment and independent credit/training writes. Run auth, environment-isolation, persistence, coach-assignment, scout and training suites after affected changes. Use a disposable synthetic database and isolated Chromium for UI edits/reload/history/conflict. Complete root check:delivery before cross-module delivery claims.

## 7. Wrong vs Correct
Wrong: accept an arbitrary table name or route browser calls through the mini-program role resolver.
Correct: resolve a fixed descriptor, authenticate the independent browser session, validate exact fields, commit through the shared queue and publish the committed projection.

For asynchronous drawers, invalidate previous load generations on close or another selection. A stale detail/options response must not replace the current editor. Preserve input after failed saves; after 409 show permitted latest values and require explicit acknowledgement before another save.

## Training catalogs and canonical projection recovery
Migration 0032 adds active/inactive session-plan state; drill document status is also configurable. Used content is immutable while status may change. New selection excludes inactive catalogs; an unchanged historical reference remains readable. Active legacy SessionPlan objects omit the optional status field for compatibility, while browser views explicitly normalize active status for revision hashing.
After writes, refresh only the current club, including newly registered clubs absent from the original seed. Startup must read all persisted club IDs. Assessment catalogs also refresh after committed project/metric edits. System metrics and drills remain read-only. Null and empty optional arrays compare equally when checking protected definitions; unrelated deactivation must not be rejected because a form normalizes an empty array.

Read [Backoffice Integration](./backoffice-integration.md) for configuration, import, BI, service/content and workbench contracts.

## Default mini-program role (2026-10-21)

The existing memberships drawer owns the app-role tab; the generic record Save is hidden there so only Save default role writes this setting. app-role-preferences is admin-only, unique club/client/user, immutable scope on update; defaultRole is nullable and must belong to authorized client/profile roles. lastActiveRole is not an admin-editable field. Reuse audit/revision/requestId receipts. The options service AND strict HTTP optionSchema must both register app-clients. Frontend saves read the direct RecordRow mutation response and detail.record on reread.409 preserves the desired input and requires explicit reread; unchanged uncertain retry retains its requestId. A real two-editor browser check supplements service tests.
