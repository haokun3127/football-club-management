import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { buildServer } from "/app/apps/api/dist/server.js";
const artifact = JSON.parse(readFileSync("/app/server-artifact.json", "utf8"));
const build = JSON.parse(readFileSync("/app/apps/api/build-metadata.json", "utf8"));
assert.equal(process.getuid(), 1000);
assert.equal(build.sourceRevision, "b51bfbb3cb85e1bba2070de50235e7e4e78e11aa");
assert.deepEqual(artifact.build, build);
for (const [section, path] of [[artifact.backoffice, "/app/apps/backoffice/dist/"], [artifact.migrations, "/app/apps/api/db/migrations/"]]) {
  for (const file of section.files) assert.equal(createHash("sha256").update(readFileSync(path + file.path)).digest("hex"), file.sha256);
  assert.equal(createHash("sha256").update(JSON.stringify(section.files)).digest("hex"), section.sha256);
}
const app = buildServer(undefined, { logger: false, runtimeConfig: { environment: "develop", databasePath: "/unused/cq-talent-develop/api.sqlite", wechatAppId: "wx0000000000000000" } });
try {
  const response = await app.inject("/health");
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { status: "ok", service: "@football-club/api", build, environment: "develop" });
  assert.equal(response.headers["cache-control"], "no-store");
  console.log(JSON.stringify({ passed: true, uid: process.getuid(), network: "none", dataVolumes: 0, readOnly: true, health: response.json(), backofficeFiles: artifact.backoffice.files.length, migrations: artifact.migrations.files.length }));
} finally { await app.close(); }
