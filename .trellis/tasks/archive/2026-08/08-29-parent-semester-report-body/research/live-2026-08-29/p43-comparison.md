# P4.3 Semester Growth Report comparison — 2026-08-29

## Design source

- Online Figma file: `zZ6wKyOHKcO4UYXDd9jGwv`
- Node: `701:177` — `P4.3 Semester Growth Report`
- Reference: `p43-online-latest.png` (`375×812`)

## Runtime evidence

- Route: `/pages/parent/semester-report/index`
- Runtime capture: `p43-runtime-final.png` (`375×812`)
- Capture channel: WeChatIDE MCP simulator screenshot
- Runtime data: real authenticated parent session, real child/team, radar values,
  completed activity counts, and attendance rate

## Changes verified

- Added the custom navigation shell so the page no longer receives an extra
  native navigation bar above the Figma-matched body.
- Replaced the old child-chip and combined summary composition with the period
  card, current-student card, ability heading/card, three-column summary card,
  and coach-note card in the online design order.
- Child switching remains available by tapping the current-student card; the
  native action sheet is only offered when multiple real children exist.
- Radar dimensions are normalized in TypeScript, limited to four rows, and long
  labels stay on one line with ellipsis. No sample Figma values are injected.
- Summary counts include completed, non-cancelled activity records only.

## Accepted differences

- The period label is `最近阶段` because the current API does not expose a named
  semester.
- Runtime student/team names, scores, counts, attendance, and number of radar
  rows differ from Figma sample content and remain API-driven.
- The WeChat status bar and native capsule are platform-rendered.

## Verification

- Focused Vitest: `7/7`
- Mini-program TypeScript: passed
- WXML compile: passed
- WXSS compile: passed
- Full repository check: domain `20/20`, mini-program `415/415`, API `115/115`
- `git diff --check`: passed
