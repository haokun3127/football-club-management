# Backoffice Integration Contracts

## Scope and signatures

The Ant Design Pro client uses the dedicated cookie/environment boundary, fixed descriptors and owning schemas shared with OpenAPI. Descriptor modules must not import application controllers (circular initialization failures).

- `/backoffice/api/models`: definitions, trials, transitions and `/:id/display`.
- `/backoffice/api/standards`: immutable versions and manual comparison.
- `/backoffice/api/assessment-tasks`: pinned dispatch, entries/handling and explicit publication.
- `/backoffice/api/import-templates`, `/imports/preview`, `/imports/:id/confirm`, `/imports/:id/failures-export`; `/exports/:key`.
- `/backoffice/api/bi-catalog`, `/bi-snapshots`, `/:id`, `/:id/export`; `/workbench`.
- Services/content use fixed resources. Parent presentation is `/clubs/:clubId/app-clients/:clientId/content/presentation` under the existing BFF boundary.

## Configuration and teaching

0033–0038 preserve mappings, metadata, lineage, model/standard versions and teaching authority. Formal publication requires complete compatible rules and an explicit reference; no demo thresholds are seeded. Active/archived content is immutable; copy to edit. Pinned historical tasks remain readable.

Composition references a fixed formal source version/output. `same_assessment` recomputes from this student's current raw inputs, never automatically selected historical/latest scores. Validate units, positive weights, known formulas and the full graph. Display groups/order use an independent revision and model-display history; saving display must not change formula revision. Standards use explicit age-reference/effective dates and units, with manual comparison.

Teaching requires assessment_entry, actor's active coach identity, current assignment and existing publication allowlist. Configuration grant alone is insufficient. Use canonical drafts/publication. Not-assessed requires a reason/revision and creates no score; processed differs from measured/completed. Corrections preserve old confirmed results until republication.

## Typed import and exports

0039 stores batches; 0043 stores scout secrets. Fixed templates, explicit source/external ID and target/revision for updates; max 500 rows; explicit preserve/clear policy and column mapping. Preview stages metadata without business facts. Confirmation rechecks current permissions/references/revisions.

Each row atomically commits fact, raw link, result, audit and receipt. Task/student assessment rows are one revision group; duplicate projects or inconsistent revision/reason fail the group. Canonical workflow lock precedes the shared SQLite transaction; audit callback runs inside it. Never nest BEGIN calls. Validation failures need a corrected preview; transient failures retain safe UUID retry and current authorization.

Scout identity uses the existing keyring/canonical registration. Only masked metadata leaves the encrypted vault; fingerprint and identity-like source ID are keyed/opaque. Decryption validates scoped AAD/key version. Full valid/invalid identities never enter JSON, audit, receipts, UI, failure exports or errors. Missing keys disable import.

Legacy raw identity includes club, connection, external ID and payload hash; preserve existing matching IDs on replay. Different external IDs with identical payload remain distinct.

Exports require export plus current resource/field grants; search/fields/snapshot must agree. Failure exports use the same grants/masking. Export history and UUID replay are atomic.

## BI and workbench

0040 persists immutable snapshots. Cards/detail/charts/XLSX share factVersion. Source correction marks old snapshots stale; new query produces new data. Filters reference owned objects. Training uses corrected facts, excludes cancellation, keeps unknown minutes null. Growth uses current confirmed revisions grouped by student/pinned template, with lineage; drafts/missing/not-assessed are not zero. Stored service snapshots still require current service authority.

Workbench reads actual counts, upcoming non-cancelled events/leave counts, unfinished/unpublished tasks, permitted import failures and service demands. Source links retain record/task IDs. Missing service authority is unavailable/null.

## Services and content

0041 extends existing private_lesson_requests and adds catalog/cases/scout work. Assignment is not acceptance: confirmed/accepted/executing/delivered require owner and explicit evidence; delivered needs feedback. New event/student or task/student associations must match participation/roster; unchanged historical references remain. Parent projections exclude internal handling. No payment/booking/credit/notification side effects. Parent request IDs are UUIDs and SQL commits before memory, avoiding restart counter collisions.

0042 stores branding/banners/plain share/evaluation text/fixed optional features. Public projection includes active/date-valid content and published article links. Reject unsafe image schemes/credentials; colors are six-digit hex. Native feature paths are allowlisted. Content does not alter scores. Presentation API is provided; native shortcut ordering is a separate client decision.

## Errors and verification

400 invalid fields/units/foreign references; 403 missing/revoked grants; 409 stale revisions, altered UUID payload, immutable content or unavailable formal prerequisites. Storage/audit failures roll back facts/links with generic errors.

Required evidence: management rollback/retry/revoke/file-reopen tests; domain mapping/graph; workflow/repository/auth/environment/persistence/scout/training suites; actual ESLint and root check:delivery. Render real builds against disposable SQLite and inspect CSP/readback/conflicts/downloads. Crypto/reopen integration uses a 15-second test timeout for concurrent suites; application timeouts/assertions remain intact.
