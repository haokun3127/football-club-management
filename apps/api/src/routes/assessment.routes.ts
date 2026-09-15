import type { FastifyInstance } from "fastify";
import type { RecordAssessmentInput } from "@football-club/domain";
import { schemas } from "../http/schemas.js";
import type { RouteContext } from "./context.js";
import { assessmentWorkflow, publicationEnabled } from "../application/assessment-workflow.js";

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

      const managed = (await context.store.listAssessmentTasks(request.params.clubId)).some((task) =>
        assessmentWorkflow(context.store).managed(task) && assessmentWorkflow(context.store).roster(task).includes(request.body.studentId));
      if (publicationEnabled(request.params.clubId) || managed) {
        return context.sendError(reply, 409, "assessment_publication_required", "请通过任务草稿和确认发布操作记录评测");
      }
      const result = await context.store.recordAssessment({
        ...request.body,
        clubId: request.params.clubId,
      });

      return reply.code(201).send(result);
    },
  );
}
