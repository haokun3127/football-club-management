import { getCoachHome } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { DEV_TEST_DATE } from "../../../utils/config";
import { openPage } from "../../../utils/navigation";
import type { CoachHome, LoadState } from "../../../utils/types";

Page({
  data: {
    state: "loading" as LoadState,
    message: "正在读取教练课表",
    home: null as CoachHome | null,
    teamsText: "",
    events: [],
    date: DEV_TEST_DATE,
  },
  onLoad() {
    this.load();
  },
  async load() {
    const session = requireRole("coach");
    if (!session) return;
    this.setData({ state: "loading", message: "正在读取教练课表" });
    try {
      const home = await getCoachHome(this.data.date);
      this.setData({
        state: home.events.length ? "ready" : "empty",
        message: home.events.length ? "" : "今日没有负责的活动。",
        home,
        teamsText: home.teams.length ? home.teams.join("、") : "负责球队接口待同步",
        events: home.events,
      });
    } catch (error) {
      this.setData({ state: "error", message: readableError(error) });
    }
  },
  openEvent(event: { currentTarget: { dataset: { id?: string } } }) {
    const id = event.currentTarget.dataset.id;
    if (id) openPage(`/pages/coach/event/index?id=${id}`);
  },
  retry() {
    this.load();
  },
});

function readableError(error: unknown) {
  const record = error as { message?: string; code?: string };
  return record?.message || record?.code || "教练课表读取失败。";
}
