import Fastify from "fastify";
import type { FastifyError } from "fastify";
import type { MembershipResolver } from "./auth/context.js";
import { apiError } from "./http/errors.js";
import { buildOpenApiDocument } from "./http/openapi.js";
import { InMemoryStore, type ApiStore } from "./store.js";
import { registerAssessmentRoutes } from "./routes/assessment.routes.js";
import { registerCalendarRoutes } from "./routes/calendar.routes.js";
import { createRouteContext } from "./routes/context.js";
import { registerDataCapabilityRoutes } from "./routes/data-capability.routes.js";
import { registerMatchRoutes } from "./routes/match.routes.js";
import { registerMetricsRoutes } from "./routes/metrics.routes.js";
import { registerPlatformRoutes } from "./routes/platform.routes.js";
import { registerTrainingRoutes } from "./routes/training.routes.js";

export interface ServerOptions {
  logger?: boolean;
  membershipResolver?: MembershipResolver;
}

export function buildServer(store: ApiStore = new InMemoryStore(), options: ServerOptions = {}) {
  const app = Fastify({
    logger: options.logger ?? true,
    ajv: {
      customOptions: {
        removeAdditional: false,
      },
    },
  });
  const context = createRouteContext(store, options.membershipResolver);

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
  void app.register(registerDataCapabilityRoutes, context);
  void app.register(registerCalendarRoutes, context);
  void app.register(registerTrainingRoutes, context);
  void app.register(registerMatchRoutes, context);
  void app.register(registerAssessmentRoutes, context);
  void app.register(registerMetricsRoutes, context);

  return app;
}
