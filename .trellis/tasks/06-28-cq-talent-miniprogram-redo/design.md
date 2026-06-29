# Technical Design

## App Shell

- `pages/launch/index` owns startup: resolve app client, restore/create session, route by role.
- Production UI never presents role selection. Dev identity is controlled by config and a hidden long-press switch for local testing only.
- Role navigation uses a custom `role-tabbar` component because native tabBar cannot switch page sets by authenticated role.

## Data Flow

- `utils/request.ts` centralizes `wx.request`, `X-Request-Id`, `X-Club-Id`, `X-Client-Id`, auth token, dev `X-User-Id`, and `Idempotency-Key` for writes.
- `utils/api.ts` exposes BFF-oriented methods. Existing BFFs are consumed directly; missing BFFs return a typed pending state, not fake success data.
- `utils/store.ts` persists app context and session. Session role comes from login result or dev identity config, not visible user choice.

## Pages

- Parent pages: schedule, event detail, growth, metric detail, child profile/status.
- Coach pages: schedule, event workbench, attendance, lesson confirmation, match entry, training management, test entry, me.
- Each page has loading, empty, error, and pending API states.

## UI System

- WeChat native visual vocabulary: restrained cards, task lists, red primary actions, clear status chips.
- Theme tokens: primary `#E60012`, pressed `#C4000F`, light `#FFF1F0`.
- Radar uses the existing native Canvas 2D component, with empty-state protection for insufficient metrics.

## Boundaries

- No backend model changes.
- No WPS import changes.
- No admin API calls from the mini-program.
- No git commit from this task.
