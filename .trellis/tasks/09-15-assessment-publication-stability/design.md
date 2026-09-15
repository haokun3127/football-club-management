# Design

- Durable workflow repository: pinned task configuration and revisioned state per task/student. State holds current entries, append-only changes and publication links. Published metric facts remain in existing assessment tables.
- Memory and SQLite adapters implement the same port. Workflow operations serialize per store. SQLite publication adds its state write inside the existing assessment transaction.
- New entry PUT and publication POST are coach/team scoped, enabled only for club IDs in FCM_ASSESSMENT_PUBLICATION_CLUBS (empty by default). Adopted tasks remain managed/read-only when disabled. Legacy POST cannot bypass publication for managed tasks.
- New task creation pins the current version when enabled. Existing adoption uses its single historical version or current version; mixed versions block adoption. Old published values initialize entries without changing facts.
- Project readback reads each latest working field. Progress uses all input bindings and current active task team members, not recent calendar participation.
- Require configured value kinds, valid ranges and input/test-item identity. Standard scores remain standard scores; no invented normalization rules. Publication requires all inputs and appends a linked full assessment snapshot with lineage.
- expectedRevision prevents stale writes. Identical saves are no-ops; publishing the same revision returns the existing publication. Batch returns individual results.
- APIs retain legacy shapes and add workflow metadata. Mini-program opts into new APIs only when metadata is present.
- Task window uses Asia/Shanghai calendar dates. After publication, every correction needs a reason. History records changes and publication revisions.
- Shared normalization only scales measurements with explicit score unit and maximum. Core maxima derive from formulas; overall is graph total divided by its actual maximum. Preserve radar geometry but use real labels and server overall.
- Rollback retains additive tables. Disabled managed tasks stay read-only; published reads continue.
