/**
 * 微信小程序隐私授权链路（官方《小程序隐私协议开发指南》接入）。
 *
 * 规则来源（仓库官方留档，2026-10-14 抓取）：
 * docs/reference/wechat-miniprogram/pages/privacy-authorize.md
 * - 2023-10-17 之后隐私相关功能默认全量生效，无需也不应再配置 `__usePrivacyCheck__`。
 * - 用户同意《小程序用户隐私保护指引》前，隐私接口（getPhoneNumber / setClipboardData 等）
 *   不得被实际调用；调用会触发 onNeedPrivacyAuthorization 或被平台报错拦截。
 * - 官方同意协议：用户点击 `<button open-type="agreePrivacyAuthorization">`，在其
 *   bindagreeprivacyauthorization 回调中调用 resolve({ buttonId, event: "agree" })；
 *   拒绝则调用 resolve({ event: "disagree" })，原隐私接口会收到
 *   `API:fail privacy permission is not authorized`。
 * - 开发者未响应 onNeedPrivacyAuthorization 时，微信会主动弹出官方默认弹窗兜底。
 *
 * 平台侧人工待办（代码无法替代）：需在「小程序管理后台-设置-服务内容声明-用户隐私保护指引」
 * 声明「收集你的手机号」（button open-type="getPhoneNumber"）与「读取你的剪切板」
 * （wx.setClipboardData）并通过平台审核，否则对应接口直接禁用（errno 112 等）。
 */

export type PrivacyAuthorizationEvent = "agree" | "disagree" | "exposureAuthorization";

export interface PrivacyAuthorizationResolution {
  event: PrivacyAuthorizationEvent;
  /** 仅 event === "agree" 时必填：同意按钮（open-type="agreePrivacyAuthorization"）的 id。 */
  buttonId?: string;
}

export type PrivacyAuthorizationResolve = (resolution: PrivacyAuthorizationResolution) => void;

export interface PrivacyAuthorizationRequest {
  resolve: PrivacyAuthorizationResolve;
  /** 触发本次授权的接口或组件名（例如 "button.getPhoneNumber"、"wx.setClipboardData"）。 */
  referrer: string;
}

type PrivacyAuthorizationListener = (request: PrivacyAuthorizationRequest | null) => void;

/** 本地收窄的隐私 API 视图：兼容手写 types/wechat.d.ts 与官方 miniprogram-api-typings 两种声明状态。 */
interface WechatPrivacyApis {
  getPrivacySetting?: (options: {
    success?: (result: { needAuthorization: boolean; privacyContractName: string }) => void;
    fail?: (error: { errMsg: string }) => void;
    complete?: () => void;
  }) => void;
  onNeedPrivacyAuthorization?: (listener: (resolve: PrivacyAuthorizationResolve, eventInfo: { referrer?: string }) => void) => void;
  requirePrivacyAuthorize?: (options: {
    success?: (result: { errMsg: string }) => void;
    fail?: (error: { errMsg: string }) => void;
    complete?: () => void;
  }) => void;
  openPrivacyContract?: (options: {
    success?: (result: { errMsg: string }) => void;
    fail?: (error: { errMsg: string }) => void;
    complete?: () => void;
  }) => void;
}

const DEFAULT_PRIVACY_CONTRACT_NAME = "《小程序用户隐私保护指引》";

let privacyHandlerRegistered = false;
let pendingRequest: PrivacyAuthorizationRequest | null = null;
let privacyContractName = DEFAULT_PRIVACY_CONTRACT_NAME;
const listeners = new Set<PrivacyAuthorizationListener>();

function privacyApis(): WechatPrivacyApis {
  if (typeof wx === "undefined") return {};
  return wx as unknown as WechatPrivacyApis;
}

function notifyListeners(request: PrivacyAuthorizationRequest | null): void {
  for (const listener of listeners) listener(request);
}

/**
 * 在 app.ts onLaunch 注册全局隐私授权处理（官方弹窗协议）。
 * 隐私接口在用户未同意时被调用会触发该回调；若当时没有任何弹窗订阅者
 * （当前页面未挂载 privacy-authorize 组件），则不做处理，交由微信
 * 官方默认隐私弹窗兜底（官方文档「六、官方隐私弹窗功能说明」）。
 */
export function registerGlobalPrivacyHandler(): void {
  const apis = privacyApis();
  if (privacyHandlerRegistered || typeof apis.onNeedPrivacyAuthorization !== "function") return;
  privacyHandlerRegistered = true;
  apis.onNeedPrivacyAuthorization((resolve, eventInfo) => {
    if (listeners.size === 0) return;
    // 先把弹窗曝光告知平台（官方协议可选项），再分发给页面上的授权弹窗组件。
    resolve({ event: "exposureAuthorization" });
    const request: PrivacyAuthorizationRequest = {
      resolve,
      referrer: eventInfo?.referrer ?? "",
    };
    pendingRequest = request;
    notifyListeners(request);
  });
}

/** 页面授权弹窗组件订阅待处理请求；请求到达或结束时回调，返回取消订阅函数。 */
export function subscribePrivacyAuthorization(listener: PrivacyAuthorizationListener): () => void {
  listeners.add(listener);
  listener(pendingRequest);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && pendingRequest) {
      // 最后一个订阅者（弹窗）离开时页面已不可见，按用户未同意结算，避免原隐私接口悬挂。
      settlePrivacyAuthorization({ event: "disagree" });
    }
  };
}

/**
 * 结算当前待处理的隐私授权请求（由授权弹窗组件调用）。
 * 返回是否存在待处理请求。
 */
export function settlePrivacyAuthorization(resolution: PrivacyAuthorizationResolution): boolean {
  const request = pendingRequest;
  if (!request) return false;
  pendingRequest = null;
  notifyListeners(null);
  request.resolve(resolution);
  return true;
}

/** 打开后台配置的《小程序用户隐私保护指引》页面。 */
export function openPrivacyContract(): void {
  const apis = privacyApis();
  if (typeof apis.openPrivacyContract !== "function") return;
  apis.openPrivacyContract({ fail: () => undefined });
}

/** 最近一次 wx.getPrivacySetting 返回的协议名称（用于弹窗文案）。 */
export function getPrivacyContractName(): string {
  return privacyContractName;
}

/**
 * 隐私接口调用前置门禁：
 * 1. wx.getPrivacySetting 查询是否已同意（needAuthorization === false 直接放行，不重复打扰）；
 * 2. 未同意则 wx.requirePrivacyAuthorize 主动触发授权流程——经由 app.ts 注册的
 *    onNeedPrivacyAuthorization 全局处理弹出授权弹窗（或官方默认弹窗兜底）；
 * 3. 用户同意后放行（resolve true），拒绝则拦截（resolve false）。
 */
export function ensurePrivacyAuthorized(): Promise<boolean> {
  return new Promise((resolveOutcome) => {
    const apis = privacyApis();
    if (typeof apis.getPrivacySetting !== "function") {
      // 低于 2.32.3 的基础库未集成隐私功能也不会拦截隐私接口，直接放行。
      resolveOutcome(true);
      return;
    }
    apis.getPrivacySetting({
      success: (result) => {
        privacyContractName = result.privacyContractName || DEFAULT_PRIVACY_CONTRACT_NAME;
        if (!result.needAuthorization) {
          resolveOutcome(true);
          return;
        }
        if (typeof apis.requirePrivacyAuthorize !== "function") {
          // 理论上与 getPrivacySetting 同时可用；缺失时交由隐私接口自身的平台拦截兜底。
          resolveOutcome(true);
          return;
        }
        apis.requirePrivacyAuthorize({
          success: () => resolveOutcome(true),
          fail: () => resolveOutcome(false),
        });
      },
      fail: () => {
        // 查询失败不硬阻断主流程；未同意场景仍会被平台在接口调用时拦截。
        resolveOutcome(true);
      },
    });
  });
}

/** 仅供单测重置模块级状态，业务代码不得调用。 */
export function resetPrivacyStateForTesting(): void {
  privacyHandlerRegistered = false;
  pendingRequest = null;
  privacyContractName = DEFAULT_PRIVACY_CONTRACT_NAME;
  listeners.clear();
}
