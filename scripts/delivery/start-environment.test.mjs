import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { root, startPlan, assertImageReference } from "./start-environment.mjs";

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
    const after = render(file, { ...env, FCM_DEVELOP_IMAGE: `sha256:${"d".repeat(64)}` });
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
    // Some Compose v2 releases check env_file existence even with
    // --no-env-resolution. Render an unchanged copy with owned synthetic input,
    // never reading or creating the checkout's private release env file.
    const releaseFile = join(directory, "docker-compose.yml");
    const releaseEnvFile = join(directory, ".env.runtime");
    copyFileSync(join(root, "docker-compose.yml"), releaseFile);
    writeFileSync(releaseEnvFile, "PRIVATE_TEST_SECRET=must-not-be-printed\n");
    const release = render(releaseFile);
    const releasePlan = startPlan("release", release);
    assert.equal(releasePlan.imageReference, digest("c"));
    assert.equal(release.services.api.environment.PRIVATE_TEST_SECRET, "must-not-be-printed");
    assert.ok(!JSON.stringify(releasePlan).includes("must-not-be-printed"));
    rmSync(releaseEnvFile);
    const missingEnv = spawnSync("docker", ["compose", "-f", releaseFile, "config", "--format", "json"], { cwd: root, env, encoding: "utf8" });
    assert.notEqual(missingEnv.status, 0, "Release topology must reject a missing required runtime env file");
    const contaminated = structuredClone(after);
    contaminated.services["develop-data-init"].volumes.push(after.services["trial-data-init"].volumes[0]);
    assert.throws(() => startPlan("develop", contaminated), /dedicated data volume/);
    const mutable = structuredClone(after);
    mutable.services.develop.image = "cq:latest";
    assert.throws(() => startPlan("develop", mutable), /immutable/);
    const dependency = structuredClone(after);
    dependency.services.develop.depends_on.trial = { condition: "service_started" };
    assert.throws(() => startPlan("develop", dependency), /Cross-environment/);
    const wrongVolume = structuredClone(after);
    wrongVolume.volumes["develop-data"].name = "cq-talent-api-data";
    assert.throws(() => startPlan("develop", wrongVolume), /Dedicated volume name/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("mutable and malformed image references are refused", () => {
  for (const image of [undefined, "cq:latest", "cq:reviewed-commit", "cq@sha256:abc", `cq@sha256:${"x".repeat(64)}`]) assert.throws(() => assertImageReference(image));
  assert.equal(assertImageReference(digest("a")), digest("a"));
  assert.equal(assertImageReference(`sha256:${"b".repeat(64)}`), `sha256:${"b".repeat(64)}`);
});
