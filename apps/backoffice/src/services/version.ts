export interface BuildIdentity { sourceRevision: string; buildId: string; builtAt: string }
export interface ServiceVersion { environment: "develop" | "trial" | "release" | null; build: BuildIdentity | null }
export function publicBuild(value: unknown): BuildIdentity | null {
  if (!value || typeof value !== "object") return null;
  const fields = value as Record<string, unknown>;
  if (typeof fields.sourceRevision !== "string" || !/^[0-9a-f]{40}$/.test(fields.sourceRevision)
    || typeof fields.buildId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(fields.buildId)
    || typeof fields.builtAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(fields.builtAt)
    || !Number.isFinite(Date.parse(fields.builtAt))) return null;
  return { sourceRevision: fields.sourceRevision, buildId: fields.buildId, builtAt: fields.builtAt };
}
export async function getServiceVersion(signal?: AbortSignal): Promise<ServiceVersion> {
  const config = window.__FCM_CONFIG__;
  if (!/^\/(?:__env\/(?:develop|trial)\/)?backoffice$/.test(config.path)) throw new Error("Version path is not configured");
  const response = await fetch(config.path.replace(/\/backoffice$/, "/health"), { credentials: "omit", cache: "no-store", redirect: "error", signal });
  if (!response.ok) throw new Error("Version read failed");
  const data: unknown = await response.json();
  if (!data || typeof data !== "object") throw new Error("Invalid version response");
  const fields = data as Record<string, unknown>;
  if (fields.status !== "ok" || fields.service !== "@football-club/api") throw new Error("Invalid version service");
  const environment = fields.environment === "develop" || fields.environment === "trial" || fields.environment === "release" ? fields.environment : null;
  if (environment && environment !== config.environment) throw new Error("Version environment differs");
  return { environment, build: publicBuild(fields.build) };
}
