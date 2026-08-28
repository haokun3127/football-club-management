# Use live dates for parent schedule

## Goal

Make the parent schedule use the device's current local date in every mini-program environment, return all activities on a requested final calendar day, and let a parent browse adjacent weeks.

## Confirmed Facts

- The current `DEV_TEST_DATE` is June 28, 2026. Its Monday-start week is June 22–28, 2026.
- The parent schedule and parent day pages use that fixed date in develop mode.
- `GET .../parent/calendar?from=&to=` currently treats a date-only `to` as midnight at the start of the final day.
- An empty calendar for a bound child is valid and must remain distinct from an unbound phone number.

## Requirements

- Preserve `DEV_TEST_DATE` for explicit smoke and fixture uses. A fixed page date may only be enabled by an explicit develop-only configuration switch that is off by default.
- A date-only `to=YYYY-MM-DD` includes the whole named day; an ISO timestamp keeps exact-time behavior. The BFF validates date formats, rejects reversed intervals, and limits ranges consistently with its other calendar endpoints.
- Week navigation changes the requested Monday–Sunday range and never fabricates activities.
- Parent calendar results remain guardian-projected.

## Acceptance Criteria

- [ ] At a frozen device time of August 10, 2026, the initial parent schedule request is `from=2026-08-10&to=2026-08-16`.
- [ ] An activity on Sunday, August 16, 2026 at 15:00 UTC is returned; an activity at Monday, August 17, 2026 00:00 UTC is not.
- [ ] A bound child with no events retains the normal empty-activity state, not the unbound-phone state.
- [ ] The parent can navigate one week backward and forward, and the selected date remains inside the displayed week.
- [ ] Malformed, reversed, and excessive date ranges receive the documented BFF validation response.
- [ ] The affected mini-program and API tests pass before the full repository check.

## Out of Scope

- Re-seeding, editing, or rolling real production events.
- A new club timezone model.
- Changes to coach schedule defaults.

## Closure Reconciliation — 2026-08-28

The parent schedule UI was intentionally superseded by the completed P1 Month V2 task on 2026-08-28. The current Figma contract is `zZ6wKyOHKcO4UYXDd9jGwv / 521:339`, a Monday-first month calendar, and the page loads the selected calendar month rather than a Monday–Sunday week. Therefore the original week-range request and week-strip navigation criteria are historical and must not be used to regress the month design.

The still-current parts of this task are complete: parent pages use the shared local-date helper with the explicit develop-only override disabled, date-only calendar `to` values include the named UTC day, malformed/reversed/overlong ranges return `invalid_date_range`, and guardian projection/empty-child behavior remain covered. The focused API and mini-program checks were rerun on 2026-08-28 with no business-code changes required.
