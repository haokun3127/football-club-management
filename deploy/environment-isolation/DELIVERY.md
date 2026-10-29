# CQ-00 delivery and version contract

The server image (API, backoffice assets and training-record job) and the WeChat mini-program are two separate release units. Build from committed source, review the artifacts, then select one environment explicitly. These commands do not authorize a deployment, push or WeChat upload.

## Build and inventory

Use Node 24 and the pinned pnpm. Run `pnpm check:delivery` before packaging. Output directories/files below must be new and outside the checkout. The tooling never imports a staged directory into DevTools; the coordinator's main project remains the only permitted DevTools import.

```sh
node scripts/delivery/build-server.mjs --revision <full-commit> --build-id <unique-id> --tag cq-talent-api:<unique-id> --output /private/tmp/server-candidate.json
node scripts/delivery/prepare-miniprogram.mjs --revision <full-commit> --build-id <unique-client-id> --output /private/tmp/cq-client-artifact
```

Both tools export the requested Git commit, excluding uncommitted working files, credentials and ignored dependencies. The server build context includes root scripts, TypeScript config, patches and the API/backoffice/domain packages. Docker installs with the frozen lockfile. No build step is part of runtime Compose.

The server image contains `/app/apps/api/build-metadata.json` (public identity only) and `/app/server-artifact.json` (same identity plus each backoffice/migration file's SHA-256 and lockfile hash). The local candidate records the image ID; this is **not** a registry manifest digest. Existing local tags and candidate output files are not overwritten. Build logs are local build diagnostics, not safe public health payloads.

The mini-program artifact contains a stamped `utils/build-metadata.ts` and a sibling `miniprogram-artifact.json` with a source inventory. This inventory includes source files that official `packOptions.ignore` later excludes; it is neither an official package-size report nor an upload receipt. The checkout's placeholder remains null. The coordinator must copy the approved generated metadata into the main project's common utility before official compilation/upload and retain the same commit/build identity; any other source change requires a new artifact. Never stamp a checkout with a SHA that does not describe its actual approved source.

After a separately authorized image distribution, retain its real `repository@sha256:<64 hex>` reference. With that image available locally, generate the association record:

```sh
node scripts/delivery/create-manifest.mjs --candidate /private/tmp/server-candidate.json --image <repository@sha256:digest> --client /private/tmp/cq-client-artifact/miniprogram-artifact.json --output /private/tmp/delivery-manifest.json
```

This checks that the digest resolves locally to the candidate's image ID. Server and client commits may differ and are recorded independently. Without upload evidence, `reportedPlatformVersion` and `uploadReceipt` remain null. After an authorized official upload, supply both `--client-version <actual-version>` and `--upload-receipt <official-receipt-file>` to a new manifest. The reported version is operator supplied; the receipt is stored only as a hash, never as a secret-bearing raw payload. Preserve the actual receipt privately for audit. This tool does not contact WeChat, push an image, or imply the installed client has updated.

## Environment selection and startup

- `FCM_DEVELOP_IMAGE`, `FCM_TRIAL_IMAGE`, `FCM_RELEASE_IMAGE` each select a reviewed **digest** independently. Do not use `latest` or mutable tags.
- Nonproduction Compose requires both independent image values and dedicated `FCM_DEVELOP_ENV_FILE` / `FCM_TRIAL_ENV_FILE` because Compose interpolates the whole standalone document. Keep the sibling's existing value when changing develop.
- Root release Compose uses `.env.runtime`. Never merge root and nonproduction Compose files or pass unrelated override files.
- `develop-data-init` mounts only develop data; `trial-data-init` only trial data; release retains its own `data-init` and volume. Runtime services have no build configuration.

```sh
node scripts/delivery/start-environment.mjs develop          # render and print safe plan only
node scripts/delivery/start-environment.mjs develop --apply  # requires separate deployment authorization
```

The command validates the selected service's image digest, matching initialization image, one dedicated volume/database, no cross-environment dependencies and localhost port. It never prints rendered environment values. Applying runs exactly the selected init with `run --rm --no-deps --pull never`, then the selected API with `up -d --no-build --no-deps --pull never`. It does not stop/recreate siblings or pull/build images. Install/load the reviewed digest separately before applying. Never run unscoped `compose up` as a shortcut.

Existing operational entrypoints still migrate the owned database without seeding. If a one-shot migration is required, use the **same selected image/config/volume**, for example `docker compose -f deploy/environment-isolation/compose.nonproduction.yml run --rm --no-deps --pull never develop node apps/api/dist/migrate.js`; this also needs deployment authorization. Synthetic/business initialization retains its existing explicit safeguards. Application rollback selects the previous compatible image; never restore an old database over new business facts as an application rollback.

## Readback and client integration

`GET /health` remains public and returns `status: "ok"`, `service: "@football-club/api"`, additive `build: {sourceRevision,buildId,builtAt} | null`, and `environment` when runtime configuration exists. It sets `Cache-Control: no-store`; existing `X-FCM-Environment` remains. Missing/malformed metadata produces null, not a guessed Git SHA or runtime env dump. OpenAPI and response validation use the same schema.

Page owners can import `getClientVersion` and `getServiceVersion` from `utils/version`. `getClientVersion()` is synchronous and makes no request; it separates actual WeChat `version`, runtime `environment`, and stamped `build`. `getServiceVersion()` explicitly reads `/health`, accepts old responses without the additive fields, preserves network errors and rejects an explicit server/client environment mismatch. Display unknown values as “版本待确认”; do not show the API SHA as the client version or add this request to every page load. Attach it to an explicit existing diagnostic/about entrance, with the page's existing loading/retry behavior. No coach/parent page is modified by CQ-00.

Post-deployment acceptance must record both artifact identities, inspect health/backoffice/login and real role flows in the selected environment, and compare trial/release identities before/after a develop update. Local config/tests do not establish live environment invariance or WeChat compilation/device success.
