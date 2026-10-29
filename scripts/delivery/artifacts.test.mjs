import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, symlinkSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildIdentity, inventory, command, sha256 } from "./artifacts.mjs";
import { prepareMiniprogram } from "./prepare-miniprogram.mjs";
import { createManifest } from "./create-manifest.mjs";

const build = buildIdentity("a".repeat(40), "cq-001", "2026-10-30T00:00:00.000Z");
test("staged client uses only a fixed commit, stamps its identity and never edits the checkout", () => {
  const directory = mkdtempSync(join(tmpdir(), "fcm-staging-"));
  const sourceRoot = join(directory, "repo");
  mkdirSync(join(sourceRoot, "apps/miniprogram-cq-talent/utils"), { recursive: true });
  const metadata = join(sourceRoot, "apps/miniprogram-cq-talent/utils/build-metadata.ts");
  const source = join(sourceRoot, "apps/miniprogram-cq-talent/app.ts");
  writeFileSync(metadata, "export const CLIENT_BUILD = null;\n");
  writeFileSync(source, "// committed\n");
  const git = args => command("git", args, { cwd: sourceRoot });
  try {
    git(["init", "--quiet"]);
    git(["add", "."]);
    git(["-c", "user.name=Fixture", "-c", "user.email=fixture@example.test", "commit", "--quiet", "-m", "fixture"]);
    const revision = git(["rev-parse", "HEAD"]);
    writeFileSync(source, "// uncommitted must not ship\n");
    const output = join(directory, "artifact");
    const artifact = prepareMiniprogram({ sourceRoot, revision, buildId: "cq-client-1", output });
    assert.equal(artifact.build.sourceRevision, revision);
    assert.equal(readFileSync(join(output, "apps/miniprogram-cq-talent/app.ts"), "utf8"), "// committed\n");
    assert.equal(readFileSync(source, "utf8"), "// uncommitted must not ship\n");
    assert.equal(readFileSync(metadata, "utf8"), "export const CLIENT_BUILD = null;\n");
    assert.ok(readFileSync(join(output, "apps/miniprogram-cq-talent/utils/build-metadata.ts"), "utf8").includes(revision));
    assert.deepEqual(JSON.parse(readFileSync(join(output, "miniprogram-artifact.json"))), artifact);
    assert.equal(artifact.uploadReceipt, null);
    assert.throws(() => prepareMiniprogram({ sourceRoot, revision, buildId: "again", output }), /EEXIST/);
    assert.throws(() => prepareMiniprogram({ sourceRoot, revision: "not-a-commit", buildId: "valid", output: join(directory, "failed") }));
    assert.equal(existsSync(join(directory, "failed")), false);
    rmSync(metadata);
    git(["add", "-u"]);
    git(["-c", "user.name=Fixture", "-c", "user.email=fixture@example.test", "commit", "--quiet", "-m", "unstamped revision"]);
    assert.throws(() => prepareMiniprogram({ sourceRoot, buildId: "valid", output: join(directory, "unsupported") }), /does not support/);
    assert.equal(existsSync(join(directory, "unsupported")), false);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("server artifact hashes actual built backoffice/migrations, public metadata has no environment secrets", () => {
  const directory = mkdtempSync(join(tmpdir(), "fcm-inventory-"));
  try {
    for (const path of ["apps/api/db/migrations", "apps/backoffice/dist"]) mkdirSync(join(directory, path), { recursive: true });
    writeFileSync(join(directory, "apps/api/db/migrations/0001_fixture.sql"), "SELECT 1;\n");
    writeFileSync(join(directory, "apps/backoffice/dist/index.html"), "<html>fixture</html>");
    writeFileSync(join(directory, "pnpm-lock.yaml"), "lockfile fixture\n");
    command(process.execPath, [fileURLToPath(new URL("./write-server-artifact.mjs", import.meta.url))], { cwd: directory, env: { ...process.env, FCM_SOURCE_REVISION: build.sourceRevision, FCM_BUILD_ID: build.buildId, FCM_BUILT_AT: build.builtAt, PRIVATE_TEST_SECRET: "never-export" } });
    const artifact = JSON.parse(readFileSync(join(directory, "server-artifact.json")));
    assert.deepEqual(artifact.build, build);
    assert.deepEqual(JSON.parse(readFileSync(join(directory, "apps/api/build-metadata.json"))), build);
    assert.equal(artifact.migrations.files[0].sha256, sha256("SELECT 1;\n"));
    assert.ok(!JSON.stringify(artifact).includes("never-export"));
    const before = artifact.backoffice.sha256;
    writeFileSync(join(directory, "apps/backoffice/dist/index.html"), "changed");
    assert.notEqual(inventory(join(directory, "apps/backoffice/dist")).sha256, before);
    symlinkSync("index.html", join(directory, "apps/backoffice/dist/linked"));
    assert.throws(() => inventory(join(directory, "apps/backoffice/dist")), /symbolic links/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("manifest associates two units with digest, asset/migration hashes and receipt, refuses mismatches", () => {
  const files = [{ path: "0001_fixture.sql", sha256: "a".repeat(64) }];
  const listing = { sha256: sha256(JSON.stringify(files)), files };
  const imageId = `sha256:${"b".repeat(64)}`;
  const input = {
    candidate: { imageId, artifact: { unit: "server", schemaVersion: 1, build, backoffice: listing, migrations: listing, lockfileSha256: "c".repeat(64) } },
    image: `example.test/cq@sha256:${"d".repeat(64)}`, inspectedImageId: imageId,
    client: { unit: "miniprogram", schemaVersion: 1, build: { ...build, buildId: "client-1" }, sourceInventory: listing },
  };
  const pending = createManifest(input);
  assert.equal(pending.miniprogram.uploadReceipt, null);
  assert.equal(pending.miniprogram.reportedPlatformVersion, null);
  assert.equal(pending.server.imageReference, input.image);
  assert.equal(pending.miniprogram.build.buildId, "client-1");
  assert.equal(pending.server.repositoryDigest, input.image);
  const local = createManifest({ ...input, image: imageId });
  assert.equal(local.server.imageId, imageId);
  assert.equal(local.server.repositoryDigest, null);
  assert.throws(() => createManifest({ ...input, image: `sha256:${"e".repeat(64)}` }), /Local image ID/);
  const uploaded = createManifest({ ...input, receipt: Buffer.from("private official receipt"), clientVersion: "1.2.3" });
  assert.deepEqual(uploaded.miniprogram.uploadReceipt, { sha256: sha256("private official receipt") });
  assert.ok(!JSON.stringify(uploaded).includes("private official receipt"));
  assert.throws(() => createManifest({ ...input, inspectedImageId: `sha256:${"e".repeat(64)}` }), /candidate/);
  assert.throws(() => createManifest({ ...input, image: "cq:latest" }), /immutable/);
  assert.throws(() => createManifest({ ...input, clientVersion: "1.2.3" }), /receipt/);
  const damaged = structuredClone(input);
  damaged.candidate.artifact.migrations.files[0].sha256 = "f".repeat(64);
  assert.throws(() => createManifest(damaged), /damaged/);
  assert.throws(() => createManifest({ ...input, client: { unit: "miniprogram", schemaVersion: 1 } }), /build identity/);
  const missingTimestamp = structuredClone(input);
  delete missingTimestamp.client.build.builtAt;
  assert.throws(() => createManifest(missingTimestamp), /build identity/);
  assert.throws(() => createManifest({ ...input, receipt: Buffer.from(""), clientVersion: "1.2.3" }), /nonempty/);
});
