# Design

## Boundaries

The change has three layers:

1. Route authentication: make the resolver distinguish production from development and reject header-only identity in production.
2. Phone identity: resolve a phone only when exactly one active user/club membership is eligible; otherwise return no identity and let the login contract remain `binding_required` or a safe auth error.
3. Test-account operation: add a fixed-ID, transaction-based operation outside startup seed. It creates three independent users, memberships, parent profiles, coach profiles, teams, and explicitly scoped guardian/team records. It does not attach test users to unrelated production children.

## Data flow

`WeChat phone -> resolveByPhone -> active user + active club membership -> available app roles -> pending role session -> selected Bearer session`.

The import operation is invoked manually on the server after backup. It must validate all target IDs and existing rows before `BEGIN IMMEDIATE`; a conflict aborts without partial writes. The operation returns counts and a rollback manifest, not raw identities.

## Security decisions

- `X-User-Id` remains available only to explicitly constructed development/test servers. Production entrypoints pass a resolver configured with `allowHeaderIdentity: false`.
- Phone matching is club-scoped at the membership step and rejects ambiguity. No phone is placed in source-controlled fixtures, docs, logs, or commit messages.
- The three parent profiles have separate test children and guardian bindings. Coach scope uses separate teams and does not expose parent contact fields.
- The operation is not a seed and is never called during API startup.

## Rollback

The import writes a manifest with fixed row IDs and before/after counts. Rollback runs in one transaction and deletes only rows owned by this operation, first removing sessions and dependent business rows created by the test run, then teams/profiles/memberships/users. It refuses to run if ownership markers or expected rows are missing.

## Verification

- Focused API tests first fail for production header auth and ambiguous phone matches.
- API typecheck and focused tests.
- Full repository check.
- Server: restricted database backup; import; bounded aggregate checks; real WeChat login by the user; restart and bounded readback.
