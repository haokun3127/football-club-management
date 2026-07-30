import { getCoachTeam } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import type { LoadState } from "../../../utils/types";

interface MemberView {
  id: string;
  name: string;
  initial: string;
  avatarBg: string;
  avatarColor: string;
}

interface PageData {
  state: LoadState;
  message: string;
  teamName: string;
  season: string;
  memberCount: number;
  trainingCount: number;
  attendanceRate: string;
  members: MemberView[];
}

const AVATAR_THEMES = [
  { bg: "#fee2e2", color: "#a80f1b" },
  { bg: "#fef3c7", color: "#d97706" },
  { bg: "#e0e7ff", color: "#4f46e5" },
  { bg: "#ecfdf5", color: "#059669" },
];

Page<PageData>({
  data: {
    state: "idle",
    message: "",
    teamName: "",
    season: "",
    memberCount: 0,
    trainingCount: 0,
    attendanceRate: "-",
    members: [],
  },
  onLoad() {
    this.load();
  },
  async load() {
    const session = requireRole("coach");
    if (!session) return;
    this.setData({ state: "loading", message: "正在读取球队信息" });
    try {
      const detail = await getCoachTeam();
      this.setData({
        state: detail.members.length ? "ready" : "empty",
        message: detail.members.length ? "" : "近 30 天暂无执教活动与学员。",
        teamName: detail.team?.name || "我的球队",
        season: detail.team?.season || "",
        memberCount: detail.stats.memberCount,
        trainingCount: detail.stats.trainingCount,
        attendanceRate: detail.stats.attendanceRate === null ? "-" : `${detail.stats.attendanceRate}%`,
        members: detail.members.map((member, index) => {
          const theme = AVATAR_THEMES[index % AVATAR_THEMES.length] ?? AVATAR_THEMES[0] ?? { bg: "#fee2e2", color: "#a80f1b" };
          return {
            id: member.id,
            name: member.name,
            initial: member.name.slice(0, 1),
            avatarBg: theme.bg,
            avatarColor: theme.color,
          };
        }),
      });
    } catch (error) {
      this.setData({ state: "error", message: error instanceof Error ? error.message : "球队信息读取失败，请稍后重试。" });
    }
  },
  retry() {
    this.load();
  },
  openRadar(event: { currentTarget: { dataset: { id: string } } }) {
    openPage(`/pages/coach/student-radar/index?student=${event.currentTarget.dataset.id}`);
  },
});
