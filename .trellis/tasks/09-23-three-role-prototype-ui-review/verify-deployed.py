import json,pathlib,subprocess,urllib.request,urllib.error
root=pathlib.Path('/opt/cq-talent-nonproduction/releases/1224e07bf5f4'); checks=[]
def probe(path,headers,expected,environment=None):
 req=urllib.request.Request('https://cqtc.pomi.tech'+path,headers=headers)
 try:r=urllib.request.urlopen(req,timeout=10)
 except urllib.error.HTTPError as e:r=e
 with r:
  assert r.status==expected,(path,r.status,expected)
  if environment:assert r.headers.get('X-FCM-Environment')==environment
  checks.append({'path':path,'status':r.status,'environment':r.headers.get('X-FCM-Environment')})
probe('/health',{},200)
probe('/health',{'X-MiniProgram-Env':'trial'},403)
probe('/clubs/probe/app-clients/probe/__isolation_probe__',{'Referer':'https://servicewechat.com/wx4c588cd106e520e0/0/page-frame.html'},403)
probe('/health',{'Referer':'https://servicewechat.com/wx4c588cd106e520e0/12/page-frame.html'},200)
probe('/__env/unknown/health',{},404)
for env in ['develop','trial']:
 probe(f'/__env/{env}/health',{},200,env)
 probe(f'/__env/{env}/clubs/probe/capabilities',{'X-MiniProgram-Env':'release'},403,env)
 probe(f'/__env/{env}/clubs/probe/capabilities',{'X-MiniProgram-Env':env,'Authorization':'Bearer invalid-isolation-probe'},401,env)
 volumes=json.loads(subprocess.check_output(['docker','inspect','--format','{{json .Mounts}}',f'cq-talent-nonproduction-{env}-1']))
 assert len(volumes)==1 and volumes[0]['Name']==f'cq-talent-{env}-data'
 js='const {DatabaseSync}=require("node:sqlite");const d=new DatabaseSync(process.env.DATABASE_URL,{readOnly:true});console.log(JSON.stringify({environment:d.prepare("SELECT environment FROM runtime_environment").get().environment,users:d.prepare("SELECT COUNT(*) AS count FROM user_accounts").get().count,records:d.prepare("SELECT COUNT(*) AS count FROM training_records").get().count}));d.close();'
 state=json.loads(subprocess.check_output(['docker','exec',f'cq-talent-nonproduction-{env}-1','node','-e',js],stderr=subprocess.DEVNULL))
 assert state=={'environment':env,'users':0,'records':0},state
baseline=json.loads((root/'startup-evidence.json').read_text())['baseline']
template='{"id":{{json .Id}},"image":{{json .Config.Image}},"imageId":{{json .Image}},"startedAt":{{json .State.StartedAt}},"mounts":{{json .Mounts}}}'
after=json.loads(subprocess.check_output(['docker','inspect','--format',template,'cq-talent-api']))
assert after==baseline,'Production container changed'
result={'passed':True,'image':'cq-talent-api:trial-1224e07bf5f4','checks':checks,'dedicatedEmptyVolumes':True,'productionContainerUnchanged':True,'wechatLoginReady':False,'completeTrialReady':False}
(root/'deployment-verification.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
