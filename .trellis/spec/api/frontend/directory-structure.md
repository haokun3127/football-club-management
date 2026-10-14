# Backoffice Directory Structure

`apps/backoffice/config/config.ts` configures Umi, hash routes and runtime public paths. `src/app.tsx` supplies Chinese Ant Design configuration and CSP. `src/pages/workspace.tsx` restores the session and dispatches navigation. Feature pages own structured forms and tables; `src/services/api.ts` owns same-origin cookie requests and typed errors. Never add SQL or credentials to browser source.

Fastify `apps/api/src/routes/backoffice-web.routes.ts` serves only allowlisted build files, injects environment configuration and a CSP nonce, and reads the configured backoffice path. Docker builds and copies `apps/backoffice/dist` separately from compiled API output. Preserve the original static fallback until its compatibility contract is deliberately retired.

API projections belong in `src/application/backoffice-*.ts`, repositories in `src/persistence`, and strict HTTP schemas in `src/http`. Keep OpenAPI synchronized with those exact schema objects.
