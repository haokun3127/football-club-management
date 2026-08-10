# Design: C7 Coach Tactical Board MVP

## Source and Contract

The only source is `zZ6wKyOHKcO4UYXDd9jGwv / 233:2 / CODE / C7 Tactical Board MVP`; `93:877` is legacy and excluded. The page consumes existing `getTacticalBoardFormations`, `getCoachTacticalBoard(eventId)`, and `saveCoachTacticalBoard(eventId, formationName, players)` contracts without changing them.

## Load and Presentation

`requireRole("coach")` and a trimmed route `eventId` gate both GETs. A monotonically increasing load token prevents old success or failure from changing the current state. Board players are intersected with the returned roster and use returned names only. Page-owned presenters derive labels, pitch positions, and classes so WXML performs no array lookup or helper invocation.

## Edit and Save Boundary

`readOnly` blocks formation changes, selection, substitution, dragging, reset, and save. The initial response is always labeled "已载入"; it does not imply a new save. A synchronous `saving` lock permits one PUT. Only a current, matching successful PUT resets dirty state and produces "已保存". Failed or stale PUTs preserve the dirty page state and show a fixed safe message.

## Visual Translation

Use page-owned layout for the 62px white header, 48px formation control, 430px field, 86px bench card, and paired 48px action controls from node 233:2. No sample players, scores, or team names are copied. Runtime status views use neutral local empty/error content.

## Rollback

Revert the dedicated page commit after review. Do not reset, checkout, or overwrite unrelated worktree changes.
