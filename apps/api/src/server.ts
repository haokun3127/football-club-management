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
import Fastify from "fastify";
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

export interface ServerOptions {
  runtimeConfig?: RuntimeConfig;
  logger?: boolean;
  membershipResolver?: MembershipResolver;
  wechatIdentityConnector?: WechatIdentityConnector;
  sessionRegistry?: SessionRegistry;
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
  const sessionRegistry = options.sessionRegistry
    ?? (store instanceof PersistentApiStore
      ? new SessionRegistry(store.repositories.appClientSessions)
      : new SessionRegistry());
  const context = createRouteContext(store, options.membershipResolver, sessionRegistry, options.wechatIdentityConnector);
  const backofficeAuth = options.runtimeConfig?.backoffice && options.membershipResolver && store instanceof PersistentApiStore
    ? new BackofficeAuth(options.runtimeConfig.backoffice, store.repositories.backofficeAuth, options.membershipResolver) : undefined;
  registerHttpRequestContracts(app, store);

  app.setErrorHandler((error: FastifyError, _request, reply) => {
    if (error.validation) {
      return reply.code(400).send(apiError(
        "bad_request",
        "Request validation failed",
        error.validation as unknown[],
      ));
    }

    const statusCode = error.statusCode && error.statusCode >= 400 && error.statusCode < 600
      ? error.statusCode
      : 400;

    return reply.code(statusCode).send(apiError(
      statusCode < 500 ? "bad_request" : "internal_error",
      statusCode < 500 ? error.message : "Internal server error",
    ));
  });

  app.get("/openapi.json", async () => buildOpenApiDocument());

  void app.register(registerPlatformRoutes, context);
  void app.register(registerBackofficeRoutes, { auth: backofficeAuth });
  void app.register(registerBackofficeManagementRoutes, { auth: backofficeAuth, store });
  void app.register(registerBackofficeWebRoutes, { auth: backofficeAuth, store });
  void app.register(registerCoachAssignmentRoutes, context);
  void app.register(registerAppClientRoutes, context);
  void app.register(registerDataCapabilityRoutes, context);
  void app.register(registerCalendarRoutes, context);
  void app.register(registerTrainingRoutes, context);
  void app.register(registerTrainingRecordRoutes, context);
  void app.register(registerStudentEvaluationRoutes, context);
  void app.register(registerScoutPlayerRoutes, context);
  void app.register(registerTemporaryRosterRoutes, context);
  void app.register(registerMatchRoutes, context);
  void app.register(registerAssessmentRoutes, context);
  void app.register(registerAssessmentWorkflowRoutes, context);
  void app.register(registerMetricsRoutes, context);

  return app;
}
