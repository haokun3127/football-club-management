import type { BackofficeResource } from "./backoffice-resources.js";
import type { PersistentApiStore } from "../store.js";
import type { AuthContext } from "../auth/context.js";
import {
  BackofficeFault,
  type BackofficeValues,
} from "../persistence/backoffice-management-repository.js";
import { BackofficeAssessmentTasks } from "./backoffice-assessment-tasks.js";
import { validateBackofficeValues } from "./backoffice-value-validation.js";
import type { AssessmentEntry } from "./assessment-workflow-types.js";
import type { MetricValue } from "@football-club/domain";
const text = (key: string, label: string, required = true) => ({
  key,
  label,
  kind: "text" as const,
  required,
});
const number = (key: string, label: string, minimum?: number) => ({
  key,
  label,
  kind: "number" as const,
  required: true,
  minimum,
});
export const specialImportResources: BackofficeResource[] = [
  {
    key: "scouts",
    title: "球探身份登记",
    table: "",
    grant: "sensitive",
    adminOnly: true,
    fields: [
      text("name", "姓名"),
      {
        ...text("identityNumber", "身份证号码（预览仅显示尾号）"),
        sensitive: true,
      },
    ],
  },
  {
    key: "assessment-drafts",
    title: "测评成绩草稿",
    table: "",
    grant: "assessment_entry",
    adminOnly: true,
    fields: [
      text("taskId", "固定版本任务标识"),
      text("studentId", "任务内学员标识"),
      text("testItemId", "采集项目标识"),
      text("eventId", "实际参与课程标识"),
      number("draftRevision", "学员当前草稿修订", 0),
      number("value", "原始数值"),
      text("unit", "原始单位"),
      text("reason", "已确认成绩更正原因", false),
    ],
  },
  {
    key: "training-records",
    title: "训练计次更正",
    table: "",
    adminOnly: true,
    fields: [
      text("eventId", "实际训练课程标识"),
      text("studentId", "当次参与学员标识"),
      number("recordRevision", "当前计次修订（缺记录填0）", 0),
      { key: "counted", label: "是否计次", kind: "boolean", required: true },
      text("reason", "更正原因"),
    ],
  },
];
export const isSpecialImport = (key: string) =>
  specialImportResources.some((resource) => resource.key === key);
export async function assessmentImportInput(
  store: PersistentApiStore,
  actor: AuthContext,
  values: BackofficeValues,
) {
  const taskId = String(values.taskId),
    studentId = String(values.studentId),
    item = (await store.listAssessmentTestItems(actor.clubId)).find(
      (item) => item.id === values.testItemId,
    );
  if (!item) throw new BackofficeFault(400, "invalid_import_assessment");
  if (!Number.isInteger(values.draftRevision))
    throw new BackofficeFault(400, "invalid_import_revision");
  const unit =
    item.unit ??
    (item.valueKind === "rating_1_5" || item.valueKind === "score_0_100"
      ? "score"
      : item.valueKind);
  if (values.unit !== unit)
    throw new BackofficeFault(400, "assessment_unit_mismatch");
  const keys: Record<string, string> = {
      score_0_100: "score",
      rating_1_5: "score",
      count: "count",
      percentage: "percentage",
      duration_minutes: "minutes",
      duration_seconds: "seconds",
      distance_meters: "meters",
      measurement: "value",
    },
    key = keys[item.valueKind!];
  if (!key) throw new BackofficeFault(400, "unsupported_import_value");
  const entry: AssessmentEntry = {
    testItemId: item.id,
    value: {
      kind: item.valueKind,
      [key]: values.value,
      ...(item.valueKind === "measurement" ? { unit: item.unit } : {}),
    } as MetricValue,
    eventId: String(values.eventId),
  };
  return {
    taskId,
    studentId,
    input: {
      expectedRevision: Number(values.draftRevision),
      entries: [entry],
      ...(values.reason ? { reason: String(values.reason) } : {}),
    },
    targetId: JSON.stringify([taskId, studentId, item.id]),
  };
}
export async function validateSpecialImport(
  store: PersistentApiStore,
  actor: AuthContext,
  resource: BackofficeResource,
  values: BackofficeValues,
) {
  validateBackofficeValues(resource, values);
  if (resource.key === "assessment-drafts") {
    const input = await assessmentImportInput(store, actor, values);
    await new BackofficeAssessmentTasks(store).previewImport(
      actor,
      input.taskId,
      input.studentId,
      input.input,
    );
    return;
  }
  const event = store.getCalendarEvent(String(values.eventId)),
    participant = store
      .listEventParticipants(actor.clubId)
      .find(
        (participant) =>
          participant.eventId === values.eventId &&
          participant.studentId === values.studentId,
      );
  if (
    !event ||
    event.clubId !== actor.clubId ||
    event.type !== "training" ||
    !participant
  )
    throw new BackofficeFault(400, "invalid_reference");
  if (event.status === "cancelled" && values.counted)
    throw new BackofficeFault(409, "cancelled_training");
  if (
    !Number.isInteger(values.recordRevision) ||
    (store.trainingRecords.get(actor.clubId, event.id, String(values.studentId))
      ?.revision ?? 0) !== values.recordRevision
  )
    throw new BackofficeFault(409, "revision_conflict");
  if (String(values.reason).length > 500)
    throw new BackofficeFault(400, "invalid_field_value");
}
