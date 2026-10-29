#!/usr/bin/env node
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { root } from "./start-environment.mjs";
import { buildIdentity, exportRevision, inventory } from "./artifacts.mjs";

export function prepareMiniprogram({ revision = "HEAD", buildId, output, sourceRoot = root }) {
  if (!output) throw new Error("A new artifact output directory is required");
  buildIdentity("0".repeat(40), buildId); // Validate before creating anything.
  const destination = resolve(output);
  mkdirSync(destination); // Never overwrite an existing directory, including the development checkout.
  try {
    const sourceRevision = exportRevision(sourceRoot, revision, ["apps/miniprogram-cq-talent"], destination);
    const build = buildIdentity(sourceRevision, buildId);
    const project = join(destination, "apps/miniprogram-cq-talent");
    writeFileSync(join(project, "utils/build-metadata.ts"), `// Generated in staged artifact only.\nexport const CLIENT_BUILD = ${JSON.stringify(build)};\n`);
    const artifact = { schemaVersion: 1, unit: "miniprogram", build, sourceInventory: inventory(project), uploadReceipt: null };
    writeFileSync(join(destination, "miniprogram-artifact.json"), `${JSON.stringify(artifact, null, 2)}\n`);
    return artifact;
  } catch (error) { rmSync(destination, { recursive: true, force: true }); throw error; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const { values } = parseArgs({ options: { revision: { type: "string", default: "HEAD" }, "build-id": { type: "string" }, output: { type: "string" } } });
    const artifact = prepareMiniprogram({ revision: values.revision, buildId: values["build-id"], output: values.output });
    console.log(JSON.stringify({ build: artifact.build, uploadReceipt: null, note: "Staged source only; no DevTools import, official compilation or upload performed" }));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
