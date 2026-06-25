import Fastify from "fastify";
import type { MembershipResolver } from "./auth/context.js";
import { InMemoryStore, type ApiStore } from "./store.js";
import { registerAssessmentRoutes } from "./routes/assessment.routes.js";
import { registerCalendarRoutes } from "./routes/calendar.routes.js";
import { createRouteContext } from "./routes/context.js";
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
  });
  const context = createRouteContext(store, options.membershipResolver);

  void app.register(registerPlatformRoutes, context);
  void app.register(registerCalendarRoutes, context);
  void app.register(registerTrainingRoutes, context);
  void app.register(registerMatchRoutes, context);
  void app.register(registerAssessmentRoutes, context);
  void app.register(registerMetricsRoutes, context);

  return app;
}
