# C4 execution plan

1. Audit the acceptance-seed roster, event participants and saved attendance coverage; record real API sources and only add deterministic opt-in rows if a real page has no inspectable state.
2. Inspect the current C4/C4.1/C4.2 pages and their tests against the three online Figma contexts.
3. Make the smallest view-model, WXML and WXSS changes while retaining existing persistence calls.
4. Run focused C4 tests and mini-program typecheck. Run API tests if seed code changes.
5. Run the full repository check and `git diff --check`, update progress/task evidence, and commit exact paths only.
6. Attempt a trustworthy 375x812 capture. On an Automator timeout, preserve the no-output rule and record the capability boundary instead of calling the screen visually accepted.

## Verification evidence

- On 2026-08-17, C4 received its final UI-only refinement: canonical `correction=1` plus legacy `mode=correction` both open the truthful correction state; the shared header gains an opt-in 22px title; the normal roster has a real `共 N 名学员` footer and a green present confirmation; and C4.1 uses neutral activity-detail copy while retaining GET workbench readback.
- Focused verification on 2026-08-17 passed: attendance, attendance-success, and API-client tests `23/23`; mini-program `typecheck`; `git diff --check`; and full repository check (domain `19/19`, mini-program `319/319`, API `104/104`).
- The API restart regression writes attendance through the real coach endpoint to a file-backed SQLite acceptance database, then closes and reopens it before reading the same event workbench again. It proves the saved status and note survive a restart.
- A trustworthy 375x812 C4/C4.1/C4.2 runtime capture is still pending. The DevTools Automator route/system-info check had previously verified the logical iPhone X viewport, but the `9432` automation endpoint later rejected connections and no visible simulator window ending in `的模拟器` existed for the Windows PrintWindow fallback. No PNG or sidecar was accepted or published; this batch makes no runtime visual-acceptance claim.
- Spec update decision: the existing app-client BFF contract already distinguishes event RSVP from real attendance; the C4 behavior is recorded in this task rather than duplicating that contract.
