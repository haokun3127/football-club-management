# C9 team detail design

## Source and visual structure

Online Figma node `93:924` defines C9. It contains a soft-pink 88px custom header, a dark 16px-radius team hero with three statistics, a 4-column learner grid using 44px color-coded initials, then a horizontally scrollable `教练组` of 140×120 white cards. The coach role is a neutral gray pill; Figma examples are visual examples only.

## Data flow and contracts

`coach authenticated session -> GET /coach/team -> scoped team, stats, members, coaches -> C9 TypeScript view model -> WXML`.

The present `CoachTeamDetail` BFF exposes team/stat/member data but no coaches, even though the online C9 design needs a coach section. Add a minimal `coaches` array to the same established coach-scoped BFF only if it can be derived from real active coach records intersecting the current coach scope. Each item will carry stable id, display name and real role label. The client maps colors, initials and presentation booleans; it never fixes sample values into code.

No schema migration, role grant, membership expansion, or new endpoint is needed. The route remains protected by active app-client, coach role and membership scope checks already used by `/coach/team`.

## Visual adaptation

Existing C9 already has a correct dark hero, learner grid, and `176rpx` (88px) header height, but it is missing the Figma coach section and menu-capsule avoidance. Restore geometry through page-local WXSS and precomputed view models. The coach section remains absent only when the real BFF returns no scoped active coaches; a clear empty message is allowed inside the normal content hierarchy rather than a fabricated sample card.

## Risks and rollback

- Coach records may not currently carry team membership. Inspect store data first; if per-team scope cannot be truthfully inferred, do not leak all club coaches merely to fill the Figma cards. Use an API-compatible empty state and record the data gap instead.
- Do not regress learner radar navigation or allow a non-coach request.
- Avoid a `status-view` that is rendered alongside ready content.
- A scoped revert of the eventual C9 commit restores the former contract and page layout; there is no persistent-data change.

## Verification boundary

- Online Figma context was read from `93:924` before implementation.
- DevTools Automator connected on port `9424`, navigated to `pages/coach/team/index`, and reported logical `375×812` on iPhone X. The screen-pixel fallback could not locate the current host's simulator notch, so no PNG was accepted.
- The local API distribution built successfully. The existing Windows `tsx watch` process remained visible, but `/health` was not responding and process restart/start was blocked by the host execution policy; this is an environment handoff item, not a page/API test failure.
