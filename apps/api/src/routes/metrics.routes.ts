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
    {
      schema: {
        ...schemas.clubParams,
        ...schemas.abilityMetrics,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin", "coach", "parent"])) {
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
    {
      schema: {
        ...schemas.clubStudentParams,
        ...schemas.studentMetrics,
      },
    },
    async (request, reply) => {
      if (!await context.requireStudentAccess(request, reply, request.params.clubId, request.params.studentId)) {
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
      if (!await context.requireStudentAccess(request, reply, request.params.clubId, request.params.studentId, { write: true })) {
        return reply;
      }

      return context.store.computeAttackingContribution(request.params.clubId, request.params.studentId);
    },
  );
}
