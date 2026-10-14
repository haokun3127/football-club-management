import { expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createPlatformPersistence } from "../src/persistence/platform-persistence.js";

it("provisions only an existing nonproduction admin, refuses silent replacement and production writes", async () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "backoffice-provision-")));
  const databasePath = join(root, "cq-talent-develop", "api.sqlite");
  const p = await createPlatformPersistence({ runtimeConfig: { environment: "develop", databasePath, wechatAppId: "wx4c588cd106e520e0" }, seed: true });
  const input = { clubId: "club-chongqing-talent", userId: "user-admin-1", username: "reviewer", password: "synthetic-provision-password" };
  const environment = { ...process.env, NODE_ENV: "production", FCM_RUNTIME_ENV: "develop", DATABASE_URL: databasePath, WECHAT_MINIPROGRAM_APP_ID: "wx4c588cd106e520e0", BACKOFFICE_PUBLIC_URL: "https://club.example/__env/develop/backoffice", FCM_IDENTITY_BACKUP_ATTESTED: "1" };
  const run = (extra = {}, options: { rotate?: boolean; env?: NodeJS.ProcessEnv } = {}) => {
    try {
      const stdout = execFileSync(process.execPath, ["--import", "tsx", fileURLToPath(new URL("../src/ops/provision-backoffice-command.ts", import.meta.url)), "--apply", ...(options.rotate ? ["--rotate"] : [])], { env: { ...environment, ...options.env }, input: JSON.stringify({ ...input, ...extra }), encoding: "utf8", timeout: 10000, stdio: ["pipe", "pipe", "pipe"] });
      return { status: 0, stdout, stderr: "" };
    } catch (error) { const result = error as { status: number; stdout: string; stderr: string }; return { status: result.status, stdout: result.stdout, stderr: result.stderr }; }
  };
  try {
    const before = readFileSync(databasePath);
    const forbidden = run({}, { env: { FCM_RUNTIME_ENV: "release", BACKOFFICE_PUBLIC_URL: "https://club.example/backoffice" } });
    expect(forbidden.status).not.toBe(0); expect(readFileSync(databasePath)).toEqual(before);
    expect(run({}, { env: { FCM_IDENTITY_BACKUP_ATTESTED: "0" } }).status).not.toBe(0);
    expect(run({ userId: "user-coach-1" }).status).not.toBe(0);
    expect(p.repositories.backofficeAuth.credential(input.clubId, input.username)).toBeNull();
    const configured = run(); expect(configured.status).toBe(0); expect(configured.stdout).toContain('"status":"configured"'); expect(configured.stdout).not.toContain(input.password);
    const first = p.repositories.backofficeAuth.credential(input.clubId, input.username)!;
    const repeat = run(); expect(repeat.status).not.toBe(0); expect(repeat.stderr).not.toContain(input.password);
    expect(p.repositories.backofficeAuth.credential(input.clubId, input.username)).toEqual(first);
    const rotated = run({ password: "replacement-provision-password" }, { rotate: true }); expect(rotated.status).toBe(0);
    expect(p.repositories.backofficeAuth.credential(input.clubId, input.username)?.passwordHash).not.toBe(first.passwordHash);
  } finally { p.database.close(); rmSync(root, { recursive: true, force: true }); }
}, 15000);
