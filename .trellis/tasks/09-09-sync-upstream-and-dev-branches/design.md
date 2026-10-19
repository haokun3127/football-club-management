# Technical Design

## Authority and Branch Model

- Repository authority: `origin = https://github.com/haokun3127/football-club-management`.
- Development authority: `origin/dev`.
- Local active branch: `dev`, configured to track `origin/dev`.
- Existing local branches remain immutable recovery pointers. Remote `master` and `codex/*` branches are fetched but not rewritten.

## Migration Flow

1. Add the new URL as `origin` and fetch branches/tags with pruning.
2. Verify fetched `origin/dev` still matches the inspected SHA or deliberately accept a newer fetched SHA as the latest authority.
3. Create/reset local `dev` to `origin/dev` and set its upstream.
4. Switch the working tree to `dev`.
5. Update Trellis metadata and validate repository state.

The migration does not merge the old local branch into `dev`: GitHub comparison proves the old HEAD is already an ancestor of `origin/dev`. The remote branch therefore supplies the complete replacement state without conflict resolution or compatibility work.

## Local Launch

- Follow the authoritative `origin/dev` package scripts and mini-program README after switching.
- Build the WeChat mini-program before opening it, then use the installed WeChat Developer Tools CLI to open the project directory.
- Verify the tool reports a successful open and retain command output as acceptance evidence.

## Safety and Rollback

- Existing local branch `codex/chongqing-talent-business` preserves the pre-migration HEAD `8cbb295`.
- No branch deletion, force push, or remote default-branch mutation is part of this task.
- If fetch or validation fails, remain on or return to the preserved local branch and report the failure; the remote configuration can be corrected without losing commits.

## Trade-offs

- `dev` becomes the operational development truth even though GitHub currently displays `master` as default. This matches actual commit freshness and avoids downgrading by 572 commits.
- Preserving historical branches leaves some branch clutter, but avoids destructive cleanup that the user did not explicitly request.
