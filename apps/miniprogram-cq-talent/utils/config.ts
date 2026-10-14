export const APP_CLIENT_KEY = "cq-talent-wechat-main";
export type RuntimeEnvironment = "develop" | "trial" | "release";
function readRuntimeEnvironment(): RuntimeEnvironment | null {
  try {
    const value = wx.getAccountInfoSync?.().miniProgram?.envVersion;
    return value === "develop" || value === "trial" || value === "release" ? value : null;
  } catch {
    return null;
  }
}
export const RUNTIME_ENV = readRuntimeEnvironment();
const API_BASE_URLS: Record<RuntimeEnvironment, string> = {
  develop: "https://cqtc.pomi.tech/__env/develop",
  trial: "https://cqtc.pomi.tech/__env/trial",
  release: "https://cqtc.pomi.tech",
};
export const API_BASE_URL = RUNTIME_ENV ? API_BASE_URLS[RUNTIME_ENV] : "";
export function environmentStorageKey(key: string): string {
  return `cqTalent:${RUNTIME_ENV ?? "unconfigured"}:${key}`;
}
export const DEV_MODE = RUNTIME_ENV === "develop";
export const DEV_AUTO_SESSION = false;
export const DEV_IDENTITY_ROLE: "parent" | "coach" = "parent";
export const DEV_USER_IDS = {
  parent: "user-parent-cq-talent-acceptance",
  coach: "user-coach-1",
};
export const DEV_DISPLAY_NAMES = {
  parent: "王子轩家长",
  coach: "陈教练",
} as const;
export const DEV_COACH_PROFILE_IDS = {
  "user-coach-1": "coach-1",
};
export const DEV_TEST_DATE = "2026-06-28";
const DEVELOP_PARENT_PAGE_DATE_OVERRIDE: string | null = null;
export const DEV_PARENT_PAGE_DATE_OVERRIDE = DEV_MODE ? DEVELOP_PARENT_PAGE_DATE_OVERRIDE : null;
export const THEME = {
  primary: "#A80F1B",
  pressed: "#7F0B14",
  light: "#FCEEEF",
};

export const STORAGE_KEYS = {
  context: environmentStorageKey("cqTalentAppContext"),
  session: environmentStorageKey("cqTalentSession"),
  devRole: environmentStorageKey("cqTalentDevRole"),
  assessmentDraftPrefix: environmentStorageKey("cqTalentAssessmentDraft"),
};

export function assertRuntimeApiConfigured() {
  if (!RUNTIME_ENV) throw new Error("无法识别当前小程序运行环境，请重新打开小程序");
  if (!API_BASE_URL) throw new Error(`${RUNTIME_ENV} 环境尚未配置服务地址`);
  if (RUNTIME_ENV !== "develop" && !API_BASE_URL.startsWith("https://")) throw new Error("体验版和正式版必须使用 HTTPS 服务地址");
  return API_BASE_URL;
}
