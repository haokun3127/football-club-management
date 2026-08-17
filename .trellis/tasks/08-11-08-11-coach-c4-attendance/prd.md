# Coach C4 attendance Figma restoration

## Goal

Restore coach attendance, success, and correction pages against Figma nodes 93:665, 93:696, 93:715 while retaining real persisted attendance and ensuring acceptance seed coverage.

## Requirements

- Online Figma is authoritative: `zZ6wKyOHKcO4UYXDd9jGwv`, nodes `93:665` (C4 attendance), `93:696` (C4.1 submitted), and `93:715` (C4.2 correction).
- Use only the existing coach workbench and attendance write APIs. The page must show actual event, roster and saved attendance data; it must not add a client-side fixture, synthetic role, token or response.
- Confirm the opt-in CQ Talent acceptance seed supplies a dense coach roster and persisted event participants suitable for all attendance states. If a data gap is found, change only the opt-in server seed and its tests.
- Restore the Figma hierarchy, 88px custom navigation, 16px/22px content geometry, dark event summary, compact roster rows, success summary and correction state while preserving actual save/reload behavior.
- Keep the coach tab bar and safe-area clearance; WXML must not invoke JavaScript array methods.
- Do not stage unrelated user-owned files already dirty in the worktree.

## Acceptance Criteria

- [x] C4 reads and writes real persisted attendance through the existing event-scoped API, including a reload/readback after saving.
- [x] The opt-in acceptance seed provides a coach-visible roster and real event participants sufficient to inspect pending, present, late and absent attendance states without exposing extra children to a parent.
- [x] C4 and C4.1 match their corresponding online Figma node structure and specified visual geometry. C4.2 is a truthful general correction variant: it adopts the warning-card and submit layout of node `93:715`, but does not claim or fabricate its unsupported parent-dispute list or correction-note data.
- [x] Focused page tests and mini-program typecheck pass; API seed tests run if seed data changes.
- [x] The user explicitly waived new runtime screenshots as a completion prerequisite for this goal; C4/C4.1/C4.2 remain documented as source/data/test evidence only and are not called pixel-accepted.
- [x] The task documentation, progress log and scoped implementation commits contain only this batch's files.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
