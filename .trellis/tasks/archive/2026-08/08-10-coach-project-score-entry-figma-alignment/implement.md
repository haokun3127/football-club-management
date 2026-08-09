# C12 implementation

1. Inspect current C12 code and real workbench/form/write contracts before editing.
2. Add RED tests for guards (role, event id, workbench event id, cancellation, workbench template, form template ID and required form version), sequential workbench-to-form ordering, all-real-field view models and field-switch draft retention, validation, submission lock, confirmed-success-only clear, partial/unknown failures and WXML restrictions.
3. Make the smallest page-local C12 changes plus the direct Figma return asset.
4. Run focused tests, miniprogram typecheck and complete miniprogram tests; review scoped diff and protected paths.
5. Controller independently reviews, explicitly commits code, then archives task records in a second commit.

Rollback is a page-only commit revert; no storage or deployment is involved.
