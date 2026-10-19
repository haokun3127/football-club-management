# Plan

1. Add failing credit and semantic repair tests, then implement corrections.
2. Build and test API. Audit exact scope and preserve unrelated rows.
3. Create restricted consistent SQLite backup; rehearse repair on its copy.
4. Execute authorized repair, restart API, check health and seven-role data reads.
5. Record evidence and limitations; stage only task-owned paths.

Completed: backed up production, rehearsed, deployed c893adb, applied September 7
09:05 CST, restarted API and verified database consistency plus 84 read-only BFF
requests. See docs/current/customer-test-data-repair-2026-09-07.md for evidence and
limitations. Never equate row existence with realistic data or device acceptance.
