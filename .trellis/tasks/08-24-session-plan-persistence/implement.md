# Implementation plan — durable coach session plans

1. Add migration `0015_session_plans.sql` and update migration expectations.
2. Add `SessionPlanRepository` with list/get/save/insert-if-absent methods and explicit JSON mapping.
3. Register the repository in `PlatformRepositories` and seed persisted session plans.
4. Merge persisted session plans in `PersistentApiStore` and override `saveSessionPlan`.
5. Add a file-backed store regression for session-plan save → close → reopen → read; retain the existing route contract test for the PUT path.
6. Run focused API tests, API typecheck, `git diff --check`, and the root check.
7. Stage only task-owned files and commit with a focused message.
