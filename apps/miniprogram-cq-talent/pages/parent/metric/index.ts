import { requireRole } from "../../../utils/auth";
import type { LoadState } from "../../../utils/types";

Page({
  data: {
    state: "pending" as LoadState,
    metricId: "",
    studentId: "",
  },
  onLoad(query?: Record<string, string | undefined>) {
    requireRole("parent");
    this.setData({
      metricId: query?.metricId || "",
      studentId: query?.studentId || "",
    });
  },
});
