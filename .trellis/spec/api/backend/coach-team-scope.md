# Explicit Coach Team Scope

## Scope and contracts
- Migration `0023_coach_assignments.sql` persists club/team/coach roles. Target team and coach must belong to the same club; no cross-club row may be written. A team's existing default coach remains its head coach.
- `coachTeamRole` is shared by schedule, assessment and planning authorization. Head, assistant and guest assignments allow team collaboration. Only head coaches may edit course content or request a course change. A coach's unrelated event ownership does not override a team's planning rule.
- `GET /clubs/:clubId/teams/:teamId/coach-assignments` and `PUT .../:coachId` are admin-only. PUT requires `role` and `expectedRole` (null means unassigned/revoke). Stale role -> 409; default coach changes belong to team management. Revocation is effective on the next request.
- BFF workbench supplies `permissions.canEditTraining`; clients must not infer planning permission from visible attendance or assessment controls. The legacy `/training/sessions` and `/training/sessions/ensure` writes enforce the same head-coach boundary and visible plan scope. Session observations require authorized event/participant scope and use the authenticated coach identity.
- Parent and coach app sessions retain their active-role boundary. Membership in an administrator role is not permission to use it from an active coach session.

## Checks
`coach-assignment.test.ts` verifies denied self-grant, explicit grant, shared assessment entry, BFF and legacy planning rejection, stale update, revocation and other-club reads. Full API/domain/mini check and migration idempotency remain required. Durable authorization history and the admin UI remain task work; these routes alone are not a completed administration module.
