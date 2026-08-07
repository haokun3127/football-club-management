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

interface WechatPageOptions<TData extends Record<string, any> = Record<string, any>> {
  data?: TData;
  onLoad?: (query?: Record<string, string | undefined>) => void;
  onShow?: () => void;
  onReady?: () => void;
  onUnload?: () => void;
  setData?: (data: Partial<TData> | Record<string, unknown>) => void;
  [key: string]: any;
}

interface WechatComponentOptions {
  properties?: Record<string, unknown>;
  data?: Record<string, any>;
  lifetimes?: Record<string, any>;
  observers?: Record<string, any>;
  methods?: Record<string, any>;
  [key: string]: any;
}

declare const wx: {
  request: <TData = unknown>(options: WechatRequestOptions<TData>) => void;
  login: (options: { success?: WechatCallback<{ code: string }>; fail?: WechatCallback<{ errMsg: string }> }) => void;
  getSystemInfoSync: () => { platform?: string; windowWidth: number; pixelRatio?: number; statusBarHeight?: number };
  getWindowInfo?: () => { windowWidth: number; screenWidth?: number; statusBarHeight?: number; pixelRatio?: number };
  getMenuButtonBoundingClientRect?: () => { top: number; bottom: number; left: number; right: number; width: number; height: number };
  getAccountInfoSync?: () => { miniProgram?: { appId?: string; envVersion?: "develop" | "trial" | "release" } };
  getStorageSync: <T = unknown>(key: string) => T;
  setStorageSync: (key: string, value: unknown) => void;
  removeStorageSync: (key: string) => void;
  switchTab: (options: { url: string }) => void;
  navigateTo: (options: { url: string; success?: WechatCallback<unknown>; fail?: WechatCallback<{ errMsg: string }> }) => void;
  redirectTo: (options: { url: string }) => void;
  navigateBack: (options?: { delta?: number }) => void;
  reLaunch: (options: { url: string; success?: WechatCallback<unknown>; fail?: WechatCallback<{ errMsg: string }> }) => void;
  showToast: (options: { title: string; icon?: "success" | "error" | "loading" | "none"; duration?: number }) => void;
  showModal: (options: { title: string; content: string; showCancel?: boolean; success?: WechatCallback<{ confirm: boolean }> }) => void;
  showActionSheet: (options: { itemList: string[]; success?: WechatCallback<{ tapIndex: number }> }) => void;
};

declare function App(options: WechatAppOptions): void;
declare function Page<TData extends Record<string, any> = Record<string, any>>(options: any): void;
declare function Component(options: any): void;
declare function getApp<T extends { globalData?: Record<string, unknown> } = { globalData?: Record<string, unknown> }>(): T;
declare function getCurrentPages(): unknown[];
declare const console: {
  log: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};
