import { getParentChildren, getParentStudentHome } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { formatDateTime, resolveNavInset } from "../../../utils/presentation";
import { setCurrentStudentId } from "../../../utils/store";
import type { LoadState, StudentHome, StudentSummary } from "../../../utils/types";

Page({
  data: {
    navInset: resolveNavInset(),
    state: "loading" as LoadState,
    message: "正在读取孩子档案",
    children: [] as StudentSummary[],
    activeStudentId: "",
    activeChild: null as StudentSummary | null,
    studentHome: null as StudentHome | null,
    avatarLetter: "",
    teamLabel: "",
    coachLabel: "",
    updatedAtLabel: "",
    heroStats: [] as Array<{ label: string; value: string }>,
    recentActivities: [] as Array<{ title: string; date: string }>,
    reminderTitle: "本周暂无待办提醒",
    reminderSub: "日程有更新会在这里显示",
  },
  onLoad() {
    this.load();
  },
  async load() {
    const session = requireRole("parent");
    if (!session) return;
    this.setData({ state: "loading", message: "正在读取孩子档案" });
    try {
      const children = await getParentChildren();
      if (!children.length) {
        this.setData({ state: "empty", message: "当前账号没有绑定孩子，请联系俱乐部确认手机号。" });
        return;
      }
      const active = children.find((child) => child.id === session.currentStudentId) ?? children[0];
      if (!active) {
        this.setData({ state: "empty", message: "当前账号没有绑定孩子，请联系俱乐部确认手机号。" });
        return;
      }
      setCurrentStudentId(active.id);
      const studentHome = await getParentStudentHome(active);
      this.setData({
        state: "ready",
        message: "",
        children,
        activeStudentId: active.id,
        activeChild: { ...active, trainingStatus: trainingStatusLabel(active.trainingStatus) },
        studentHome,
        avatarLetter: active.name.slice(0, 1),
        teamLabel: active.teams.join("、") || "队伍待确认",
        coachLabel: active.coachNames.join("、") || "教练待确认",
        updatedAtLabel: studentHome.updatedAt ? formatDateTime(studentHome.updatedAt) : "随俱乐部档案更新",
        heroStats: buildHeroStats(studentHome),
        recentActivities: buildRecentActivities(studentHome),
        reminderTitle: studentHome.clubInfo[0]?.value || "本周暂无待办提醒",
        reminderSub: studentHome.clubInfo[0]?.label || "日程有更新会在这里显示",
      });
    } catch (error) {
      this.setData({ state: "error", message: readableError(error) });
    }
  },
  switchChild(event: { detail: { studentId: string } }) {
    const id = event.detail.studentId;
    if (!id || id === this.data.activeStudentId) return;
    setCurrentStudentId(id);
    this.load();
  },
  retry() {
    this.load();
  },
  openStatus() {
    openPage(`/pages/parent/status/index?student=${this.data.activeStudentId}`);
  },
  openContent() {
    openPage("/pages/parent/content/index");
  },
  openPrivate() {
    openPage(`/pages/parent/private/index?student=${this.data.activeStudentId}`);
  },
  openBinding() {
    openPage("/pages/parent/binding/index");
  },
  openSchedule() {
    openPage("/pages/parent/schedule/index");
  },
  openGrowth() {
    openPage("/pages/parent/growth/index");
  },
  openRadar() {
    openPage("/pages/parent/radar/index");
  },
  openCoach() {
    openPage("/pages/parent/coaches/index");
  },

});

function buildHeroStats(home: StudentHome) {
  const lessonText = home.lessonStatus.map((item) => `${item.label} ${item.value}`);
  const profileText = home.profile.map((item) => `${item.label} ${item.value}`);
  return [
    { label: "训练课时", value: extractHomeMetric(lessonText, /(\d+(?:\.\d+)?)\s*(?:课时|课|节)/) },
    { label: "出勤率", value: extractHomeMetric(lessonText, /(\d+(?:\.\d+)?)\s*%/, "%") },
    { label: "在队时长", value: extractDuration(profileText) },
  ];
}

function extractHomeMetric(values: string[], pattern: RegExp, suffix = "") {
  for (const value of values) {
    const match = value.match(pattern);
    if (match?.[1]) return `${match[1]}${suffix}`;
  }
  return "—";
}

function extractDuration(values: string[]) {
  for (const value of values) {
    const match = value.match(/(\d+年(?:\d+个月)?|\d+个月)/);
    if (match?.[1]) return match[1];
  }
  return "—";
}

function buildRecentActivities(home: StudentHome) {
  const sources = [...home.lessonStatus, ...home.insuranceStatus, ...home.profile].slice(0, 3);
  const fallback = ["完成本周训练", "更新训练数据", "档案信息已同步"];
  return [0, 1, 2].map((index) => ({
    title: sources[index]?.value || fallback[index],
    date: sources[index]?.label || "近期更新",
  }));
}

function readableError(error: unknown) {
  const record = error as { message?: string; code?: string };
  return record?.message || record?.code || "孩子档案读取失败。";
}

function trainingStatusLabel(status?: string) {
  const labels: Record<string, string> = { active: "在训", enrolled: "在训", paused: "暂停训练", inactive: "已停训", graduated: "已结业" };
  return labels[String(status ?? "").toLowerCase()] || status || "在训";
}
