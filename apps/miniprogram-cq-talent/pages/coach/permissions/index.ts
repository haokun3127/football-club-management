import { requireRole } from "../../../utils/auth";
import { resolveNavInset } from "../../../utils/presentation";
import type { Capabilities, LoadState } from "../../../utils/types";

const ENTRYPOINTS = [
  { key: "modify_activity", label: "修改活动", aliases: ["modify_activity", "event_change", "eventChangeRequests", "event-change-requests", "change-requests"] },
  { key: "bulk_attendance", label: "批量出勤", aliases: ["bulk_attendance", "batch_attendance", "attendance"] },
  { key: "assessment", label: "能力评估", aliases: ["assessment", "assessments"] },
  { key: "private_lesson", label: "发起私教", aliases: ["private_lesson", "private_lessons", "privateLessons"] },
  { key: "finance", label: "查看财务", aliases: ["finance", "payments", "view_finance"] },
] as const;

interface PermissionRow {
  key: string;
  label: string;
  enabled: boolean;
}

interface PageData {
  navInset: number;
  state: LoadState;
  message: string;
  permissions: PermissionRow[];
}

Page<PageData>({
  data: {
    navInset: resolveNavInset(),
    state: "idle",
    message: "",
    permissions: [],
  },
  onLoad() {
    this.load();
  },
  load() {
    const session = requireRole("coach");
    if (!session) return;

    const permissions = projectPermissions(session.capabilities);
    this.setData({
      state: "ready",
      message: "",
      permissions,
    });
  },
  goBack() {
    wx.navigateBack();
  },
});

function projectPermissions(capabilities: Capabilities | undefined): PermissionRow[] {
  const roleEntrypoints = capabilities?.client?.roleEntrypoints?.coach ?? [];
  const available = new Set(roleEntrypoints);
  const features = capabilities?.features ?? {};
  return ENTRYPOINTS.map((entrypoint) => ({
    key: entrypoint.key,
    label: entrypoint.label,
    enabled: entrypoint.aliases.some((alias) => available.has(alias))
      || (entrypoint.key === "private_lesson" && features.private_lessons === true)
      || (entrypoint.key === "finance" && features.payments === true),
  }));
}
