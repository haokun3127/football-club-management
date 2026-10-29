import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, lstatSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
export function buildIdentity(sourceRevision, buildId, builtAt = new Date().toISOString()) {
  if (!/^[0-9a-f]{40}$/.test(sourceRevision ?? "") || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(buildId ?? "")
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(builtAt) || !Number.isFinite(Date.parse(builtAt))) throw new Error("Invalid public build identity");
  return { sourceRevision, buildId, builtAt };
}

/** Stable, relative paths + bytes, rather than timestamps or filesystem order. */
export function inventory(directory) {
  const files = [];
  function visit(path = "") {
    for (const name of readdirSync(join(directory, path)).sort()) {
      const relative = path ? `${path}/${name}` : name;
      const file = join(directory, relative);
      const stat = lstatSync(file);
      if (stat.isSymbolicLink()) throw new Error("Artifact inventories cannot contain symbolic links");
      if (stat.isDirectory()) visit(relative);
      else if (stat.isFile()) files.push({ path: relative, sha256: sha256(readFileSync(file)) });
      else throw new Error("Unsupported artifact entry");
    }
  }
  visit();
  return { sha256: sha256(JSON.stringify(files)), files };
}

export function command(program, args, options = {}) {
  const result = spawnSync(program, args, { encoding: "utf8", ...options });
  if (result.status !== 0) throw new Error(`${program} ${args[0]} failed (exit ${result.status ?? "unavailable"})`);
  return (result.stdout ?? "").trim();
}

/** Only the named immutable commit enters the artifact; dirty working files are excluded. */
export function exportRevision(root, revision, paths, destination) {
  const sha = command("git", ["rev-parse", "--verify", "--end-of-options", `${revision}^{commit}`], { cwd: root });
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error("Git commit could not be resolved");
  const temporary = mkdtempSync(join(tmpdir(), "fcm-archive-"));
  try {
    const archive = join(temporary, "source.tar");
    command("git", ["archive", "--format=tar", `--output=${archive}`, sha, "--", ...paths], { cwd: root });
    command("tar", ["-xf", archive, "-C", destination]);
    return sha;
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}
