// Synthetic native-render verification only; no backend writes or upload.
const path=require('node:path');const root=path.resolve(__dirname,'../..');
const automator=require(root+'/apps/miniprogram-cq-talent/node_modules/miniprogram-automator');
const {resolveAutomationPort}=require('./automation-session.cjs');
const out=process.env.CQ_TALENT_VISUAL_EVIDENCE_DIR||require('node:path').join(require('node:os').tmpdir(),'cq-talent-visual-evidence');
require('node:fs').mkdirSync(out,{recursive:true});
(async()=>{const m=await automator.connect({wsEndpoint:'ws://127.0.0.1:'+String(resolveAutomationPort())});let changed=false;try{
 await m.mockWxMethod('request',{statusCode:200,data:{}});
 await m.evaluate(()=>{const store=require('utils/store.js');getApp().__renderBackup={session:store.getSession(),context:store.getAppContext()};store.setSession({clubId:'club-chongqing-talent',clientId:'app-client-cq-talent-wechat-main',role:'coach',availableRoles:['coach'],userId:'local-render-coach',displayName:'界面验证教练',capabilities:[],token:'dev-render-only'});});changed=true;

 const profile={student:{id:'render-s1',name:'陈小宇',age:10,school:'青训小学',dominantFoot:'right',level:'发展组',teams:[{id:'render-team',name:'U10 青训队',joinedAt:'2026-01-01'}]},attendance:{expected:12,present:10,absent:1,leave:1,late:1,unrecorded:0,effectiveLessons:10,earlyLeave:null},records:[{eventId:'render-course',title:'运控球与突破训练',occurredAt:'2026-09-20T09:00:00Z',status:'present',counted:true,source:'automatic',revision:1,history:[{revision:1,counted:true,source:'automatic',reason:'训练日期已过，自动计次',changedAt:'2026-09-21T00:00:00Z'}]}],training:{modules:[{label:'个人技术',courses:8,configuredMinutes:160},{label:'协作与比赛理解',courses:5,configuredMinutes:100}],participation:10,formalMatches:2,friendlyMatches:null,completionTargets:null}};
 const latest=Array.from({length:6},(_,i)=>({metricId:'m'+i,metric:{id:'m'+i,name:['运控球','传接球','射门','防守','协作','体能'][i]},record:{value:{kind:'score_0_100',score:50+i*7},occurredAt:'2026-09-20T09:00:00Z'}}));
 await m.mockWxMethod('request',function(options, json){return JSON.parse(json);},JSON.stringify({statusCode:200,data:{profile,latest,overall:67.5,modelName:'青训能力模型'}}));
 let p=await m.reLaunch('/pages/coach/student-radar/index?student=render-s1');await p.waitFor(1500);await m.screenshot({path:out+'/student-profile-top-render.png'});
 if(await p.data('state')!=='ready')throw new Error('Student profile did not render');const proof=await m.evaluate(()=>{const page=getCurrentPages().slice(-1)[0];const comp=page.selectComponent('.radar-hero__canvas');return {hasRadar:page.data.hasRadar,count:comp?.data.metrics.length,empty:comp?.data.empty};});if(proof.count!==6||proof.empty)throw new Error('Radar binding failed');console.log(JSON.stringify({profile:'ready',radarDimensions:proof.count}));
 await m.evaluate(()=>wx.pageScrollTo({scrollTop:850,duration:0}));await p.waitFor(300);await m.screenshot({path:out+'/student-profile-analysis-render.png'});
 await m.mockWxMethod('request',function(_options,json){return JSON.parse(json);},JSON.stringify({statusCode:200,data:{team:{id:'render-team',name:'U10 青训队',season:'2026秋季'},teamOptions:[{id:'render-team',name:'U10 青训队'},{id:'render-team2',name:'U12 精英队'}],stats:{memberCount:16,trainingCount:12,completedTrainingCount:10,attendanceRate:90},members:[{id:'render-s1',name:'陈小宇'},{id:'render-s2',name:'张远航'}],coaches:[{id:'render-coach',name:'教练',role:'主教练'}],formalMatches:[{eventId:'render-match',title:'秋季青少年杯',startsAt:'2026-09-28T09:00:00Z',venue:'青训中心一号场',match:{matchType:'cup',opponentName:'渝北青训队'}}]}}));
 p=await m.reLaunch('/pages/coach/team/index');await p.waitFor(900);await m.screenshot({path:out+'/team-formal-matches-render.png'});console.log(JSON.stringify({page:p.path,state:await p.data('state'),matches:(await p.data('matches')).length}));

 const event={id:'render-course',title:'运控球与突破训练',type:'training',status:'scheduled',timeRange:{startsAt:'2026-10-01T09:00:00Z',endsAt:'2026-10-01T10:00:00Z'},venue:'青训中心一号场',teamName:'U10 青训队'};
 await m.mockWxMethod('request',function(_options,json){return JSON.parse(json);},JSON.stringify({statusCode:200,data:{event,permissions:{canEditTraining:true},rosterContext:{students:[{id:'s1',name:'陈小宇'},{id:'s2',name:'张远航'}],participants:[{studentId:'s1',status:'present'},{studentId:'s2',status:'confirmed'}]},training:{projects:[{id:'d1',name:'运控球训练',durationMinutes:20}],selectedProjectIds:['d1'],contentSummary:{count:1,configuredMinutes:20,groups:[{id:'technical',label:'个人技术',items:[{id:'d1',name:'运控球训练',configuredMinutes:20}]}]}}}}));
 p=await m.reLaunch('/pages/coach/event/index?id=render-course');await p.waitFor(500);if(!await p.data('canEditTraining'))throw new Error('Workbench planning permission missing');await m.screenshot({path:out+'/course-workbench-render.png'});
 const preview={source:{title:'运控球与突破训练',revision:'ui-only-source',items:[{id:'d1',name:'运控球训练',configuredMinutes:20}],count:1,configuredMinutes:20,excluded:['课程内友谊赛']},targets:[{eventId:'target1',title:'U10 周四训练',startsAt:'2026-10-08T09:00:00Z',revision:'ui-only-target1',existing:[{id:'old',name:'传接球训练',configuredMinutes:15}]},{eventId:'target2',title:'U10 周六训练',startsAt:'2026-10-10T09:00:00Z',revision:'ui-only-target2',existing:[]}]};
 await m.mockWxMethod('request',function(_options,json){return JSON.parse(json);},JSON.stringify({statusCode:200,data:preview}));
 await p.callMethod('openTransfer',{currentTarget:{dataset:{mode:'copy'}}});await p.waitFor(500);await m.screenshot({path:out+'/course-copy-preview-render.png'});
 if((await p.data('transferTargets')).some(target=>target.action!=='skip'))throw new Error('Copy preselected an overwrite');
 console.log(JSON.stringify({workbench:'ready',copy:'preview-only',targets:(await p.data('transferTargets')).length}));
 const taskOptions={tasks:[],publicationEnabled:true,templates:[{id:'template-synthetic',name:'青训能力测评',testItems:Array.from({length:18},(_,i)=>({id:'item-'+i,name:['正脚背运球','内脚背传球','停球与转身','观察与决策','协调与平衡','接应与协作'][i%6]+(i>=6?' · 进阶':'' )}))}],teams:[{id:'render-team',name:'U10 青训队',students:[{id:'s1',name:'陈小宇'},{id:'s2',name:'张远航'},{id:'outside-course',name:'非本课学员'}]}],sourceCourse:{id:'render-course',title:'运控球与突破训练',teamId:'render-team',date:'2026-09-22',studentIds:['s1','s2']}};
 await m.mockWxMethod('request',function(_options,json){return JSON.parse(json);},JSON.stringify({statusCode:200,data:taskOptions}));
 p=await m.reLaunch('/pages/coach/test-task-create/index?eventId=render-course');await p.waitFor(500);
 if((await p.data('students')).length!==2 || await p.data('startsOn')!=='2026-09-22')throw new Error('Task course scope did not render');
 await m.screenshot({path:out+'/assessment-task-create-course.png'});
 await m.evaluate(()=>wx.pageScrollTo({scrollTop:680,duration:0}));await p.waitFor(200);
 await m.screenshot({path:out+'/assessment-task-create-selection.png'});
 await p.callMethod('toggleProject',{currentTarget:{dataset:{id:'item-0'}}});
 if((await p.data('projects'))[0].selected)throw new Error('Task project selection did not change');
 console.log(JSON.stringify({taskCreation:'preview-only',students:2,selectedProjects:17}));
 }finally{
 if(changed)await m.evaluate(()=>{const store=require('utils/store.js');const backup=getApp().__renderBackup;store.clearSession();if(backup?.session)store.setSession(backup.session);else if(backup?.context)store.setAppContext(backup.context);delete getApp().__renderBackup;});
 await m.restoreWxMethod('request');await m.reLaunch('/pages/login/index');m.disconnect();}
})().catch(error=>{console.error(error.message);process.exit(1)});
