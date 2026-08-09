# Coach profile Figma alignment

## Goal

Align C16 Coach Me to Figma `zZ6wKyOHKcO4UYXDd9jGwv / 93:1182 / C16 Coach Me` and `zZ6wKyOHKcO4UYXDd9jGwv / 231:137 / CODE / C16 Coach Profile`, using direct exports `c16-settings.svg`, `c16-shield.svg`, `c16-heart.svg`, `c16-user.svg`, `c16-help-circle.svg`, and `c16-chevron-right.svg`.

## Requirements

- Change only C16 page files, its focused test, direct C16 icon assets and task records.
- Display real session identity/role, with safe “教练” fallback only. Query coach home with `from = localToday - 29 days`, `to = localToday`, using an injected/frozen clock in tests; label teams as “近30天负责球队”. Never use `home.coachName` to override session identity or invent season, club, student count, attendance or permissions.
- Use a monotonically increasing request id: stale success and stale failure cannot overwrite newest state. API failures use fixed safe copy, never upstream error text.
- Retain only these existing routes: account, permissions, private-interest and help. Add page-level single-flight logout: cancel does nothing; confirmed action invokes `clearSession()` and `reLaunch('/pages/launch/index')` exactly once.
- Use Figma custom top bar, dark identity hero, icons and red logout while preserving role tabbar active me.
- WXML uses precomputed data only; no API/store/persistence/config/utils or unrelated file changes.

## Acceptance Criteria

- [ ] Non-coach makes no request; real session name is preferred, empty team/API failure safe.
- [ ] Home call has explicit valid 30-day range and stale response protection.
- [ ] Four menus navigate existing pages; logout cancel has no effect and confirm clears/relaunches once.
- [ ] No fixed Figma identity/team/stat samples; test/typecheck/package/diff checks pass.
