type WechatCallback<T = unknown> = (result: T) => void;

interface WechatRequestOptions<TData = unknown> {
  url: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  data?: TData;
  header?: Record<string, string>;
  success?: WechatCallback<{ statusCode: number; data: unknown; header?: Record<string, string> }>;
  fail?: WechatCallback<{ errMsg: string }>;
  complete?: WechatCallback;
}

interface WechatAppOptions {
  onLaunch?: () => void;
  globalData?: Record<string, unknown>;
}

interface WechatPageOptions<TData extends Record<string, unknown> = Record<string, unknown>> {
  data?: TData;
  onLoad?: (query?: Record<string, string | undefined>) => void;
  onShow?: () => void;
  onReady?: () => void;
  onUnload?: () => void;
  [key: string]: unknown;
}

interface WechatComponentOptions {
  properties?: Record<string, unknown>;
  data?: Record<string, unknown>;
  lifetimes?: Record<string, () => void>;
  observers?: Record<string, (value: unknown) => void>;
  methods?: Record<string, (...args: unknown[]) => unknown>;
  [key: string]: unknown;
}

declare const wx: {
  request: <TData = unknown>(options: WechatRequestOptions<TData>) => void;
  login: (options: { success?: WechatCallback<{ code: string }>; fail?: WechatCallback<{ errMsg: string }> }) => void;
  getSystemInfoSync: () => { platform?: string; windowWidth: number; pixelRatio?: number };
  getAccountInfoSync?: () => { miniProgram?: { appId?: string } };
  getStorageSync: <T = unknown>(key: string) => T;
  setStorageSync: (key: string, value: unknown) => void;
  removeStorageSync: (key: string) => void;
  switchTab: (options: { url: string }) => void;
  navigateTo: (options: { url: string }) => void;
  showToast: (options: { title: string; icon?: "success" | "error" | "loading" | "none"; duration?: number }) => void;
  showModal: (options: { title: string; content: string; showCancel?: boolean; success?: WechatCallback<{ confirm: boolean }> }) => void;
};

declare function App(options: WechatAppOptions): void;
declare function Page<TData extends Record<string, unknown>>(options: WechatPageOptions<TData>): void;
declare function Component(options: WechatComponentOptions): void;
declare function getApp<T extends { globalData?: Record<string, unknown> } = { globalData?: Record<string, unknown> }>(): T;
