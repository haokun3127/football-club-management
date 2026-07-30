import { getCoachHome } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import type { CoachHome, LoadState } from "../../../utils/types";

Page({
  data: {
    state: "loading" as LoadState,
    message: "正在读取教练身份",
    home: null as CoachHome | null,
    displayName: "教练身份已绑定",
    avatarLetter: "教",
    teamsText: "",
  },
  onLoad() {
    this.load();
  },
  async load() {
    const session = requireRole("coach");
    if (!session) return;
    const displayName = session.displayName || "教练身份已绑定";
    this.setData({ state: "loading", message: "正在读取教练身份", displayName, avatarLetter: displayName.slice(0, 1) });
    try {
      const home = await getCoachHome();
      const resolvedDisplayName = home.coachName || displayName;
      this.setData({
        state: "ready",
        message: "",
        home,
        displayName: resolvedDisplayName,
        avatarLetter: resolvedDisplayName.slice(0, 1),
        teamsText: home.teams.length ? home.teams.join("、") : "暂无负责球队",
      });
    } catch (error) {
      this.setData({ state: "error", message: readableError(error) });
    }
  },
  retry() {
    this.load();
  },
  openTeam() {
    openPage("/pages/coach/team/index");
  },
  openStudentRadar() {
    openPage("/pages/coach/student-radar/index");
  },
  openTeamAbility() {
    openPage("/pages/coach/team-ability/index");
  },
});

function readableError(error: unknown) {
  const record = error as { message?: string; code?: string };
  return record?.message || record?.code || "教练身份读取失败。";
}
