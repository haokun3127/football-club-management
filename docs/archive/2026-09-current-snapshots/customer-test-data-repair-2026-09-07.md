# Customer-test data consistency repair

## Scope and authorization

The user authorized correcting test data before customer testing. Work targets the
seven fixed `cq-talent-secure-test` account scopes (19 students each). Existing
phones, sessions, memberships and guardian bindings are preserved. No credentials
are stored in this document. Ordinary club rows are not reset.

## Changes

- Rebuild the explicitly authorized test credit histories from attended completed
  training, with positive semester credits and matching operational profiles.
- Provide date-keyed activities across three weeks, including current and next week.
  Future activities have no attendance result, score or premature match events.
- Populate eight selected catalog training blocks and present-only classroom scores.
- Completed demo matches have a recorded 2–1 result, two goals, two assists, one own
  goal conceded and a foul; roster minutes and saved tactical boards are present.
- Rebuild two historical assessment rounds using the existing score-table inputs
  and domain metric graph, not manually assigned radar outputs. Leave one current
  project-selection task unscored per team.
- Correct coach task-list filtering: only accessible teams' tasks are returned.
- Refuse the legacy rolling importer once this customer baseline is installed; it
  must not silently overwrite customer test actions or reintroduce old ledger rows.

## Operational evidence

- Consistent SQLite backups were created before any live write. September 7 backup:
  `/var/lib/cq-talent/customer-pre-repair-20260907.sqlite` inside the API data volume,
  mode 0600; `integrity_check=ok`, no foreign-key violations.
- Deployed API commit `c893adb`; applied the backed-up repair on September 7 at
  09:05 CST, restarted API and confirmed HTTPS health. Production is no longer pending.
- All seven scopes (133 students) have daily activities from September 7–27.
  Negative credits/balances, absent-student scores, ledger/profile mismatches and
  premature match results are zero; SQLite integrity is `ok`, foreign-key errors zero.
- Each team has 38 historical assessments (two rounds for 19 players) and three
  tasks, including one unscored project-selection task. Radar values use the domain
  model; the current task does not require testing every catalog project.
- Post-restart read-only BFF checks: 84/84 HTTP 200, two bound children per account,
  eight radar dimensions, three own-team tasks, 21 calendar dates, and training plus
  ability-update growth history for both children. No cross-team task leakage.
- Account slot 1 (罗志炫): 丁宁 balance 24 / attended 24; 方圆 balance 35 / attended 25.
  This replaces the inconsistent negative-balance test history, not merely its display.
- API suite: 138 tests; TypeScript build and diff checks passed during implementation.
- In-process read-only BFF checks use persisted memberships, not fabricated phone
  authorization or production sessions. They are **not** real-device login acceptance.

## Limits

These are synthetic customer-test records, not actual sporting results. Completed
demo matches share a 2–1 scenario and training plans reuse eight catalog blocks.
The checks above establish selected data invariants and BFF readability, not every
screen's appearance, real-device authorization, or all historical age-group metadata.

## Recovery and safety

The reset is an operator function, never a seed, cron or route. Do not repeat it
after customers start entering data without new approval and a fresh backup.
Reversal requires stopping API writes and restoring the verified snapshot to the
original volume path with correct ownership; SQLite WAL/SHM must be handled while
the API is stopped. Do not copy a live WAL beside a VACUUM INTO backup.
Restoring the snapshot discards subsequent test edits, so confirm scope first.
