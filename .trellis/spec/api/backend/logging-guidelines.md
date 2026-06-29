# API Logging Guidelines

The API currently avoids broad business-logic logging.

## Current Practice

- Tests build Fastify with `{ logger: false }`.
- Route handlers return structured errors instead of logging expected failures.
- Integration code must avoid logging credentials, WPS authorization headers, webhook secrets, raw identity numbers, phone numbers, or student privacy data.

## Add Logging Conservatively

- Prefer explicit return values and test assertions over logs.
- If runtime logging is needed, keep it at boundary points and sanitize sensitive data.
- Never log raw WPS credential config; follow `sanitizeExternalConnection` / `sanitizeWpsConnectionConfig` patterns.

## Examples

- Sanitization: `apps/api/src/integration/wps-connector.ts`
- Webhook security: `apps/api/src/integration/wps-webhook-security.ts`
