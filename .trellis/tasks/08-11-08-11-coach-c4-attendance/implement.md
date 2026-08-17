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
- A trustworthy 375x812 C4/C4.1/C4.2 runtime capture is still pending. On 2026-08-17 the recurring refused-connection boundary was fixed in the shared DevTools tooling: the canonical opener now distinguishes `.ide` HTTP from Automator WebSocket ports, reuses a verified active endpoint, and persists one non-sensitive session-state file for all tracked helpers. A real handshake reached `pages/coach/schedule/index` on port 9432, but no C4 PNG/sidecar was created in this task; this batch still makes no runtime visual-acceptance claim.
- Later on 2026-08-17, DevTools Stable exposed no standalone simulator window: the iPhone X canvas was embedded in its only main window. The capture helper now falls back to that unique host and locates the off-centre notch. A real coach schedule capture through `.ide` port `61245` and Automator port `9424` produced a uniformly scaled `563×1218` PNG for the verified `375×812` logical viewport. This proves the shared capture capability, but is not C4/C4.1/C4.2 visual acceptance evidence.
- Spec update decision: the existing app-client BFF contract already distinguishes event RSVP from real attendance; the C4 behavior is recorded in this task rather than duplicating that contract.
