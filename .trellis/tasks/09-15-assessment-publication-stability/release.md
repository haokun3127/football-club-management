# Formal release status — 2026-09-16

Status: native workflow acceptance passed; matching mini-program uploaded as `9.7.4` following the user-confirmed `9.7.3` trial version; production API switched successfully. GitHub delivery and WeChat platform review/public release remain pending. The user explicitly authorized upload and online cutover. Keep this task active until the remaining delivery and rollout acceptance is complete.

## Candidate and checks

- Source: `b0503919871efe842f531b5f5acd109d7f46ca2e` on `dev`. Later documentation commits do not change the deployed binary.
- Source archive SHA-256: `53f4ba8b7fb1287af007956dc0beb2b213660197adcea4a7802344b23e6cb949`; local/server copies match.
- Image: `cq-talent-api:b050391`, ID `sha256:cff8ce30dc02b427a91a813b0a900a3c5ba25b6d0101d60ef59e9e03184ed459`.
- Source directory: `/opt/cq-talent-releases/b050391`; built from the committed tree, not the dirty worktree.
- Frozen install, root check and build passed: domain 23 tests, mini-program 505 passed/1 native Windows skip, API 147. Logs: `/tmp/fcm-release-validation/{install,check,build}.log`.
- GitHub workflow uses read-only permissions, Node 24, frozen install/check/build and pinned official actions. YAML validated; no remote CI run is claimed because push was denied.

## Native workflow acceptance — passed

Used only `/tmp/fcm-release-validation/mini` and an in-memory API bound to `127.0.0.1:3038`. This synthetic fixture was never uploaded. The previous Mac-lock/confirmation blocker was resolved and the actual native controls were exercised:

1. Entered the missing project score of 100; saved, navigated away and reopened. Progress changed from 61/62 to 62/62. Both published overall scores remained null.
2. Confirmed the real publication dialog. Revision 2 became published; coach and parent API overall scores were both 100. The coach radar visibly displayed 100.
3. Changed the score to zero. Saving without a correction reason was rejected. Entering a reason saved revision 3 while published revision remained 2 and both published scores remained 100.
4. Cancelled the real republish dialog; published scores/revision remained unchanged. Then confirmed it: published revision became 3 and coach/parent scores both became 94.4.
5. Viewed history showing 100 → 0, actor, reason, time and both publication revisions. Parent radar visibly displayed 94.4. Parent timeline contained two publication events, not an extra event for the draft.

Evidence under `/tmp/fcm-release-validation`: `before-publication.json`, `after-publication.json`, `correction-draft.json`, `cancelled-correction-publication.json`, `after-correction-publication.json`, `coach-published.png`, `correction-history.png`, `republished-history.png`, `parent-corrected-radar-final.png`, and timestamped official CLI results. A parent navigation request initially raced simulator refresh; after observing the landing page, a fresh navigation succeeded. No business-code defect or change resulted.

These are native simulator/local-fixture checks, not a claim of authenticated production phone acceptance.

## Matching mini-program — uploaded, public release unconfirmed

- App ID: `wx4c588cd106e520e0`; latest uploaded version: `9.7.4`. The earlier `0.1.0-20260916` upload was superseded for this delivery by the user-requested continuation of the `9.7.3` version sequence.
- Clean upload directory: `/tmp/fcm-release-validation/upload-b050391`, 408 committed files. Each included file matches the source commit; manifest: `upload-manifest.json` in the validation directory.
- All three client environments use `https://cqtc.pomi.tech`; `DEV_AUTO_SESSION` is false; no local session bootstrap or localhost endpoint was included.
- Official stable DevTools CLI returned upload success for `9.7.4`, package size 1,243,081 bytes. Receipt: `/tmp/fcm-release-validation/tool-1789528111145775000.json`. Earlier `0.1.0-20260916` receipt: `tool-1789523074567330000.json` in the same directory.
- User confirmed the September 7 `9.7.3` trial belongs to this App ID. The registered old Documents project path resolves to the current repository. Git confirms the last September 7 mini-program commit `b6a3de3` is an ancestor of the candidate; no exact Git-to-`9.7.3` upload mapping is recorded. Rechecked all 408 upload files against `b050391`: no differences. No business-code or API deployment change accompanied this version-number correction.
- Selecting `9.7.4` as the active trial version is still a separate platform action and is not verified complete. The user should select the new upload in the platform before relying on the existing trial QR code.
- Browser access to `https://mp.weixin.qq.com/` was rejected by the tool's site-safety policy, explicitly forbidding alternate browser/indirect workarounds. This was not an account login failure or an automatic-approval rejection. Asked the user to complete/check review and public release in the platform.
- Upload does not establish that Tencent review or public release has completed. No public-release confirmation is available yet.

## Backup, rehearsal and production cutover — passed

- Previous observed release label: `c893adb`; old image ID `sha256:2af072566363a245f40bbbaaf62456fef72d0b0f44604db70b028d2a3cdee556`. Its source was not reconstructed from the label.
- Initial consistent backup: `/opt/cq-talent-backups/assessment-release-20260915T174140Z/api.sqlite`, SHA-256 `f2cb50c8609879332a27d6e61339964174902aadfebe841fa402b3f3616030e4`.
- Exact candidate booted against a backup copy with no network and a read-only root filesystem. Integrity and migration checks passed; all existing rows/columns in 12 critical tables were unchanged. Report: `/opt/cq-talent-releases/b050391/staging-verification.json`.
- Immediately before cutover, refreshed the SQLite online backup including committed WAL data: `/opt/cq-talent-backups/assessment-release-20260916T014512Z/api.sqlite`, 68,087,808 bytes, SHA-256 `eab2bec27f0bace52793693aa2ca9a2456a3b27442da9040635b9c029ffa9269`, integrity ok. Directory 0700, private artifacts 0600; server-local only.
- Preserved current runtime environment, SQLite volume, port mapping and seed setting. Compared planned environment with the live container in memory, without printing credentials. Captured private runtime/compose metadata in the restricted backup folder.
- Switched only the API service to the immutable image with `--no-build --no-deps --pull never`. Container image and internal health passed; restart count was zero at verification.
- Public `https://cqtc.pomi.tech/health` returned status ok. An unauthenticated business-route request returned the expected HTTP 403.
- Post-deployment database integrity passed. Compared every existing value in 12 critical tables with the fresh backup: no missing or changed rows. Counts include users 206, parents 197, students 334, sessions 244; assessments 267, raw results 16,492, scores 16,493, metrics 30,162, lineage 9,842. Managed tasks: zero. Report: `/opt/cq-talent-releases/b050391/post-deployment.json`.
- Deployment manifest: `/opt/cq-talent-releases/b050391/deployment.json`.
- Removed the stopped rehearsal container and moved its database copy outside the build source to the restricted backup folder at `staging-validation-b050391/api.sqlite`.
- Default `/opt/cq-talent-api/docker-compose.override.yml` now links to `release-b050391.yml`. Both service image tags and build contexts point at this release. Default Compose configuration and environment equivalence were verified without restarting the API. Report: `deployment-defaults.json` in the release directory.

## Runtime operation and rollback

Normal restart/recreation uses the pinned image (no rebuild or data-init rerun):

```sh
sudo docker compose --project-directory /opt/cq-talent-api -p cq-talent-api up -d --no-build --no-deps --pull never api
```

The previous image is retained as `cq-talent-api:rollback-c893adb-20260916`; the fresh backup folder contains `rollback-image.yml`, base compose and restricted runtime snapshots. Before workflow adoption, an emergency image rollback can use explicit files, which bypass automatic default override discovery:

```sh
sudo docker compose -p cq-talent-api \
  -f /opt/cq-talent-api/docker-compose.yml \
  -f /opt/cq-talent-backups/assessment-release-20260916T014512Z/rollback-image.yml \
  up -d --no-build --no-deps --pull never api
```

After rollback, verify image, health and authentication and align the default override before routine operations. Do not restore an old database over subsequent writes. After workflow adoption, prefer clearing the allowlist and a forward fix: the old image does not recognize managed-task write guards.

## Remaining delivery and rollout gates

- GitHub `haokun3127/football-club-management`: `git push origin dev` failed 403 for `clint-cpu`; authenticated permissions still report `push: false`. Existing GitHub SSH authentication also failed. After the user reported permission was granted, a fresh fetch showed 0 remote-only and 20 local-only commits; one actual push retry still returned HTTP 403 for `clint-cpu`, and API permissions remained `push: false`. User action is needed to grant write access or sign in with an authorized account. No force push, credential extraction or alternate repository was attempted. Once restored, fetch/recheck divergence, push `dev` normally, and inspect CI. Do not merge the unrelated, substantially older `master` into this release.
- WeChat platform review/public release requires user completion due to the site-safety restriction above. Record the actual released version and status before rollout.
- `FCM_ASSESSMENT_PUBLICATION_CLUBS` remains empty. API deployment and mini-program upload do not enable the new managed workflow for existing online clients.
- After the matching public client is available, verify real authenticated coach/parent requests and old-task compatibility, then enable only the intended club and confirm the full workflow. No production synthetic session or test record was created in this release.
- Task stays active; GitHub delivery, public mini-program release and production rollout acceptance are not marked complete.
