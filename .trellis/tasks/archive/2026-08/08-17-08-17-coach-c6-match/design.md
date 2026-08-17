# C6 match pages design

## Source and page roles

- C6 `93:796`: real match detail. A dark 16px-radius summary presents title, teams, score and period chips; a separate white events card contains the real event timeline and a red outline add action.
- C6.1 `93:827`: real event-create surface. Capability-provided event types render as compact 32px chips above a white form card with 48px time/player/note controls and a red 52px submit action.
- C6.2 `93:858`: local-draft acknowledgement overlay. The obscured C6 background is illustrative only; the overlay must truthfully call the draft a local unfinished record and continue into C6.1 or discard it.

## Data flow

`coach role + eventId -> GET coach match detail -> C6 view model -> C6.1 local draft -> POST match event with idempotency key -> C6 onShow GET readback`.

No schema, endpoint or authority change is allowed. The existing API determines event types and roster. C6.2 does not perform a remote write; it only reads/writes the existing device-local draft helper.

## Visual adaptation

The Figma sample includes unsupported labels such as substitution/other events, match controls, sample periods and server-looking autosave language. The implementation keeps equivalent visual containers but uses only real title, status, score, time-line event, and local-draft values. The C6.2 overlay wording will explicitly say that the unfinished event is stored on this device.

## Risks and rollback

- Avoid turning `status-view` into a ready-state overlay; show it only for loading/empty/error states.
- Avoid replacing the capability-driven chips with fixed Figma sample options.
- Preserve create retry behavior: operation key changes only after material input change and is reused on retry.
- Keep changes page-scoped. A revert of the C6 commit restores the prior visual layout without data migration or API rollback.
