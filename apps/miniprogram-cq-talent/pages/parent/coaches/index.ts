import { getClubCoachTeam } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { ClubCoachTeam, LoadState } from "../../../utils/types";

interface Coach {
  id: string;
  surname: string;
  name: string;
  bio: string;
  hasBio: boolean;
}

interface PageData {
  state: LoadState;
  message: string;
  teamName: string;
  teamCounts: string[];
  hasTeamCounts: boolean;
  coaches: Coach[];
  hasCoaches: boolean;
  emptyMessage: string;
}

Page<PageData>({
  data: {
    navInset: resolveNavInset(),
    menuInset: resolveMenuInset(),
    state: "loading",
    message: "正在加载教练团队",
    teamName: "",
    teamCounts: [],
    hasTeamCounts: false,
    coaches: [],
    hasCoaches: false,
    emptyMessage: "暂无可展示的教练",
  },
  goBack() {
    wx.navigateBack();
  },
  onLoad() {
    requireRole("parent");
    this.loadCoachTeam();
  },
  async loadCoachTeam() {
    this.setData({ state: "loading", message: "正在加载教练团队" });
    try {
      const team = await getClubCoachTeam();
      if (!team?.teamName) {
        this.setData({
          state: "empty",
          message: "暂无可展示的教练团队",
          teamName: "",
          teamCounts: [],
          hasTeamCounts: false,
          coaches: [],
          hasCoaches: false,
          emptyMessage: "暂无可展示的教练",
        });
        return;
      }
      const coaches = presentCoaches(team.coaches);
      const teamCounts = presentTeamCounts(team.teamChips);
      this.setData({
        state: "ready",
        message: "",
        teamName: team.teamName,
        teamCounts,
        hasTeamCounts: teamCounts.length > 0,
        coaches,
        hasCoaches: coaches.length > 0,
        emptyMessage: coaches.length > 0 ? "" : "暂无可展示的教练",
      });
    } catch {
      this.setData({
        state: "error",
        message: "教练团队加载失败，请点击重试",
        teamName: "",
        teamCounts: [],
        hasTeamCounts: false,
        coaches: [],
        hasCoaches: false,
        emptyMessage: "",
      });
    }
  },
});

function presentTeamCounts(teamChips: ClubCoachTeam["teamChips"]): string[] {
  return teamChips.filter((chip) => /^\d+(名球员|支队伍)$/.test(chip));
}

function presentCoaches(coaches: ClubCoachTeam["coaches"]): Coach[] {
  return coaches.map(({ id, name, bio }) => ({
    id,
    name,
    surname: name.slice(0, 1),
    bio,
    hasBio: Boolean(bio),
  }));
}
