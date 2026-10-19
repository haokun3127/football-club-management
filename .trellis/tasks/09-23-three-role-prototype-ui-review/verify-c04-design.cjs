// Synthetic local UI verification only; never sends business API requests.
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const { resolveAutomationPort } = require(root + '/scripts/devtools/automation-session.cjs');
const automator = require(root + '/apps/miniprogram-cq-talent/node_modules/miniprogram-automator');
const out = __dirname + '/club-style-light-evidence';
const projects = [{id:'p1',name:'绕桩变向',durationMinutes:15,metricIds:['m3'],quantityLabel:'每组 8 次',coachingPoints:['保持抬头观察']},{id:'p2',name:'移动传接球',durationMinutes:20,metricIds:['m3'],quantityLabel:'每组 10 次',coachingPoints:['提前观察队友']}];
const fixture = {
 tree:{ projects,contentTree:{viewId:'v1',viewName:'训练内容库',nodes:[{id:'n1',metricId:'m1',label:'技术',level:1,drills:[],children:[{id:'n2',metricId:'m2',label:'控球与传球',level:2,drills:[],children:[{id:'n3',metricId:'m3',label:'基础练习',level:3,drills:projects,children:[]}]}]}]},team:{id:'t1',name:'U10 精英队'}},
 workbench:{ trainingContentRevision:"a".repeat(64), event:{id:'e1',title:'技术训练',type:'training',status:'scheduled',timeRange:{startsAt:'2026-10-05T08:00:00Z',endsAt:'2026-10-05T09:00:00Z'}},permissions:{canEditTraining:true},rosterContext:{students:[],participants:[]},training:{selectedProjectIds:['p1'],projects} }
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
    const f=getApp().globalData.__recordFixture;
    if(opts.url.includes('/training-project-tree')) return JSON.parse(JSON.stringify({statusCode:200,data:f.tree}));
    if(opts.method==='PUT') { f.workbench.training.selectedProjectIds=opts.data.projectIds; return {statusCode:200,data:{eventId:'e1'}}; }
    return JSON.parse(JSON.stringify({statusCode:200,data:f.workbench}));
  });
  // Keep a return page so successful save exercises native navigation.
  await mp.reLaunch('/pages/coach/content-select/index?eventId=e1');
  let page=await mp.navigateTo('/pages/coach/content-select/index?eventId=e1');await page.waitFor(500);
  assert.equal(await page.data('state'),'ready');assert.equal(await page.data('selectedCount'),1);
  await (await page.$$('.content-action-card'))[1].tap();await page.waitFor(100);
  assert.equal(await page.data('selectedCount'),2);assert.ok((await page.data('actionCards')).every(card=>card.isSelected));
  await mp.screenshot({path:out+'/c04-runtime-selected-20261005.png'});
  await (await page.$('input')).input('移动');await page.waitFor(100);assert.equal((await page.data('actionCards')).length,1);assert.equal(await page.data('selectedCount'),2);
  await mp.screenshot({path:out+'/c04-runtime-search-20261005.png'});
  await (await page.$('.select-bar__confirm')).tap();await page.waitFor(1500);
  assert.deepEqual(await mp.evaluate(()=>getApp().globalData.__recordFixture.workbench.training.selectedProjectIds),['p1','p2']);
  const pages=await mp.evaluate(()=>getCurrentPages().length);assert.equal(pages,1);
  console.log(JSON.stringify({appId:account.appId,checks:['hierarchy checks update','search retains hidden selections','save and readback','native return'],screenshots:2,scope:'synthetic local data only'}));
 } finally {
  if (backed) await mp.evaluate(() => { const store = require('utils/store.js'); const b = getApp().globalData.__recordBackup; store.clearSession(); if (b.session) store.setSession(b.session); if (b.context) store.setAppContext(b.context); for (const item of b.keys) { if (item.present) wx.setStorageSync(item.key, item.value); else wx.removeStorageSync(item.key); } delete getApp().globalData.__recordBackup; delete getApp().globalData.__recordFixture; });
  await mp.restoreWxMethod('request'); await mp.reLaunch('/pages/login/index'); await mp.disconnect();
 }
})().catch(e => { console.error(e.stack); process.exitCode = 1; });
