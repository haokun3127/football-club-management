import { requireRole } from "../../../utils/auth";
import { resolveNavInset } from "../../../utils/presentation";

type FeatureState = "enabled" | "unavailable" | "pending";

interface PageData {
  navInset: number;
  featureState: FeatureState;
  featureTitle: string;
  featureMessage: string;
  coachStatus: string;
  availabilityMessage: string;
}

Page<PageData>({
  data: featurePageData(undefined),
  onLoad() {
    const session = requireRole("coach");
    if (!session) return;
    this.setData(featurePageData(session.capabilities?.features?.private_lessons));
  },
  goBack() {
    wx.navigateBack();
  },
});

function featurePageData(feature: unknown): PageData {
  if (feature === true) {
    return {
      navInset: resolveNavInset(),
      featureState: "enabled",
      featureTitle: "私教服务已开通",
      featureMessage: "家长可提交私教意向，当前教练接单状态与确认排期尚未接入",
      coachStatus: "状态待同步",
      availabilityMessage: "当前教练可用时段尚未接入",
    };
  }

  if (feature === false) {
    return {
      navInset: resolveNavInset(),
      featureState: "unavailable",
      featureTitle: "俱乐部未开通私教服务",
      featureMessage: "当前无法提供私教意向服务",
      coachStatus: "状态待同步",
      availabilityMessage: "俱乐部未开通，暂无可用时段",
    };
  }

  return {
    navInset: resolveNavInset(),
    featureState: "pending",
    featureTitle: "私教服务状态待同步",
    featureMessage: "暂无法确认俱乐部是否已开通私教服务",
    coachStatus: "状态待同步",
    availabilityMessage: "当前教练可用时段尚未接入",
  };
}
