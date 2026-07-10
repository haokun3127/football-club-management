import { getParentActivityDetail } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { activityStatus, activityTypeLabel } from "../../../utils/presentation";
import type { ActivityDetail, LoadState } from "../../../utils/types";

type ActivityDetailView = ActivityDetail & {
  typeLabel: string;
  eyebrow: string;
  subtitle: string;
  statusLabel: string;
  statusTone: string;
  symbol: string;
};

Page({
  data: {
    state: "loading" as LoadState,
    message: "正在读取活动详情",
    eventId: "",
    detail: null as ActivityDetailView | null,
  },
  onLoad(query?: Record<string, string | undefined>) {
    requireRole("parent");
    const eventId = query?.id || "";
    this.setData({ eventId });
    this.load(eventId);
  },
  async load(id: string) {
    if (!id) {
      this.setData({ state: "error", message: "这条活动信息暂时无法打开，请从日程重新进入。" });
      return;
    }
    try {
      const detail = await getParentActivityDetail(id);
      this.setData({ state: "ready", detail: presentDetail(detail), message: "" });
    } catch (error) {
      this.setData({ state: "error", message: readableError(error) });
    }
  },
  retry() {
    this.load(this.data.eventId);
  },
});

function presentDetail(detail: ActivityDetail): ActivityDetailView {
  const status = activityStatus(detail.status);
  const variants = {
    training: { eyebrow: "TRAINING", subtitle: "训练内容、出勤与课后反馈", symbol: "训" },
    match: { eyebrow: "MATCH DAY", subtitle: "赛前信息、比分与孩子表现", symbol: "赛" },
    other: { eyebrow: "CLUB EVENT", subtitle: "活动说明、参与状态与通知", symbol: "活" },
  } as const;
  return { ...detail, typeLabel: activityTypeLabel(detail.type), statusLabel: status.label, statusTone: status.tone, ...variants[detail.type] };
}

function readableError(error: unknown) {
  const record = error as { message?: string; code?: string };
  return record?.message || record?.code || "活动详情读取失败。";
}
