# Design: Coach Attendance SQLite Persistence

## Scope

This batch persists coach attendance participant updates without changing the HTTP contract, migrations, attendance page presentation, authentication/session behavior, or unrelated dirty worktree files.

## Data Path

`calendar_events` and `event_participants` from `0002_data_capability_foundation.sql` remain the source of truth. A focused calendar repository owns insert-if-absent seed writes, club-scoped reads, and upsert by `(club_id, event_id, student_id)` for status, note, and `updated_at`.

The repository translates snake_case SQLite columns to domain `CalendarEvent` and `EventParticipant` values. Existing rows are matched by stable id first and the natural participant key second. Seed replay never overwrites an existing participant status or note.

`PlatformRepositories` registers the repository. `seedPlatformData` writes calendar events before participants, after referenced clubs, students, teams, and coaches exist. `PersistentApiStore` overrides calendar/event-participant reads and writes, so event details and student timelines consume SQLite-backed participants.

## Compatibility

- Route authorization, `Idempotency-Key`, conflict handling, response shapes, and present/late lesson debit logic remain in the existing route/service layers.
- A missing `note` preserves the stored note; an explicit empty string clears it.
- No migration is added because the required tables and unique constraint already exist in migration `0002`.
- The mini-program normalizer accepts backend `participant.status` and `participant.note` while retaining legacy fallback fields for compatibility.

## Rollback Boundary

The implementation is limited to the repository, platform assembly/seed, persistent store overrides, tests, and the mini-program API normalizer. Reverting those files restores the prior in-memory participant path; no schema rollback is required.
