#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const project=fileURLToPath(new URL('../apps/miniprogram-cq-talent/',import.meta.url));
const read=(name)=>JSON.parse(readFileSync(project+name,'utf8'));
assert.equal(Number(process.versions.node.split('.')[0]),24,'Delivery requires Node 24, matching CI/container');
const team=read('project.config.json');
assert.equal(team.setting.urlCheck,true,'Team domain/TLS checking must be enabled');
assert.match(team.appid,/^wx[0-9a-f]{16}$/);
if(existsSync(project+'project.private.config.json')){
 const local=read('project.private.config.json');
 assert.notEqual(local.setting?.urlCheck,false,'Private config disables domain/TLS checks');
 if(local.libVersion) assert.equal(local.libVersion,team.libVersion,'Private library version differs from team');
 if(local.appid) assert.equal(local.appid,team.appid,'Private AppID differs from team');
}
console.log(JSON.stringify({gate:'local-delivery-config',passed:true,node:process.version,appid:team.appid,libVersion:team.libVersion,urlCheck:true}));
