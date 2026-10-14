import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {spawnSync} from "node:child_process";
test("canonical documentation policy",()=>{const p=JSON.parse(fs.readFileSync("scripts/docs-governance-policy.json","utf8"));assert.equal(p.compatibility["PRODUCT.md"],"docs/spec/product.md");for(const t of Object.values(p.compatibility))assert.ok(fs.existsSync(t),t)});
test("active links and compatibility pointers",()=>{const r=spawnSync(process.execPath,["scripts/docs-governance.mjs","--strict"],{encoding:"utf8"});assert.equal(r.status,0,r.stdout+"\n"+r.stderr)});
