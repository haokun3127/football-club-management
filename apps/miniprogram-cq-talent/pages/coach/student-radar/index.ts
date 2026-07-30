import { getCoachStudentRadar, getCoachTeam } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import type { LoadState, RadarMetricPoint } from "../../../utils/types";

interface StudentChip {
  id: string;
  name: string;
}

interface PageData {
  state: LoadState;
  message: string;
  students: StudentChip[];
  activeStudentId: string;
  activeStudentName: string;
  radar: RadarMetricPoint[];
  overall: string;
}

Page<PageData>({
  data: {
    state: "idle",
    message: "",
    students: [],
    activeStudentId: "",
    activeStudentName: "",
    radar: [],
    overall: "-",
  },
  onLoad(query: { student?: string }) {
    this.load(query?.student || "");
  },
  async load(preferredStudentId: string) {
    const session = requireRole("coach");
    if (!session) return;
    this.setData({ state: "loading", message: "正在读取学员名单" });
    try {
      const team = await getCoachTeam();
      if (!team.members.length) {
        this.setData({ state: "empty", message: "近 30 天暂无执教学员。" });
        return;
      }
      const students = team.members.map((member) => ({ id: member.id, name: member.name }));
      const active = students.find((student) => student.id === preferredStudentId) ?? students[0];
      this.setData({ students });
      await this.loadRadar(active);
    } catch (error) {
      this.setData({ state: "error", message: error instanceof Error ? error.message : "学员名单读取失败，请稍后重试。" });
    }
  },
  async loadRadar(student: StudentChip) {
    this.setData({ state: "loading", message: `正在读取${student.name}的能力雷达` });
    try {
      const radar = await getCoachStudentRadar(student.id);
      const values = radar.map((point) => point.value).filter((value): value is number => typeof value === "number");
      this.setData({
        state: radar.length >= 3 ? "ready" : "empty",
        message: radar.length >= 3 ? "" : `${student.name} 暂无足够的评测数据生成雷达图。`,
        activeStudentId: student.id,
        activeStudentName: student.name,
        radar,
        overall: values.length ? String(Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)) : "-",
      });
    } catch (error) {
      this.setData({ state: "error", message: error instanceof Error ? error.message : "能力雷达读取失败，请稍后重试。" });
    }
  },
  selectStudent(event: { currentTarget: { dataset: { id: string; name: string } } }) {
    const { id, name } = event.currentTarget.dataset;
    if (id === this.data.activeStudentId) return;
    this.loadRadar({ id, name });
  },
  retry() {
    this.load("");
  },
});
