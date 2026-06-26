import type { FastifyInstance } from "fastify";
import type { RecordAssessmentInput } from "@football-club/domain";
import { schemas } from "../http/schemas.js";
import type { RouteContext } from "./context.js";

export async function registerAssessmentRoutes(app: FastifyInstance, context: RouteContext) {
  app.post<{
    Params: {
      clubId: string;
    };
    Body: Omit<RecordAssessmentInput, "clubId">;
  }>(
    "/clubs/:clubId/assessments",
    {
      schema: {
        ...schemas.clubParams,
        ...schemas.recordAssessment,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin", "coach"])) {
        return reply;
      }

      const result = await context.store.recordAssessment({
        ...request.body,
        clubId: request.params.clubId,
      });

      return reply.code(201).send(result);
    },
  );
}
