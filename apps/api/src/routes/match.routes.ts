import type { FastifyInstance } from "fastify";
import type { RecordMatchInput } from "@football-club/domain";
import { schemas } from "../http/schemas.js";
import type { RouteContext } from "./context.js";

export async function registerMatchRoutes(app: FastifyInstance, context: RouteContext) {
  app.post<{
    Params: {
      clubId: string;
    };
    Body: Omit<RecordMatchInput, "clubId">;
  }>(
    "/clubs/:clubId/matches",
    {
      schema: {
        ...schemas.clubParams,
        ...schemas.recordMatch,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubMembership(request, reply, request.params.clubId)) {
        return reply;
      }

      const result = await context.store.recordMatchSummary({
        ...request.body,
        clubId: request.params.clubId,
      });

      return reply.code(201).send(result);
    },
  );
}
