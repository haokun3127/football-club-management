# Coach C1 Schedule Home — 2026-08-11

- Source of truth: online Figma `zZ6wKyOHKcO4UYXDd9jGwv / 93:578 / C1 Coach Schedule Home`.
- The coach schedule starts from the real local date rather than a fixed development date. Its C1 layout uses the selected-week strip, API-backed summary pills, a real current/upcoming activity hero, and the API-backed activity list. The old team chips, date picker, view toggle, and separate task-card section are no longer rendered on this page.
- The hero never invents attendance or other sample facts: it uses the loaded event title, time, location, status, and duration only. Empty states still come from the existing status component.
- Verification: focused schedule tests, root `check` (domain `19/19`, mini-program `282/282`, API `85/85`), TypeScript checks, and `git diff --check` passed. No new 375x812 runtime screenshot was captured, so this record does not claim visual acceptance.
