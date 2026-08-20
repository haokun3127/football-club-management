import { getClubCoachTeam } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { ClubCoachTeam, LoadState } from "../../../utils/types";

interface Coach {
  id: string;
  surname: string;
  name: string;
  role: string;
  ringColor: string;
  hasRole: boolean;
  bio: string;
  hasBio: boolean;
  wechatId: string;
  hasWechat: boolean;
}

interface PageData {
  state: LoadState;
  message: string;
  teamName: string;
  teamCounts: string[];
  hasTeamCounts: boolean;
  teamGoal: string;
  hasGoal: boolean;
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
    teamGoal: "",
    hasGoal: false,
    coaches: [],
    hasCoaches: false,
    emptyMessage: "暂无可展示的教练",
  },
  goBack() {
    wx.navigateBack();
  },
  copyCoachWechat(event: { currentTarget: { dataset: { wechat: string } } }) {
    const wechatId = event.currentTarget.dataset.wechat;
    if (!wechatId) return;
    wx.setClipboardData({ data: wechatId });
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
          teamGoal: "",
          hasGoal: false,
          coaches: [],
          hasCoaches: false,
          emptyMessage: "暂无可展示的教练",
        });
        return;
      }
      const coaches = presentCoaches(team.coaches);
      const teamCounts = presentTeamCounts(team.teamChips);
      const teamGoal = (team.teamGoal ?? "").trim();
      this.setData({
        state: "ready",
        message: "",
        teamName: team.teamName,
        teamCounts,
        hasTeamCounts: teamCounts.length > 0,
        teamGoal,
        hasGoal: teamGoal.length > 0,
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
        teamGoal: "",
        hasGoal: false,
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
  return coaches.map(({ id, name, role, bio, wechatId }) => {
    const trimmedRole = (role ?? "").trim();
    const contact = (wechatId ?? "").trim();
    return {
      id,
      name,
      surname: name.slice(0, 1),
      role: trimmedRole,
      ringColor: roleColorOf(trimmedRole),
      hasRole: trimmedRole.length > 0,
      bio,
      hasBio: Boolean(bio),
      wechatId: contact,
      hasWechat: contact.length > 0,
    };
  });
}

// 设计稿角色色：主教练红 / 助教蓝 / 体能橙；其他教练默认蓝
function roleColorOf(role: string): string {
  if (role.includes("主教练")) return "#a80f1b";
  if (role.includes("体能")) return "#ea580c";
  return "#2563eb";
}
