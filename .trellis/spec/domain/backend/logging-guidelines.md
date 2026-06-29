# Domain Logging Guidelines

Domain modules should remain pure and should not log.

## Rules

- Do not add console logging to domain services or calculations.
- Return structured results and let the API layer decide whether operational logging is needed.
- Do not log student, guardian, health/privacy, assessment, payment, or identity data from domain helpers.

## Examples

- Domain tests assert returned records and lineage rather than log output.
