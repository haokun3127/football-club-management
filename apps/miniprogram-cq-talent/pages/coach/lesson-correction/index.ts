import { correctCoachLesson, getCoachLessonConfirmation, getCoachWorkbench } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { createIdempotencyKey } from "../../../utils/idempotency";
import type { CoachLessonConfirmation, CoachWorkbench, LoadState } from "../../../utils/types";

type LessonDelta = -0.5 | 0 | 0.5;

interface CorrectionRow {
  studentId: string;
  name: string;
  avatarLetter: string;
  avatarColor: string;
  balanceText: string;
  delta: LessonDelta;
  deltaLabel: string;
  operationKey: string;
  operationSignature: string;
}

interface PageData {
  state: LoadState;
  statusTitle: string;
  statusAction: string;
  message: string;
  eventId: string;
  rows: CorrectionRow[];
  hasRows: boolean;
  canSubmit: boolean;
  submitting: boolean;
  hasSubmitError: boolean;
  submitError: string;
}

Page<PageData>({
  data: {
    state: "idle",
    statusTitle: "",
    statusAction: "",
    message: "",
    eventId: "",
    rows: [],
    hasRows: false,
    canSubmit: false,
    submitting: false,
    hasSubmitError: false,
    submitError: "",
  },

  onLoad(query?: Record<string, string | undefined>) {
    return this.load(query?.id || "");
  },

  async load(eventId: string): Promise<boolean> {
    if (!requireRole("coach")) {
      return false;
    }

    if (!eventId) {
      this.setData({
        state: "empty",
        statusTitle: "缺少活动",
        statusAction: "",
        message: "缺少活动 ID，暂时无法读取课时记录。",
        eventId: "",
        rows: [],
        hasRows: false,
        canSubmit: false,
      });
      return false;
    }

    this.setData({
      state: "loading",
      statusTitle: "正在读取课时记录",
      statusAction: "",
      message: "",
      eventId,
      hasSubmitError: false,
      submitError: "",
    });

    try {
      const [workbench, confirmation] = await Promise.all([
        getCoachWorkbench(eventId),
        getCoachLessonConfirmation(eventId),
      ]);
      const rows = mergeCorrectionRows(workbench, confirmation, this.data.rows);
      const hasRows = rows.length > 0;
      this.setData({
        state: hasRows ? "ready" : "empty",
        statusTitle: hasRows ? "" : "暂无可更正学员",
        statusAction: "",
        message: hasRows ? "" : "当前活动没有可核对的课时学员。",
        rows,
        hasRows,
        canSubmit: hasSelection(rows),
      });
      return true;
    } catch {
      this.setData({
        state: "error",
        statusTitle: "课时记录读取失败",
        statusAction: "重试",
        message: "课时记录读取失败，请稍后重试。",
        rows: [],
        hasRows: false,
        canSubmit: false,
      });
      return false;
    }
  },

  retry() {
    return this.load(this.data.eventId);
  },

  adjustDelta(event: { currentTarget: { dataset: { studentId: string; direction: number } } }) {
    if (this.data.submitting) return;
    const { studentId, direction } = event.currentTarget.dataset;
    const selectedDelta: Exclude<LessonDelta, 0> = direction < 0 ? -0.5 : 0.5;
    const rows = this.data.rows.map((row: CorrectionRow) => {
      if (row.studentId !== studentId) return row;
      const delta: LessonDelta = selectedDelta;
      return updateRowOperation({ ...row, delta, deltaLabel: formatDelta(delta) });
    });
    this.setData({
      rows,
      canSubmit: hasSelection(rows),
      hasSubmitError: false,
      submitError: "",
    });
  },

  async submit() {
    if (this.data.submitting) return;
    const pendingRows = this.data.rows
      .filter((row: CorrectionRow) => row.delta !== 0)
      .sort((left: CorrectionRow, right: CorrectionRow) => left.studentId.localeCompare(right.studentId));

    if (!pendingRows.length) {
      this.setData({
        hasSubmitError: true,
        submitError: "请先选择需要更正的学员。",
        canSubmit: false,
      });
      return;
    }

    this.setData({ submitting: true, hasSubmitError: false, submitError: "" });
    const savedStudentIds = new Set<string>();
    let failure: unknown;
    for (const row of pendingRows) {
      try {
        await correctCoachLesson(this.data.eventId, row.studentId, row.delta as Exclude<LessonDelta, 0>, undefined, row.operationKey);
        savedStudentIds.add(row.studentId);
      } catch (error) {
        failure = error;
        break;
      }
    }

    const rowsAfterAttempt = this.data.rows.map((row: CorrectionRow) => savedStudentIds.has(row.studentId)
      ? clearRowOperation(row)
      : row);
    this.setData({ rows: rowsAfterAttempt, canSubmit: hasSelection(rowsAfterAttempt) });
    const reread = await this.load(this.data.eventId);

    if (failure) {
      this.setData({
        submitting: false,
        hasSubmitError: true,
        submitError: correctionFailureMessage(failure, savedStudentIds.size),
      });
      return;
    }

    if (!reread) {
      this.setData({
        submitting: false,
        hasSubmitError: true,
        submitError: "课时调整已提交，请重新读取后核对。",
      });
      return;
    }

    this.setData({ submitting: false });
    wx.showToast({ title: "课时更正已保存", icon: "success" });
    wx.navigateBack({ delta: 1 });
  },
});

function mergeCorrectionRows(
  workbench: CoachWorkbench,
  confirmation: CoachLessonConfirmation,
  existingRows: CorrectionRow[],
) {
  const confirmationIds = new Set(confirmation.participants.map((participant) => participant.studentId));
  const ledgerByStudentId = new Map(confirmation.ledgers.map((ledger) => [ledger.studentId, ledger]));
  const previousByStudentId = new Map(existingRows.map((row) => [row.studentId, row]));

  return workbench.roster
    .filter((student) => student.studentId && confirmationIds.has(student.studentId))
    .map((student) => {
      const previous = previousByStudentId.get(student.studentId);
      const ledger = ledgerByStudentId.get(student.studentId);
      const balance = ledger?.remainingLessons ?? ledger?.balance ?? student.remainingLessons;
      const name = student.name && student.name !== "学员" ? student.name : "姓名待同步";
      return updateRowOperation({
        studentId: student.studentId,
        name,
        avatarLetter: name.slice(0, 1),
        avatarColor: correctionAvatarColor(student.studentId),
        balanceText: typeof balance === "number" ? `原值: ${balance}课时` : "课时余额待核对",
        delta: previous?.delta ?? 0,
        deltaLabel: formatDelta(previous?.delta ?? 0),
        operationKey: previous?.operationKey ?? "",
        operationSignature: previous?.operationSignature ?? "",
      });
    });
}

function updateRowOperation(row: CorrectionRow): CorrectionRow {
  if (row.delta === 0) {
    return clearRowOperation(row);
  }

  const operationSignature = `${row.studentId}|${row.delta}`;
  if (row.operationKey && row.operationSignature === operationSignature) {
    return row;
  }

  return {
    ...row,
    operationKey: createIdempotencyKey("lesson-correction"),
    operationSignature,
  };
}

function clearRowOperation(row: CorrectionRow): CorrectionRow {
  return {
    ...row,
    delta: 0,
    deltaLabel: formatDelta(0),
    operationKey: "",
    operationSignature: "",
  };
}

function formatDelta(delta: LessonDelta) {
  return delta > 0 ? "+0.5" : delta < 0 ? "-0.5" : "±0";
}

function hasSelection(rows: CorrectionRow[]) {
  return rows.some((row) => row.delta !== 0);
}

function correctionAvatarColor(studentId: string) {
  const colors = ["#dbeafe", "#fef3c7", "#dcfce7", "#fce7f3"];
  let total = 0;
  for (let index = 0; index < studentId.length; index += 1) total += studentId.charCodeAt(index);
  return colors[total % colors.length] || "#f3f4f6";
}

function correctionFailureMessage(error: unknown, savedCount: number) {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  const outcomeUnknown = !code || code === "network_error" || code === "http_error" || code === "internal_error";
  if (outcomeUnknown) {
    return "保存状态待确认，请重试。";
  }
  return savedCount > 0 ? "部分更正已保存，请核对后重试。" : "课时更正失败，请稍后重试。";
}
