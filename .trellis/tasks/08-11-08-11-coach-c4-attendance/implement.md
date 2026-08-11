# C4 execution plan

1. Audit the acceptance-seed roster, event participants and saved attendance coverage; record real API sources and only add deterministic opt-in rows if a real page has no inspectable state.
2. Inspect the current C4/C4.1/C4.2 pages and their tests against the three online Figma contexts.
3. Make the smallest view-model, WXML and WXSS changes while retaining existing persistence calls.
4. Run focused C4 tests and mini-program typecheck. Run API tests if seed code changes.
5. Run the full repository check and `git diff --check`, update progress/task evidence, and commit exact paths only.
6. Attempt a trustworthy 375x812 capture. On an Automator timeout, preserve the no-output rule and record the capability boundary instead of calling the screen visually accepted.

## Verification evidence

- The final full-repository gate passed on 2026-08-11: domain 19/19, mini-program 297/297, and API 85/85 tests; all package type checks and `git diff --check` also passed.
- The API restart regression writes attendance through the real coach endpoint to a file-backed SQLite acceptance database, then closes and reopens it before reading the same event workbench again. It proves the saved status and note survive a restart.
- A trustworthy 375x812 C4/C4.1/C4.2 runtime capture is still pending. This batch makes no runtime visual-acceptance claim.
- Spec update decision: the existing app-client BFF contract already distinguishes event RSVP from real attendance; the C4 behavior is recorded in this task rather than duplicating that contract.
