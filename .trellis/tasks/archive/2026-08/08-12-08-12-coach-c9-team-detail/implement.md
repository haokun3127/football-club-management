# C9 implementation plan

1. Add focused red assertions for the cumulative hero metric and a BFF-backed
   coach-card section.
2. Keep the loader scoped to its existing `coach/team` BFF contract; do not
   repurpose the club-scoped `coach-team` content slice for the Figma cards.
3. Align the C9 markup/styles to node `93:924`: hero terminology, attendance
   emphasis, 4-column member grid and safe header sizing.
4. Run the focused page suite, mini-program typecheck, root check and
   `git diff --check`; record the capture boundary and commit only C9/task
   files.
