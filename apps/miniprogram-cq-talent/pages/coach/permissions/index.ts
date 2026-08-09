import { requireRole } from "../../../utils/auth";
import { resolveNavInset } from "../../../utils/presentation";
import type { LoadState } from "../../../utils/types";

const ENTRYPOINTS = [
  { key: "calendar", label: "日程" },
  { key: "attendance", label: "出勤" },
  { key: "training", label: "训练" },
  { key: "matches", label: "比赛" },
  { key: "assessment", label: "能力评估" },
] as const;

interface PermissionRow {
  key: (typeof ENTRYPOINTS)[number]["key"];
  label: string;
  enabled: true;
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

    const permissions = projectEntrypoints(session.capabilities?.client?.roleEntrypoints?.coach);
    this.setData({
      state: permissions.length ? "ready" : "empty",
      message: permissions.length ? "" : "当前未配置可用入口",
      permissions,
    });
  },
  goBack() {
    wx.navigateBack();
  },
});

function projectEntrypoints(entrypoints: unknown): PermissionRow[] {
  const available = new Set(Array.isArray(entrypoints) ? entrypoints : []);
  return ENTRYPOINTS.filter((entrypoint) => available.has(entrypoint.key)).map((entrypoint) => ({
    ...entrypoint,
    enabled: true,
  }));
}
