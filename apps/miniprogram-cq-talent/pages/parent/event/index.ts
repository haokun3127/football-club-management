import { getParentActivityDetail } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import type { ActivityDetail, LoadState } from "../../../utils/types";

Page({
  data: {
    state: "loading" as LoadState,
    message: "正在读取活动详情",
    detail: null as ActivityDetail | null,
  },
  onLoad(query?: Record<string, string | undefined>) {
    requireRole("parent");
    this.load(query?.id || "");
  },
  async load(id: string) {
    if (!id) {
      this.setData({ state: "error", message: "缺少活动 ID" });
      return;
    }
    try {
      const detail = await getParentActivityDetail(id);
      this.setData({ state: "ready", detail, message: "" });
    } catch (error) {
      this.setData({ state: "error", message: readableError(error) });
    }
  },
});

function readableError(error: unknown) {
  const record = error as { message?: string; code?: string };
  return record?.message || record?.code || "活动详情读取失败。";
}
