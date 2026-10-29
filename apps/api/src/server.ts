import { registerTrainingGameRoutes } from "./routes/training-game.routes.js";
import { createHash } from "node:crypto";
import { registerBackofficeManagementRoutes } from "./routes/backoffice-management.routes.js";
import { registerScoutPlayerRoutes } from "./routes/scout-player.routes.js";
import { BackofficeAuth } from "./auth/backoffice.js";
import { registerBackofficeRoutes } from "./routes/backoffice.routes.js";
import { registerBackofficeWebRoutes } from "./routes/backoffice-web.routes.js";
import { registerTemporaryRosterRoutes } from "./routes/temporary-roster.routes.js";
import { registerStudentEvaluationRoutes } from "./routes/student-evaluation.routes.js";
import { registerCoachAssignmentRoutes } from "./routes/coach-assignment.routes.js";
import { registerEnvironmentGuard } from "./http/environment-guard.js";
import type { RuntimeConfig } from "./runtime/environment.js";
import { normalizeBuildInfo, readBuildInfo, type BuildInfo } from "./runtime/build-info.js";
import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import helmet from "@fastify/helmet";
import { registerAssessmentWorkflowRoutes } from "./routes/assessment-workflow.routes.js";
import type { FastifyError } from "fastify";
import type { MembershipResolver } from "./auth/context.js";
import { SessionRegistry } from "./auth/session-registry.js";
import type { WechatIdentityConnector } from "./integrations/wechat-identity-connector.js";
import { apiError } from "./http/errors.js";
import { buildOpenApiDocument } from "./http/openapi.js";
import { registerHttpRequestContracts } from "./http/request-contracts.js";
import { InMemoryStore, PersistentApiStore, type ApiStore } from "./store.js";
import { registerAppClientRoutes } from "./routes/app-client.routes.js";
import { registerAssessmentRoutes } from "./routes/assessment.routes.js";
import { registerCalendarRoutes } from "./routes/calendar.routes.js";
import { createRouteContext } from "./routes/context.js";
import { registerDataCapabilityRoutes } from "./routes/data-capability.routes.js";
import { registerMatchRoutes } from "./routes/match.routes.js";
import { registerMetricsRoutes } from "./routes/metrics.routes.js";
import { registerPlatformRoutes } from "./routes/platform.routes.js";
import { registerTrainingRoutes } from "./routes/training.routes.js";
import { registerTrainingRecordRoutes } from "./routes/training-record.routes.js";

export interface RateLimitOptions {
  max: number;
  timeWindow: string;
  loginMax?: number;
}

// 全局默认阈值按「小程序多用户共享出口 IP + 生产 Nginx 未传 X-Forwarded-For（request.ip 恒为 127.0.0.1）」设计：
// key 按已验证会话哈希分桶（每个会话独立计数），匿名桶覆盖登录/健康检查等未鉴权流量，
// 阈值需容纳活动场景集中登录与共享 WiFi 出口的并发峰值。
const DEFAULT_RATE_LIMIT: RateLimitOptions = {
  max: 300,
  timeWindow: "1 minute",
  loginMax: 90,
};

export interface ServerOptions {
  buildInfo?: BuildInfo | null;
  runtimeConfig?: RuntimeConfig;
  logger?: boolean;
  membershipResolver?: MembershipResolver;
  wechatIdentityConnector?: WechatIdentityConnector;
  sessionRegistry?: SessionRegistry;
  /** false 显式关闭；传对象则用自定义阈值；缺省时仅在有 runtimeConfig 的运行时（生产/develop 容器）启用。 */
  rateLimit?: false | RateLimitOptions;
}

export function buildServer(store: ApiStore = new InMemoryStore(), options: ServerOptions = {}) {
  const app = Fastify({
    logger: options.logger === false ? false : { redact: ["req.headers.cookie", "req.headers.authorization"] },
    ajv: {
      customOptions: {
        removeAdditional: false,
      },
    },
  });
  if (options.runtimeConfig) registerEnvironmentGuard(app, options.runtimeConfig);

  // 默认安全响应头：CSP 关闭——backoffice 页面已由 backoffice-web 路由下发专属的 nonce CSP，
  // 全局 CSP 与之叠加会按交集收紧并破坏内联样式；JSON API 响应亦无 CSP 语义。
  void app.register(helmet, { contentSecurityPolicy: false });

  const sessionRegistry = options.sessionRegistry
    ?? (store instanceof PersistentApiStore
      ? new SessionRegistry(store.repositories.appClientSessions)
      : new SessionRegistry());

  const rateLimitOptions = options.rateLimit === undefined
    ? (options.runtimeConfig ? DEFAULT_RATE_LIMIT : false)
    : options.rateLimit;
  let loginRateLimit: { max: number; timeWindow: string } | undefined;
  if (rateLimitOptions) {
    void app.register(rateLimit, {
      max: rateLimitOptions.max,
      timeWindow: rateLimitOptions.timeWindow,
      // 生产链路 Nginx 未透传 X-Forwarded-For，request.ip 无法区分真实来源；
      // 有效会话按 token 哈希分桶，伪造/匿名请求和登录退回共享 IP 桶。
      keyGenerator: async (request) => {
        const authorization = request.headers.authorization;
        const token = authorization?.match(/^Bearer ([^ ]+)$/i)?.[1];
        // Untrusted header values must not create unlimited anonymous buckets.
        const session = token ? await sessionRegistry.resolve(token) : null;
        if (session && !request.url.split("?")[0]?.endsWith("/wechat-login")) {
          return `auth:${createHash("sha256").update(token!).digest("hex")}`;
        }
        return `ip:${request.ip}`;
      },
      errorResponseBuilder: (_request, context) => ({
        statusCode: context.statusCode,
        error: {
          code: "rate_limited",
          message: `Rate limit exceeded, retry in ${context.after}`,
        },
      }),
    });
    loginRateLimit = rateLimitOptions.loginMax === undefined
      ? undefined
      : { max: rateLimitOptions.loginMax, timeWindow: rateLimitOptions.timeWindow };
  }

  const context = createRouteContext(store, options.membershipResolver, sessionRegistry, options.wechatIdentityConnector, loginRateLimit);
  const backofficeAuth = options.runtimeConfig?.backoffice && options.membershipResolver && store instanceof PersistentApiStore
    ? new BackofficeAuth(options.runtimeConfig.backoffice, store.repositories.backofficeAuth, options.membershipResolver) : undefined;
  registerHttpRequestContracts(app, store);

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error.validation) {
      return reply.code(400).send(apiError(
        "bad_request",
        "Request validation failed",
        error.validation as unknown[],
      ));
    }

    // 限流插件通过 throw errorResponseBuilder(...) 触发 429，按项目 apiError 形状透传。
    const rateLimitPayload = (error as FastifyError & { error?: { code?: unknown; message?: unknown } }).error;
    if (
      error.statusCode === 429
      && typeof rateLimitPayload === "object" && rateLimitPayload !== null
      && typeof rateLimitPayload.code === "string"
      && typeof rateLimitPayload.message === "string"
    ) {
      return reply.code(429).send(apiError(rateLimitPayload.code, rateLimitPayload.message));
    }

    // 未显式标记 statusCode 的异常视为服务器内部错误，绝不回显 error.message；
    // Fastify 在错误进入本处理器前已按 error 级别记录完整日志。
    const statusCode = error.statusCode && error.statusCode >= 400 && error.statusCode < 600
      ? error.statusCode
      : 500;
    const isServerError = statusCode >= 500;

    return reply.code(statusCode).send(apiError(
      isServerError ? "internal_error" : "bad_request",
      isServerError ? "Internal server error" : error.message,
    ));
  });

  app.get("/openapi.json", async () => buildOpenApiDocument());

  const buildInfo = normalizeBuildInfo(options.buildInfo === undefined ? readBuildInfo() : options.buildInfo);
  void app.register(registerPlatformRoutes, {
    ...context,
    buildInfo,
    environment: options.runtimeConfig?.environment,
  });
  void app.register(registerBackofficeRoutes, { auth: backofficeAuth });
  void app.register(registerBackofficeManagementRoutes, { auth: backofficeAuth, store });
  void app.register(registerBackofficeWebRoutes, { auth: backofficeAuth, store, buildInfo });
  void app.register(registerCoachAssignmentRoutes, context);
  void app.register(registerAppClientRoutes, context);
  void app.register(registerDataCapabilityRoutes, context);
  void app.register(registerCalendarRoutes, context);
  void app.register(registerTrainingRoutes, context);
  void app.register(registerTrainingRecordRoutes, context);
  void app.register(registerTrainingGameRoutes, context);
  void app.register(registerStudentEvaluationRoutes, context);
  void app.register(registerScoutPlayerRoutes, context);
  void app.register(registerTemporaryRosterRoutes, context);
  void app.register(registerMatchRoutes, context);
  void app.register(registerAssessmentRoutes, context);
  void app.register(registerAssessmentWorkflowRoutes, context);
  void app.register(registerMetricsRoutes, context);

  return app;
}
