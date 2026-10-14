# Public presentation and confirmed child results

## 1. Scope / trigger
REQ-PAR-001 / REQ-EVA-001 / REQ-ASM-006: Native consumers must use actual backoffice content and confirmed facts without exposing operational data.

## 2. Signatures
GET `.../content/presentation` returns branding, active/date-valid banners and fixed optionalFeatures. GET `/clubs/:clubId/app-clients/:clientId/parent/students/:studentId/confirmed-results` returns `{student:{id,name,teams:[{name}]},confirmedResults}`. Rows retain raw `value`, unit, task/event/occurredAt/recordedAt/templateVersionId; `mapping` is null or `{integerScore,grade,rawScoreVersionId,gradeVersionId,mappedAt}`. Schema lives in parent-result-schemas.ts and OpenAPI uses the same schema.

## 3. Contracts
Parent result access requires an active parent app session and actual guardian relationship. Scope is the child's club; no unscoped legacy facts acquire fabricated team provenance. Reuse confirmedStudentResults publication-pointer selection: old confirmation remains during revision drafts; superseded confirmations do not become extra attempts. No note/recorder/contact fields. Missing mapping is shown explicitly; never infer a score/grade from raw values.

Native home reads public content via environment-aware request. Failure leaves core data usable, indicates unavailable configuration and blocks saving shortcuts until reread. Fixed allowlist accepts known keys/routes only; four core defaults remain, extra options require active public configuration. Select/replace/swap exactly four distinct actions. Preferences use environmentStorageKey plus club/client/user ID, exclude old global keys, and are revalidated against the current catalog; withdrawn choices are replaced by safe defaults. Storage failure retains the draft. New parent results route reuses a typed results page factory; parent has no teammate switch.

## 4. Validation / error matrix
Missing/non-parent session or unbound child: auth error/403 before read. Missing student:404. Empty confirmed facts:200 with empty list. Raw zero/decimal retained. Invalid route/configuration is not navigable. Missing user identity, duplicate/wrong count/unavailable shortcut: refuse save. Transient configuration failure is not reported as a successful settings refresh.

## 5. Good / base / bad cases
Good: configured banner and a saved four-action order reappear, another account gets its own order; guardian sees4.28 seconds/80/A+ plus both actual rule versions. Base: no configured content uses established core defaults, no mapped score displays missing mapping. Bad: exposing a generic student record to a parent, arbitrary config URLs as feature routes, inventing zero grades, or merging cross-version charts.

## 6. Tests required
public-content-release.test.ts exercises actual HTTP guardian/coach rejection, raw/mapping/version whitelist, configurable phrase history and retired reselection. club-presentation.test.mjs covers account/club/env namespace, reopen order, invalid routes/duplicates and withdrawn choices. Native results/controller regressions preserve raw zero and use the guardian endpoint. Official Native rendering is required separately; tests do not prove Babel-enhanced compiled modules or device login.

## 7. Wrong vs correct
Wrong: render latest radar as raw results or store a global `shortcuts` key. Correct: read confirmed raw facts and optional mapping, retain their versions, and resolve preferences only for the active environment/account and fixed catalog.
