# Runtime Environment Isolation

## 1. Scope / Trigger

Any change to API bootstrap, migration, mini-program routing, local smoke, reverse proxy or SQLite deployment. This contract protects against accidental environment mixing; it does not establish caller identity.

## 2. Signatures

- `readRuntimeConfig(process.env): RuntimeConfig` in `src/runtime/environment.ts`.
- `openRuntimeDatabase(config): DatabaseSync` in `src/persistence/runtime-database.ts`.
- `buildServer(store, { runtimeConfig, ... })` registers an `onRequest` guard before request contracts. Operational `index.ts` always supplies config; unconfigured builders are isolated unit-test/library fixtures, never deployment entrypoints.
- `runtime_environment(id = 1, environment)` is a bootstrap ownership marker created before business migrations, not a business-schema migration.
- `X-MiniProgram-Env: develop|trial|release`; response `X-FCM-Environment`.

## 3. Contracts

- Runtime environment, absolute database path and WeChat AppID are explicit. `NODE_ENV` controls debug identity, not deployment routing. Trial/release require production mode; remote develop also uses production mode. Debug identity may bind only to localhost.
- Develop/trial use dedicated `cq-talent-<env>/api.sqlite` files and separate volumes. Before any writable open, reject links (including WAL/SHM/journal paths), unknown ownership and mismatched ownership. Never copy a production database/backup into nonproduction.
- Only a deliberate release upgrade accepts a legacy unmarked database. Every configured server runtime defaults to no seed, including develop and trial. Only the localhost development entrypoint or explicit synthetic initialization may seed; tests may explicitly seed temporary databases.
- Every business request passes the environment guard before validation, idempotency pruning/replay and handlers. GET/HEAD health/OpenAPI remain public.
- Nonproduction requires the matching declaration. Release app-client routes require an exact official release Referer matching the configured AppID; old formal clients may omit the new header. Other release tools/integrations must send the correct declaration or a valid formal Referer. Audit old callers before rollout.
- Outside the dedicated `/backoffice` browser boundary, any supplied Referer must match the fixed official HTTPS format. `0` and `devtools` are non-release. They do not distinguish develop from trial. Non-WeChat tools can forge headers: retain Bearer, membership and role checks. Backoffice uses the explicit origin/path and independent session contract in [backoffice-authentication.md](./backoffice-authentication.md); this exception never applies to app-client or generic legacy business paths.
- Proxy upstreams are fixed, strip one environment prefix, preserve declarations/Referer, remove debug identity and never fall back to release.
- Local write smoke permits only localhost HTTP, rejects redirects, and requires a develop health response before proceeding.

## 4. Validation & Error Matrix

| Input | Result |
| --- | --- |
| Missing/unknown runtime env, missing DB/AppID, trial/release debug mode | Startup fails |
| Nonproduction points to old/shared/unmarked/wrong-environment DB or linked path | Reject before writable connection/migration/seed |
| Missing/wrong/duplicate declaration, incompatible or malformed Referer | `403 environment_mismatch`, no business/idempotency write |
| Old trial/approval Referer plus valid production Bearer | `403 environment_mismatch` |
| Matching source but no valid authenticated role | Existing auth rejection |
| Correct formal Referer plus valid Bearer without new header | Existing authorized behavior preserved |

## 5. Good / Base / Bad Cases

- Good: trial request → fixed trial upstream → trial-owned database; a release token is unknown in the independent session repository.
- Base: new temporary owned database migrates and reopens without sharing another environment's records.
- Bad: `NODE_ENV=production` alone is mistaken for release isolation, or an Nginx header overwrites the caller declaration with release.

## 6. Tests Required

`apps/api/test/environment-isolation.test.ts`: runtime selection, independent file reopen, legacy and copied DB rejection with bytes unchanged, links, all configured runtimes no-seed default, HTTP matrix, a real authorized training mutation, valid-session old-trial rejection with `total_changes()` unchanged and no idempotency prune. Mini-program tests cover mapping, cache namespaces, unknown env, fixed header and local smoke health refusal. Run root check/build and render the standalone nonproduction Compose without starting containers. Nginx and real-device behavior require separately authorized deployment validation.

## 7. Wrong vs Correct

Wrong: `createPlatformPersistence({ databasePath: process.env.DATABASE_URL ?? "dev.sqlite" })` in an operational entrypoint.

Correct: `const runtimeConfig = readRuntimeConfig();` then `createPlatformPersistence({ runtimeConfig })` and `buildServer(store, { runtimeConfig })`. All configured server runtimes default to no seed; localhost development data stays in OS temporary storage, outside Documents.

## Deployment Evidence and Runtime Packaging

`node scripts/verify-environment-startup.mjs` exercises built entrypoints, explicit `initialize-nonproduction.js --synthetic`, repeated initialization refusal, and release refusal before database creation. Remote trial/develop do not inherit production AppSecret without explicit authorization. Container code under `/app/apps` and `/app/packages` must be readable/traversable by the `node` user even when build context extraction uses umask 077; Dockerfile normalizes with `chmod -R a+rX`. Validate module loading from `/app/apps/api` using a network-disabled, volume-free container before switching the nonproduction image.

The legacy production process can be protected by `nginx-release-guard.conf` plus `nginx-release-location.conf` without migrating its database. The temporary-upstream verifier `scripts/verify-environment-proxy.py` proves fixed routing and no production fallback; it does not replace deployed HTTPS readback. Current deployment evidence is attached to the active task.

When exporting a reduced build context from a committed Git tree, include root `scripts/` and `tsconfig.base.json` alongside Dockerfile, workspace manifests, lockfile, patches and the API/backoffice/domain packages. Package build commands resolve `../../scripts/clean.mjs`, and TypeScript extends the root config. Check archive entries before transfer; exporting only package directories can pass dependency installation but fail compilation. Keep the failed build log, verify that no immutable tag or active build exists, then rebuild the complete context from the same commit. No service switch is allowed until the candidate builds and passes the remaining delivery gates.

## Scenario: Explicit nonproduction client registration

1. **Scope:** a migrated develop/trial database is reachable but `/app-clients/resolve` returns 404.
2. **Signature:** from repository/container root, `node deploy/environment-isolation/bootstrap-client.mjs --apply`; built API modules and runtime configuration are required.
3. **Contract:** existing owned database only; transactionally insert only the canonical club and WeChat app-client. Use runtime AppID, never the seed placeholder. No user/contact/session/business/external-integration seed. Preserve existing settings on repeat.
4. **Errors:** release/unknown environment, missing flag/file, linked/mismatched DB, conflicting club/client identifiers or inactive registration must fail; never overwrite conflicting configuration.
5. **Cases:** good = new registration resolves via real BFF after reopen; base = repeat returns already_present without changing custom name; bad = full demo/production import to fix one missing client.
6. **Checks:** `bootstrap-client.test.mjs` proves both environments resolve, repeat preserves settings, no users/external connections, conflicts and release fail. `pnpm check:delivery` runs these after build. `check-runtime.mjs` reports missing credentials/roles with exit 1 and never outputs their values.
7. **Wrong vs correct:** a 200 health response is not full login readiness. Use HTTPS routing checks plus private nonproduction configuration check, then genuine WeChat identity and role-flow acceptance.

## Scenario: One authorized nonproduction reviewer

1. **Scope:** explicit user-selected single account with parent/coach/admin membership in develop and trial; no production identity read or update.
2. **Signature:** `node deploy/environment-isolation/bootstrap-identity.mjs --apply`, with runtime-only `FCM_TEST_PHONE` and `FCM_IDENTITY_BACKUP_ATTESTED=1` after a verified dedicated SQLite backup.
3. **Contract:** reuse runtime database ownership/link checks; require an existing active canonical club/client matching runtime AppID. Transactionally insert exactly one fixed user, membership, parent profile and coach profile. No students, teams, finance, sessions or external integrations. Do not log/store the supplied phone in source, reports or command-line arguments.
4. **Errors:** release, missing flag/phone/backup, ownership mismatch, duplicate/conflicting identity or partial installation reject. Never overwrite existing roles, status or phone. Complete matching repeats preserve custom fields.
5. **Cases:** good = unique runtime phone resolves after reopen; base = repeat is `already_present`; bad = reuse the seven-account demo importer or modify a production account for single-user testing.
6. **Tests:** `bootstrap-identity.test.mjs` covers both environments, rejected calls leave DB bytes unchanged, repeat, conflict, no unrelated seed, phone membership lookup and parent/coach switching with a synthetic identity connector. It does not prove real WeChat login. Restart the affected nonproduction services after the separate write so their parent/coach in-memory projections reload.
7. **Wrong vs correct:** three membership roles do not imply three mini-program entrances. Existing app sessions expose parent/coach; admin belongs to the separately implemented backoffice. Record admin permission configuration separately from backoffice acceptance.


## Authorized reviewer business samples

- **Scope:** separately authorized develop business-data preparation for the existing reviewer; the identity-only bootstrap remains unchanged.
- **Operation:** use a verified file backup and a disposable staging database; preserve the reviewer user/membership/profiles, WeChat binding, sessions and registered client. The dated task recovery script is evidence of a one-time operation, not a general CLI.
- **Contract:** generate only synthetic data from repository fixtures, retain one authorized scope, map references to the existing identity before deleting temporary identities, then incrementally insert in a deferred-FK transaction. Restart only the affected test service to refresh projections. Never copy production records or enable startup seeding.
- **Errors:** unknown/release environment, mismatched identity, pre-existing business data, foreign-key/semantic errors or row conflicts must stop before commit. Repeated restore must reject rather than overwrite review edits.
- **Cases:** good = two guardian children and an editable synthetic team under real role sessions; base = identity/session remains unchanged after restart; bad = delete temporary profiles first and trust FK integrity alone, because cascades can remove valid child bindings/assessments without an FK violation.
- **Checks:** assert guardian/roster/publication counts, real course provenance, attendance-to-ledger equality and positive balances, not just integrity_check. Exercise the real parent/coach session and read rendered pages.
- **Wrong vs correct:** client role/token injection is not provisioning; persist authorized memberships and scoped business associations, and validate through the normal role-switch endpoint.


## Fixed artifacts and independent environment selection (CQ-00)

## 1. Scope / Trigger

Server or mini-program packaging, environment startup selection, public build diagnostics and artifact association. No database/domain/authorization changes; the existing environment guard, owned SQLite runtime and explicit provisioning safeguards remain.

## 2. Signatures

- `node scripts/delivery/build-server.mjs --revision <commit> --build-id <id> --tag <unique-local-tag> --output <new-file>`.
- `node scripts/delivery/prepare-miniprogram.mjs --revision <commit> --build-id <id> --output <new-directory>`.
- `node scripts/delivery/create-manifest.mjs --candidate <json> --image <sha256:local-id|repo@sha256:digest> --client <artifact.json> --output <new-file> [--client-version <version> --upload-receipt <file>]`.
- `node scripts/delivery/start-environment.mjs <develop|trial|release> [--apply]`.
- `GET /health`; `getClientVersion()` / `getServiceVersion()` in `utils/version.ts`.

## 3. Contracts

- Immutable commit export separates build from runtime. Docker build args are `FCM_SOURCE_REVISION` (40 lowercase hex), `FCM_BUILD_ID` (1–80 alphanumeric/dot/underscore/hyphen, starts alphanumeric), `FCM_BUILT_AT` (UTC ISO timestamp). They produce an image-baked file, never a runtime env dump.
- Health preserves required status/service; adds optional build (whitelisted three fields or null) and environment. No cache. OpenAPI uses the same schema. Old response consumers ignore additive fields; new clients tolerate old missing fields.
- `FCM_DEVELOP_IMAGE`, `FCM_TRIAL_IMAGE`, `FCM_RELEASE_IMAGE` select independent local image IDs or optional repository digests. Each init/runtime shares the selected immutable image reference and only its dedicated named volume, DB path and localhost port. Startup validates physical volume names too, then targets only the selected init/API with no dependency traversal/build/pull.
- Server artifact lists actual backoffice/migration hashes and lockfile hash. Client artifact lists staged source hashes; official package/receipt evidence is independent. Manifest binds two separately versioned units to the actual locally inspected image ID and optional repository digest; optional reported platform version requires receipt bytes (stored as hash only). No automatic push/upload/deployment.
- Client version utility does no network work until an explicit service-version read. Platform version, client source and API source remain distinct facts. Page integration details: `deploy/environment-isolation/DELIVERY.md`.

## 4. Validation / Error Matrix

| Input | Behavior |
| --- | --- |
| Missing/broken image metadata | Health build is null; status/service remain usable |
| Secret-bearing extra fields | Whitelisted public metadata only |
| Older health response | Client returns null build/environment |
| Explicit service/client environment mismatch | Client diagnostic rejects |
| Mutable tag, different init image, cross-volume/dependency/port | Startup refuses before any command |
| Existing packaging destination or local tag | Refuse overwrite |
| Uncommitted source changes | Excluded from fixed commit artifact |
| Wrong candidate image ID/digest, broken hashes or missing build identity | Manifest refuses |
| Platform version without receipt or reverse | Manifest refuses; absent pair stays null |

## 5. Good / Base / Bad Cases

- Good: change only develop image ID; trial rendered service/init stays identical; plan starts develop init and develop API only.
- Base: unstamped local checkout or older service reports unknown metadata without blocking business flows.
- Bad: infer client SHA from API SHA, call health on every page load, publish latest, run unscoped compose up, share init volumes, or claim source inventory is official WeChat compilation evidence.

## 6. Tests Required

- API build-info/server/environment-isolation tests: public read, whitelist, null cases, no-store, OpenAPI and existing auth/environment boundaries.
- Mini-program version/environment tests: no implicit request, stamped/source/platform distinction, old response, mismatch and unavailable runtime/request.
- `node --test scripts/delivery/*.test.mjs`: real Compose rendering and unchanged sibling, digest/volume/dependency guards, fixed Git fixture export vs dirty checkout, actual asset/migration hashing and manifest association/rejection.
- `pnpm check:delivery`: root typechecks/tests/build, scripts/bootstrap and isolated three-environment startup. Actual container and live deployment evidence recorded separately in implement.md.

## 7. Wrong vs Correct

Wrong: `FCM_NONPROD_IMAGE=cq:latest docker compose up -d` with one init mounting both environments.

Correct: preserve independently reviewed immutable image references; inspect `start-environment.mjs develop` plan, then execute that exact targeted plan only under deployment authorization. Read back both public artifact identities, compare siblings, preserve existing database facts during application rollback.
