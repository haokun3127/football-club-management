# Restart-Safe WeChat Phone Binding Seed

## 1. Scope / Trigger

- Trigger: a production WeChat phone is bound to an existing seeded user and parent profile, then the API restarts.

## 2. Signatures

- Seed boundary: `seedPlatformData(repositories, data)`.
- Persistent records: `user_accounts.phone` and `parent_profiles.phone`.
- Login boundary: `POST /clubs/{clubId}/app-clients/{clientId}/wechat-login`.

## 3. Contracts

- Seed replay may fill a missing phone from seed data, but must preserve an existing non-empty stored phone for the same user/profile ID.
- This rule applies only in the seed path; normal `UserAccountRepository.save` and `ParentProfileRepository.save` update semantics remain unchanged.
- Acceptance guardian bindings remain enabled and are not recreated or changed by phone binding.
- Real authorization must resolve the membership-derived role and existing children; no session, role, or phone response may be fabricated.

## 4. Validation & Error Matrix

- Existing non-empty phone + API restart -> stored phone remains unchanged.
- Missing phone + seed replay -> seed phone may be inserted.
- Duplicate target phone or missing target IDs -> production transaction stops before write.
- Missing/inactive parent membership or failed restart readback -> production transaction is rejected or rolled back.

## 5. Good / Base / Bad Cases

- Good: update the existing user and parent profile phone in one transaction, restart the API, and read back the same masked mapping while the parent still sees two bound children.
- Base: a fresh seeded database receives the synthetic seed phone.
- Bad: directly update production SQLite while startup seed still overwrites phones, or disable acceptance seed and turn the parent into a zero-child login.

## 6. Tests Required

- File-SQLite regression: seed, manually save a non-empty phone in both tables, close/reopen with `seed:true`, and assert both phones remain.
- Guardian regression: after the same reopen, assert the acceptance parent still resolves exactly two guardian children.
- API checks: focused persistence test, API typecheck, API build, and `git diff --check`.

## 7. Wrong vs Correct

### Wrong

```typescript
await repositories.users.save(seedUser);
await repositories.parents.save(seedParent);
```

### Correct

```typescript
const existingUser = await repositories.users.getById(seedUser.id);
await repositories.users.save({ ...seedUser, phone: existingUser?.phone || seedUser.phone });
```
