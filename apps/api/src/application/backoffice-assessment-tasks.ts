import type { AuthContext } from "../auth/context.js";
import type { PersistentApiStore } from "../store.js";
import {
  BackofficeFault,
  digest,
} from "../persistence/backoffice-management-repository.js";
import {
  assessmentWorkflow,
  AssessmentWorkflowError,
  publicationEnabled,
} from "./assessment-workflow.js";
import { coachTeamRole } from "./coach-scope.js";
import type { AssessmentEntry } from "./assessment-workflow-types.js";
import type { AssessmentTask } from "../data-capability/types.js";
export interface TaskCreateInput {
  title: string;
  termLabel: string;
  templateVersionId: string;
  teamIds: string[];
  startsOn: string;
  dueOn: string;
  requestId: string;
  selections?: Array<{ teamId: string; studentIds: string[] }>;
}
export class BackofficeAssessmentTasks {
  constructor(readonly store: PersistentApiStore) {}
  private require(actor: AuthContext, admin = false) {
    if (
      !this.store.repositories.backofficeManagement.activeBrowser(
        actor.clubId,
        actor.user.id,
        actor.membership.id,
      ) ||
      !actor.membership.roles.some((role) =>
        ["owner", "admin", "operator"].includes(role),
      ) ||
      (admin &&
        !this.store.repositories.backofficeManagement.activeAdmin(
          actor.clubId,
          actor.user.id,
          actor.membership.id,
        ))
    )
      throw new BackofficeFault(403, "permission_denied");
  }
  private task(actor: AuthContext, id: string) {
    this.require(actor);
    const task = this.store.repositories.assessmentTasks
      .listByClub(actor.clubId)
      .find((t) => t.id === id);
    if (!task) throw new BackofficeFault(404, "not_found");
    return task;
  }
  private coach(actor: AuthContext, task: AssessmentTask) {
    const grants = this.store.repositories.backofficeManagement.grants(
        actor.clubId,
        actor.user.id,
      ),
      coach = this.store
        .listCoaches(actor.clubId)
        .find((c) => c.userId === actor.user.id);
    if (
      !grants.includes("assessment_entry") ||
      !coach ||
      coach.status !== "active" ||
      !coachTeamRole(this.store, actor.clubId, coach.id, task.teamId)
    )
      throw new BackofficeFault(403, "teaching_authorization_required");
    return coach;
  }
  catalog(actor: AuthContext) {
    this.require(actor);
    const repo = this.store.repositories.dataCapability;
    return {
      enabled: publicationEnabled(actor.clubId),
      teams: this.store
        .listTeams(actor.clubId)
        .filter((t) => t.status === "active")
        .map((t) => ({
          id: t.id,
          name: t.name,
          studentIds: this.store
            .listTeamMembers(actor.clubId)
            .filter((m) => m.teamId === t.id && m.status === "active")
            .map((m) => m.studentId),
        })),
      students: this.store
        .listStudents(actor.clubId)
        .map((s) => ({ id: s.id, name: s.name })),
      versions: repo
        .listAssessmentTemplateVersions(actor.clubId)
        .filter((v) => v.status === "active")
        .map((v) => ({
          id: v.id,
          version: v.version,
          templateId: v.templateId,
          name:
            repo
              .listAssessmentTemplates(actor.clubId)
              .find((t) => t.id === v.templateId)?.name ?? v.templateId,
        })),
    };
  }
  async list(actor: AuthContext) {
    this.require(actor);
    const workflow = assessmentWorkflow(this.store);
    return Promise.all(
      this.store.repositories.assessmentTasks
        .listByClub(actor.clubId)
        .map(async (task) => {
          try {
            return {
              ...task,
              revision: digest(task),
              summary: await workflow.summary(task),
            };
          } catch (error) {
            return {
              ...task,
              revision: digest(task),
              error:
                error instanceof AssessmentWorkflowError
                  ? error.code
                  : "assessment_definition_unavailable",
            };
          }
        }),
    );
  }
  async create(actor: AuthContext, input: TaskCreateInput) {
    this.require(actor, true);
    const repo = this.store.repositories.backofficeManagement;
    const ids = await repo.transaction(async () => {
      this.require(actor, true);
      const hash = digest({ action: "task_create", input }),
        replay = repo.replay(
          actor.clubId,
          actor.user.id,
          input.requestId,
          hash,
        );
      if (replay !== undefined) return replay as string[];
      if (
        input.startsOn > input.dueOn ||
        new Set(input.teamIds).size !== input.teamIds.length
      )
        throw new BackofficeFault(400, "invalid_task_selection");
      const version = this.store.repositories.dataCapability
        .listAssessmentTemplateVersions(actor.clubId)
        .find((v) => v.id === input.templateVersionId && v.status === "active");
      if (!version) throw new BackofficeFault(400, "invalid_reference");
      if (
        input.selections &&
        (new Set(input.selections.map((s) => s.teamId)).size !==
          input.selections.length ||
          input.selections.some((s) => !input.teamIds.includes(s.teamId)))
      )
        throw new BackofficeFault(400, "invalid_task_selection");
      const tasks: AssessmentTask[] = [];
      for (const teamId of input.teamIds) {
        if (
          !this.store
            .listTeams(actor.clubId)
            .some((t) => t.id === teamId && t.status === "active")
        )
          throw new BackofficeFault(400, "invalid_reference");
        const roster = this.store
            .listTeamMembers(actor.clubId)
            .filter((m) => m.teamId === teamId && m.status === "active")
            .map((m) => m.studentId),
          selected =
            input.selections?.find((s) => s.teamId === teamId)?.studentIds ??
            roster;
        if (
          !selected.length ||
          new Set(selected).size !== selected.length ||
          selected.some((id) => !roster.includes(id))
        )
          throw new BackofficeFault(400, "invalid_task_students");
        const task: AssessmentTask = {
          id: repo.newId("assessment-task"),
          clubId: actor.clubId,
          teamId,
          title: input.title,
          termLabel: input.termLabel,
          templateId: version.templateId,
          startsOn: input.startsOn,
          dueOn: input.dueOn,
          studentIds: selected,
        };
        const bindings = this.store.repositories.dataCapability
          .listAssessmentMetricBindings(actor.clubId)
          .filter(
            (b) => b.templateVersionId === version.id && b.role === "input",
          );
        if (!bindings.length || bindings.some((b) => !b.testItemId))
          throw new BackofficeFault(409, "assessment_inputs_missing");
        tasks.push(task);
      }
      const now = new Date().toISOString();
      for (const task of tasks) {
        this.store.repositories.assessmentTasks.save(task);
        this.store.assessmentWorkflow.pin(actor.clubId, task.id, version.id);
        repo.audit(
          actor.clubId,
          "assessment-tasks",
          task.id,
          actor.user.id,
          "create",
          null,
          { ...task, templateVersionId: version.id },
          input.requestId,
          now,
        );
      }
      const result = tasks.map((t) => t.id);
      repo.remember(actor.clubId, actor.user.id, input.requestId, hash, result);
      return result;
    });
    this.store.refreshBackofficeAssessmentTasks(actor.clubId);
    return { taskIds: ids };
  }
  async detail(actor: AuthContext, id: string) {
    const task = this.task(actor, id),
      workflow = assessmentWorkflow(this.store);
    try {
      const definition = await workflow.definition(task),
        summary = await workflow.summary(task);
      let coach:
        ReturnType<PersistentApiStore["listCoaches"]>[number] | undefined;
      try {
        coach = this.coach(actor, task);
      } catch {}
      const states = await Promise.all(
        workflow.roster(task).map(async (studentId) => ({
          studentId,
          state: await workflow.state(task, studentId),
        })),
      );
      const items = await this.store.listAssessmentTestItems(actor.clubId),
        assessments = await this.store.listPlayerAssessments(actor.clubId),
        ids = new Set(
          assessments
            .filter((a) => a.assessmentTaskId === task.id)
            .map((a) => a.id),
        );
      const metricNames = new Map(
        this.store
          .listAbilityMetrics(actor.clubId)
          .map((metric) => [metric.id, metric.name]),
      );
      const lineages = new Map(
        this.store.repositories.assessments
          .listMetricLineages(actor.clubId)
          .map((lineage) => [lineage.outputRecordId, lineage]),
      );
      return {
        task,
        revision: digest(task),
        summary,
        canWrite: Boolean(coach && workflow.editable(task)),
        actingCoach: coach ? { id: coach.id, name: coach.name } : null,
        items: definition.bindings.map((binding) => {
          const item = items.find((i) => i.id === binding.testItemId);
          return {
            id: binding.testItemId!,
            name: item?.name ?? binding.testItemId!,
            valueKind: item?.valueKind,
            unit: item?.unit,
            protocol: item?.protocol,
            metricId: binding.metricId,
            scoreMappingVersionId: binding.scoreMappingVersionId,
            gradeMappingVersionId: binding.gradeMappingVersionId,
          };
        }),
        courses: coach ? await workflow.courses(task, coach.id) : [],
        states,
        computedResults: this.store
          .listMetricRecords(actor.clubId)
          .filter(
            (record) =>
              ids.has(record.assessmentId ?? "") &&
              record.source === "algorithm",
          )
          .map((record) => ({
            id: record.id,
            studentId: record.studentId,
            assessmentId: record.assessmentId,
            templateVersionId: record.templateVersionId,
            metricId: record.metricId,
            name: metricNames.get(record.metricId) ?? record.metricId,
            value: record.value,
            occurredAt: record.occurredAt,
            lineage: lineages.get(record.id),
          })),
        results: this.store
          .listAssessmentRawResults(actor.clubId)
          .filter((r) => ids.has(r.assessmentId)),
        history: this.store.repositories.backofficeManagement.history(
          actor.clubId,
          "assessment-tasks",
          id,
        ),
      };
    } catch (e) {
      if (e instanceof AssessmentWorkflowError)
        throw new BackofficeFault(e.status, e.code);
      throw e;
    }
  }
  async previewImport(
    actor: AuthContext,
    id: string,
    studentId: string,
    input: {
      expectedRevision: number;
      entries: AssessmentEntry[];
      reason?: string;
    },
  ) {
    const task = this.task(actor, id),
      coach = this.coach(actor, task);
    try {
      return await assessmentWorkflow(this.store).previewSave(
        task,
        studentId,
        coach.id,
        input,
      );
    } catch (e) {
      if (e instanceof AssessmentWorkflowError)
        throw new BackofficeFault(e.status, e.code);
      throw e;
    }
  }
  async save(
    actor: AuthContext,
    id: string,
    studentId: string,
    input: {
      expectedRevision: number;
      entries: AssessmentEntry[];
      reason?: string;
    },
    afterSave?: (
      state: import("./assessment-workflow-types.js").AssessmentWorkingState,
    ) => void,
  ) {
    const task = this.task(actor, id),
      coach = this.coach(actor, task);
    try {
      return await assessmentWorkflow(this.store).save(
        task,
        studentId,
        coach.id,
        input,
        (state) => {
          this.require(actor);
          this.coach(actor, task);
          afterSave?.(state);
        },
      );
    } catch (e) {
      if (e instanceof AssessmentWorkflowError)
        throw new BackofficeFault(e.status, e.code);
      throw e;
    }
  }
  async handling(
    actor: AuthContext,
    id: string,
    studentId: string,
    input: { expectedRevision: number; reason: string | null },
  ) {
    const task = this.task(actor, id),
      coach = this.coach(actor, task);
    try {
      return await assessmentWorkflow(this.store).markNotAssessed(
        task,
        studentId,
        coach.id,
        input,
      );
    } catch (e) {
      if (e instanceof AssessmentWorkflowError)
        throw new BackofficeFault(e.status, e.code);
      throw e;
    }
  }
  async publish(
    actor: AuthContext,
    id: string,
    input: { students: Array<{ studentId: string; expectedRevision: number }> },
  ) {
    const task = this.task(actor, id),
      coach = this.coach(actor, task);
    if (
      new Set(input.students.map((s) => s.studentId)).size !==
      input.students.length
    )
      throw new BackofficeFault(400, "duplicate_students");
    const results = [];
    for (const student of input.students) {
      try {
        results.push({
          success: true,
          ...(await assessmentWorkflow(this.store).publish(
            task,
            student.studentId,
            coach.id,
            student.expectedRevision,
          )),
        });
      } catch (e) {
        results.push({
          studentId: student.studentId,
          success: false,
          error: {
            code:
              e instanceof AssessmentWorkflowError
                ? e.code
                : "assessment_publication_failed",
          },
        });
      }
    }
    return { results };
  }
}
