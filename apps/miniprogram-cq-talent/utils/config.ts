export const APP_CLIENT_KEY = "cq-talent-wechat-main";
export type RuntimeEnvironment = "develop" | "trial" | "release";
export const RUNTIME_ENV: RuntimeEnvironment = wx.getAccountInfoSync?.().miniProgram?.envVersion ?? "develop";
const API_BASE_URLS: Record<RuntimeEnvironment, string> = {
  develop: "http://localhost:3000",
  trial: "",
  release: "",
};
export const API_BASE_URL = API_BASE_URLS[RUNTIME_ENV];
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
export const THEME = {
  primary: "#A80F1B",
  pressed: "#7F0B14",
  light: "#FCEEEF",
};

export const STORAGE_KEYS = {
  context: "cqTalentAppContext",
  session: "cqTalentSession",
  devRole: "cqTalentDevRole",
  assessmentDraftPrefix: "cqTalentAssessmentDraft",
};

export function assertRuntimeApiConfigured() {
  if (!API_BASE_URL) throw new Error(`${RUNTIME_ENV} 环境尚未配置服务地址`);
  if (RUNTIME_ENV !== "develop" && !API_BASE_URL.startsWith("https://")) throw new Error("体验版和正式版必须使用 HTTPS 服务地址");
  return API_BASE_URL;
}
