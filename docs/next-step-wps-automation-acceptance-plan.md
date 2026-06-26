# Next Step: WPS Automation Acceptance Plan

## Goal

The next milestone is to move from deterministic WPS stub sync to a production-shaped WPS automation foundation for 重庆天才足球俱乐部, while preserving the platform architecture:

- WPS credentials, field mappings, sync policies, schedules, and conflict rules stay in the backend.
- The mini-program only consumes capabilities, sync status, student status summaries, calendar, training, match, and assessment APIs.
- MVP still does not execute online payment, online insurance purchase, refund, invoice, or financial settlement.
- Lesson balance, insurance status, attendance debit, offline recharge confirmation, and review status continue to flow as platform facts.

## External Capability Baseline

The implementation should align with current WPS/KDocs platform capabilities:

- WPS/KDocs exposes data-table record traversal APIs for online sheets and lightweight database tables.
- WPS/KDocs exposes sheet/schema APIs that can be used to validate table and field configuration.
- WPS/KDocs exposes webhook subscription APIs for database/table changes.
- WPS API limits, authentication, scopes, and account eligibility must be confirmed during real club onboarding.

## Scope

### E Window: WPS Connector And Staging Runtime

Implement the backend connector foundation without requiring real 重庆天才 credentials:

- Extend WPS connection/table mapping config with provider-specific fields:
  - document/file token,
  - sheet/table id,
  - table kind: online sheet, data table, lightweight table,
  - API base URL,
  - page size,
  - credential reference id, never raw secret.
- Introduce a WPS connector factory:
  - deterministic stub connector remains for tests and local development,
  - HTTP WPS connector accepts injected `fetch` and credential resolver,
  - no route handler performs WPS HTTP logic directly.
- Implement record traversal normalization:
  - supports paged records,
  - normalizes WPS record id, row number/index when available, and field payload,
  - computes stable row hash,
  - returns `StageExternalImportRecord[]`.
- Add connector tests with mocked WPS responses:
  - pagination,
  - stable row hash,
  - missing mapping/config errors,
  - credentials are not included in API responses or logs.

### F Window: Sync Rules, Scheduling Contract, And Webhook Entry

Harden the sync policy contract around automation:

- Validate sync policy configuration:
  - `manual` requires no schedule,
  - `scheduled` requires a supported schedule config,
  - MVP run remains inbound-only,
  - outbound/bidirectional can be configured only as disabled/not runnable.
- Add scheduled sync planning helpers:
  - find due policies by club/time,
  - compute next run metadata,
  - keep execution path the same as manual `runExternalSyncPolicy`.
- Add webhook ingestion contract:
  - backend-only route for WPS webhook event intake,
  - validates connection/table mapping,
  - creates a sync run or queues a policy run without applying directly to core facts,
  - preserves staging/manual-confirm path.
- Extend OpenAPI and tests:
  - admin can see connection/policy/sync status,
  - parent/coach cannot configure WPS,
  - webhook route does not expose credentials.

## Controller Acceptance

Main controller will integrate E then F and run:

- `pnpm check`
- `pnpm build`
- `DATABASE_URL=:memory: pnpm --filter @football-club/api db:migrate`
- forbidden placeholder scan:
  - old demo club ids and demo club variable names,
  - old demo club display names,
  - old placeholder identifiers for external integrations.
- forbidden legacy assessment scan:
  - direct old assessment-template metric-id coupling,
  - old template-node model,
  - fixed score-only assessment model.

## Out Of Scope

- No mini-program UI implementation.
- No real 重庆天才 WPS credential storage in repo.
- No production scheduler daemon.
- No outbound WPS writeback beyond status-only contract preparation.
- No payment execution, online insurance purchase, refund, invoice, or settlement.
