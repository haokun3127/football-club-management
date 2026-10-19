// Synthetic local design validation; restores session and request mocks in finally.
const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const {resolveAutomationPort}=require(root+'/scripts/devtools/automation-session.cjs');
const automator=require(root+'/apps/miniprogram-cq-talent/node_modules/miniprogram-automator');
const out=root+'/.trellis/tasks/09-23-three-role-prototype-ui-review/club-style-light-evidence';
const students=[{id:'s1',name:'林予安'},{id:'s2',name:'周子衡'},{id:'s3',name:'许明澈'}];
const items=[{id:'i1',name:'20米跑'},{id:'i2',name:'传接球'},{id:'i3',name:'控球稳定性'}];
const fixture={tasks:[{id:'existing',title:'9月阶段测评',sourceEventId:'course-1',teamId:'team-1',templateId:'template-1',startsOn:'2026-09-19',dueOn:'2026-09-19',studentIds:students.map(s=>s.id),testItemIds:items.map(i=>i.id)}],publicationEnabled:true,templates:[{id:'template-1',name:'技术测评',testItems:items}],teams:[{id:'team-1',name:'U10',students}],courseOptions:[{id:'course-1',title:'U10技术训练',teamId:'team-1',date:'2026-09-19',startsAt:'2026-09-19T08:30:00Z',endsAt:'2026-09-19T10:00:00Z'}],sourceCourse:{id:'course-1',title:'U10技术训练',teamId:'team-1',date:'2026-09-19',startsAt:'2026-09-19T08:30:00Z',endsAt:'2026-09-19T10:00:00Z',studentIds:students.map(s=>s.id),attendance:[{studentId:'s1',status:'present'},{studentId:'s2',status:'present'},{studentId:'s3',status:'leave_requested'}]}};
(async()=>{const mp=await automator.connect({wsEndpoint:'ws://127.0.0.1:'+resolveAutomationPort()});let backed=false;try{
 const account=await mp.evaluate(()=>wx.getAccountInfoSync().miniProgram);assert.equal(account.appId,'wx4c588cd106e520e0');assert.equal(account.envVersion,'develop');
 await mp.mockWxMethod('request',new Function('return JSON.parse('+JSON.stringify(JSON.stringify({statusCode:200,data:fixture}))+');'));
 await mp.evaluate(()=>{const store=require('utils/store.js');const cfg=require('utils/config.js');const keys=[cfg.STORAGE_KEYS.session,cfg.STORAGE_KEYS.context,cfg.STORAGE_KEYS.devRole];const present=wx.getStorageInfoSync().keys;getApp().globalData.__c15VisualBackup={session:store.getSession(),context:store.getAppContext(),keys:keys.map(key=>({key,present:present.includes(key),value:wx.getStorageSync(key)}))};store.setSession({clubId:'club-chongqing-talent',clientId:'app-client-cq-talent-wechat-main',role:'coach',availableRoles:['coach'],userId:'visual-fixture',token:'dev-visual-fixture',displayName:'界面验证',capabilities:{}});});backed=true;
 let page=await mp.reLaunch('/pages/coach/test-task-create/index?eventId=course-1');await page.waitFor(300);
 const data=await page.data();assert.equal(data.sourceEventId,'course-1');assert.equal(data.selectedStudentCount,3);assert.equal(data.view,'summary');
 await mp.screenshot({path:out+'/c15-runtime-summary-20261004.png'});
 await (await page.$('.summary-row')).tap();await page.waitFor(150);assert.equal(await page.data('view'),'scope');
 const choices=await page.$$('.selection-row');assert.equal(choices.length,3);await choices[2].tap();await page.waitFor(200);assert.equal(await page.data('selectedStudentCount'),2);
 await mp.screenshot({path:out+'/c15-runtime-scope-20261004.png'});
 await (await page.$('.page-nav__back')).tap();await page.waitFor(200);assert.equal(await page.data('selectedStudentCount'),3);
 await (await page.$('.settings-summary')).tap();await page.waitFor(150);assert.equal(await page.data('view'),'settings');
 await mp.screenshot({path:out+'/c15-runtime-settings-20261004.png'});
 await (await page.$('.secondary-button')).tap();await page.waitFor(100);
 await (await page.$('.club-card .text-action')).tap();await page.waitFor(150);assert.equal(await page.data('view'),'courses');
 await mp.screenshot({path:out+'/c15-runtime-courses-20261004.png'});
 console.log(JSON.stringify({appId:account.appId,environment:account.envVersion,checks:['summary loads','scope opens','real row tap changes selection','cancel restores selection','settings opens/cancels','course switch opens despite origin context'],evidence:'synthetic request fixture only; no backend requests or business writes',screenshots:4}));
}finally{
 if(backed)await mp.evaluate(()=>{const store=require('utils/store.js');const b=getApp().globalData.__c15VisualBackup;store.clearSession();if(b.session)store.setSession(b.session);if(b.context)store.setAppContext(b.context);for(const item of b.keys){if(item.present)wx.setStorageSync(item.key,item.value);else wx.removeStorageSync(item.key);}delete getApp().globalData.__c15VisualBackup;});
 await mp.restoreWxMethod('request');await mp.reLaunch('/pages/login/index');await mp.disconnect();
}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
