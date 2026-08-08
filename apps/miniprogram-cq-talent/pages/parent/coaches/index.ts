import { getClubCoachTeam } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { resolveMenuInset, resolveNavInset } from "../../../utils/presentation";

interface Coach {
  id: string;
  surname: string;
  name: string;
  role: string;
  roleBg: string;
  ringColor: string;
  bio: string;
}

interface PageData {
  teamName: string;
  teamChips: string[];
  teamGoal: string;
  coaches: Coach[];
}

const ROLE_STYLES = [
  { roleBg: "#fceeef", ringColor: "#a80f1b" },
  { roleBg: "#eff6ff", ringColor: "#3b82f6" },
  { roleBg: "#fffbeb", ringColor: "#d97706" },
  { roleBg: "#f0fdf4", ringColor: "#22c55e" },
];

Page<PageData>({
  data: {
    navInset: resolveNavInset(),
    menuInset: resolveMenuInset(),
    teamName: "重庆天才足球俱乐部",
    teamChips: [],
    teamGoal: "",
    coaches: [],
  },
  goBack() {
    wx.navigateBack();
  },
  onLoad() {
    requireRole("parent");
    this.loadCoachTeam();
  },
  async loadCoachTeam() {
    try {
      const team = await getClubCoachTeam();
      if (!team) return;
      this.setData({
        teamName: team.teamName,
        teamChips: team.teamChips,
        teamGoal: team.teamGoal,
        coaches: team.coaches.map((coach, index) => ({
          id: coach.id,
          surname: coach.name.slice(0, 1),
          name: coach.name,
          role: coach.role,
          roleBg: ROLE_STYLES[index % ROLE_STYLES.length]!.roleBg,
          ringColor: ROLE_STYLES[index % ROLE_STYLES.length]!.ringColor,
          bio: coach.bio,
        })),
      });
    } catch {
      wx.showToast({ title: "教练团队加载失败", icon: "none" });
    }
  },
  contactCoach(event: { currentTarget: { dataset: { name: string } } }) {
    wx.showToast({ title: `联系${event.currentTarget.dataset.name}教练请通过俱乐部`, icon: "none" });
  },
});
