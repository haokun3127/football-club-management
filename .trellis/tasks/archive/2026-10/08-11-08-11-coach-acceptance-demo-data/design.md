# Design: Coach acceptance demo data coverage

The acceptance seed is the only permitted source for this work. It is opt-in at
process start, uses deterministic IDs, and already owns the dual-role account,
the two guardian-visible children, and the fixed demo events. The extension
selects six existing synthetic students from the same club instead of creating
new accounts or bindings. The coach may therefore see a realistic eight-player
roster; the parent BFF continues to enforce the existing guardian projection
and remains limited to two children.

The same `demoRosterStudents` collection will own all additional team-member,
participant, completed-match roster/note, and acceptance-coach metric record
projections. This avoids separately maintained student lists. Fixed event IDs
are unchanged to retain deployed acceptance routes and targeted rollback
compatibility. New row IDs use the existing `cq-talent-acceptance-demo` naming
prefix and remain insert-if-absent on seed/restart.

No app-client route, browser storage, role/session resolution, database schema
or public operations surface is added. Database persistence continues through
the existing seed/repository layer; mutable tactical boards and attendance
remain backed by their established repositories. The existing rollback gets
the new fixed acceptance records only and its test proves peer records survive.

Rollback: execute the existing explicit, confirmed acceptance-demo rollback on
the named database only after a backup. The code change can be rolled back by
deploying the prior release; existing saved rows remain preserved because the
seed path is insert-if-absent.
