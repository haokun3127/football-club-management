import { readBackofficeConfig, type BackofficeConfig } from "./backoffice.js";
export type RuntimeEnvironment = "develop" | "trial" | "release";

export interface RuntimeConfig {
  environment: RuntimeEnvironment;
  databasePath: string;
  wechatAppId: string;
  backoffice?: BackofficeConfig;
}

export function readRuntimeConfig(environment: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const value = environment.FCM_RUNTIME_ENV;
  if (value !== "develop" && value !== "trial" && value !== "release") {
    throw new Error("FCM_RUNTIME_ENV must explicitly be develop, trial or release");
  }
  if (value === "develop" && (environment.NODE_ENV === "development" || environment.NODE_ENV === "test")
    && environment.HOST && environment.HOST !== "127.0.0.1") {
    throw new Error("Debug identity requires a localhost listener");
  }
  if (!environment.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const wechatAppId = environment.WECHAT_MINIPROGRAM_APP_ID;
  if (!wechatAppId || !/^wx[0-9a-f]{16}$/.test(wechatAppId)) {
    throw new Error("WECHAT_MINIPROGRAM_APP_ID must be configured explicitly");
  }
  if (value !== "develop" && environment.NODE_ENV !== "production") {
    throw new Error("trial/release require NODE_ENV=production to disable debug identity");
  }
  return { environment: value, databasePath: environment.DATABASE_URL, wechatAppId, backoffice: readBackofficeConfig(value, environment.BACKOFFICE_PUBLIC_URL) };
}
