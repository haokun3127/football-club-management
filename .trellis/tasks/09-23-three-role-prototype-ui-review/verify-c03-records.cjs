// Synthetic local UI verification only; never sends business API requests.
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const { resolveAutomationPort } = require(root + '/scripts/devtools/automation-session.cjs');
const automator = require(root + '/apps/miniprogram-cq-talent/node_modules/miniprogram-automator');
const out = __dirname + '/club-style-light-evidence';
const eventId = 'synthetic-training';
const names = ['林予安', '周子衡', '许明澈', '陈若川'];
const fixture = {
 event: { id: eventId, clubId: 'club-chongqing-talent', type: 'training', title: 'U10 技术训练', status: 'completed', timeRange: { startsAt: '2026-10-04T08:30:00Z', endsAt: '2026-10-04T10:00:00Z' }, venue: '天才足球训练场2号场' },
 permissions: { canEditTraining: true },
 rosterContext: { participants: names.map((name, i) => ({ studentId: 's' + i, studentName: name, status: i === 1 ? 'leave_requested' : 'confirmed' })), teams: [{ name: 'U10 精英队' }] },
 trainingRecords: names.map((name, i) => ({ clubId: 'club-chongqing-talent', eventId, studentId: 's' + i, revision: 1, counted: i !== 1, source: 'automatic', occurredAt: '2026-10-04T08:30:00Z', updatedAt: '2026-10-04T10:00:00Z', history: [{ revision: 1, counted: i !== 1, previousCounted: null, source: 'automatic', reason: i === 1 ? '已请假' : '训练已结束，自动记录', changedAt: '2026-10-04T10:00:00Z' }] })),
 training: { contentSummary: { count: 2, configuredMinutes: 40, groups: [{ id: 'tech', label: '技术', items: [{ id: 'passing', name: '传接球', configuredMinutes: 20 }, { id: 'one-two', name: '二过一', configuredMinutes: 20 }] }] }, projects: [], selectedProjectIds: [] }, assessment: {}, workflow: {},
};
(async () => {
 const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:' + resolveAutomationPort() }); let backed = false;
 try {
  const account = await mp.evaluate(() => wx.getAccountInfoSync().miniProgram);
  assert.equal(account.appId, 'wx4c588cd106e520e0'); assert.equal(account.envVersion, 'develop');
  await mp.evaluate((data) => {
   const store = require('utils/store.js'); const cfg = require('utils/config.js'); const keys = [cfg.STORAGE_KEYS.session, cfg.STORAGE_KEYS.context, cfg.STORAGE_KEYS.devRole]; const present = wx.getStorageInfoSync().keys;
   getApp().globalData.__recordBackup = { session: store.getSession(), context: store.getAppContext(), keys: keys.map(key => ({ key, present: present.includes(key), value: wx.getStorageSync(key) })) };
   getApp().globalData.__recordFixture = data;
   store.setSession({ clubId: 'club-chongqing-talent', clientId: 'app-client-cq-talent-wechat-main', role: 'coach', availableRoles: ['coach'], userId: 'visual-fixture', token: 'dev-visual-fixture', displayName: '界面验证', capabilities: {} });
  }, fixture); backed = true;
  await mp.mockWxMethod('request', function(opts) {
   const f = getApp().globalData.__recordFixture;
   if (opts.method === 'PATCH') {
    const studentId = opts.url.split('/students/')[1].split('/')[0]; const record = f.trainingRecords.find(r => r.studentId === studentId);
    record.history.push({ revision: record.revision + 1, previousCounted: record.counted, counted: opts.data.counted, source: 'correction', actorUserId: '界面验证教练', reason: opts.data.reason, changedAt: '2026-10-04T10:01:00Z' });
    record.revision++; record.counted = opts.data.counted; record.source = 'correction';
    return JSON.parse(JSON.stringify({ statusCode: 200, data: { record } }));
   }
   if (opts.url.includes('/assessment-tasks')) return { statusCode: 200, data: { tasks: [{ id: 'task1', sourceEventId: f.event.id, title: '传接球随堂测评', templateId: 'template1', totalStudents: 4, completedStudents: 1 }] } };
   return JSON.parse(JSON.stringify({ statusCode: 200, data: f }));
  });
  let page = await mp.reLaunch('/pages/coach/event/index?id=' + eventId); await page.waitFor(500);
  assert.equal(await page.data('state'), 'ready'); assert.equal(await page.data('attendancePresent'), 3);
  await mp.screenshot({ path: out + '/c03-runtime-20261004.png' });
  await (await page.$('.roster-person')).tap(); await page.waitFor(200);

  assert.equal(await page.data('attendancePresent'), 2); assert.equal(await page.data('attendanceError'), '');
  await (await page.$('.attendance-links text')).tap(); await page.waitFor(900); page = await mp.currentPage(); await page.waitFor(250);
  assert.equal(page.path, 'pages/coach/lesson/index'); assert.equal(await page.data('total'), 2);
  await mp.screenshot({ path: out + '/c07-runtime-20261004.png' });
  const filters = await page.$$('.record-filters button'); await filters[1].tap(); await page.waitFor(100); assert.equal((await page.data('visibleRows')).length, 2);
  await filters[0].tap(); await page.waitFor(100);
  await (await page.$('.record-actions button')).tap(); await page.waitFor(150); assert.equal((await page.data('editing')).revision, 2);
  await (await page.$('textarea')).input('线下核对后更正'); await page.waitFor(100);
  await mp.screenshot({ path: out + '/c08-runtime-20261004.png' });
  await page.callMethod('changeCounted', { detail: { value: true } }); await page.waitFor(100); await (await page.$('.record-primary')).tap(); await page.waitFor(200);
  assert.equal((await page.data()).editing, null); assert.equal(await page.data('total'), 3);
  assert.ok((await page.data('rows'))[0].historyLabels.at(-1).includes('不计课次 → 已计课次'));
  console.log(JSON.stringify({ appId: account.appId, checks: ['shared workbench facts', 'single quick correction', 'list readback', 'filter', 'correction and history'], screenshots: 3, scope: 'synthetic local data only' }));
 } finally {
  if (backed) await mp.evaluate(() => { const store = require('utils/store.js'); const b = getApp().globalData.__recordBackup; store.clearSession(); if (b.session) store.setSession(b.session); if (b.context) store.setAppContext(b.context); for (const item of b.keys) { if (item.present) wx.setStorageSync(item.key, item.value); else wx.removeStorageSync(item.key); } delete getApp().globalData.__recordBackup; delete getApp().globalData.__recordFixture; });
  await mp.restoreWxMethod('request'); await mp.reLaunch('/pages/login/index'); await mp.disconnect();
 }
})().catch(e => { console.error(e.stack); process.exitCode = 1; });
