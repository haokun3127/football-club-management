import { CLIENT_BUILD } from "./build-metadata";
import { RUNTIME_ENV, type RuntimeEnvironment } from "./config";
import { request } from "./request";

export interface BuildIdentity { sourceRevision: string; buildId: string; builtAt: string }
function readBuild(value: unknown): BuildIdentity | null {
  if (!value || typeof value !== "object") return null;
  const fields = value as Record<string, unknown>;
  if (typeof fields.sourceRevision !== "string" || !/^[0-9a-f]{40}$/.test(fields.sourceRevision)
    || typeof fields.buildId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(fields.buildId)
    || typeof fields.builtAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(fields.builtAt)
    || !Number.isFinite(Date.parse(fields.builtAt))) return null;
  return { sourceRevision: fields.sourceRevision, buildId: fields.buildId, builtAt: fields.builtAt };
}

/** Platform version and stamped source identity are separate facts. Neither is inferred from the API. */
export function getClientVersion(): { environment: RuntimeEnvironment | null; version: string | null; build: BuildIdentity | null } {
  let version: string | null = null;
  try {
    const value = wx.getAccountInfoSync?.().miniProgram?.version;
    if (typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(value)) version = value;
  } catch { /* Old/unsupported runtime stays unknown. */ }
  return { environment: RUNTIME_ENV, version, build: readBuild(CLIENT_BUILD) };
}

/** Explicit diagnostic read, not an additional request during every business-page load. */
export async function getServiceVersion(): Promise<{ environment: RuntimeEnvironment | null; build: BuildIdentity | null }> {
  const response = await request<{ status?: unknown; service?: unknown; environment?: unknown; build?: unknown }>({ path: "/health" });
  if (!response || response.status !== "ok" || response.service !== "@football-club/api") throw new Error("无法读取服务版本，请稍后重试");
  const environment = response.environment === "develop" || response.environment === "trial" || response.environment === "release" ? response.environment : null;
  if (environment && environment !== RUNTIME_ENV) throw new Error("服务环境与小程序环境不一致");
  return { environment, build: readBuild(response.build) };
}
