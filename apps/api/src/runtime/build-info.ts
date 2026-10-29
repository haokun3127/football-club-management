import { readFileSync } from "node:fs";

/** Public, non-secret identity baked into the image; never spread runtime env/config. */
export interface BuildInfo {
  sourceRevision: string;
  buildId: string;
  builtAt: string;
}

export function normalizeBuildInfo(value: unknown): BuildInfo | null {
  if (!value || typeof value !== "object") return null;
  const fields = value as Record<string, unknown>;
  if (typeof fields.sourceRevision !== "string" || !/^[0-9a-f]{40}$/.test(fields.sourceRevision)
    || typeof fields.buildId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(fields.buildId)
    || typeof fields.builtAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(fields.builtAt)
    || !Number.isFinite(Date.parse(fields.builtAt))) return null;
  return { sourceRevision: fields.sourceRevision, buildId: fields.buildId, builtAt: fields.builtAt };
}

export function readBuildInfo(file: URL = new URL("../../build-metadata.json", import.meta.url)): BuildInfo | null {
  try { return normalizeBuildInfo(JSON.parse(readFileSync(file, "utf8"))); }
  catch { return null; } // Local and older packages explicitly report unknown, never invent a version.
}
