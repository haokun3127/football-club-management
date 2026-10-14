import type { FastifyInstance, FastifyRequest } from "fastify";
import type { BackofficeAuth } from "../auth/backoffice.js";
import type { PersistentApiStore } from "../store.js";
import {
  BackofficeAssessmentTasks,
  type TaskCreateInput,
} from "../application/backoffice-assessment-tasks.js";
import { BackofficeFault } from "../persistence/backoffice-management-repository.js";
import type { AssessmentEntry } from "../application/assessment-workflow-types.js";
import { backofficeTaskSchemas as schemas } from "../http/backoffice-task-schemas.js";
export async function registerBackofficeTaskRoutes(
  app: FastifyInstance,
  { auth, store }: { auth?: BackofficeAuth; store?: PersistentApiStore },
) {
  const service = store ? new BackofficeAssessmentTasks(store) : undefined;
  const actor = async (r: FastifyRequest) => {
    const current = await auth?.resolve(r);
    if (!current || !service)
      throw new BackofficeFault(401, "authentication_required");
    return current;
  };
  app.get(
    "/backoffice/api/task-catalog",
    { schema: schemas.catalog },
    async (r) => service!.catalog(await actor(r)),
  );
  app.get(
    "/backoffice/api/assessment-tasks",
    { schema: schemas.list },
    async (r) => service!.list(await actor(r)),
  );
  app.get<{ Params: { id: string } }>(
    "/backoffice/api/assessment-tasks/:id",
    { schema: schemas.detail },
    async (r) => service!.detail(await actor(r), r.params.id),
  );
  app.post<{ Body: TaskCreateInput }>(
    "/backoffice/api/assessment-tasks",
    { schema: schemas.create },
    async (r) => service!.create(await actor(r), r.body),
  );
  app.put<{
    Params: { id: string; studentId: string };
    Body: {
      expectedRevision: number;
      entries: AssessmentEntry[];
      reason?: string;
    };
  }>(
    "/backoffice/api/assessment-tasks/:id/students/:studentId/entries",
    { schema: schemas.save },
    async (r) =>
      service!.save(await actor(r), r.params.id, r.params.studentId, r.body),
  );
  app.put<{
    Params: { id: string; studentId: string };
    Body: { expectedRevision: number; reason: string | null };
  }>(
    "/backoffice/api/assessment-tasks/:id/students/:studentId/handling",
    { schema: schemas.handling },
    async (r) =>
      service!.handling(
        await actor(r),
        r.params.id,
        r.params.studentId,
        r.body,
      ),
  );
  app.post<{
    Params: { id: string };
    Body: { students: Array<{ studentId: string; expectedRevision: number }> };
  }>(
    "/backoffice/api/assessment-tasks/:id/publications",
    { schema: schemas.publish },
    async (r) => service!.publish(await actor(r), r.params.id, r.body),
  );
}
