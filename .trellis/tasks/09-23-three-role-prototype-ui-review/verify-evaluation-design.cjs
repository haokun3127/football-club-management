// Synthetic local UI verification only; never sends business API requests.
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const { resolveAutomationPort } = require(root + '/scripts/devtools/automation-session.cjs');
const automator = require(root + '/apps/miniprogram-cq-talent/node_modules/miniprogram-automator');
const out = __dirname + '/club-style-light-evidence';
const phrases=[{id:'observe-teammates',text:'主动观察队友'},{id:'dribble-confidently',text:'敢于持球突破'},{id:'off-ball-movement',text:'加强无球跑动'}];
const history=[{revision:1,phrases:[phrases[1]],note:'',actorDisplayName:'陈教练',changedAt:'2026-08-20T02:00:00Z'},{revision:2,phrases:phrases.slice(0,2),note:'保持训练投入，先观察再处理球',actorDisplayName:'陈教练',changedAt:'2026-09-18T02:00:00Z'}];
const fixture={studentId:'s1',studentName:'林予安',phrases,teams:[{id:'t1',name:'U10 精英队',canEdit:true,evaluation:{clubId:'club-chongqing-talent',studentId:'s1',teamId:'t1',revision:2,history}}]};
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
    if(opts.url.endsWith('/parent/children')) return JSON.parse(JSON.stringify({statusCode:200,data:{children:[{id:'s1',name:'林予安',teams:[{name:'U10 精英队'}]}]}}));
    if(opts.url.endsWith('/growth-summary')) return JSON.parse(JSON.stringify({statusCode:200,data:{latest:[],evaluations:[{...f.teams[0].evaluation,teamName:'U10 精英队'}],timeline:[{id:'evaluation-t1-3',kind:'evaluation',teamId:'t1',evaluationRevision:3,occurredAt:'2026-10-05T02:00:00Z',title:'陈教练更新评价',subtitle:'增加：加强无球跑动'}]}}));
    if(opts.method==='PUT') { const old=f.teams[0].evaluation; const entry={revision:old.revision+1,phrases:f.phrases.filter(p=>opts.data.phraseIds.includes(p.id)),note:opts.data.note,actorDisplayName:'陈教练',changedAt:'2026-10-05T02:00:00Z'}; f.teams[0].evaluation={...old,revision:entry.revision,history:[...old.history,entry]}; return JSON.parse(JSON.stringify({statusCode:200,data:{evaluation:f.teams[0].evaluation}})); }
    return JSON.parse(JSON.stringify({statusCode:200,data:f}));
  });
  let page=await mp.reLaunch('/pages/shared/student-evaluation/index?student=s1&team=t1&mode=edit');await page.waitFor(1000);
  assert.equal(await page.data('state'),'ready');assert.equal(await page.data('mode'),'edit');
  assert.equal((await page.$$('.evaluation-option')).length,4);
  await mp.screenshot({path:out+'/c12-runtime-20261005.png'});
  await (await page.$('[data-id="off-ball-movement"]')).tap();
  await (await page.$('.evaluation-save')).tap(); await page.waitFor(300);
  assert.equal(await page.data('mode'),'current');assert.equal(await page.data('revision'),3);
  await page.callMethod('showHistory');await page.waitFor(1800);
  assert.equal((await page.data('history')).length,3);await mp.screenshot({path:out+'/c13-runtime-20261005.png'});
  await mp.evaluate(()=>{const store=require('utils/store.js');store.setSession({...store.getSession(),role:'parent',availableRoles:['parent'],currentStudentId:'s1'});getApp().globalData.__recordFixture.teams[0].canEdit=false;});
  page=await mp.reLaunch('/pages/shared/student-evaluation/index?student=s1&team=t1');await page.waitFor(500);
  assert.equal(await page.data('canEdit'),false);assert.equal(await page.data('revision'),3);
  await mp.screenshot({path:out+'/parent-evaluation-runtime-20261005.png'});
  page=await mp.reLaunch('/pages/parent/growth/index');await page.waitFor(500);
  assert.equal(await page.data('state'),'empty');assert.equal((await page.data('evaluationCards')).length,1);
  await mp.screenshot({path:out+'/parent-growth-evaluation-empty-radar-20261005.png'});
  await (await page.$('.p4-evaluation-card')).tap();await page.waitFor(1500);page=await mp.currentPage();
  assert.equal(page.path,'pages/shared/student-evaluation/index');assert.equal(await page.data('teamId'),'t1');
  page=await mp.reLaunch('/pages/parent/milestones/index');await page.waitFor(500);
  assert.equal((await page.data('milestones'))[0].state,'评价变化');
  await (await page.$('.milestone-card__action')).tap();await page.waitFor(1500);page=await mp.currentPage();
  assert.equal(page.path,'pages/shared/student-evaluation/index');assert.equal(await page.data('mode'),'history');
  console.log(JSON.stringify({appId:account.appId,checks:['C12 choice cards','save reflects matching revision','C13 change history','parent readonly same evaluation'],screenshots:4,parentEntryAndTimeline:true,scope:'synthetic local data only'}));
 } finally {
  try {
  if (backed) await mp.evaluate(() => { const store = require('utils/store.js'); const b = getApp().globalData.__recordBackup; store.clearSession(); if (b.session) store.setSession(b.session); if (b.context) store.setAppContext(b.context); for (const item of b.keys) { if (item.present) wx.setStorageSync(item.key, item.value); else wx.removeStorageSync(item.key); } delete getApp().globalData.__recordBackup; delete getApp().globalData.__recordFixture; });
  await mp.restoreWxMethod('request'); await mp.reLaunch('/pages/login/index');
  } finally { await mp.disconnect(); }
 }
})().catch(e => { console.error(e.stack); process.exitCode = 1; });
