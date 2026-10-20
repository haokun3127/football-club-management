"""Read-only navigation/capture through Tencent's official CLI. No business writes."""
import json, subprocess, time
from pathlib import Path

ROOT=Path('/Users/dongjun/projects/football-club-management')
OUT=Path('/private/tmp/cq-core-flow-audit-20261020')
CLI='/Applications/wechatwebdevtools.app/Contents/MacOS/wechatide'
PROJECT=str(ROOT/'apps/miniprogram-cq-talent')
OUT.mkdir(exist_ok=True)

def call(tool, **kwargs):
    args=[CLI,'-c','codex',tool,'--project',PROJECT]
    for key,value in kwargs.items():
        args.extend(['--'+key.replace('_','-'), str(value) if not isinstance(value,(dict,list)) else json.dumps(value,ensure_ascii=False)])
    result=subprocess.run(args,capture_output=True,text=True,timeout=50)
    raw=result.stdout
    start=raw.find('{')
    if start<0: raise RuntimeError(raw[-300:]+result.stderr[-300:])
    parsed=json.loads(raw[start:])
    if not parsed.get('ok'): raise RuntimeError(json.dumps(parsed,ensure_ascii=False))
    value=parsed
    for _ in range(5):
        if isinstance(value,dict) and 'result' in value: value=value['result']
        else: break
    return value

INSTALL=r'''function(){
 var app=getApp(); if(app.__cqCoreAudit) return {installed:true,reused:true};
 var old=wx.request; var audit={entries:[],original:old}; app.__cqCoreAudit=audit;
 var wrapped=function(options){var t=Date.now(); var row={path:options.url.replace(/^https?:\/\/[^/]+/,''),start:t,status:null}; audit.entries.push(row);
   var next=Object.assign({},options); var success=options.success,fail=options.fail,complete=options.complete;
   next.success=function(r){row.status=r.statusCode; if(success)success(r)};
   next.fail=function(r){row.failed=true;if(fail)fail(r)};
   next.complete=function(r){row.durationMs=Date.now()-t;if(complete)complete(r)};
   return old.call(wx,next);
 }; wx.request=wrapped; audit.wrapped=wrapped;
 return {installed:wx.request===wrapped};
}'''

READ=r'''function(){var p=getCurrentPages().slice(-1)[0]; if(!p)return null; var d=p.data;
 return {route:p.route,state:d.state||d.featureState,message:d.message||d.featureMessage||'',canSwitchToParent:d.canSwitchToParent,canSwitchToCoach:d.canSwitchToCoach,
 events:(d.eventViews||d.events||d.trainingCards||[]).slice(0,20).map(function(x){return {id:x.id,type:x.type,date:x.startsAt}}),
 tasks:(d.tasks||d.courseTasks||[]).slice(0,10).map(function(x){return {id:x.id,templateId:x.templateId}}),
 counts:{children:(d.children||[]).length,rows:(d.rows||[]).length,roster:(d.rosterRows||d.roster||[]).length},
 canEditTraining:d.canEditTraining,canManageRoster:d.canManageRoster};}'''

NAV=r'''function(url){var a=getApp().__cqCoreAudit; if(a)a.entries=[]; var started=Date.now();
 return new Promise(function(resolve){wx.reLaunch({url:url,fail:function(){resolve({navigationFailed:true})},success:function(){
 var end=Date.now()+10000;var firstReady=null;
 function check(){var p=getCurrentPages().slice(-1)[0],d=p&&p.data;var right=p&&('/'+p.route===url.split('?')[0]);
 var state=d&&(d.state||d.featureState);var ready=right&&['ready','empty','error','enabled','unavailable','pending'].indexOf(state)>=0;
 if(ready&&firstReady===null)firstReady=Date.now()-started;
 var rows=a?a.entries:[];var inflight=rows.some(function(r){return r.durationMs===undefined});
 if((ready&&!inflight&&Date.now()-started-firstReady>180)||Date.now()>end){resolve({route:p&&p.route,state:state,dataReadyMs:firstReady,elapsedMs:Date.now()-started,
 requestCount:rows.length,requests:rows.map(function(r){return {path:r.path,startOffsetMs:r.start-started,durationMs:r.durationMs,status:r.status,failed:r.failed}})});return;}
 setTimeout(check,80);}check();}})});
}'''

def evaluate(fn,args=None):
    if args is not None:
        fn='function(){return ('+fn+').apply(null,'+json.dumps(args,ensure_ascii=False)+');}'
    kw={'fn_source':fn}
    return call('automation_evaluate',**kw)

def capture(label,route):
    result=evaluate(NAV,[route])
    result['summary']=evaluate(READ)
    result['screenshot']=call('simulator_screenshot',path=str(OUT/(label+'.png')),optimize='false')
    (OUT/(label+'.json')).write_text(json.dumps(result,ensure_ascii=False,indent=2))
    print(json.dumps({'step':label,'route':result.get('route'),'state':result.get('state'),'dataReadyMs':result.get('dataReadyMs'),'requestCount':result.get('requestCount'),'summary':result['summary']},ensure_ascii=False),flush=True)
    return result

if __name__=='__main__':
    print(json.dumps(evaluate(INSTALL)),flush=True)
    pages=[('02-coach-schedule','/pages/coach/schedule/index'),('03-coach-training','/pages/coach/training/index'),('04-coach-tasks','/pages/coach/test-tasks/index'),('05-coach-team','/pages/coach/team/index'),('06-coach-me','/pages/coach/me/index'),('07-coach-private','/pages/coach/private-interest/index')]
    results=[]
    for label,route in pages:
        try:results.append(capture(label,route))
        except Exception as e:print(json.dumps({'step':label,'error':str(e)},ensure_ascii=False),flush=True)
    (OUT/'coach-summary.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
