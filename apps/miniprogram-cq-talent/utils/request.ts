import { assertRuntimeApiConfigured, DEV_MODE, DEV_USER_IDS, RUNTIME_ENV } from "./config";
import { createIdempotencyKey, createRequestId } from "./idempotency";
import { clearSession, getAppContext, getSession } from "./store";
import type { SessionState } from "./types";

export type ApiErrorType =
  | "network"
  | "timeout"
  | "unauthorized"
  | "forbidden"
  | "conflict"
  | "server_error"
  | "http_error"
  | "unexpected_status"
  | "runtime_not_configured";

export interface ApiError {
  code: string;
  message: string;
  details?: unknown[];
  statusCode?: number;
  /** Stable machine-readable category pages can branch on. */
  errorType?: ApiErrorType;
  /** Unified user-facing copy for the error category. */
  userMessage?: string;
}

const USER_MESSAGES: Record<ApiErrorType, string> = {
  network: "网络连接不可用，请检查网络后重试",
  timeout: "请求超时，请检查网络后重试",
  unauthorized: "登录已过期，请重新登录",
  forbidden: "没有权限执行此操作",
  conflict: "操作冲突，请刷新后重试",
  server_error: "服务暂时不可用，请稍后重试",
  http_error: "请求失败，请重试",
  unexpected_status: "服务返回了意外的响应，请重试",
  runtime_not_configured: "当前环境尚未配置服务地址，请重新打开小程序",
};

function httpErrorType(statusCode: number): ApiErrorType {
  if (statusCode === 401) return "unauthorized";
  if (statusCode === 403) return "forbidden";
  if (statusCode === 409) return "conflict";
  if (statusCode >= 500) return "server_error";
  return "http_error";
}

export interface RequestOptions<TBody = unknown> {
  path: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  data?: TBody;
  idempotent?: boolean;
  idempotencyKey?: string;
  expectedStatus?: number;
  headers?: Record<string, string>;
  bearerToken?: string;
  timeout?: number;
}

// WeChat's default wx.request timeout is 60s; the mini-program opts into
// shorter budgets so weak networks fail fast instead of leaving pages stuck.
const READ_TIMEOUT_MS = 10_000;
const WRITE_TIMEOUT_MS = 15_000;

function defaultTimeoutFor(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | undefined): number {
  return method && method !== "GET" ? WRITE_TIMEOUT_MS : READ_TIMEOUT_MS;
}

export function request<TResponse = unknown, TBody = unknown>(options: RequestOptions<TBody>): Promise<TResponse> {
  const context = getAppContext();
  // Snapshot the session that authorizes this request so a late 401 can be
  // checked against the session that is actually current when it arrives.
  const sessionAtRequest = getSession();
  const bearerToken = options.bearerToken ?? sessionAtRequest?.token;
  if (lastAuthFailureHandledFor !== null && lastAuthFailureHandledFor !== bearerToken) {
    lastAuthFailureHandledFor = null;
  }
  const requestId = createRequestId();
  const headers: Record<string, string> = {
    "X-Request-Id": requestId,
    ...options.headers,
  };

  // Caller headers cannot override or duplicate the runtime routing declaration.
  for (const name of Object.keys(headers)) {
    if (name.toLowerCase() === "x-miniprogram-env") delete headers[name];
  }
  if (RUNTIME_ENV) headers["X-MiniProgram-Env"] = RUNTIME_ENV;

  if (context) {
    headers["X-Club-Id"] = context.clubId;
    headers["X-Client-Id"] = context.clientId;
  }

  if (bearerToken && !bearerToken.startsWith("dev-")) {
    headers.Authorization = `Bearer ${bearerToken}`;
  }

  if (DEV_MODE && sessionAtRequest?.role) {
    headers["X-User-Id"] = sessionAtRequest.userId || DEV_USER_IDS[sessionAtRequest.role];
  }

  if (options.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey;
  } else if (options.idempotent && options.method && options.method !== "GET") {
    headers["Idempotency-Key"] = createIdempotencyKey(options.method.toLowerCase());
  }

  return new Promise((resolve, reject) => {
    let baseUrl: string;
    try {
      baseUrl = assertRuntimeApiConfigured();
    } catch (error) {
      reject({
        code: "runtime_not_configured",
        message: error instanceof Error ? error.message : "当前环境尚未配置服务地址",
        errorType: "runtime_not_configured",
        userMessage: USER_MESSAGES.runtime_not_configured,
      });
      return;
    }
    wx.request({
      url: `${baseUrl}${options.path}`,
      method: options.method ?? "GET",
      data: options.data,
      header: headers,
      timeout: options.timeout ?? defaultTimeoutFor(options.method),
      success: (response) => {
        const isExpectedStatus = options.expectedStatus === undefined
          ? response.statusCode >= 200 && response.statusCode < 300
          : response.statusCode === options.expectedStatus;
        if (isExpectedStatus) {
          resolve(response.data as TResponse);
          return;
        }
        if (options.expectedStatus !== undefined && response.statusCode >= 200 && response.statusCode < 300) {
          reject({
            code: "unexpected_status",
            message: "Unexpected response status",
            statusCode: response.statusCode,
          });
          return;
        }
        if (response.statusCode === 401) {
          handleAuthFailure(sessionAtRequest, bearerToken, options.bearerToken !== undefined);
        }
        const payload = response.data as { error?: ApiError };
        const errorType = httpErrorType(response.statusCode);
        reject({
          ...(payload.error ?? { code: "http_error", message: `HTTP ${response.statusCode}` }),
          statusCode: response.statusCode,
          errorType,
          userMessage: USER_MESSAGES[errorType],
        });
      },
      fail: (error) => {
        // WeChat reports timeouts as "request:fail timeout"; they need distinct
        // user-facing copy from generic network failures.
        const isTimeout = /timeout/i.test(error.errMsg ?? "");
        const errorType: ApiErrorType = isTimeout ? "timeout" : "network";
        reject({
          code: isTimeout ? "timeout" : "network_error",
          message: error.errMsg,
          errorType,
          userMessage: USER_MESSAGES[errorType],
        });
      },
    });
  });
}

// Remembers which token already triggered the login redirect so a burst of
// concurrent 401 responses without any surrounding session converges to a
// single navigation. Genuine failures of a live session reset it implicitly:
// after the first 401 clears the session, later ones are classified as stale.
let lastAuthFailureHandledFor: string | null = null;

function handleAuthFailure(sessionAtRequest: SessionState | null, tokenSent: string | undefined, usedExplicitBearer: boolean): void {
  const currentSession = getSession();

  // A 401 is stale when the session that issued the request has already been
  // replaced (or removed) by a newer session: it must not clear the new one.
  // Requests sent with the session token compare against the current token;
  // requests with an explicit bearer (e.g. the temporary role-selection token)
  // are genuine auth failures as long as the surrounding session has not
  // changed since the request was issued.
  const isStaleAuthFailure = usedExplicitBearer
    ? !isSameSession(currentSession, sessionAtRequest)
    : !(currentSession && tokenSent !== undefined && currentSession.token === tokenSent);
  if (isStaleAuthFailure) return;

  if (
    !currentSession
    && !sessionAtRequest
    && tokenSent !== undefined
    && lastAuthFailureHandledFor === tokenSent
  ) return;
  if (tokenSent !== undefined) lastAuthFailureHandledFor = tokenSent;

  clearSession();
  wx.reLaunch({ url: "/pages/login/index" });
}

function isSameSession(left: SessionState | null, right: SessionState | null): boolean {
  if (left === right) return true;
  if (!left || !right) return false;
  return left.token === right.token && left.userId === right.userId;
}
