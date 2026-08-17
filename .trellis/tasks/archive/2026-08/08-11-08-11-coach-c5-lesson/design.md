# C5 lesson confirmation and correction design

## Online design source

- C5 Lesson Confirm: `zZ6wKyOHKcO4UYXDd9jGwv / 93:734`
- C5.1 Lesson Correction: `zZ6wKyOHKcO4UYXDd9jGwv / 93:765`

Both artboards are 375x812. C5 uses an 88px soft-pink header, 22px content gutters, 20px content spacing, a 16px-radius dark activity summary, a compact white lesson list, a 52px red primary action and the coach tab bar. The actual list may have more than the five visual-example rows, so it must scroll rather than truncate or fabricate the sample count.

## Real data flow

`coach workbench + lesson-confirmation GET -> real event roster/ledger view model -> C5 POST confirmation or C5.1 PATCH correction -> persisted lesson ledger -> GET readback`.

The UI does not manufacture a deduction amount, roster, balance, correction outcome or reason. Existing APIs remain the authority for the coach's event scope, lesson debit semantics and idempotency. C5.1 stays a general real correction page; Figma samples are layout guidance only.

## Risk boundary

- A normal confirmation may debit lessons. The UI must not change the existing API payload semantics or turn pending RSVP into a debit without the server's validation.
- The acceptance seed is insert-if-absent. Updating it changes fresh acceptance databases only; an existing production database needs an authorized normal API write to show a new state.
- Parent projection remains limited to guardian-linked children; coach roster data is not reused by parent pages.
- The controlled proof runs only against a temporary file-backed SQLite database. It may exercise the normal acceptance event and restart/read it back, but it must never make a production request or mutate an existing database.
