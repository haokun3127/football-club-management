# Formal release status — 2026-09-16

Status: candidate prepared; production cutover and GitHub push pending acceptance/access. User authorized verification, GitHub delivery and online release once ready. Do not archive this task yet.

## Candidate and checks

- Source commit: `b0503919871efe842f531b5f5acd109d7f46ca2e` on the existing `dev` delivery line. Later release-status-only documentation commits do not change this binary.
- Source archive SHA-256: `53f4ba8b7fb1287af007956dc0beb2b213660197adcea4a7802344b23e6cb949`; local and server copies match.
- Candidate image: `cq-talent-api:b050391`, ID `sha256:cff8ce30dc02b427a91a813b0a900a3c5ba25b6d0101d60ef59e9e03184ed459`.
- Server source: `/opt/cq-talent-releases/b050391`; never built from the dirty local worktree.
- Frozen lockfile install, root check and build passed. Root tests: domain 23; mini-program 505 passed/1 native Windows skip; API 147. Logs: `/tmp/fcm-release-validation/{install,check,build}.log`.
- `.github/workflows/ci.yml` adds a read-only Node 24 root check/build gate, with official action commits pinned. YAML syntax validated. No GitHub run has occurred because the push was denied.

## Native mini-program acceptance

Uses `/tmp/fcm-release-validation/mini`, copied from committed source. Only the isolated copy uses a localhost API and a synthetic local session; this copy must NEVER be uploaded. The in-memory API listens only on `127.0.0.1:3038`.

Passed through actual native controls:

- Project list showed 61/62 entered, 0/1 complete.
- Selected the missing project, entered 100 through its input and tapped save.
- Page reported saved; leaving/reopening read back 100.
- Project list then showed 62/62 entered and 1 awaiting publication.
- API snapshot confirms revision 2, no published revision, and both coach/parent overall still null. Saving the complete draft did not create published facts.
- Tapped publish; native confirmation correctly names one student and describes parent/radar visibility.

Evidence: `/tmp/fcm-release-validation/saved-project.png`, `publish-confirmation.png`, `before-publication.json`, and timestamped native tool JSON files.

Pending: confirm/cancel the real modal, verify published coach/parent scores in UI, correct with a reason, republish and inspect history. CUA reported the Mac locked and unable to unlock. Asked the user to unlock; did not bypass the lock or substitute a mocked confirmation. The local API/project remain available for resumption.

## Production backup and restored-copy rehearsal

- Current live container label: `com.cq-talent.release=c893adb`; image ID `sha256:2af072566363a245f40bbbaaf62456fef72d0b0f44604db70b028d2a3cdee556`. This is the observed release label, not a claim that its source tree has been reconstructed.
- Current live health returned 200/status ok; Nginx config check passed. Workflow allowlist is empty.
- Consistent backup: `/opt/cq-talent-backups/assessment-release-20260915T174140Z/api.sqlite`; SQLite online backup includes committed WAL data. Directory 0700, files 0600, server-local only.
- Backup: 68,087,808 bytes, SHA-256 `f2cb50c8609879332a27d6e61339964174902aadfebe841fa402b3f3616030e4`, integrity check ok; companion `manifest.json` records counts and running image.
- Started the candidate against a COPY at `/opt/cq-talent-releases/b050391/validation-data/api.sqlite`, with `--network none`, read-only root filesystem and the existing acceptance-seed flag. Candidate health passed; container `cq-talent-verify-b050391` was then stopped.
- Restored database integrity passed and both new workflow tables exist. All existing rows/columns in 12 critical tables were unchanged: users, parents, students, memberships, guardian bindings, team membership, assessments, raw results, scores, metric records, lineage and sessions. No missing rows or changed values in that comparison.
- Full server-local report: `/opt/cq-talent-releases/b050391/staging-verification.json` (no account/phone/session values printed).
- Live image and health were verified unchanged after rehearsal. No production migration, restart, allowlist change or mini-program upload occurred.

## GitHub delivery blocker

- Repository: `haokun3127/football-club-management`; established active branch is `dev`. `master` has hundreds of historical commits missing; do not fold that unrelated branch migration into this release.
- `git push origin dev` returned 403 for `clint-cpu`. API confirms `pull: true`, `push: false`; existing GitHub SSH authentication also failed.
- Asked user to grant that account repository write access or sign `gh` into an account with access. No credential reset, token extraction, forced push or alternate repository was attempted.

## Resume and cutover gates

1. Complete the pending native flow after Mac unlock; fix any issue and rerun relevant checks. Any business-code change requires a new immutable image/rehearsal.
2. After GitHub access is restored, fetch/recheck divergence, push without force and inspect the new CI run. Deliver against `dev`, preserving the existing branch policy.
3. Prepare a clean committed mini-program copy with the production HTTPS configuration; validate preview/upload separately from the synthetic local fixture. Upload/review/release states must be reported independently.
4. Before API cutover, refresh the consistent backup and capture private runtime/compose configuration server-locally with restricted permissions. Use the immutable candidate image; preserve current runtime secrets, volume and seed setting. Keep the workflow allowlist empty until the matching mini-program is accepted.
5. Verify live health, expected image and real authenticated mini-program requests after cutover. Roll out only to the agreed club after end-to-end acceptance.
6. Rollback before workflow adoption may use the captured previous image if schema-compatible. After adoption, prefer clearing the allowlist/forward fix; the old image lacks managed-task write guards. Never restore an old database over subsequent live writes without a separately reviewed recovery plan.
7. Record final GitHub/CI links, API revision, mini-program version/review status and rollout results; archive only when required acceptance is satisfied.
