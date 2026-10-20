/* Audit probes of unchanged page controllers, using synthetic dependencies only. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../../..');
const ts=require(path.join(root,'apps/miniprogram-cq-talent/node_modules/typescript'));
const output=[];
function page(route,api,extra={}){
 let definition;const events=[];
 const session={role:route.startsWith('parent')?'parent':'coach',currentStudentId:'b',availableRoles:['parent','coach'],userId:'audit',clubId:'audit'};
 const defaults={
  '../../../utils/api':api,
  '../../../utils/auth':{requireRole:()=>session},
  '../../../utils/presentation':new Proxy({},{get:(_,key)=> key==='resolveNavInset'?()=>47:key==='resolveMenuInset'?()=>16:()=>''}),
  '../../../utils/store':{setCurrentStudentId:id=>{session.currentStudentId=id}},
  '../../../utils/navigation':{openPage:url=>events.push({navigate:url})},
  ...extra,
 };
 const ctx={Page:v=>{definition=v},require:id=>{if(id in defaults)return defaults[id];throw new Error('Unstubbed '+id)},exports:{},console,setTimeout,clearTimeout,structuredClone,Date,Promise,Map,Set,WeakMap,
  wx:{showToast:arg=>events.push({toast:arg.title}),navigateBack:()=>{},navigateTo:()=>{},reLaunch:()=>{}}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,'apps/miniprogram-cq-talent/pages',route,'index.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,ctx);
 const p={...definition,data:structuredClone(definition.data),setData(patch){Object.assign(this.data,patch)}};
 return {p,events,session};
}
const children=[{id:'a',name:'合成甲',teams:['A'],coachNames:['合成教练']},{id:'b',name:'合成乙',teams:['B'],coachNames:['合成教练']}];
function homeApi(){return {getParentChildren:async()=>children,getParentGrowth:async()=>({milestones:[]}),getContentArticles:async()=>[],getParentCalendar:async()=>[]};}
const shortcuts=[{key:'leave',path:'/pages/parent/schedule/index'}];
const homeExtra={
 '../../../utils/training-records':{getTrainingRecords:async()=>({total:1,records:[]})},
 '../../../utils/club-presentation':{getClubPresentation:async()=>({banners:[],branding:null}),defaultParentShortcuts:shortcuts,parentShortcutOptions:()=>shortcuts,restoreParentShortcuts:v=>v},
};
(async()=>{
 {const api=homeApi();api.getContentArticles=async()=>{throw {message:'synthetic-news-failure'}};const {p}=page('parent/home',api,homeExtra);await p.load();assert.equal(p.data.state,'error');assert.equal(p.data.student,null);output.push({id:'HOME-AUX-FAIL',confirmed:true,observed:'News failure hides otherwise successful child, training, calendar and growth content.'});}
 {const api=homeApi();let release;api.getParentGrowth=()=>new Promise(r=>{release=r});const {p}=page('parent/home',api,homeExtra);const started=Date.now();const pending=p.load();await new Promise(r=>setTimeout(r,120));assert.equal(p.data.state,'loading');assert.equal(p.data.student,null);release({milestones:[]});await pending;output.push({id:'HOME-GATE',confirmed:true,controlledWaitMs:Date.now()-started,observed:'No child content is rendered until the slow growth promise resolves; controlled dependency, not phone performance.'});}
 {const {p}=page('parent/private',{getParentChildren:async()=>children});await p.load('');assert.equal(p.data.studentId,'a');output.push({id:'PRIVATE-CHILD',confirmed:true,selectedChild:'b',actualChild:p.data.studentId,observed:'Default shortcut omits student query, and private form chooses children[0] instead of currentStudentId.'});}
 {const {p,events}=page('coach/private-interest',{getCoachPreferences:async()=>({acceptsPrivateLessons:true,availabilitySlots:['0-0']}),saveCoachPreferences:async()=>{throw new Error('synthetic-offline')}});await p.load(true);const before=JSON.stringify(p.data.availabilityColumns);await p.toggleSlot({currentTarget:{dataset:{key:'5-0'}}});assert.notEqual(JSON.stringify(p.data.availabilityColumns),before);output.push({id:'PRIVATE-ROLLBACK',confirmed:true,changedAfterFailedSave:true,toasts:events});}
 {const {p}=page('coach/private-interest',{getCoachPreferences:async()=>({acceptsPrivateLessons:true,availabilitySlots:[]})});await p.load(true);const count=p.data.availabilityColumns.flatMap(x=>x.slots).filter(x=>x.selected).length;assert.equal(count,20);output.push({id:'PRIVATE-EMPTY',confirmed:true,storedSlots:0,displayedSelectedSlots:count});}
 {const {p}=page('coach/private-interest',{getCoachPreferences:async()=>{throw new Error('synthetic-read-failed')}});await p.load(true);assert.equal(p.data.interactive,true);output.push({id:'PRIVATE-READ-FAIL',confirmed:true,interactive:p.data.interactive,observed:'After a failed preferences read, default values remain editable and may overwrite saved server preferences.'});}
 {const source=fs.readFileSync(path.join(root,'apps/miniprogram-cq-talent/pages/parent/growth/index.ts'),'utf8');assert.match(source,/session\.currentStudentId === this\.data\.activeStudentId/);output.push({id:'GROWTH-RETURN',evidence:'source',observed:'onShow returns without refresh when the selected child is unchanged, including return from training-record correction.'});}
 {const points=Array.from({length:8},(_,i)=>({metricId:'m'+i,label:'合成指标'+i,value:80,maxValue:100}));const {p}=page('parent/radar',{getParentChildren:async()=>children,getParentGrowth:async()=>({radar:points,views:[],milestones:[]})});await p.load();assert.equal(p.data.radar.length,6);assert.equal(p.data.compositeScore,80);output.push({id:'RADAR-SIX',confirmed:true,inputDimensions:8,renderedDimensions:p.data.radar.length,serverOverall:'absent',frontendOverall:p.data.compositeScore});}
 fs.writeFileSync(path.join(__dirname,'logic-probes.json'),JSON.stringify({checkedAt:'2026-10-21',sourceHead:'97419b47',scope:'Unchanged TypeScript page controllers with synthetic dependencies; no renderer/network/server/phone coverage',probes:output},null,2)+'\n');
 console.log(JSON.stringify(output,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
