# PRD: C16.4 Coach Help Figma Alignment

## Goal

Align the coach help page with `zZ6wKyOHKcO4UYXDd9jGwv / 93:1286 / C16.4 Coach Help` using only the actual FAQ contract.

## Requirements

- Modify only the coach help page, its focused test, direct C16.4 exported icons, this task's records, and the parent child pointer created by Trellis.
- After `requireRole("coach")` succeeds, call `getContentFaqs()` exactly once per initial page load. Non-coaches make no request.
- Derive categories, search results, and expanded FAQ state locally from `ContentFaq.id`, `q`, `a`, and `category`. Search spans question, answer, and category.
- Dynamic categories use one neutral direct Figma icon. Do not map arbitrary categories to Figma's six sample business-topic icons.
- Show loading, empty, safe error, and stale-response states. Do not render raw upstream errors.
- Keep the existing `role-tabbar`. Apart from shared navigation, only back, local search input, category selection, and FAQ expansion are interactive.
- Do not add support contact, phone, public account, online consultation, service-hour, storage, or write behavior. Support availability remains a non-interactive pending state.

## Acceptance Criteria

- [x] Coach load calls the FAQ API exactly once and renders only returned FAQ fields; non-coach load is zero-request.
- [x] Real categories are de-duplicated, local search matches `q`/`a`/`category`, and local category/FAQ expansion preserve API content.
- [x] Loading, empty, safe error, and stale success/failure are visible and correct.
- [x] Template uses no WXML method calls, no text icons, no hard-coded topics/sample support facts, and no unsupported support interactions.
- [x] The local 176rpx Figma nav, 40rpx top-level section spacing, direct exported icons, focused test, typecheck, package test, task validation, and diff check pass. No screenshot result is claimed.

## Out of Scope

- API contracts, backend, shared components, role tab bar, support integration, storage, configuration, Figma writes, deployment, and unrelated working-tree changes.
