import fs from "node:fs";
import path from "node:path";
const policy=JSON.parse(fs.readFileSync("scripts/docs-governance-policy.json","utf8"));
const strict=process.argv.includes("--strict");
const seen=new Set(),errors=[],warnings=[];
function walk(d){if(!fs.existsSync(d))return;for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.posix.join(d,e.name);if(e.isDirectory()){if(!["node_modules",".git","dist"].includes(e.name))walk(p)}else if(e.isFile())seen.add(p)}}
walk("docs");walk(".trellis/spec");for(const p of ["README.md","AGENTS.md","PRODUCT.md"])seen.add(p);
const scoped=p=>policy.strictPrefixes.some(x=>p.startsWith(x))||policy.strictFiles.includes(p);
for(const p of seen){if(!p.endsWith(".md"))continue;const data=fs.readFileSync(p,"utf8");
if(p.startsWith("docs/spec/")&&!/Status:\s*\*{0,2}(Active|Draft|Superseded|Historical)/i.test(data))errors.push(p+": status missing");
const body=data.replace(/^\s*```[^\n]*\n[\s\S]*?^\s*```[^\n]*$/gm,"");
for(const m of body.matchAll(/!?\[[^\]\n]*\]\((<[^>]+>|[^)\s]+)\)/g)){let raw=m[1].replace(/^<|>$/g,"").split("#")[0].split("?")[0];if(!raw||/^(https?:|mailto:|\/|data:)/.test(raw))continue;const dest=path.posix.normalize(path.posix.join(path.posix.dirname(p),raw));if(!fs.existsSync(dest))(scoped(p)?errors:warnings).push(p+" => "+dest)}}
for(const [old,dest] of Object.entries(policy.compatibility)){if(!fs.existsSync(old)||!fs.existsSync(dest)){errors.push("compat missing "+old+" => "+dest);continue}const body=fs.readFileSync(old,"utf8");const rel=path.posix.relative(path.posix.dirname(old),dest);if(!body.includes(rel)&&!body.includes(dest))errors.push("compat pointer missing "+old+" => "+dest)}
console.log(JSON.stringify({checked:[...seen].filter(p=>p.endsWith(".md")).length,errors,warnings:warnings.slice(0,20),historicalWarnings:warnings.length},null,2));
if(strict&&errors.length)process.exitCode=1;
