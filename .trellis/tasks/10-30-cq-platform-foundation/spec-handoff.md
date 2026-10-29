# CQ-00 executable contract handoff

Shared specs remain coordinator-owned. Suggested target: `.trellis/spec/api/backend/environment-isolation.md`, API quality guidelines and mini-program configuration guidelines. This task-local handoff follows trellis-update-spec without editing shared files.

## 1. Scope / Trigger

Server or mini-program packaging, environment startup selection, public build diagnostics and artifact association. No database/domain/authorization changes; the existing environment guard, owned SQLite runtime and explicit provisioning safeguards remain.

## 2. Signatures

- `node scripts/delivery/build-server.mjs --revision <commit> --build-id <id> --tag <unique-local-tag> --output <new-file>`.
- `node scripts/delivery/prepare-miniprogram.mjs --revision <commit> --build-id <id> --output <new-directory>`.
- `node scripts/delivery/create-manifest.mjs --candidate <json> --image <repo@sha256:digest> --client <artifact.json> --output <new-file> [--client-version <version> --upload-receipt <file>]`.
- `node scripts/delivery/start-environment.mjs <develop|trial|release> [--apply]`.
- `GET /health`; `getClientVersion()` / `getServiceVersion()` in `utils/version.ts`.

## 3. Contracts

- Immutable commit export separates build from runtime. Docker build args are `FCM_SOURCE_REVISION` (40 lowercase hex), `FCM_BUILD_ID` (1–80 alphanumeric/dot/underscore/hyphen, starts alphanumeric), `FCM_BUILT_AT` (UTC ISO timestamp). They produce an image-baked file, never a runtime env dump.
- Health preserves required status/service; adds optional build (whitelisted three fields or null) and environment. No cache. OpenAPI uses the same schema. Old response consumers ignore additive fields; new clients tolerate old missing fields.
- `FCM_DEVELOP_IMAGE`, `FCM_TRIAL_IMAGE`, `FCM_RELEASE_IMAGE` select independent repository digests. Each init/runtime shares the selected digest and only its dedicated named volume, DB path and localhost port. Startup validates physical volume names too, then targets only the selected init/API with no dependency traversal/build/pull.
- Server artifact lists actual backoffice/migration hashes and lockfile hash. Client artifact lists staged source hashes; official package/receipt evidence is independent. Manifest binds two separately versioned units to the actual locally inspected image ID/digest; optional reported platform version requires receipt bytes (stored as hash only). No automatic push/upload/deployment.
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

- Good: change only develop digest; trial rendered service/init stays identical; plan starts develop init and develop API only.
- Base: unstamped local checkout or older service reports unknown metadata without blocking business flows.
- Bad: infer client SHA from API SHA, call health on every page load, publish latest, run unscoped compose up, share init volumes, or claim source inventory is official WeChat compilation evidence.

## 6. Tests Required

- API build-info/server/environment-isolation tests: public read, whitelist, null cases, no-store, OpenAPI and existing auth/environment boundaries.
- Mini-program version/environment tests: no implicit request, stamped/source/platform distinction, old response, mismatch and unavailable runtime/request.
- `node --test scripts/delivery/*.test.mjs`: real Compose rendering and unchanged sibling, digest/volume/dependency guards, fixed Git fixture export vs dirty checkout, actual asset/migration hashing and manifest association/rejection.
- `pnpm check:delivery`: root typechecks/tests/build, scripts/bootstrap and isolated three-environment startup. Actual container and live deployment evidence recorded separately in implement.md.

## 7. Wrong vs Correct

Wrong: `FCM_NONPROD_IMAGE=cq:latest docker compose up -d` with one init mounting both environments.

Correct: preserve independently reviewed digest values; inspect `start-environment.mjs develop` plan, then execute that exact targeted plan only under deployment authorization. Read back both public artifact identities, compare siblings, preserve existing database facts during application rollback.
