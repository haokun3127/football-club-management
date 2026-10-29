#!/usr/bin/env node
// Runs after the server/backoffice build, inside the isolated Docker build context.
import { writeFileSync } from "node:fs";
import { buildIdentity, inventory, sha256 } from "./artifacts.mjs";
import { readFileSync } from "node:fs";

const build = buildIdentity(process.env.FCM_SOURCE_REVISION, process.env.FCM_BUILD_ID, process.env.FCM_BUILT_AT);
const artifact = {
  schemaVersion: 1, unit: "server", build,
  backoffice: inventory("apps/backoffice/dist"),
  migrations: inventory("apps/api/db/migrations"),
  lockfileSha256: sha256(readFileSync("pnpm-lock.yaml")),
};
writeFileSync("apps/api/build-metadata.json", `${JSON.stringify(build)}\n`);
writeFileSync("server-artifact.json", `${JSON.stringify(artifact, null, 2)}\n`);
