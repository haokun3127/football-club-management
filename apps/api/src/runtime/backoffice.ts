import type { RuntimeEnvironment } from "./environment.js";

export interface BackofficeConfig {
  environment: RuntimeEnvironment;
  origin: string;
  path: string;
  secure: boolean;
  cookieName: string;
}

/** An absent URL leaves the browser boundary disabled. Never infer it from Host. */
export function readBackofficeConfig(environment: RuntimeEnvironment, value?: string): BackofficeConfig | undefined {
  if (!value) return undefined;
  const url = new URL(value);
  const local = url.hostname === "127.0.0.1" || url.hostname === "localhost";
  const path = environment === "release" ? "/backoffice" : `/__env/${environment}/backoffice`;
  if (url.username || url.password || url.search || url.hash || url.pathname.replace(/\/$/, "") !== path
    || (url.protocol !== "https:" && !(environment === "develop" && local && url.protocol === "http:"))) {
    throw new Error("BACKOFFICE_PUBLIC_URL must be an exact environment-specific HTTPS backoffice URL (localhost HTTP only for develop)");
  }
  const secure = url.protocol === "https:";
  return { environment, origin: url.origin, path, secure, cookieName: `${secure ? "__Secure-" : ""}fcm_${environment}` };
}

export function isBackofficePath(url: string): boolean {
  const path = url.split("?", 1)[0]!;
  return path === "/backoffice" || path.startsWith("/backoffice/");
}
