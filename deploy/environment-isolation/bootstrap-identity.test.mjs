import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, realpathSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createPlatformPersistence } from '../../apps/api/dist/persistence/platform-persistence.js';
import { createProductionMembershipResolver } from '../../apps/api/dist/auth/context.js';
import { PersistentApiStore } from '../../apps/api/dist/store.js';
import { buildServer } from '../../apps/api/dist/server.js';

const root = resolve(import.meta.dirname, '../..');
const script = join(root, 'deploy/environment-isolation/bootstrap-identity.mjs');
const phone = '10000000000'; // Synthetic value, not a real test identity.
const club = 'club-chongqing-talent';
const base = `/clubs/${club}/app-clients/app-client-cq-talent-wechat-main`;
test('owned nonproduction single identity is repeat-safe, resolves by phone and supports scoped role switching after reopen', async () => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'fcm-identity-')));
  try {
    for (const environment of ['develop', 'trial']) {
      const config = { environment, wechatAppId: 'wx4c588cd106e520e0', databasePath: join(dir, `cq-talent-${environment}`, 'api.sqlite') };
      let p = await createPlatformPersistence({ runtimeConfig: config, seed: false }); p.database.close();
      const env = { NODE_ENV: 'production', FCM_RUNTIME_ENV: environment, DATABASE_URL: config.databasePath, WECHAT_MINIPROGRAM_APP_ID: config.wechatAppId, FCM_TEST_PHONE: phone, FCM_IDENTITY_BACKUP_ATTESTED: '1' };
      const run = (overrides = {}) => spawnSync(process.execPath, [script, '--apply'], { cwd: root, env: { ...env, ...overrides }, encoding: 'utf8', timeout: 10000 });
      const client = spawnSync(process.execPath, ['deploy/environment-isolation/bootstrap-client.mjs', '--apply'], { cwd: root, env, encoding: 'utf8' }); assert.equal(client.status, 0, client.stderr);
      const before = readFileSync(config.databasePath);
      for (const invalid of [{ FCM_RUNTIME_ENV: 'release' }, { FCM_IDENTITY_BACKUP_ATTESTED: '' }, { FCM_TEST_PHONE: '' }]) {
        const rejected = run(invalid); assert.equal(rejected.status, 1); assert.deepEqual(readFileSync(config.databasePath), before);
      }
      const first = run(); assert.equal(first.status, 0, first.stderr); assert.equal(first.stdout.includes(phone), false); assert.equal(first.stderr.includes(phone), false);
      assert.equal(JSON.parse(run().stdout).status, 'already_present');
      p = await createPlatformPersistence({ runtimeConfig: config, seed: false });
      const resolver = createProductionMembershipResolver(p.repositories.users, p.repositories.memberships);
      const identity = await resolver.resolveByPhone(club, phone);
      assert.deepEqual(identity.membership.roles, ['parent', 'coach', 'admin']);
      assert.equal(await resolver.resolveByPhone('other-club', phone), null);
      for (const table of ['user_accounts', 'club_user_memberships', 'parent_profiles', 'coach_profiles']) assert.equal(p.database.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n, 1);
      for (const table of ['student_profiles', 'teams', 'external_system_connections']) assert.equal(p.database.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n, 0);
      const app = buildServer(new PersistentApiStore(p.repositories), { runtimeConfig: config, logger: false, membershipResolver: resolver, wechatIdentityConnector: { resolve: async () => ({ openId: 'synthetic', phone }) } });
      try {
        const headers = { 'x-miniprogram-env': environment, 'x-app-client-capabilities': 'active-role-switch-v1' };
        const login = await app.inject({ method: 'POST', url: `${base}/wechat-login`, headers, payload: { wxLoginCode: 'synthetic-code', phoneCode: 'synthetic-phone-code' } });
        assert.equal(login.statusCode, 200, login.body); assert.deepEqual(login.json().availableRoles, ['parent', 'coach']);
        let token = login.json().session.token;
        for (const role of ['parent', 'coach']) {
          const selected = await app.inject({ method: 'POST', url: `${base}/session/role`, headers: { ...headers, authorization: `Bearer ${token}` }, payload: { role } });
          assert.equal(selected.statusCode, 200, selected.body); assert.equal(selected.json().session.activeRole, role);
          token = selected.json().session.token;
        }
      } finally { await app.close(); }
      p.database.prepare("UPDATE coach_profiles SET status='inactive'").run(); p.database.close();
      const conflict = run(); assert.equal(conflict.status, 1); assert.match(conflict.stderr, /Conflicting/);
      assert.equal(run({ FCM_TEST_PHONE: '10000000001' }).status, 1);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
