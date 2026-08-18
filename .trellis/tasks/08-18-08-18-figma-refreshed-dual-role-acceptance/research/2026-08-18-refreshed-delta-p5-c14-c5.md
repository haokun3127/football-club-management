# Refreshed Figma delta: C5 / P5 / C14

## Authority

- Figma file: `zZ6wKyOHKcO4UYXDd9jGwv`
- Parent page: `4:6`
- Coach page: `4:7`
- All page screenshots are read from the online file before deciding whether code or reference assets need changes.

## Findings

### C5 Lesson Confirm — `93:734`

- The current online frame adds an explicit bottom action area above the coach TabBar: `确认全部` and `发起更正`.
- Existing `pages/coach/lesson` already matched that structure and real API behavior, so only the offline reference PNG and progress record were refreshed in commit `77459ac`.

### P5 Ability Radar — `93:278`

- Online frame is `375×812`: 24×40px back region, 18px title, 13px subtitle, page-background player strip, 16px content inset, 20px hero spacing, and a 303×280px radar canvas.
- Existing page passed real `GrowthSummary` values through `radar-canvas`, but the component default height was `520rpx`; P5 now explicitly passes `width="100%" height="560rpx"`.
- The text back glyph was replaced by `/assets/icons/chevron-left.svg`, and the page spacing/typography was aligned to the online frame.
- Commit: `3de93a4`.
- Static evidence: online PNG `C:\Users\ASUS\AppData\Local\Temp\p5-ability-radar-figma-current.png`; parent runtime evidence is still unavailable because the active DevTools session is coach-only.

### C14 Team Ability Overview — `93:1106`

- Online frame is a complete `375×1258` image.
- The tracked offline reference had been incorrectly cropped to `306×1024`; it was replaced with the current online PNG without changing C14 code or API data.
- Commit: `fb24f57`.

## Verification

- P5/radar focused tests: `8/8`.
- Full gate: `npx --yes pnpm@10.33.0 run check` exit `0`; domain `19/19`, miniprogram `340/340`, API `109/109`.
- No API, auth, role, session, production database, or Figma write operation was performed for this refresh delta.

## Remaining boundary

The refreshed static/code work is complete for the three changed frames. Do not call P5 runtime visual acceptance complete until a legal parent-role WeChat DevTools session produces a verified `375×812` screenshot; coach-only routing correctly rejects the parent page.
