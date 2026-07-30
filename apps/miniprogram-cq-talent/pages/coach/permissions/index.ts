import { requireRole } from "../../../utils/auth";

interface PermissionRow {
  key: string;
  label: string;
  enabled: boolean;
}

Page({
  data: {
    permissions: [
      { key: "edit-event", label: "修改活动", enabled: true },
      { key: "batch-attendance", label: "批量出勤", enabled: true },
      { key: "assessment", label: "能力评估", enabled: true },
      { key: "match-manage", label: "赛事管理", enabled: true },
      { key: "student-profile", label: "学员档案", enabled: true },
      { key: "private-lesson", label: "私教预约", enabled: false },
    ] as PermissionRow[],
  },
  onLoad() {
    requireRole("coach");
  },
  explainToggle() {
    wx.showToast({ title: "权限由俱乐部管理员分配", icon: "none" });
  },
});
