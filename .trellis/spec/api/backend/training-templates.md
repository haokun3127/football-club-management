# Course templates and reviewed copy

- BFF routes are under `coach/training-content/{templates,preview,apply}` and require an authenticated coach/admin plus an active coach app client. Personal templates are visible only to their author; club templates are readable by authorized coaches and created only by administrators.
- Templates contain reusable SessionPlanBlock snapshots. Identify friendly content through `TrainingDrill.recordingCapability === 'friendly_match'`, never a name match. Omit the whole block and recalculate count/minutes. Do not copy opponents, scores, game state, attendance or financial entries.
- Preview returns the source fingerprint, excluded names, source content and each authorized future training event's fingerprint/current content. No target is preselected. C06 offers explicit merge or replace after target selection; the template modal retains explicit replace. Empty-after-exclusion sources cannot be applied.
- Apply revalidates source visibility/version, target planning permission, club, type, future time, scheduled state and fingerprint. Results are per target; the caller must explicitly select merge/replace, with no implicit overwrite. A stale target returns conflict, and a stale source rejects the request.
- Persistent application writes the plan and session in one shared SQLite transaction and updates in-memory projections only after commit. Injected persistence failure must leave both DB and projection unchanged. Preserve original plan creation time on replacement.
- Migration 0025 persists template snapshots and authorship; tests cover private visibility, public-write denial, capability exclusion, source/target conflicts, rollback and file-DB reopen. The content-library administrator still needs a UI to configure friendly capabilities; this contract does not imply that UI or the friendly scoring flow is complete.

## C06 reviewed merge and preview (2026-10-04)

### Scope / trigger
Existing-course copy at `pages/coach/content-copy/index?eventId=...`, Figma `214:2290`. The workbench copy entry navigates here only when `canEditTraining` is true. Template save/apply remains separate.

### Signatures
- `POST .../coach/training-content/preview` retains `{sourceEventId}` or `{sourceTemplateId}` and adds each target's `outcomes: {merge, replace}`. Each outcome has `{items, count, configuredMinutes}`.
- `POST .../coach/training-content/apply`: `targets[].action` is `merge | replace | skip`. Source and target revisions remain required; 1–20 unique targets.

### Contracts
Merge keeps all existing blocks, their order, minutes and notes, and appends incoming blocks only if their stable `drillId` is absent. It does not collapse existing repetitions or match by names. Source friendly-match blocks are excluded before merge; a target's existing friendly content remains. Replace uses only reusable source blocks. Both modes derive objective IDs, metric IDs and minutes from the final blocks and reuse the existing per-target SQLite transaction and revision check. Neither mode writes assessment results, attendance, ledger entries or event scheduling fields.

Preview and apply use the same merge function. Source revisions additionally hash referenced drill definitions, so catalog edits affecting exclusion or derived metadata invalidate a previous preview. A template/course plan revision alone is insufficient.

### Validation / errors
Source/catalog change → 409. Target change/cancel/start or revision mismatch → per-target `conflict`; inaccessible target → `forbidden`; transaction failure → `failed` with no plan/session or memory projection partial write. Empty reusable source → 400. Missing preview outcomes (older server) blocks C06 rather than inventing merge numbers. Missing/duplicate/unrecognized apply results are unconfirmed, never success. After any submit result or network failure, C06 requires fresh preview and explicit target selection before another write.

### Good / base / bad
- Good: source A=7/B=9, target A=20/Friendly=30 → merge A=20/Friendly=30/B=9, 59 minutes; source friendly content never copied.
- Base: no selected target or no reusable source → submit disabled.
- Bad: a failed response triggers blind replacement retries or applies a different source catalog than the user previewed.

### Tests
`apps/api/test/training-templates.test.ts`: both modes' preview equals saved blocks/minutes, target notes retained for merge, source catalog changes rejected, parent denied, repeated stale apply conflicts, injected session-write failure rolls back DB and projection. Existing test retains file reopen and template visibility checks.
`pages/coach/content-copy/index.test.mjs`: explicit selection/cancel, server-derived mode preview, revisions, per-course conflicts, malformed results, unloaded callbacks, max20, empty/old server. `pages/coach/event/index.test.mjs`: permission-gated, encoded source navigation. Task `verify-c06-design.cjs` checks rendered interaction using temporary mock requests after actual AppID/develop verification and restores session/request in finally; this is not real-user E2E evidence.

### Wrong / correct
Wrong: concatenate source and target, recompute different frontend numbers, retry overwrites after transport errors.
Correct: `mergeTrainingBlocks(existing, reusableSource)` drives server preview and apply; UI shows returned outcomes and re-previews after uncertain writes.


## C04 direct edit uses the same atomic boundary (2026-10-05)

1. **Scope:** existing course content editing, preserving C03-02/R03 online selection and allowing friendly-match content in the course. Transfer exclusion rules are unchanged.
2. **Signatures:** workbench adds `trainingContentRevision` (64 lowercase hex characters). `PUT .../coach/events/:eventId/training-projects` accepts unique `projectIds`, `expectedRevision`, optional `intensity`/`note`. Revision is required by the route after auth; missing ->428 `training_revision_required`. Client helper signature is `saveCoachTrainingProjects(eventId, projectIds, expectedRevision, note?)`.
3. **Contract:** C04 captures the revision it read, never fetches a newer one just before submitting. `applyTrainingContent({operation:"edit",...})` uses the existing plan+session SQLite transaction, hash recheck, and post-commit memory projection. `operation` is an internal store flag, not accepted from HTTP. Direct editing retains the existing non-cancelled course policy; default copy/template application still requires a future scheduled target. Intensity is preserved when omitted. The legacy selected-ID replacement semantics and catalog-derived duration behavior are retained; this does not add reorder/custom-duration editing.
4. **Errors:** malformed revision/duplicate IDs ->400; no revision ->428; stale event/session/plan ->409 `training_content_conflict`; revoked planning scope ->403; cancelled ->409; persistence failure ->500 `training_content_save_failed` with no database detail leakage or partial plan/session/memory write. UI preserves chosen IDs but disables another write until explicit reload, including after an uncertain network result.
5. **Cases:** good: one coach saves and the second receives409 without overwriting; base: no version/new server unavailable ->read-only error; bad: silently replace the user's expected revision with the latest or call `saveSessionPlan` before a separate session write.
6. **Tests:** `training-content-edit.test.ts` verifies read revision, missing/stale refusal, SQL-trigger rollback of plan/session and projections, cancellation and redacted error. Existing persistence restart tests now read a revision before write; copy tests retain their stricter future-only behavior. C04 controller verifies passed revision, permission, preserved choices, serialized save/readback and unloaded callbacks; native script checks the selection path.
7. **Wrong/correct:** wrong: save plan, then independently ensure session; correct: authenticated route builds the intended plan then calls the revision-checked atomic store operation.

**Rollout compatibility:** an older mini-program that omits `expectedRevision` can no longer save this endpoint on the new API (428). Deploy this API and the version-aware client together to isolated develop/trial. No production deployment occurred; a future formal rollout must explicitly handle old-client compatibility, not reuse the nonproduction rollout blindly. Environment-header compatibility and routing guard remain separate and tested.
