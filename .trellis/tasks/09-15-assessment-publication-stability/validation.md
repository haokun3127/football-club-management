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
