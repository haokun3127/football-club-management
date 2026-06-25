import type { FastifyInstance } from "fastify";
import type { MetricSourceKind } from "@football-club/domain";
import { schemas } from "../http/schemas.js";
import type { RouteContext } from "./context.js";

export async function registerMetricsRoutes(app: FastifyInstance, context: RouteContext) {
  app.get<{
    Params: {
      clubId: string;
    };
  }>(
    "/clubs/:clubId/catalog/ability-metrics",
    { schema: schemas.clubParams },
    async (request, reply) => {
      if (!await context.requireClubMembership(request, reply, request.params.clubId)) {
        return reply;
      }

      return context.store.listAbilityMetrics(request.params.clubId);
    },
  );

  app.get<{
    Params: {
      clubId: string;
      studentId: string;
    };
    Querystring: {
      source?: MetricSourceKind | MetricSourceKind[];
    };
  }>(
    "/clubs/:clubId/students/:studentId/metrics",
    { schema: schemas.clubStudentParams },
    async (request, reply) => {
      if (!await context.requireClubMembership(request, reply, request.params.clubId)) {
        return reply;
      }

      return context.store.getStudentMetrics(request.params.clubId, request.params.studentId, request.query.source);
    },
  );

  app.post<{
    Params: {
      clubId: string;
      studentId: string;
    };
  }>(
    "/clubs/:clubId/students/:studentId/derived-metrics/attacking-contribution",
    {
      schema: {
        ...schemas.clubStudentParams,
        ...schemas.derivedMetric,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubMembership(request, reply, request.params.clubId)) {
        return reply;
      }

      return context.store.computeAttackingContribution(request.params.clubId, request.params.studentId);
    },
  );
}
