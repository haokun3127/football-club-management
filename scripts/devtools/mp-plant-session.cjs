/* 直接向模拟器 wx storage 写入已种好的真实会话（绕过授权弹窗），然后 reLaunch 走正常启动流程 */
const path = require('path');
const automator = require(path.resolve(__dirname, '../../apps/miniprogram-cq-talent/node_modules/miniprogram-automator'));

const port = process.env.MP_AUTO_PORT || '9432';
const step = (m) => console.log('[' + new Date().toISOString().slice(11, 19) + ']', m);

const SESSION = {
  clubId: 'club-chongqing-talent',
  clientId: 'app-client-cq-talent-wechat-main',
  capabilities: [],
  role: 'parent',
  availableRoles: ['parent', 'coach'],
  token: process.env.PLANT_TOKEN,
  userId: 'user-cq-talent-secure-test-1',
  displayName: 'Secure parent 1',
  currentStudentId: 'student-cq-talent-secure-test-1-1',
  expiresAt: process.env.PLANT_EXPIRES,
};

if (!SESSION.token || !SESSION.expiresAt) {
  console.log('FAIL missing PLANT_TOKEN/PLANT_EXPIRES env');
  process.exit(1);
}

(async () => {
  step('connecting');
  const mp = await automator.connect({ wsEndpoint: 'ws://localhost:' + port });
  step('connected');
  await mp.callWxMethod('setStorage', { key: 'cqTalentSession', data: SESSION });
  step('session storage written');
  await mp.callWxMethod('setStorage', {
    key: 'cqTalentAppContext',
    data: { clubId: SESSION.clubId, clientId: SESSION.clientId },
  });
  step('context storage written');
  await mp.callWxMethod('reLaunch', { url: '/pages/launch/index' });
  step('reLaunched to launch');
  await new Promise((r) => setTimeout(r, 6000));
  const page = await mp.currentPage();
  step('route now: ' + page.path);
  await mp.disconnect();
  step('done');
})().catch((e) => {
  console.log('FAIL', String((e && e.message) || e).slice(0, 300));
  process.exit(1);
});
