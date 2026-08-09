# Align coach attendance page to Figma

## Goal

Implement the coach attendance flow represented by C4 (`93:665`), C4.1 (`93:696`), and C4.2 (`93:715`) in the current Figma source `zZ6wKyOHKcO4UYXDd9jGwv`, while keeping every visible attendance value tied to the existing workbench and attendance APIs.

## Requirements

- Load the event roster from the real coach workbench contract and save attendance through the existing event attendance endpoint.
- Preserve existing attendance states, including `late`, `leave_requested`, and `excused`; a pending record cannot be submitted.
- C4.1 may only present a success state after a real event workbench readback. Missing, inaccessible, or failed events remain in a safe non-success state.
- C4.2 is a correction mode over the existing roster and notes. The current API has no parent-dispute or anomaly fields, so it must not invent those facts or counters.
- Prevent duplicate submission, preserve edits after a save error, and do not navigate to success after a failed save.
- The shared C4/C4.2 route may change only its attendance page files and focused tests.

## Acceptance Criteria

- [x] C4 renders real event and roster data, supports existing attendance states, and persists valid changes through the real API.
- [x] C4.1 success is gated on a real event readback and has safe missing/error states.
- [x] C4.2 explains truthful roster correction without fabricated dispute/anomaly data and preserves the C4 save/error protections.
- [x] Focused attendance tests cover normal save, pending blocking, failure retention, truthful correction mode, and safe missing/error states.
- [x] Package test suite, TypeScript check, and diff check pass for the implementation batch.
- [ ] Device screenshot comparison is intentionally deferred under the current goal; no visual-device pass is claimed by this task.

## Notes

- Figma source: `https://www.figma.com/design/zZ6wKyOHKcO4UYXDd9jGwv`.
- No API or backend schema changes were required. The key implementation decision is to prefer truthful existing roster data over visually similar but unsupported design sample data.
