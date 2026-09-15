# Validation and rollout status — 2026-09-15

Code implementation is committed. The feature remains disabled by default. Runtime acceptance is pending; the task is intentionally not archived.

## Delivered

- Per-project server drafts with task template pinning, roster-based completion and optimistic revisions.
- Coach-confirmed publication of complete students; independent per-student batch results and replay protection.
- Correction reasons, old published-result isolation, append-only change/publication history and cutoff read-only behavior.
- Existing standard-score graph input normalization and shared score maxima/percentage display. The first-round scope is the existing 62 standard-score items; no age normalization tables were introduced.
- Mini-program save, publish confirmation, history, conflict-preserving local drafts and server-overall display.
- Additive persistence migration and shared SQLite transaction queue. No production writes, deployment or push.

## Automated evidence

| Check | Result |
|---|---|
| `pnpm typecheck` | All three packages passed |
| Domain suite | 23 tests passed |
| API complete suite | 144 tests passed |
| Mini-program suite excluding pre-existing screenshot helper file | 485 tests passed |
| Root `pnpm check` | Failed only in the previously failing Windows-specific screenshot helper file: 4 failures; mini-program otherwise reported 497 passed, 1 skipped |
| `git diff --check` | Passed |

The four screenshot-helper failures are two file-output assertions and two missing `D:\微信web开发者工具\cli.bat` errors on macOS. Their behavior was present at baseline. This task does not modify that helper. Test-created scratch files were removed; pre-existing user screenshots/configuration remain untouched.

The table and scope statement above describe the initial run. The subsequent user-authorized remediation below supersedes the four-failure status.

Regression coverage includes single-project readback, zero and bad inputs, stale/no-op saves, authorization, cutoff, disabled/adopted tasks, incremental/full equivalence, 99-record publication, partial batches, retry, correction isolation, publication rollback, archived pinned versions, real file-database restart, cross-interface overall scores and OpenAPI paths.

## WeChat runtime attempt and remaining acceptance

- Created a separate mini-program copy under `/tmp/fcm-assessment-runtime/mini`, replacing its API endpoint with `127.0.0.1:3038` only in that copy.
- Started an isolated in-memory API and opened the copy through the installed WeChat DevTools CLI. CLI login was valid; automation connected on port 9427.
- `currentPage` did not return. A second bounded probe connected, but `systemInfo` also timed out after 20 seconds. The runtime did not provide sufficient evidence to validate rendering, input, confirmation dialogs or navigation.
- Closed the temporary DevTools project and stopped the temporary API and hung inspection process.
- No visual or real-device acceptance is claimed. Verify entry → save → project navigation/reopen → publish → coach/parent radar → correction/history on a functioning simulator/device before enabling the flag.

## Rollout and rollback

1. Keep `FCM_ASSESSMENT_PUBLICATION_CLUBS` empty until runtime acceptance is complete.
2. Deploy additive migration/API and matching mini-program through the normal release process; retain a database backup.
3. Enable only the intended test club first, verify the full sequence and old-task behavior, then expand deliberately.
4. To pause the new workflow, clear the allowlist. Managed tasks remain read-only; published results remain readable. Do not revert to an API binary that does not recognize managed tasks, since its legacy write endpoints lack the bypass guard.
5. No data backfill, historical recalculation or table deletion is needed for this rollout.

## Commits

- `49ce87d` planning and boundaries
- `77857fc` isolated revisioned persistence
- `8625b8f` project drafts and scopes
- `67691dc` publication/correction history
- `956d57e` score scale and publication timeline
- `ba55b21` mini-program integration
- `de30091` pinned-version, transaction and restart hardening

## Conditional deployment check — 2026-09-15

The user subsequently authorized deployment if prerequisites are met. This supersedes the earlier no-deployment authorization boundary, but does not waive release checks.

- Public `https://cqtc.pomi.tech/health` responded successfully with `status: ok`.
- Read-only SSH attempt using the documented `ubuntu@43.136.114.225` endpoint and existing authentication failed with `Permission denied (publickey)`. No current release, image, persistent volume, backup or rollout environment could be verified on the server.
- `pnpm build` passed for domain and API.
- The known root-check screenshot-helper failures and the new mini-program runtime acceptance gap remain unresolved.
- No deployment, service restart, production migration, rollout flag change or push was performed. Deployment is blocked until a working authorized SSH/deployment entrypoint is available and the applicable release checks pass.

## SSH verification correction — 2026-09-15

The previous SSH conclusion was incomplete: the default identity failed, but this machine already has the project's dedicated identity at `~/.ssh/football_club_codex`. It is not selected by the default SSH config.

Verified command (contains no credential material):

```sh
ssh -i ~/.ssh/football_club_codex -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes ubuntu@43.136.114.225
```

- Explicit identity authentication succeeded as `ubuntu`.
- `cq-talent-api` runs `cq-talent-api:latest`; observed uptime was 8 days.
- Compose working directory is `/opt/cq-talent-api`.
- Persistent mount is `cq-talent-api-data:/var/lib/cq-talent`.
- Running image ID is `sha256:2af072566363a245f40bbbaaf62456fef72d0b0f44604db70b028d2a3cdee556`; the queried OCI revision label is absent, so no Git revision is inferred from the mutable `latest` tag.
- Internal `/health` returned `status: ok`.
- The SSH access blocker is resolved. These were read-only checks; no backup, deployment, migration, restart or flag change was performed. Existing test/runtime acceptance gaps remain as recorded above.
- One automatic approval request failed because its review connection disconnected; the same read-only check succeeded after local identity/permission validation and a new approval request.

## Test foundation remediation — 2026-09-15/16

The user asked to correct local prerequisites before continuing acceptance/deployment. Commit `23382d9` fixes the screenshot helper and its deterministic fixtures:

- Two output tests failed because `path.win32` transformed macOS absolute output/temp paths into backslash filenames in the repository. The helper now uses native paths and canonical containment checks, preserving outside-repository, no-overwrite and sidecar safeguards.
- Two Windows CLI tests mocked process launch but still checked a real hardcoded Windows executable on macOS. They now inject filesystem existence alongside process creation; the production CLI existence check remains active.
- Connection/page inspection has bounded timeouts; new regression tests cover path rejection, a missing real CLI, and hung page inspection with cleanup.
- The screenshot suite passed: 20 passed, 1 skipped. The skip is the existing native Windows window-enumeration test, inapplicable on macOS.
- Root `pnpm check` passed: domain 23, mini-program 505 passed/1 skipped, API 147, plus package type checks. `node --test scripts/devtools/automation-session.test.cjs` passed 5 tests. Log: `/tmp/fcm-foundation-check.log`. `git diff --check` passed.

Runtime foundation is a separate check:

- An offline minimal project at `/tmp/fcm-devtools-foundation` rendered its test text in the installed 2.01.2510290 DevTools, but Automator `currentPage` timed out after 20 seconds even there. The temporary project window was closed. This isolates the observed automation failure from the assessment business/API code; it does not establish which vendor component causes it.
- Downloaded official stable arm64 2.02.2608070 to `/tmp/fcm-devtools-2.02.2608070-arm64.dmg`. SHA-256 `911600453eacc4e7c7b64366719bc8d0151bd5bdb36d7816ca17fc0881dcc681` matches the published Homebrew cask; unsandboxed `codesign --verify --deep --strict` passed and `spctl --assess --type execute` accepted Developer ID. The sandboxed signature check initially failed and was not used as the final verdict.
- Copied and launched the verified app separately at `/tmp/fcm-devtools-stable/wechatwebdevtools.app`. The vendor installation diagnostic reports compatible version 2.02.2608070 and a working `wechatide` entrypoint. The existing app in `/Applications` and user configuration were not replaced.
- `wechatide -c Codex check_wechatide_status --skill-version 0.3.9` has not completed its first authorization handshake: `CONNECT_ERROR / wait WechatIDE authorization timeout`. The visible new app is at its project list; a vendor log also reports re-login required. No successful authorization, page read, screenshot or assessment runtime acceptance is claimed.
- Automatic approval rejected a coordinate click on the new app's avatar because it could enter login/authorization beyond a status check. Asked the user for explicit permission or manual login; no workaround was used.
- The user then explicitly allowed opening the login entry. A fresh screenshot showed the new tool's test-project window with an open QR panel labeled `未登录`. Requested the user's own WeChat scan/phone confirmation. The concrete next prerequisite is completing this login, followed by verifying the Codex handshake; do not infer either from the old tool's login state.

Deployment remains pending real-runtime acceptance. The four unit-test failures and SSH access are no longer blockers.
