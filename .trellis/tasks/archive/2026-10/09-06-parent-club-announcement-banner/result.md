# Result — 2026-09-06

- Figma file `zZ6wKyOHKcO4UYXDd9jGwv`, current Parent V6 page `1609:2`; week banner `1610:29` and month banner `1610:202` updated and screenshot-read back at 343×72 design dimensions. Mutated text nodes: `1610:32/33/34`, `1610:205/206/207`.
- Existing brand accent and layout retained. Label is 俱乐部公告; sample title is 秋季训练安排 and sample summary is 9月起按秋季课表训练，详情见日程.
- Client uses real title and prefers trimmed subtitle, then body/title fallback. Publication is inclusive and expiry exclusive; malformed present timestamps are excluded. Missing timestamps retain legacy notices. Input article records remain unchanged.
- Banner navigates to the existing article detail by encoded id. Bell independently reads parent reminders. Existing content API lists articles without the homepage expiry filter, so historical content remains available; this batch does not create a new history page or notification fan-out.
- Validation: parent schedule/article/reminders Vitest 26/26, Mini Program TypeScript, WeChatIDE WXML/WXSS compile all pass. No simulator visual acceptance claim.
- Production article title/body remain backend-authored; Figma sample text is not injected as a frontend fallback. No API runtime or production database write needed.
- Durable rule: publication/expiry metadata controls homepage placement, not a parent action deadline; never use article presence to increment the bell badge. Recorded in current design/source documentation rather than inactive API/domain frontend specs.
