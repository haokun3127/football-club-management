# C9 team detail implementation plan

1. Preserve the dirty-worktree baseline; limit edits to C9 task artifacts, C9 miniprogram files/tests, the established coach-team BFF/type/tests if required, and `docs/current/progress.md`.
2. Read online Figma `93:924`, C9 source/tests, and the coach/team store contract. Confirm whether active coach records can be safely limited to the authenticated coach's existing team scope.
3. Add a narrow C9 regression that fails because the online C9 coach section requires real BFF-provided coach view models and the Figma header/section geometry. Run it and record the expected failure.
4. Make the smallest BFF/type/client/WXML/WXSS change that preserves existing scope checks and maps only real team/coaches/members into presentation fields.
5. Run focused miniprogram/API tests, typecheck, `git diff --check`, then the full repository check.
6. Use the canonical DevTools automator session to navigate to C9 and attempt a 375×812 simulator capture. Record stale-bundle limitations honestly.
7. Update progress, stage exact paths, commit the C9 batch and push `dev`.
