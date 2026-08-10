# C6.2 Coach Match Save State

## Goal

Implement Figma `zZ6wKyOHKcO4UYXDd9jGwv:93:858` as a truthful local draft-resume overlay for an unsent C6.1 match-event form. The page may claim only local draft persistence; it must not treat a client clock, local storage, or a rendered Figma sample as an active server match record.

## Confirmed Facts

- C6 currently reads one real match detail through `GET /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/match`.
- C6.1 persists completed individual match events through its own exact-201 append route.
- There is no current route for live timer state, pause, end match, score mutation, or server-side match-progress draft.
- Figma's timer, pause/end buttons, score, team names, and event rows are not independent C6.2 facts unless supplied by an approved BFF response.

## Requirements

1. Save one versioned local draft per current `eventId`, containing only a user-modified real `studentId`, capability-allowed event `type`, optional valid `minute`, optional valid `note`, and local `updatedAt`.
2. C6.1 writes a draft only when the form is valid and materially changed. Exact `201` submission clears it; all rejected, failed, and unknown outcomes retain it.
3. C6 reads its existing real detail first and displays the overlay only when the draft's event id, student id, and event type still intersect with the real roster and current coach capabilities.
4. The overlay identifies itself as a local draft. Continue returns to C6.1 with the same event id; exit navigates back once without deleting the draft.
5. Do not add API calls, timer state, pause/end actions, score writes, synthetic timeline rows, or server-persistence claims.

## Acceptance Criteria

- [ ] Only valid user-modified local form data is restored; missing, malformed, stale, or incompatible drafts remain hidden.
- [ ] C6.1 clears the draft only after exact `201`; every other outcome retains it and does not navigate.
- [ ] C6 displays real C6 detail behind the overlay and labels the overlay as a local draft with actual local update time.
- [ ] Continue/exit navigation is bounded to one action and does not make an API write.
- [ ] Focused RED-to-GREEN Mini Program tests, typecheck, package test, task validation, and diff check pass before review.

## Out Of Scope

- Closing a match, score editing, timer or pause/end state, automatic retries, API/persistence changes, assessment behavior, deployment, commit, or visual-device acceptance claims.
