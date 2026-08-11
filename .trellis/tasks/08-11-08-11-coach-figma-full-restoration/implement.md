# Execution Plan: Coach Figma Full Restoration

## Evidence Already Captured

- Runtime screenshots: `C:\Users\ASUS\AppData\Local\Temp\cq-coach-audit-20260811`
- Figma exports: `C:\Users\ASUS\AppData\Local\Temp\cq-coach-figma-audit-20260811`
- Node mapping and state constraints: research recorded during the 2026-08-11 audit.

## Batch Discipline

For each batch:

1. Read the exact online Figma node and the affected page's existing TS, WXML, WXSS, and tests.
2. Add a narrow failing regression test covering the missing Figma rule.
3. Implement the smallest page-scoped change.
4. Run the focused test, then the relevant mini-program type/test check and `git diff --check`.
5. Capture the repaired route at 375x812 and compare it with the original Figma export.
6. Ask Terra to review the diff and evidence, record the result, and commit only the batch files.

## Ordered Batches

1. C1 schedule, C2 workbench, C3 activity change.
2. C4 attendance and C5 lesson states.
3. C6 match and C7 tactical board.
4. C8 training and C9 team.
5. C10 content/coverage and C11-C12 test entry states.
6. C13-C15 capability radar and assessment states.
7. C16 profile and auxiliary states.

## Rollback Point

Each batch is independently committed only after checks and screenshot review. If a visual change breaks an API-backed screen, revert only that batch's page-local change; do not reset the workspace or alter unrelated user files.
