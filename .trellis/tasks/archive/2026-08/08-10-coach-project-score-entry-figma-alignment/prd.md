# Coach project score entry Figma alignment

## Goal

Align C12 Project Score Entry to Figma `zZ6wKyOHKcO4UYXDd9jGwv` node `93:1030` with CODE node `231:108`, using only existing workbench, assessment-form and submission capabilities.

## Requirements

- Whitelist only `pages/coach/test-entry/index.{json,ts,wxml,wxss}`, a new focused test, `assets/icons/c12-arrow-left.svg`, and this task's records.
- Require a real event id. The only page-level template source is the existing normalized `workbench.assessmentTemplateId` returned for that event; C12 must never apply a URL value, seed literal, name heuristic or first-list fallback itself. Load and validate that workbench before requesting its form. Replacing the shared API's historical normalization is a separate backend/API batch.
- Render exactly one real template and all of its real fields, plus the real roster and local drafts. Field selection is explicit group/field navigation and switching fields must preserve every draft entry. No fixed student names, scores, dates, counts, seed template or arbitrary first field.
- Retain truthful range validation, submission lock and partial-failure state; never represent a failed row as submitted.
- Render C12's pink navigation, dark task header, fixed submit bar and training tab. Use the CODE node's one-metric/full-roster interaction rather than inventing an unverified horizontally cropped multi-metric form.
- WXML has no JavaScript array methods. Do not alter shared APIs, routes, app configuration, API/persistence/store/tests, C11/C13/C14 or user work.

## Acceptance Criteria

- [ ] Role, missing event, route/workbench event mismatch, cancelled event, absent workbench template, absent form, form template ID mismatch or missing form version prevent writes.
- [ ] Workbench is loaded before form; all rendered rows derive from the roster and all rendered fields derive from one real current template.
- [ ] Draft, validation, submission lock and partial-failure handling are covered: clear only confirmed-success rows; retain failure/unknown rows without automatic retry or success display.
- [ ] Focused test, package typecheck, package test suite and scoped diff check pass.
