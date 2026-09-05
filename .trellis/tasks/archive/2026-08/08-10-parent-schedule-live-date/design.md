# Parent Schedule Live Date Design

## Boundaries

The mini-program owns the local initial date, displayed week and week-navigation state. The BFF owns calendar-range interpretation and guardian projection. Seed data remains unchanged.

## Date Contract

`from` and `to` remain optional query parameters. A date-only `from` is inclusive at its UTC midnight. A date-only `to` is converted to the next UTC midnight and compared as an exclusive upper bound. Full ISO timestamps retain the existing exact timestamp semantics. The route validates the supported forms, rejects a reverse range, and applies an explicit maximum range before querying events. The whole implementation uses the existing UTC event convention; a club-timezone redesign is deliberately out of scope.

## Client Behaviour

Parent schedule/day pages call a shared date helper for the current local date. The schedule page retains a selected date and derives a Monday–Sunday week. Previous/next controls move the selected date by seven days and refresh the BFF range. A development fixture override, if retained, is owned centrally in `utils/config.ts`, disabled by default, and cannot affect trial or release. No page embeds a hidden fixture date.

## Risks and Rollback

Changing a develop default may reveal a genuine empty current week because fixtures are historical. That is correct. The API range correction and client live-date change land in separate commits, so either can be reverted without schema or data rollback.

## Current Design Reconciliation — 2026-08-28

P1 Month V2 (`521:339`) supersedes the former week-strip design. The client now derives the selected month from the live local date, requests that month's first and last date, and precomputes a six-row Monday-first grid. The API date-only contract remains unchanged and is validated independently. The existing `changeWeek` handler is retained only as inert compatibility code; it is not exposed by the current Figma UI.
