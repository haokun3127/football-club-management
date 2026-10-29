#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";

export const root = fileURLToPath(new URL("../../", import.meta.url));
export function assertImageReference(image) {
  if (typeof image !== "string" || (!/^sha256:[0-9a-f]{64}$/.test(image) && !/^[a-zA-Z0-9][a-zA-Z0-9._:/-]*@sha256:[0-9a-f]{64}$/.test(image))) {
    throw new Error("An immutable local sha256 image ID or repository@sha256 reference is required");
  }
  return image;
}

export function environmentTarget(environment) {
  if (!["develop", "trial", "release"].includes(environment)) throw new Error("Select develop, trial or release explicitly");
  return environment === "release"
    ? { file: "docker-compose.yml", service: "api", init: "data-init", volume: "cq-talent-api-data", directory: "/var/lib/cq-talent", port: "3000" }
    : { file: "deploy/environment-isolation/compose.nonproduction.yml", service: environment, init: `${environment}-data-init`, volume: `${environment}-data`, directory: `/var/lib/cq-talent-${environment}`, port: environment === "develop" ? "3101" : "3102" };
}

export function startPlan(environment, config) {
  const target = environmentTarget(environment);
  const service = config.services?.[target.service];
  const init = config.services?.[target.init];
  if (!service || !init) throw new Error("Environment services are missing");
  const volume = config.volumes?.[target.volume];
  const expectedName = environment === "release" ? "cq-talent-api-data" : `cq-talent-${environment}-data`;
  if (volume?.name !== expectedName || volume.external || volume.driver_opts) throw new Error("Dedicated volume name differs or uses an external mount");
  assertImageReference(service.image);
  if (init.image !== service.image || service.build || init.build) throw new Error("Runtime and initialization must use the same prebuilt image");
  for (const entry of [service, init]) {
    const volumes = entry.volumes ?? [];
    if (volumes.length !== 1 || volumes[0].type !== "volume" || volumes[0].source !== target.volume || volumes[0].target !== target.directory) {
      throw new Error("Environment services must mount only their dedicated data volume");
    }
  }
  if (service.environment?.FCM_RUNTIME_ENV !== environment || service.environment?.DATABASE_URL !== `${target.directory}/api.sqlite`
    || String(service.environment?.FCM_CQ_TALENT_ACCEPTANCE_SEED) !== "0") throw new Error("Runtime environment or database target differs");
  if (Object.keys(service.depends_on ?? {}).some(name => name !== target.init) || Object.keys(init.depends_on ?? {}).length) throw new Error("Cross-environment dependency refused");
  if (!service.ports?.length || service.ports.some(port => port.host_ip !== "127.0.0.1" || port.published !== target.port || port.target !== 3000)) throw new Error("Runtime must use its dedicated localhost port");
  const prefix = ["compose", "-f", resolve(root, target.file)];
  return {
    environment, imageReference: service.image,
    // run --no-deps ignores an old init container's completion and never starts a sibling.
    commands: [
      [...prefix, "run", "--rm", "--no-deps", "--pull", "never", target.init],
      [...prefix, "up", "-d", "--no-build", "--no-deps", "--pull", "never", target.service],
    ],
  };
}

export function main(args = process.argv.slice(2)) {
  const [environment, flag] = args;
  if (args.length > 2 || (flag && flag !== "--apply")) throw new Error("Usage: start-environment.mjs <develop|trial|release> [--apply]");
  const target = environmentTarget(environment);
  const rendered = spawnSync("docker", ["compose", "-f", resolve(root, target.file), "config", "--format", "json"], { cwd: root, encoding: "utf8" });
  // Rendered config contains credentials. Never print it or raw Compose diagnostics.
  if (rendered.status !== 0) throw new Error("Compose configuration failed; check dedicated image/env-file settings privately");
  const plan = startPlan(environment, JSON.parse(rendered.stdout));
  const inspected = spawnSync("docker", ["image", "inspect", plan.imageReference, "--format", "{{.Id}}"], { encoding: "utf8" });
  if (inspected.status !== 0 || !/^sha256:[0-9a-f]{64}$/.test(inspected.stdout.trim())
    || (plan.imageReference.startsWith("sha256:") && inspected.stdout.trim() !== plan.imageReference)) throw new Error("The reviewed immutable image is not available locally or its identity differs");
  plan.imageId = inspected.stdout.trim();
  console.log(JSON.stringify(plan, null, 2));
  if (flag !== "--apply") return;
  for (const command of plan.commands) {
    const result = spawnSync("docker", command, { cwd: root, stdio: "inherit" });
    if (result.status !== 0) throw new Error("Environment startup failed; no further command executed");
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
