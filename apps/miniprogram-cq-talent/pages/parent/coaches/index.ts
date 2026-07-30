import { requireRole } from "../../../utils/auth";

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

// Figma Coach Team 设计内容（静态，待后端教练档案服务接入）
Page<PageData>({
  data: {
    teamName: "凤凰山足球俱乐部 U10精英队",
    teamChips: ["18名球员", "2020年成立"],
    teamGoal: "本赛季目标：打造更强的团队凝聚力与战术执行力，争取联赛前三名。",
    coaches: [
      { id: "c1", surname: "林", name: "林建国", role: "主教练", roleBg: "#fceeef", ringColor: "#a80f1b", bio: "技术型 · 执教年限 8年 · 专注于球员战术意识提升" },
      { id: "c2", surname: "张", name: "张明", role: "助教", roleBg: "#eff6ff", ringColor: "#3b82f6", bio: "防守专项 · 执教年限 5年 · 专注于球员防守意识提升" },
      { id: "c3", surname: "陈", name: "陈力", role: "体能教练", roleBg: "#fffbeb", ringColor: "#d97706", bio: "体能专项 · 执教年限 6年 · 专注于球员爆发力与耐力提升" },
    ],
  },
  onLoad() {
    requireRole("parent");
  },
  contactCoach(event: { currentTarget: { dataset: { name: string } } }) {
    wx.showToast({ title: `联系${event.currentTarget.dataset.name}教练请通过俱乐部`, icon: "none" });
  },
});
