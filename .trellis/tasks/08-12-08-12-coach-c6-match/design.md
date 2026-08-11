# C6 match: design and data contract

## Online design targets

| Screen | Figma node | Implementation boundary |
| --- | --- | --- |
| C6 Match Entry | `93:796` | `pages/coach/match/` |
| C6.1 Add Match Event | `93:827` | `pages/coach/match-event-add/` |
| C6.2 Save State | `93:858` | existing local-draft overlay in `pages/coach/match/` |

All three nodes were refreshed from the online Figma on 2026-08-12. C6 adopts the soft 88px header, 16px page inset, dark 16px-radius hero, compact period chips, 12px-radius event card and outlined `+添加事件` action. C6.1 adopts the chip group, white 12px-radius form card, 48px controls and 52px rounded primary action. C6.2 contributes only the dimmed overlay, 315px modal scale and two-action composition; its sample in-progress match, clock, pause/end controls and remote auto-save language are unsupported by the current BFF and are not copied as business facts.

## Data flow

```text
SQLite acceptance seed / coach write
  -> GET /coach/events/:eventId/match
  -> getCoachMatchDetail(eventId)
  -> C6 view model

C6.1 user-confirmed event
  -> POST /coach/events/:eventId/match/events + Idempotency-Key
  -> SQLite match_events + metric record transaction
  -> navigate back
  -> C6 re-reads exact event
```

## Visual adaptation

- Reuse `app-header` and `role-tabbar`; do not introduce a separate navigation system.
- C6 hero uses API event title/team and recorded score. Its period chips cannot imply a persisted half-by-half score because the BFF has no period-score fields; use neutral, non-invented labels only.
- C6 places two neutral period chips below the score presentation and uses the Figma outlined red `+添加事件` affordance. Neither chip contains a fabricated half score.
- Timeline pills derive colour and label from the real event type in the TypeScript view model. No WXML method calls.
- C6.1 options derive exclusively from `capabilities.match.eventTypes` and the real match roster.
- C6.2 remains a device-local unsent-draft resume prompt. It uses no remote auto-save wording, fake clock, score, pause/end control or sample event. Continue opens C6.1 and Exit navigates back; neither action writes a server record.

## Acceptance demonstration data

| Item | Existing | Required result |
| --- | --- | --- |
| Completed match | yes | `event-cq-talent-demo-match-completed`, friendly, 3:2, 16-player roster |
| Participants / roster | yes | all 16 acceptance demo students are present and in the match roster |
| Goal + assist | yes | same 22nd-minute play from two real roster students |
| Yellow card | missing | one real roster student, a distinct minute |
| Save | missing | one real roster student, a distinct minute |
| Append proof | yes | C6.1 POST is idempotent and C6 GET sees the saved event |
| Restart proof | yes | API test opens a fresh file-backed SQLite DB, writes, closes and reopens it |

The displayed 3:2 match score remains the persisted match summary. The match-event BFF does not support recording opponent goals or per-half totals, so neither is invented just to mirror Figma sample copy.

## C6.1 no-regression contract

- This task does not change the match route, body, schema, authorization, idempotency, persistence contract, migration set or any production database.
- C6.1 sends only `{ studentId, type, minute?, note? }` with one stable 8–128 character `Idempotency-Key`.
- Only HTTP `201` is success. Validation, network, conflict and ambiguous responses retain the local draft and do not navigate.
- C6 performs no optimistic event insertion and accepts no opener payload: after C6.1 returns, `onShow` re-reads the same `GET /coach/events/:eventId/match` projection.

## Seed-environment boundary

- `FCM_CQ_TALENT_ACCEPTANCE_SEED=1` is permitted only for non-production, explicitly isolated development/test runs.
- Production ignores that variable. This change does not delete, overwrite, migrate or backfill any database; existing production test records remain untouched.

## Risks and rollback point

- The acceptance seed is insert-if-absent: changing it does not backfill an already-created database. This is deliberate; run a fresh isolated database for data checks.
- Do not merge seed-only facts into production data during this task.
- The exact live 375x812 visual comparison is still a separate verification step; no runtime screenshot claim is made by code tests.
