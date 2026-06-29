# API Error Handling

Fastify routes convert expected domain/store failures into structured HTTP errors.

## Route Pattern

- Use `context.sendError(reply, status, code, message)` for expected client-facing errors.
- Return 404 with code `not_found` when a target resource is absent.
- Wrap validation-like service/store failures in `try/catch` and return 400 with a specific error code.
- Preserve existing route style: auth check first, then store/service call, then return payload or `reply.code(...).send(...)`.

## Auth and Capability Failures

- Use `context.requireClubRole(request, reply, clubId, roles)` for admin/coach role checks.
- If `requireClubRole` returns false, return `reply` immediately and do not continue the handler.

## Examples

- `apps/api/src/routes/data-capability.routes.ts` uses `invalid_sync_policy`, `due_sync_failed`, and `invalid_wps_webhook`.
- `apps/api/src/http/errors.ts` defines the common error response shape.
