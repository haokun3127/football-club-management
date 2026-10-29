#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { assertDigest } from "./start-environment.mjs";
import { buildIdentity, command, sha256 } from "./artifacts.mjs";

function validateInventory(value, { migrations = false } = {}) {
  if (!value || !Array.isArray(value.files) || !value.files.length || value.sha256 !== sha256(JSON.stringify(value.files))) throw new Error("Artifact inventory is missing or damaged");
  const names = new Set();
  for (const file of value.files) {
    if (typeof file.path !== "string" || file.path.startsWith("/") || file.path.split("/").some(part => !part || part === "." || part === "..")
      || names.has(file.path) || !/^[0-9a-f]{64}$/.test(file.sha256 ?? "") || (migrations && !/^\d{4}_[A-Za-z0-9_-]+\.sql$/.test(file.path))) throw new Error("Invalid artifact inventory entry");
    names.add(file.path);
  }
  return { sha256: value.sha256, files: value.files.map(file => ({ path: file.path, sha256: file.sha256 })) };
}

export function createManifest({ candidate, image, inspectedImageId, client, clientVersion = null, receipt = null }) {
  assertDigest(image);
  if (!/^sha256:[0-9a-f]{64}$/.test(candidate?.imageId ?? "") || candidate.imageId !== inspectedImageId) throw new Error("Registry digest must resolve to the candidate's local image ID");
  const server = candidate.artifact;
  if (server?.unit !== "server" || server.schemaVersion !== 1 || client?.unit !== "miniprogram" || client.schemaVersion !== 1) throw new Error("Expected the server and mini-program artifact records");
  const serverBuild = buildIdentity(server.build?.sourceRevision, server.build?.buildId, server.build?.builtAt);
  const clientBuild = buildIdentity(client.build?.sourceRevision, client.build?.buildId, client.build?.builtAt);
  if (!/^[0-9a-f]{64}$/.test(server.lockfileSha256 ?? "")) throw new Error("Missing lockfile identity");
  if ((receipt === null) !== (clientVersion === null) || (clientVersion !== null && !/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(clientVersion))) throw new Error("An operator-reported platform version requires its upload receipt, and vice versa");
  return {
    schemaVersion: 1,
    server: { build: serverBuild, image, imageId: candidate.imageId, backoffice: validateInventory(server.backoffice), migrations: validateInventory(server.migrations, { migrations: true }), lockfileSha256: server.lockfileSha256 },
    miniprogram: { build: clientBuild, sourceInventory: validateInventory(client.sourceInventory), reportedPlatformVersion: clientVersion, uploadReceipt: receipt === null ? null : { sha256: sha256(receipt) } },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const { values } = parseArgs({ options: { candidate: { type: "string" }, image: { type: "string" }, client: { type: "string" }, "client-version": { type: "string" }, "upload-receipt": { type: "string" }, output: { type: "string" } } });
    if (!values.candidate || !values.client || !values.output) throw new Error("Usage: create-manifest.mjs --candidate <json> --image <repository@sha256:digest> --client <miniprogram-artifact.json> --output <new-manifest.json> [--client-version <version> --upload-receipt <receipt-file>]");
    assertDigest(values.image);
    // Read local image identity only: never pull, push, run the API or touch a data volume.
    const inspectedImageId = command("docker", ["image", "inspect", values.image, "--format", "{{.Id}}"]);
    const manifest = createManifest({ candidate: JSON.parse(readFileSync(values.candidate, "utf8")), image: values.image, inspectedImageId, client: JSON.parse(readFileSync(values.client, "utf8")), clientVersion: values["client-version"] ?? null, receipt: values["upload-receipt"] ? readFileSync(values["upload-receipt"]) : null });
    writeFileSync(resolve(values.output), `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
    console.log(JSON.stringify({ manifest: resolve(values.output), server: manifest.server.build, miniprogram: manifest.miniprogram.build, uploaded: manifest.miniprogram.uploadReceipt !== null }));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
