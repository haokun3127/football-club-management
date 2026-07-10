import { getParentChildren, getParentStudentHome } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { formatDateTime } from "../../../utils/presentation";
import { setCurrentStudentId } from "../../../utils/store";
import type { LoadState, StudentHome, StudentSummary } from "../../../utils/types";

Page({
  data: {
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
});

function readableError(error: unknown) {
  const record = error as { message?: string; code?: string };
  return record?.message || record?.code || "孩子档案读取失败。";
}

function trainingStatusLabel(status?: string) {
  const labels: Record<string, string> = { active: "在训", enrolled: "在训", paused: "暂停训练", inactive: "已停训", graduated: "已结业" };
  return labels[String(status ?? "").toLowerCase()] || status || "在训";
}
