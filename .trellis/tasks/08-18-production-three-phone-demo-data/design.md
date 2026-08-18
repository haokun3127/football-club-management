# Design: Seven isolated dual-role demo accounts

## Boundaries

The existing secure test-account operation remains the only write entry point. Its canonical manifest grows from three to seven fixed slots, preserving the existing IDs for slots 1–3 and allocating deterministic IDs for slots 4–7. Runtime phone values are read from seven private environment variables and never enter the manifest or result projection.

The confirmed import runs in one SQLite transaction. For each slot it either validates the complete existing base installation or inserts the missing base identity. It then runs an idempotent demo-data expansion for every slot. A partial base row, conflicting phone owner, wrong role set, or incompatible fixed row aborts the whole transaction.

## Data shape per slot

- Identity: one active user, one active club membership, one parent profile, one coach profile, one team, and two guardian-bound students.
- Coach roster: six additional synthetic students owned by the secure slot, eight active team members total, and no parent binding for the additional six.
- Calendar: the original base event plus deterministic demo events for past training, current/upcoming training, completed match, and scheduled match. Dates are derived from the command's `now` value.
- Training/attendance: eight participants per demo event with deterministic confirmed/present/late/absent states, plus lesson-ledger entries and metric records for each roster student.
- Assessment: one persisted assessment per guardian student with linked raw results, normalized scores, and metric records.
- Match/tactical: one completed match with player events, one scheduled match, and a tactical board attached to the scheduled match.
- Parent support: operational profiles, insurance policies, private lesson requests, communication logs, and lesson balances for the two guardian-bound students.

All inserted IDs use the canonical `cq-talent-secure-test-` namespaces already accepted by the rollback validator. Inserts use `INSERT ... ON CONFLICT DO NOTHING` or existence checks so reruns do not duplicate rows or overwrite user changes.

## Isolation and rollback

The manifest records all canonical base IDs and namespaced side-effect IDs. Rollback first proves all seven canonical base installations are complete, validates the exact canonical manifest/version, validates every side-effect namespace, and then deletes child rows before parent rows within one transaction. It never accepts caller-provided arbitrary IDs.

## Verification

Local verification proves import/dry-run/idempotency/partial-install rejection, parent two-child scoping, coach eight-player scoping, persisted assessment/match/tactical rows, restart readback, and rollback isolation. Production verification uses a restricted backup including SQLite WAL/SHM, confirmed import, API-only restart, `/health`, and bounded authenticated BFF readbacks for each slot and role.
