import type { PersistentApiStore } from "../store.js";
import type { AuthContext } from "../auth/context.js";
import { BackofficeManagement } from "./backoffice-management.js";
import { BackofficeAssessmentTasks } from "./backoffice-assessment-tasks.js";
import { BackofficeImports } from "./backoffice-imports.js";
import { resourceByKey } from "./backoffice-resources.js";
export async function backofficeWorkbench(
  store: PersistentApiStore,
  actor: AuthContext,
) {
  const management = new BackofficeManagement(store);
  const counts = Object.fromEntries(
    await Promise.all(
      ["students", "teams", "coaches", "events"].map(
        async (key) =>
          [
            key,
            (await management.records(resourceByKey(key)!, actor.clubId))
              .length,
          ] as const,
      ),
    ),
  );
  const tasks = await new BackofficeAssessmentTasks(store).list(actor);
  const imports = new BackofficeImports(store).list(actor);
  const events = (await store.listCalendarEvents(actor.clubId))
    .filter(
      (event) =>
        event.status !== "cancelled" &&
        Date.parse(event.timeRange.startsAt) >= Date.now(),
    )
    .sort((a, b) => a.timeRange.startsAt.localeCompare(b.timeRange.startsAt))
    .slice(0, 5);
  const service = management.has(actor, "service")
    ? ["consultations", "service-cases"]
        .flatMap((key) =>
          management.repository.list(resourceByKey(key)!, actor.clubId),
        )
        .filter((row) =>
          ["pending", "communicating"].includes(String(row.values.status)),
        ).length
    : null;
  return {
    counts,
    upcoming: events.map((event) => ({
      id: event.id,
      title: event.title,
      startsAt: event.timeRange.startsAt,
      leaveCount: store
        .listEventParticipants(actor.clubId)
        .filter(
          (person) =>
            person.eventId === event.id &&
            ["leave_requested", "excused"].includes(person.status),
        ).length,
    })),
    pendingTasks: tasks
      .filter(
        (task) =>
          !("summary" in task) ||
          task.summary.processedStudents < task.summary.totalStudents ||
          task.summary.completedStudents > task.summary.publishedStudents,
      )
      .map((task) => ({
        id: task.id,
        title: task.title,
        error: "error" in task ? task.error : null,
        unpublished:
          "summary" in task
            ? Math.max(
                0,
                task.summary.completedStudents - task.summary.publishedStudents,
              )
            : null,
        pending:
          "summary" in task
            ? task.summary.totalStudents - task.summary.processedStudents
            : null,
      })),
    failedImports: imports
      .filter((batch) => batch.rows.some((row) => row.status === "failed"))
      .map((batch) => ({
        id: batch.id,
        sourceName: batch.sourceName,
        failed: batch.rows.filter((row) => row.status === "failed").length,
      })),
    pendingServices: service,
  };
}
