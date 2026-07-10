import { STORAGE_KEYS } from "./config";
import type { AssessmentDraftEntry, AssessmentDraftStatus } from "./types";

export type AssessmentDraftMap = Record<string, AssessmentDraftEntry>;

export function assessmentDraftStorageKey(eventId: string, templateVersionId: string) {
  return `${STORAGE_KEYS.assessmentDraftPrefix}:${eventId || "no-event"}:${templateVersionId || "current"}`;
}

export function assessmentDraftEntryKey(studentId: string, testItemId: string) {
  return `${studentId}:${testItemId}`;
}

export function loadAssessmentDraft(eventId: string, templateVersionId: string): AssessmentDraftMap {
  return wx.getStorageSync<AssessmentDraftMap | "">(assessmentDraftStorageKey(eventId, templateVersionId)) || {};
}

export function saveAssessmentDraftEntry(
  eventId: string,
  templateVersionId: string,
  input: { studentId: string; testItemId: string; status: AssessmentDraftStatus; rawValue?: string; missingReason?: string },
) {
  const draft = loadAssessmentDraft(eventId, templateVersionId);
  const key = assessmentDraftEntryKey(input.studentId, input.testItemId);
  draft[key] = {
    studentId: input.studentId,
    testItemId: input.testItemId,
    status: input.status,
    rawValue: input.rawValue ?? "",
    missingReason: input.missingReason,
    updatedAt: new Date().toISOString(),
  };
  wx.setStorageSync(assessmentDraftStorageKey(eventId, templateVersionId), draft);
  return draft;
}

export function clearAssessmentDraftStudents(eventId: string, templateVersionId: string, studentIds: string[]) {
  const draft = loadAssessmentDraft(eventId, templateVersionId);
  const cleared = new Set(studentIds);
  Object.keys(draft).forEach((key) => {
    if (cleared.has(draft[key]!.studentId)) delete draft[key];
  });
  wx.setStorageSync(assessmentDraftStorageKey(eventId, templateVersionId), draft);
  return draft;
}

export function draftProgress(draft: AssessmentDraftMap, studentIds: string[], testItemIds: string[]) {
  const total = studentIds.length * testItemIds.length;
  const completed = Object.values(draft).filter((entry) =>
    studentIds.includes(entry.studentId) && testItemIds.includes(entry.testItemId) && entry.status !== "empty",
  ).length;
  return { completed, total };
}
