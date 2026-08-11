# C4 attendance restoration design

## Source of truth

- Figma file: `zZ6wKyOHKcO4UYXDd9jGwv`
- C4: `93:665`
- C4.1: `93:696`
- C4.2: `93:715`

## Data flow

`opt-in acceptance seed -> persisted event participants and attendance rows -> coach workbench BFF -> attendance page view model -> PUT attendance -> persistence -> workbench reload -> success summary`.

The client retains its current event-scoped request and never invents a roster or completion state. The server remains the owner of attendance status, lesson consumption and role authorization.

## UI approach

Reuse the existing `app-header`, `role-tabbar`, `status-chip` and page state primitives. C4 keeps the event summary and mass actions, but roster items are rendered as compact 60px Figma rows in the normal state. The success page presents real saved counts and event metadata. Correction mode keeps the actual editable roster but uses the warning hierarchy and bottom action layout from C4.2; it deliberately does not render Figma's unsupported parent-dispute sample list or a global correction note.

## Risk and rollback

- Role and event scope must not be widened for demo data.
- Event RSVP (`confirmed`/`invited`) is not attendance. The mini-program normalizes it to `pending` before C4 rendering, while the attendance writer remains restricted to actual attendance statuses.
- Changing an attendance save path can affect lesson debits, so UI work should avoid touching the API contract unless the data audit proves a missing seed value.
- Each commit is independently reversible: data-only changes and UI-only changes are kept separate where possible.
