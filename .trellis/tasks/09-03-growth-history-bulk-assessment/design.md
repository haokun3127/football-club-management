# Technical Design

## Design and navigation boundary

The existing parent Growth API already exposes a typed growth timeline and lesson statistics. Extend its view model only where it cannot identify source detail or cumulative attendance at a specific event. Parent pages remain thin renderers over this API model: Growth is the entry point, milestones is the complete timeline, and dedicated full-screen routes provide match and ability-update detail.

The coach assessment flow keeps the existing task and assessment submission contracts. The mini-program owns only transient drafts, keyed by `assessmentTaskId:projectId`; saved entries are reconstructed from the API so a reload never depends on local draft state.

## API and data flow

1. `buildStudentGrowthTimeline` produces training records with event identity, attendance-derived cumulative `attendedLessons` / `scheduledLessons`, source content assessments, and match records with event identifiers.
2. It produces ability update records from training-content assessments and semester assessment metric records, including source reference and prior/current normalized values when the prior record exists.
3. The parent pages navigate with immutable route parameters (`studentId`, `eventId`, `timelineItemId` / source type) and fetch their visible detail through existing app-client endpoints or a narrowly scoped detail route where the aggregate omits needed fields.
4. The coach task detail derives an ordered project list from the task template/configuration. It loads the roster for the task team and projects existing saved scores onto that roster.
5. Batch entry prepares WXML-safe row fields in TypeScript. It posts each changed student's assessment through the existing assessment endpoint, always including `assessmentTaskId`.

## Compatibility and risks

- Attendance progress is calculated server-side so every parent client sees identical historical denominators.
- Existing per-student assessment routes stay compatible; the new batch route is additive and becomes the primary navigation.
- A task can have projects without an automatic conversion rule. Those rows explicitly display a manual normalized-score control rather than pretending a raw number maps to a score.
- All Figma changes are V7 copies placed beside the current V6 set. No historic node is moved or deleted.
- The mini-program compiles WXML only with precomputed arrays/strings; no JavaScript array methods are invoked from WXML.

## Rollback shape

Each feature is isolated behind a new route/view-model branch or additive API field. Reverting its commit restores the old navigation without data migration or destructive persistence change.
