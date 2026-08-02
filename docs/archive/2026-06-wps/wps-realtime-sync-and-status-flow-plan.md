# WPS Realtime Sync And Status Flow Plan

## Decision

WPS API integration is part of the backend platform roadmap, not a mini-program customization. The first delivery can keep Excel/WPS exported-file import as a compatibility path, but the backend must evolve toward automatic WPS synchronization using the same integration model:

WPS connector -> sync policy -> sync run -> raw records -> field mapping -> validation -> confirmation policy -> core facts.

The platform does not execute online payment, online insurance purchase, refunds, invoicing, or financial settlement in MVP. It does manage the operational state produced by those offline processes:

- student lesson balance,
- lesson credit/debit/adjustment ledger,
- payment/offline confirmation state,
- insurance status,
- insurance expiry,
- insurance policy number,
- insurance review state,
- source sync run and audit trail.

The correct MVP boundary is: no transaction execution, yes operational fact and state flow.

## Product Requirements

### WPS Connector

The backend should support WPS as an external system connection:

- club-scoped WPS authorization and connection status,
- WPS document/workbook/sheet identifiers,
- token/config storage behind the backend only,
- manual sync trigger from club admin,
- scheduled sync policy for automatic sync,
- sync status, last synced time, and error report.

The mini-program can display sync state or trigger a backend sync if authorized, but it must not hold WPS credentials or implement mapping logic.

### Configurable Sync Rules

Each club can configure sync behavior in the club admin backend:

- provider: `wps`,
- sync mode: manual, scheduled, disabled,
- schedule: interval minutes or cron-like daily time,
- direction: inbound only for MVP,
- table mapping: WPS table to system target type,
- field mapping: WPS field to standard field, custom field, metric field, or status field,
- identity rule: identity number, external row id, payload hash,
- apply policy: manual confirm, auto apply when valid, reject when invalid,
- conflict policy: WPS wins, system wins, manual review,
- writeback policy: disabled by default, later optional status writeback.

MVP should default to inbound-only WPS -> platform. Two-way sync must wait until field ownership is explicitly configured.

### Status Flow

Lesson and insurance data are not just display fields. They must be facts with sources, states, and audit history.

Lesson state flow:

- offline recharge confirmed -> `PaymentEvent` + `LessonCreditLedger(credit)`,
- attendance/deduct event confirmed -> `LessonCreditLedger(debit)`,
- manual correction -> `LessonCreditLedger(adjustment)`,
- current balance -> calculated from ledger with cached snapshot on student operational profile,
- every ledger entry stores source type, source id, sync run/raw record where applicable, actor, and timestamp.

Insurance state flow:

- offline insurance purchase/review confirmed -> `InsurancePolicy`,
- active/expired/unknown derived from `approved` and `expiresAt`,
- renewal creates a new policy record, not a silent overwrite,
- student operational profile keeps latest expiry snapshot for filtering,
- every policy stores source type, source id, sync run/raw record where applicable, actor, and timestamp.

## Backend Model Additions

The current schema already has:

- `external_system_connections`,
- `external_table_mappings`,
- `external_field_mappings`,
- `external_sync_runs`,
- `external_raw_records`,
- `external_record_links`,
- `payment_events`,
- `lesson_credit_ledger`,
- `insurance_policies`,
- student operational snapshots.

Next additions should be incremental:

- `external_sync_policies`: sync schedule, direction, apply/conflict/writeback policies,
- connection config extension for WPS document identifiers and credential references,
- sync run trigger API,
- sync run worker/service interface,
- status transition service for lesson and insurance facts,
- audit fields on generated operational facts where currently missing.

## API Targets

Admin/config APIs:

- `GET /clubs/:clubId/admin/integrations/connections`
- `POST /clubs/:clubId/admin/integrations/connections`
- `GET /clubs/:clubId/admin/integrations/sync-policies`
- `POST /clubs/:clubId/admin/integrations/sync-policies`
- `PATCH /clubs/:clubId/admin/integrations/sync-policies/:policyId`
- `POST /clubs/:clubId/admin/integrations/sync-policies/:policyId/run`
- `GET /clubs/:clubId/admin/sync-runs/:syncRunId`

Operational status APIs:

- `GET /clubs/:clubId/admin/students/:studentId/lesson-ledger`
- `POST /clubs/:clubId/admin/students/:studentId/lesson-adjustments`
- `GET /clubs/:clubId/admin/students/:studentId/insurance-policies`
- `POST /clubs/:clubId/admin/students/:studentId/insurance-policies`

Parent/coach read APIs should expose only allowed status summaries, not payment proof or financial review internals.

## Window Responsibilities

### E Window

Owns integration persistence and admin operations:

- add `external_sync_policies` migration and repository,
- expose connection/policy CRUD APIs,
- add manual sync-run trigger endpoint,
- implement WPS connector interface with a deterministic stub adapter for tests,
- ensure WPS API and Excel import both land in the same staging/raw-record model,
- keep real WPS network calls behind an adapter, not in route handlers.

### F Window

Owns business rules and API contracts:

- formalize lesson ledger transition rules,
- formalize insurance policy/status transition rules,
- enforce permissions for admin/operator, coach, parent,
- expose lesson/insurance status APIs with response schemas,
- ensure attendance and offline recharge can update lesson state without online payment,
- ensure insurance status can update without online insurance purchase.

### Main Control

Owns integration and verification:

- integrate only E/F branches based on current `codex/chongqing-talent-business`,
- run migration, `pnpm check`, `pnpm build`, and forbidden-model scans,
- verify WPS sync policy and lesson/insurance state flows with重庆天才 sample data,
- reject any implementation that puts WPS credentials or mapping logic in the mini-program.

## Acceptance Criteria

- A club admin can configure a WPS connection and sync policy.
- A manual sync run can create staging raw records using the same mapping path as Excel import.
- A sync run records success/failure counts and validation errors.
- Valid payment/attendance/insurance records can update lesson and insurance operational facts through explicit confirmation or configured auto-apply.
- The system can answer a student's current lesson balance and insurance status with source/audit context.
- Parent can read child status summaries; parent cannot mutate payment, lesson, insurance, or sync state.
- Coach can read relevant student status in activity context, but cannot configure WPS or financial review rules.
- `pnpm check` and `pnpm build` pass.
