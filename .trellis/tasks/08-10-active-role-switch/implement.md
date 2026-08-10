# Active Role Switch Implementation Plan

1. Add API contract tests for parent-only, coach-only and dual-role `availableRoles` plus entrypoint filtering; run red.
2. Add the additive API response field using existing role mapping and app-client entrypoint validation; run green.
3. Add mini-program session-store tests for safe active-role persistence, old session fallback and refusal of unauthorized roles; run red then green.
4. Add login tests proving dual-role authentication pauses for a choice while single-role routing remains immediate; implement the minimal selector without weakening phone single-flight logic.
5. Add parent account and coach account switch controls, plus visibility/routing tests.
6. Run targeted API/mini-program tests and the full repository check; commit API, session, login UI and account UI in separate batches.
