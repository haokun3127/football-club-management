#!/usr/bin/env node
import { mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { root } from "./start-environment.mjs";
import { command, exportRevision, buildIdentity } from "./artifacts.mjs";

try {
  const { values } = parseArgs({ options: { revision: { type: "string", default: "HEAD" }, "build-id": { type: "string" }, tag: { type: "string" }, output: { type: "string" } } });
  if (!values.output || !values.tag || !/^[a-zA-Z0-9][a-zA-Z0-9._:/-]*:[A-Za-z0-9_][A-Za-z0-9_.-]*$/.test(values.tag) || values.tag.endsWith(":latest")) throw new Error("Usage: build-server.mjs --revision <commit> --build-id <id> --tag <unique-local-tag> --output <new-candidate.json>");
  if (existsSync(resolve(values.output))) throw new Error("Candidate output already exists");
  command("docker", ["info", "--format", "{{.ServerVersion}}"]);
  if (command("docker", ["image", "ls", "--quiet", values.tag])) throw new Error("Refusing to overwrite an existing image tag");
  const directory = mkdtempSync(join(tmpdir(), "fcm-server-build-"));
  try {
    const sourceRevision = exportRevision(root, values.revision, ["Dockerfile", ".dockerignore", "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "tsconfig.base.json", "patches", "scripts", "apps/api", "apps/backoffice", "packages/domain"], directory);
    const build = buildIdentity(sourceRevision, values["build-id"], new Date().toISOString());
    command("docker", ["build", "--tag", values.tag, ...Object.entries({ FCM_SOURCE_REVISION: sourceRevision, FCM_BUILD_ID: build.buildId, FCM_BUILT_AT: build.builtAt }).flatMap(([key, value]) => ["--build-arg", `${key}=${value}`]), directory], { stdio: "inherit" });
    const imageId = command("docker", ["image", "inspect", values.tag, "--format", "{{.Id}}"]);
    const artifact = JSON.parse(command("docker", ["run", "--rm", "--network", "none", "--read-only", "--entrypoint", "cat", imageId, "/app/server-artifact.json"]));
    if (JSON.stringify(artifact.build) !== JSON.stringify(build)) throw new Error("Built image identity differs from requested commit");
    writeFileSync(resolve(values.output), `${JSON.stringify({ schemaVersion: 1, imageId, imageDigest: null, artifact }, null, 2)}\n`, { flag: "wx" });
    console.log(JSON.stringify({ imageId, build, imageDigest: null, note: "Local image ID is not a registry digest; no push or deployment performed" }));
  } finally { rmSync(directory, { recursive: true, force: true }); }
} catch (error) { console.error(error.message); process.exitCode = 1; }
