# PRD: C15.1 Coach Assessment Submit

## Goal

Implement the success state for `zZ6wKyOHKcO4UYXDd9jGwv / 93:1163 / C15.1 Assessment Submit` at `/pages/coach/assessment-submit/index`.

## Requirements

- Render success only for an authenticated coach and a non-empty route `title` plus a positive integer route `count` supplied by C15 after every selected assessment has returned HTTP 201.
- Treat absent, malformed, or non-positive route data as a safe empty state. This page performs no API calls and must not fabricate results, processing state, server-sync timing, or assessment facts.
- Use the local relative submission date, neutral "已提交" language, and "查看当前结果" for the primary action.
- Route the primary action to the existing coach team-ability page. Return to the preceding assessment-task list with `wx.navigateBack({ delta: 1 })`.
- Match the Figma structure with a page-owned 176rpx navigation area and the existing coach role tab bar active on training. WXML must not invoke JavaScript helpers.

## Boundaries

- Allowed: C15.1 page-owned JSON/TS/WXML/WXSS/test, an optional direct Figma check asset, this task, and the parent child pointer.
- Forbidden: C15, API helpers/routes, shared components, app configuration, store/persistence, and all unrelated worktree changes.

## Acceptance Criteria

- [ ] Coach plus valid `title` and positive integer `count` renders only route-derived title/count and a local relative date.
- [ ] Missing/malformed inputs and non-coach access render safely without an API request or fabricated success state.
- [ ] Result and back actions target only the stated existing routes; role tab bar is coach/training.
- [ ] Focused test, mini-program typecheck, package tests, and scoped diff check pass.
