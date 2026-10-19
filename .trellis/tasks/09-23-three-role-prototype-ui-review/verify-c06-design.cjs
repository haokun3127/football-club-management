// Synthetic local design validation; restores session and request mocks in finally.
const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const {resolveAutomationPort}=require(root+'/scripts/devtools/automation-session.cjs');
const automator=require(root+'/apps/miniprogram-cq-talent/node_modules/miniprogram-automator');
const out=root+'/.trellis/tasks/09-23-three-role-prototype-ui-review/club-style-light-evidence';
const source={title:'U10 技术训练',revision:'source-v1',count:3,configuredMinutes:65,items:[{id:'a',name:'传接球',configuredMinutes:20},{id:'b',name:'二过一',configuredMinutes:25},{id:'c',name:'控球',configuredMinutes:20}],excluded:['友谊赛记分']};
const existing=[{id:'a',name:'传接球',configuredMinutes:15},{id:'d',name:'射门',configuredMinutes:20}];
const merged=[...existing,...source.items.slice(1)];
const fixture={source,targets:[{eventId:'target-1',title:'U10 技术训练',startsAt:'2099-10-06T08:30:00Z',revision:'target-v1',existing,outcomes:{merge:{items:merged,count:4,configuredMinutes:80},replace:{items:source.items,count:3,configuredMinutes:65}}},{eventId:'target-2',title:'U10 综合训练',startsAt:'2099-10-08T08:30:00Z',revision:'target2-v1',existing:[],outcomes:{merge:{items:source.items,count:3,configuredMinutes:65},replace:{items:source.items,count:3,configuredMinutes:65}}}]};
(async()=>{const mp=await automator.connect({wsEndpoint:'ws://127.0.0.1:'+resolveAutomationPort()});let backed=false;try{
 const account=await mp.evaluate(()=>wx.getAccountInfoSync().miniProgram);assert.equal(account.appId,'wx4c588cd106e520e0');assert.equal(account.envVersion,'develop');
 await mp.mockWxMethod('request',new Function('opts', 'return JSON.parse(opts.url.endsWith("/apply") ? '+JSON.stringify(JSON.stringify({statusCode:200,data:{results:[{eventId:'target-1',status:'applied'}],excluded:[]}}))+' : '+JSON.stringify(JSON.stringify({statusCode:200,data:fixture}))+');'));
 await mp.evaluate(()=>{const store=require('utils/store.js');const cfg=require('utils/config.js');const keys=[cfg.STORAGE_KEYS.session,cfg.STORAGE_KEYS.context,cfg.STORAGE_KEYS.devRole];const present=wx.getStorageInfoSync().keys;getApp().globalData.__c06VisualBackup={session:store.getSession(),context:store.getAppContext(),keys:keys.map(key=>({key,present:present.includes(key),value:wx.getStorageSync(key)}))};store.setSession({clubId:'club-chongqing-talent',clientId:'app-client-cq-talent-wechat-main',role:'coach',availableRoles:['coach'],userId:'visual-fixture',token:'dev-visual-fixture',displayName:'界面验证',capabilities:{}});});backed=true;
 let page=await mp.reLaunch('/pages/coach/content-copy/index?eventId=source-1');await page.waitFor(400);
 assert.equal(await page.data('loadError'),'');assert.equal(await page.data('canSubmit'),false);
 await (await page.$('.target-picker')).tap();await page.waitFor(150);assert.equal(await page.data('view'),'targets');
 await (await page.$('.target-row')).tap();await page.waitFor(150);
 await mp.screenshot({path:out+'/c06-runtime-targets-20261004.png'});
 await (await page.$('.secondary')).tap();await page.waitFor(150);assert.equal(await page.data('selectedCount'),0);
 await (await page.$('.target-picker')).tap();await page.waitFor(100);await (await page.$('.target-row')).tap();await page.waitFor(100);await (await page.$('.primary')).tap();await page.waitFor(150);
 assert.equal(await page.data('selectedCount'),1);assert.equal(await page.data('canSubmit'),true);assert.equal((await page.data('previewRows'))[0].minutes,80);
 await mp.screenshot({path:out+'/c06-runtime-merge-20261004.png'});
 const modes=await page.$$('.mode-switch button');await modes[1].tap();await page.waitFor(150);assert.equal((await page.data('previewRows'))[0].minutes,65);
 await mp.screenshot({path:out+'/c06-runtime-replace-20261004.png'});
 await modes[0].tap();await page.waitFor(100);await (await page.$('.primary')).tap();await page.waitFor(300);
 assert.equal((await page.data('results'))[0].applied,true);assert.equal(await page.data('canSubmit'),false);
 await mp.screenshot({path:out+'/c06-runtime-result-20261004.png'});
 await mp.mockWxMethod('request',new Function('return JSON.parse('+JSON.stringify(JSON.stringify({statusCode:200,data:{source,targets:[]}}))+');'));
 await page.callMethod('load');await page.waitFor(200);await (await page.$('.target-picker')).tap();await page.waitFor(200);
 assert.equal(await page.data('view'),'targets');assert.equal((await page.$$('.selection-empty')).length,1);
 await mp.screenshot({path:out+'/c06-runtime-empty-20261004.png'});
 await (await page.$('.primary')).tap();await page.waitFor(100);assert.equal(await page.data('view'),'summary');
 console.log(JSON.stringify({appId:account.appId,environment:account.envVersion,checks:['explicit target selection','cancel restores','apply target','server merge preview','replace preview','confirmed simulated result','repeat submit blocked','empty target state and return'],evidence:'synthetic request fixture only; no backend requests or business writes',screenshots:5}));
}finally{
 if(backed)await mp.evaluate(()=>{const store=require('utils/store.js');const b=getApp().globalData.__c06VisualBackup;store.clearSession();if(b.session)store.setSession(b.session);if(b.context)store.setAppContext(b.context);for(const item of b.keys){if(item.present)wx.setStorageSync(item.key,item.value);else wx.removeStorageSync(item.key);}delete getApp().globalData.__c06VisualBackup;});
 await mp.restoreWxMethod('request');await mp.reLaunch('/pages/login/index');await mp.disconnect();
}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
