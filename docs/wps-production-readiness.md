# WPS Production Readiness Boundary

## Summary

The backend now has a production-shaped boundary for real WPS synchronization without storing real 重庆天才 credentials in the repository. WPS remains a backend integration concern:

WPS -> connector -> sync policy -> sync run -> raw records -> field mapping -> validation -> manual/auto confirmation -> core facts.

Mini-program clients must not hold WPS credentials, table identifiers, field mappings, or signature secrets.

## Implemented

- HTTP WPS connector supports injected fetch, environment-backed credential resolution, timeout, retry, and per-connection rate-limit settings.
- WPS connection config uses `credentialRef`; real authorization headers are resolved from environment variables.
- Webhook intake supports HMAC-SHA256 signature verification, timestamp skew checks, and nonce replay protection when the connection config enables signing.
- Scheduled sync planning remains separate from execution; webhook intake queues a sync run and does not write core facts directly.
- The admin-only run-due endpoint executes due scheduled policies and can be reused by a production scheduler or worker.
- HTTP sync readiness requires active connection, active table mapping, and field mappings before execution.
- Failed sync execution records a failed `external_sync_run` for operational visibility.
- API responses sanitize WPS connection config and do not return raw secrets.

## Runtime Configuration

Use environment variables for production secrets:

- `WPS_CREDENTIAL_<REF>`: authorization header for a WPS credential reference.
- `WPS_WEBHOOK_SECRET_<REF>`: HMAC secret for webhook signature verification.

Example:

```bash
WPS_CREDENTIAL_CQ_TALENT_PROD="Bearer <token>"
WPS_WEBHOOK_SECRET_CQ_TALENT_WEBHOOK="<webhook-secret>"
```

Connection config should contain references and operating limits only:

```json
{
  "mode": "http",
  "apiBaseUrl": "https://wps-api.example",
  "credentialRef": "cq-talent-prod",
  "credentialStatus": "configured",
  "documentToken": "<document-token>",
  "pageSize": 100,
  "timeoutMs": 10000,
  "maxRetries": 2,
  "retryBaseDelayMs": 250,
  "rateLimitPerMinute": 60,
  "webhookSigningMode": "hmac_sha256",
  "webhookSecretRef": "cq-talent-webhook",
  "webhookMaxSkewSeconds": 300
}
```

## Official Account And Application Requirements

Based on WPS/KDocs official documentation, real API access requires an application and authorization setup, not just an ordinary document link:

- A WPS developer account is required. WPS states that the developer account is the WPS account, and that after creating a service provider, applications can be managed in the developer console.
- Creating an application is the prerequisite for using OpenAPI. WPS distinguishes test applications and formal applications; test applications are recommended for development, and test/formal applications may have different API frequency limits.
- After an application is approved, WPS generates `APPID` and `APPKEY`. These secrets must be kept server-side and must not be placed in mini-program code, frontend code, documents, or repository files.
- Web/App/Mini-program authorization uses OAuth 2.0. The application must request scopes, and the authorized WPS/KDocs account must grant access to the relevant documents.
- For user-owned personal documents, APIs require a user access token. For organization/application documents, document ownership and access depend on organization authorization.
- The exact API scopes, document type, table type, webhook behavior, and API quotas must be verified against the customer's WPS/KDocs account and document setup during onboarding.

Official references:

- https://developer.kdocs.cn/isp/access/create_application.html
- https://developer.kdocs.cn/server/example/personal-files.html
- https://developer.kdocs.cn/common/authorization/web.html
- https://developer.kdocs.cn/server/guide/api.html
- https://developer.kdocs.cn/server/et/overview.html
- https://open.wps.cn/previous/docs/scope

## Webhook Signature Contract

The backend accepts signature data from headers:

- `x-wps-timestamp`
- `x-wps-nonce`
- `x-wps-signature`

The generic signature payload is:

```text
timestamp + "." + nonce + "." + canonical_json(webhook_body_without_security)
```

The signature is lowercase hex HMAC-SHA256. If the real WPS gateway uses different header names or canonicalization, add a thin adapter at the route boundary and keep the store/integration contract unchanged.

## Still Required Before Real Club Go-Live

- Confirm WPS/KDocs account eligibility, API scope, rate limits, webhook behavior, and exact payload format during onboarding.
- Store production env vars in the deployment secret manager, not in repo or app-client config.
- Run a real credential smoke test against a non-production WPS document.
- Decide operations policy for repeated failures: alert channel, manual retry, and pausing a sync policy.
- Add a production scheduler/worker process if automatic scheduled sync must run without an operator; the worker should call the existing run-due execution contract.
