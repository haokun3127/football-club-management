import { correctCoachLesson, getCoachWorkbench } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import type { CoachWorkbench, LoadState } from "../../../utils/types";

type RosterItem = CoachWorkbench["roster"][number];

interface CorrectionRow {
  studentId: string;
  name: string;
  baseLabel: string;
  delta: number;
  deltaLabel: string;
}

interface PageData {
  state: LoadState;
  message: string;
  eventId: string;
  rows: CorrectionRow[];
  reason: string;
  submitting: boolean;
}

const STEP = 0.5;

Page<PageData>({
  data: {
    state: "idle",
    message: "",
    eventId: "",
    rows: [],
    reason: "",
    submitting: false,
  },
  onLoad(query: { id?: string }) {
    this.load(query?.id || "");
  },
  async load(id: string) {
    const session = requireRole("coach");
    if (!session) return;
    this.setData({ state: "loading", message: "正在读取课时记录", eventId: id });
    try {
      const workbench = await getCoachWorkbench(id);
      const rows = workbench.roster.map((student: RosterItem) => ({
        studentId: student.studentId,
        name: student.name,
        baseLabel: `原值: ${student.shouldConsume === false ? 0 : 1}课时`,
        delta: 0,
        deltaLabel: "±0",
      }));
      this.setData({
        state: rows.length ? "ready" : "empty",
        message: rows.length ? "" : "当前活动没有可更正的学员。",
        rows,
      });
    } catch (error) {
      this.setData({ state: "error", message: error instanceof Error ? error.message : "课时记录读取失败，请稍后重试。" });
    }
  },
  retry() {
    this.load(this.data.eventId);
  },
  adjustDelta(event: { currentTarget: { dataset: { studentId: string; direction: number } } }) {
    const { studentId, direction } = event.currentTarget.dataset;
    const rows = this.data.rows.map((row: CorrectionRow) => {
      if (row.studentId !== studentId) return row;
      const delta = Math.round((row.delta + direction * STEP) * 10) / 10;
      return { ...row, delta, deltaLabel: `${delta > 0 ? "+" : delta < 0 ? "" : "±"}${delta}` };
    });
    this.setData({ rows });
  },
  onReasonInput(event: { detail: { value: string } }) {
    this.setData({ reason: event.detail.value });
  },
  async submit() {
    if (this.data.submitting) return;
    const changed = this.data.rows.filter((row: CorrectionRow) => row.delta !== 0);
    if (!changed.length) {
      wx.showToast({ title: "请先调整需要更正的课时", icon: "none" });
      return;
    }
    const reason = this.data.reason.trim() || "课时更正";
    this.setData({ submitting: true });
    try {
      for (const row of changed) {
        await correctCoachLesson(this.data.eventId, row.studentId, row.delta, reason);
      }
      wx.showToast({ title: "课时已更正", icon: "success" });
      wx.navigateBack({ delta: 1 });
    } catch (error) {
      this.setData({ submitting: false });
      wx.showToast({ title: error instanceof Error ? error.message : "更正失败，请稍后重试", icon: "none" });
    }
  },
});
