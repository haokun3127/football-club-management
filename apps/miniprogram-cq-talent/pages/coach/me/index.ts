import { getCoachHome } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import type { CoachHome, LoadState } from "../../../utils/types";

Page({
  data: {
    state: "loading" as LoadState,
    message: "正在读取教练身份",
    home: null as CoachHome | null,
    displayName: "教练身份已绑定",
    teamsText: "",
  },
  onLoad() {
    this.load();
  },
  async load() {
    const session = requireRole("coach");
    if (!session) return;
    this.setData({ state: "loading", message: "正在读取教练身份", displayName: session.displayName || "教练身份已绑定" });
    try {
      const home = await getCoachHome();
      this.setData({
        state: "ready",
        message: "",
        home,
        teamsText: home.teams.length ? home.teams.join("、") : "负责球队接口待同步",
      });
    } catch (error) {
      this.setData({ state: "error", message: readableError(error) });
    }
  },
  retry() {
    this.load();
  },
});

function readableError(error: unknown) {
  const record = error as { message?: string; code?: string };
  return record?.message || record?.code || "教练身份读取失败。";
}
