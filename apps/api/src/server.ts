import Fastify from "fastify";
import { InMemoryStore } from "./store.js";

export interface ServerOptions {
  logger?: boolean;
}

export function buildServer(store = new InMemoryStore(), options: ServerOptions = {}) {
  const app = Fastify({
    logger: options.logger ?? true,
  });

  app.get("/health", async () => store.getHealth());

  app.get("/calendar/events", async () => store.listCalendarEvents());

  app.get<{
    Params: {
      studentId: string;
    };
  }>("/students/:studentId/timeline", async (request) => store.getStudentTimeline(request.params.studentId));

  app.get("/catalog/ability-metrics", async () => store.listAbilityMetrics());

  app.get<{
    Params: {
      studentId: string;
    };
  }>("/students/:studentId/metrics", async (request) => store.getStudentMetrics(request.params.studentId));

  app.post<{
    Params: {
      studentId: string;
    };
  }>("/students/:studentId/derived-metrics/attacking-contribution", async (request) =>
    store.computeAttackingContribution(request.params.studentId),
  );

  return app;
}
