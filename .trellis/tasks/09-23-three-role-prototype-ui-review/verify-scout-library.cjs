// Synthetic local UI verification only; never sends business API requests.
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const { resolveAutomationPort } = require(root + '/scripts/devtools/automation-session.cjs');
const automator = require(root + '/apps/miniprogram-cq-talent/node_modules/miniprogram-automator');
const out = __dirname + '/club-style-light-evidence';
const fixture={player:{id:'s1',name:'标准示例人员',birthDate:'1949-12-31',maskedDocument:'**************002X',status:'active',createdAt:'2026-10-05T00:00:00Z'}};
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
    const f=getApp().globalData.__recordFixture;
    let data;
    if(opts.method==='POST') data={created:false,player:f.player};
    else if(opts.url.endsWith('/s1')) data={player:f.player,participations:[]};
    else data={players:[f.player],total:1,nextOffset:null,canCreate:true};
    return JSON.parse(JSON.stringify({statusCode:200,data}));
  });
  const page=await mp.reLaunch('/pages/coach/scout/index');await page.waitFor(700);
  assert.equal(await page.data('state'),'ready');
  await mp.screenshot({path:out+'/sc01-library-runtime-20261005.png'});
  await (await page.$('.scout-primary')).tap();await page.waitFor(300);
  assert.equal(await page.data('mode'),'create');
  await (await page.$$('.scout-input'))[0].input('标准示例人员');
  await (await page.$$('.scout-input'))[1].input('11010519491231002X');
  await mp.screenshot({path:out+'/sc01-new-runtime-20261005.png'});
  await (await page.$('.scout-primary')).tap();await page.waitFor(1000);
  assert.equal(await page.data('mode'),'detail');assert.equal(await page.data('identityNumber'),'');
  assert.equal(await page.data('player.id'),'s1');await page.waitFor(1200);
  await mp.screenshot({path:out+'/sc01-profile-runtime-20261005.png'});
  await (await page.$('.scout-back')).tap();await page.waitFor(300);assert.equal(await page.data('mode'),'list');
  console.log(JSON.stringify({appId:account.appId,checks:['library','identity input','verified save and identity cleared','profile empty history','return to list'],screenshots:3,scope:'synthetic local data only'}));
 } finally {
  try {
  if (backed) await mp.evaluate(() => { const store = require('utils/store.js'); const b = getApp().globalData.__recordBackup; store.clearSession(); if (b.session) store.setSession(b.session); if (b.context) store.setAppContext(b.context); for (const item of b.keys) { if (item.present) wx.setStorageSync(item.key, item.value); else wx.removeStorageSync(item.key); } delete getApp().globalData.__recordBackup; delete getApp().globalData.__recordFixture; });
  await mp.restoreWxMethod('request'); await mp.reLaunch('/pages/login/index');
  } finally { await mp.disconnect(); }
 }
})().catch(e => { console.error(e.stack); process.exitCode = 1; });
