# Stable project entry and coach-confirmed assessment publication

## Goal
Make the existing 62-score mini-program workflow reliable without changing scoring standards or unrelated screens.

## Confirmed requirements
- Coaches save projects independently; drafts survive navigation and server restart.
- Only explicit coach publication changes parent-visible results. Publish ready students without waiting for the whole team.
- During the task period, corrections require a reason and another publication; old results remain visible until then. After the period, read-only.
- Drafts, published snapshots and revision history remain separate. Missing values are never zero.
- Pin task template versions; count progress against the task team roster, not recent events.
- Normalize existing score scales correctly; preserve the original 90-point formula and display its percentage consistently.
- Preserve API compatibility behind a disabled-by-default club rollout flag. No production writes/deployment/push.
- Small independently checked commits; preserve pre-existing configuration and screenshots.

## Acceptance
- Single-project save/reopen works; 62 incremental entries and full input produce the same published output.
- Unpublished input/corrections never change parent radar or growth history.
- Duplicate publication is harmless; conflicting revisions fail without losing local edits.
- Team/student scores agree; full scores produce 100 percent.
- Restart, authorization, cutoff, old database and legacy API behavior have regression coverage.
- Mini-program changes have controller tests and real-runtime validation; unavailable runtime evidence must be reported honestly.

## Out of scope
New age normalization tables, classroom/match score fusion, arbitrary spreadsheet formula imports, broad UI or store refactoring.

## Authorization
User approved the plan and small commits on 2026-09-15; no further commit confirmation is needed.

## Subsequent deployment authorization

User authorized deployment if ready. The 2026-09-15 readiness check found public health normal, but documented SSH access failed with public-key authentication rejection. No production mutation was performed; see validation.md.

## Test environment remediation

User explicitly requested correction of local prerequisites behind the four previously failing tests. Scope includes host-native screenshot paths, deterministic Windows CLI fixtures, bounded runtime probes and verification of the installed WeChat toolchain. No test bypass or business behavior changes are authorized by this remediation alone.
