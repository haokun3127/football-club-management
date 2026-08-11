# C5 real-data coverage

## Existing controlled acceptance data

- The opt-in CQ Talent acceptance seed has a 16-student coach roster and an imported lesson-ledger balance for every seeded student.
- The scheduled acceptance training has the same real participants. C5 reads the BFF roster/ledger intersection; it does not derive a roster in WXML or use a client fixture.
- A normal C5 `POST` writes a real `attendance`-source debit entry. C5.1 uses the normal idempotent `PATCH` to write a half-lesson correction, then both pages re-read the BFF result.

## Demonstration boundary

- The write/restart proof must use a disposable file-backed SQLite database. It must not be run against the server's existing database or production.
- Acceptance seeding is insert-if-absent. A seed-code change cannot retroactively alter an existing database; use the normal authorized API path for a deliberate demonstration write.
- Parent BFF responses retain guardian projection. The coach roster is not made available to parent routes.
