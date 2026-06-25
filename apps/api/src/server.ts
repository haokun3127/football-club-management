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

  app.get("/clubs", async () => store.listClubs());

  app.get<{
    Params: {
      clubId: string;
    };
  }>("/clubs/:clubId/config", async (request, reply) => {
    const config = store.getClubConfig(request.params.clubId);

    if (!config) {
      return reply.code(404).send({ error: "Club not found" });
    }

    return config;
  });

  app.get<{
    Params: {
      clubId: string;
    };
  }>("/clubs/:clubId/calendar/events", async (request) => store.listCalendarEvents(request.params.clubId));

  app.get<{
    Params: {
      clubId: string;
      studentId: string;
    };
  }>("/clubs/:clubId/students/:studentId/timeline", async (request) =>
    store.getStudentTimeline(request.params.clubId, request.params.studentId),
  );

  app.get<{
    Params: {
      clubId: string;
    };
  }>("/clubs/:clubId/catalog/ability-metrics", async (request) => store.listAbilityMetrics(request.params.clubId));

  app.get<{
    Params: {
      clubId: string;
      studentId: string;
    };
  }>("/clubs/:clubId/students/:studentId/metrics", async (request) =>
    store.getStudentMetrics(request.params.clubId, request.params.studentId),
  );

  app.post<{
    Params: {
      clubId: string;
      studentId: string;
    };
  }>("/clubs/:clubId/students/:studentId/derived-metrics/attacking-contribution", async (request) =>
    store.computeAttackingContribution(request.params.clubId, request.params.studentId),
  );

  return app;
}
