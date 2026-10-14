#!/usr/bin/env node
// Read-only fixed-destination probes. No tokens, credentials, business writes or redirects.
const checks=[];
async function probe(environment,path,headers,status,client=false){
 const url=`https://cqtc.pomi.tech${environment==='release'?'':`/__env/${environment}`}${path}`;
 try {
  const response=await fetch(url,{headers,redirect:'error',signal:AbortSignal.timeout(12000)});
  const marker=response.headers.get('x-fcm-environment');
  let passed=response.status===status && (environment==='release'||marker===environment);
  if(client && response.status===200){const data=await response.json();passed=passed && data.clientId==='app-client-cq-talent-wechat-main' && Boolean(data.capabilities);}
  checks.push({environment,path,status:response.status,expected:status,marker,passed});
 }catch(error){checks.push({environment,path,passed:false,error:error.message});}
}
for(const environment of ['develop','trial']){
 await probe(environment,'/health',{},200);
 await probe(environment,'/app-clients/resolve?clientKey=cq-talent-wechat-main',{'X-MiniProgram-Env':environment},200,true);
 await probe(environment,'/app-clients/resolve?clientKey=cq-talent-wechat-main',{'X-MiniProgram-Env':environment==='develop'?'trial':'develop'},403);
 await probe(environment,'/clubs/probe/capabilities',{'X-MiniProgram-Env':environment,Authorization:'Bearer invalid-readiness-probe'},401);
}
await probe('release','/health',{},200);
await probe('release','/health',{'X-MiniProgram-Env':'trial'},403);
console.log(JSON.stringify({checkedAt:new Date().toISOString(),passed:checks.every(x=>x.passed),scope:'routing-and-client-registration-only',realWechatLoginVerified:false,checks},null,2));
process.exitCode=checks.every(x=>x.passed)?0:1;
