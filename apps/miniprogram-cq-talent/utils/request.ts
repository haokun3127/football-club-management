import { assertRuntimeApiConfigured, DEV_MODE, DEV_USER_IDS } from "./config";
import { createIdempotencyKey, createRequestId } from "./idempotency";
import { clearSession, getAppContext, getSession } from "./store";

export interface ApiError {
  code: string;
  message: string;
  details?: unknown[];
  statusCode?: number;
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
}

export function request<TResponse = unknown, TBody = unknown>(options: RequestOptions<TBody>): Promise<TResponse> {
  const context = getAppContext();
  const session = getSession();
  const requestId = createRequestId();
  const headers: Record<string, string> = {
    "X-Request-Id": requestId,
    ...options.headers,
  };

  if (context) {
    headers["X-Club-Id"] = context.clubId;
    headers["X-Client-Id"] = context.clientId;
  }

  const bearerToken = options.bearerToken ?? session?.token;
  if (bearerToken && !bearerToken.startsWith("dev-")) {
    headers.Authorization = `Bearer ${bearerToken}`;
  }

  if (DEV_MODE && session?.role) {
    headers["X-User-Id"] = session.userId || DEV_USER_IDS[session.role];
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
      reject({ code: "runtime_not_configured", message: error instanceof Error ? error.message : "当前环境尚未配置服务地址" });
      return;
    }
    wx.request({
      url: `${baseUrl}${options.path}`,
      method: options.method ?? "GET",
      data: options.data,
      header: headers,
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
          clearSession();
          wx.reLaunch({ url: "/pages/login/index" });
        }
        const payload = response.data as { error?: ApiError };
        reject(payload.error ?? { code: "http_error", message: `HTTP ${response.statusCode}` });
      },
      fail: (error) => {
        reject({ code: "network_error", message: error.errMsg });
      },
    });
  });
}
