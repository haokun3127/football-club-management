# Design: Restart-safe parent phone binding

## Scope

This hotfix changes startup seed behavior only for existing user-account and parent-profile phone fields. Production binding then updates the existing two-child acceptance parent:

- user: `user-parent-cq-talent-acceptance`
- parent profile: `parent-cq-talent-acceptance`
- club: `club-chongqing-talent`

## Data contract

During seed replay, an existing `user_accounts.id` or `parent_profiles.id` keeps its stored non-empty phone. Other seeded fields retain existing repository save semantics. This prevents seed data from replacing a real authorized WeChat phone with the synthetic acceptance number.

The production change updates only `user_accounts.phone` and `parent_profiles.phone` in one SQLite transaction. It requires a unique target phone, active user, active parent membership, and matching parent profile identifiers.

## Boundaries

- Do not change `UserAccountRepository.save` or `ParentProfileRepository.save`; those are normal mutation APIs.
- Do not disable `FCM_CQ_TALENT_ACCEPTANCE_SEED`; its runtime guardian bindings are required for the target parent to have two children.
- No migration is needed.

## Rollback

The code rollback is one commit. Before the production data transaction, retain a private SQLite backup and the two prior masked phone values. Revert only the two phone columns in one transaction if verification fails.
