/* automator 点击登录页授权按钮（分步日志，便于定位挂点） */
const path = require('path');
const automator = require(path.resolve(__dirname, '../../apps/miniprogram-cq-talent/node_modules/miniprogram-automator'));

const port = process.env.MP_AUTO_PORT || '9432';
const step = (m) => console.log('[' + new Date().toISOString().slice(11, 19) + ']', m);

(async () => {
  step('connecting ws://localhost:' + port);
  const mp = await automator.connect({ wsEndpoint: 'ws://localhost:' + port });
  step('connected');
  const page = await mp.currentPage();
  step('page: ' + page.path);
  const btn = await page.$('.login-cta');
  step('btn: ' + (btn ? 'found' : 'MISSING'));
  if (btn) {
    await btn.tap();
    step('tapped');
  }
  await new Promise((r) => setTimeout(r, 4000));
  const p2 = await mp.currentPage();
  step('route now: ' + p2.path);
  await mp.disconnect();
  step('done');
})().catch((e) => {
  console.log('FAIL', String((e && e.message) || e).slice(0, 200));
  process.exit(1);
});
