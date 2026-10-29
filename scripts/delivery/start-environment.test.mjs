import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { root, startPlan, assertDigest } from "./start-environment.mjs";

const digest = char => `example.test/cq@sha256:${char.repeat(64)}`;
test("Compose keeps develop, trial and release images and init volumes independent", () => {
  const directory = mkdtempSync(join(tmpdir(), "fcm-compose-"));
  const envFile = join(directory, "runtime.env");
  writeFileSync(envFile, "WECHAT_MINIPROGRAM_APP_ID=wx0000000000000000\nPRIVATE_TEST_SECRET=must-not-be-printed\n");
  const env = { ...process.env, FCM_DEVELOP_IMAGE: digest("a"), FCM_TRIAL_IMAGE: digest("b"), FCM_RELEASE_IMAGE: digest("c"), FCM_DEVELOP_ENV_FILE: envFile, FCM_TRIAL_ENV_FILE: envFile };
  try {
    const render = (file, environment = env) => {
      const result = spawnSync("docker", ["compose", "-f", file, "config", "--format", "json"], { cwd: root, env: environment, encoding: "utf8" });
      assert.equal(result.status, 0, "Docker Compose must render successfully (runtime env values are private)");
      return JSON.parse(result.stdout);
    };
    const file = "deploy/environment-isolation/compose.nonproduction.yml";
    const before = render(file);
    const after = render(file, { ...env, FCM_DEVELOP_IMAGE: digest("d") });
    assert.deepEqual(before.services.trial, after.services.trial);
    assert.deepEqual(before.services["trial-data-init"], after.services["trial-data-init"]);
    for (const environment of ["develop", "trial"]) {
      const plan = startPlan(environment, after);
      assert.equal(plan.commands.length, 2);
      assert.equal(plan.commands[0].at(-1), `${environment}-data-init`);
      assert.equal(plan.commands[1].at(-1), environment);
      assert.ok(plan.commands.every(args => args.includes("--no-deps")));
      assert.ok(plan.commands[1].includes("--no-build"));
      assert.ok(!JSON.stringify(plan).includes("must-not-be-printed"));
    }
    // Root release uses its existing private env-file path; config --no-env-resolution
    // renders the topology without reading or creating a production config file.
    const release = spawnSync("docker", ["compose", "-f", "docker-compose.yml", "config", "--no-env-resolution", "--format", "json"], { cwd: root, env, encoding: "utf8" });
    assert.equal(release.status, 0, "Release topology must render without a private env file");
    assert.equal(startPlan("release", JSON.parse(release.stdout)).image, digest("c"));
    const contaminated = structuredClone(after);
    contaminated.services["develop-data-init"].volumes.push(after.services["trial-data-init"].volumes[0]);
    assert.throws(() => startPlan("develop", contaminated), /dedicated data volume/);
    const mutable = structuredClone(after);
    mutable.services.develop.image = "cq:latest";
    assert.throws(() => startPlan("develop", mutable), /immutable/);
    const dependency = structuredClone(after);
    dependency.services.develop.depends_on.trial = { condition: "service_started" };
    assert.throws(() => startPlan("develop", dependency), /Cross-environment/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("mutable and malformed image references are refused", () => {
  for (const image of [undefined, "cq:latest", "cq:reviewed-commit", "cq@sha256:abc", `cq@sha256:${"x".repeat(64)}`]) assert.throws(() => assertDigest(image));
  assert.equal(assertDigest(digest("a")), digest("a"));
});
