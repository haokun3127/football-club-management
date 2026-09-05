# Coach account and help Figma fidelity

## Goal

Close the two confirmed coach-side Figma acceptance gaps without fabricating an API response or mixing the work into the active attendance/lesson-settlement task:

1. C16.3 **账号设置** must display the authenticated user's own masked phone and real WeChat binding state when the login session already supplies them.
2. C16.4 **帮助中心** must keep the online Figma's six fixed quick-start cards and support-card visual structure while continuing to load the FAQ questions from the real app-client content endpoint.

Online design authority: file `zZ6wKyOHKcO4UYXDd9jGwv`, nodes `93:1262` (C16.3) and `93:1286` (C16.4).

## Confirmed facts

- The authenticated app-client response already returns `profile.phone` and `phoneBinding`; `persistAuthenticatedSession()` currently discards both, so the C16.3 page has no source of truth after login.
- The API's `maskPhone()` behavior is `138****6789`; the coach page should use the same display rule locally and must never render another user's phone.
- C16.4 already fetches real `ContentFaq[]` data via `getContentFaqs()`. The current UI derives its quick-start cards directly from arbitrary server categories, which renders an extra `全部` tile and does not match node `93:1286`.
- The current seed's FAQ categories are parent-oriented; category content is a data difference, but the quick-start grid is a Figma-owned structural taxonomy rather than a raw echo of server category labels.
- Fresh route-verified 375×812 runtime evidence exists in `%TEMP%\cq-talent-visual-evidence` for both screens. No screenshot or other evidence may be written to the desktop or repository root.

## Requirements

- Preserve session compatibility: old persisted sessions that have no phone/binding fields must show an honest pending/fallback state; no reauthentication token or profile may be fabricated.
- Persist the current login result's own `profile.phone` and `phoneBinding` alongside the existing durable session fields.
- C16.3 must display a masked value only for the current user, an accurate binding label, and the corresponding visual badge state. It remains read-only: no faux “修改手机号”、密码、设备、缓存 or binding mutations are introduced.
- C16.4 must always render exactly six fixed quick-start cards in the online Figma order: 出勤操作、活动管理、评分评估、私教流程、账号权限、联系支持. Card selection filters the already-loaded real FAQ list through a deterministic local category mapping; “全部” remains the default filter but is not a seventh card.
- Search and FAQ expansion must keep operating on real API FAQ records and preserve stale-request protection.
- C16.4 must render the online design's static support presentation (工作日 9:00-18:00, 在线咨询 tag, 关注微信公众号 row) as informational UI only. It must not pretend to open a chat, invoke a modal, or use an unconfigured contact endpoint.
- Keep WXML free of `.map()`, `.filter()`, `.slice()`, `.indexOf()` and use committed SVG assets with `<image mode="aspectFit">` for non-text icons.
- All edits must be limited to task-owned mini-program code/tests/docs; never stage the unrelated 235-path working-tree state.

## Acceptance Criteria

- [ ] A new login/session test proves phone and binding fields survive `persistAuthenticatedSession()` and an older stored session remains valid.
- [ ] C16.3 focused test proves a current coach session renders `138****6789`-style own-phone output and the real binding state, while missing fields remain explicitly pending.
- [ ] C16.4 focused test proves the six Figma quick-start cards are fixed in order, `全部` is not rendered as a card, each card filters real FAQ data deterministically, and search/expansion/stale loads continue to work.
- [ ] C16.4 static template and stylesheet assertions cover the fixed card geometry, support presentation, top nav, and shared TabBar without any unconfigured interactive action.
- [ ] All relevant focused tests, mini-program TypeScript check, `git diff --check`, and one serial root quality gate pass.
- [ ] Fresh online Figma reads and route-verified real 375×812 WeChatIDE MCP captures confirm C16.3 and C16.4 after the repair; evidence stays in the system temporary evidence directory.

## Notes

- C16.3 and C16.4 are separate from the currently active `08-31-attendance-is-lesson-settlement` business task. This child task owns only the Figma/account/help repair.
- No API schema, database migration, production data import, or deployment is planned: the needed identity fields are already present in the login response and FAQ records already come from the real content endpoint.
