import { getCoachHome, getCoachWorkbench } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import type { CoachHome, CoachWorkbench, LoadState, RadarMetricPoint } from "../../../utils/types";

const pendingRadar: RadarMetricPoint[] = [
  { metricId: "coverage", label: "能力覆盖", value: 0, maxValue: 100 },
  { metricId: "testing", label: "测试任务", value: 0, maxValue: 100 },
  { metricId: "history", label: "训练历程", value: 0, maxValue: 100 },
];

Page({
  data: {
    state: "loading" as LoadState,
    message: "正在读取训练管理",
    home: null as CoachHome | null,
    teamsText: "",
    workbench: null as CoachWorkbench | null,
    radar: pendingRadar,
  },
  onLoad() {
    this.load();
  },
  async load() {
    const session = requireRole("coach");
    if (!session) return;
    this.setData({ state: "loading", message: "正在读取训练管理" });
    try {
      const home = await getCoachHome();
      const firstEvent = home.events[0];
      const workbench = firstEvent ? await getCoachWorkbench(firstEvent.id) : null;
      this.setData({
        state: "ready",
        message: "",
        home,
        teamsText: home.teams.length ? home.teams.join("、") : "负责球队接口待同步",
        workbench,
        radar: pendingRadar,
      });
    } catch (error) {
      this.setData({ state: "error", message: readableError(error) });
    }
  },
  openTestEntry() {
    const eventId = this.data.workbench?.event.id || "";
    const templateId = this.data.workbench?.assessmentTemplateId || "";
    openPage(`/pages/coach/test-entry/index?eventId=${eventId}&templateId=${templateId}`);
  },
  retry() {
    this.load();
  },
});

function readableError(error: unknown) {
  const record = error as { message?: string; code?: string };
  return record?.message || record?.code || "训练管理读取失败。";
}
