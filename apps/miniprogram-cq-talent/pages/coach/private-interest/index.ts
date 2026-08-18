import { requireRole } from "../../../utils/auth";
import { resolveNavInset } from "../../../utils/presentation";

type FeatureState = "enabled" | "unavailable" | "pending";

interface AvailabilitySlot {
  label: string;
  stateClass: string;
  textClass: string;
}

interface AvailabilityColumn {
  day: string;
  slots: AvailabilitySlot[];
}

interface PageData {
  navInset: number;
  featureState: FeatureState;
  featureTitle: string;
  featureMessage: string;
  acceptingToggleClass: string;
  availabilityColumns: AvailabilityColumn[];
  feeMessage: string;
}

const WEEK_DAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const TIME_SLOTS = ["17:00", "18:00", "19:00", "20:00"];

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
      featureMessage: "开启私教兴趣后，家长可向您发起私教预约",
      acceptingToggleClass: "c162-toggle c162-toggle--pending",
      availabilityColumns: buildAvailabilityColumns(),
      feeMessage: "费用由俱乐部统一结算",
    };
  }

  if (feature === false) {
    return {
      navInset: resolveNavInset(),
      featureState: "unavailable",
      featureTitle: "俱乐部未开通私教服务",
      featureMessage: "当前无法提供私教意向服务",
      acceptingToggleClass: "c162-toggle c162-toggle--off",
      availabilityColumns: buildAvailabilityColumns(),
      feeMessage: "费用由俱乐部统一结算",
    };
  }

  return {
    navInset: resolveNavInset(),
    featureState: "pending",
    featureTitle: "私教服务状态待同步",
    featureMessage: "暂无法确认俱乐部是否已开通私教服务",
    acceptingToggleClass: "c162-toggle c162-toggle--pending",
    availabilityColumns: buildAvailabilityColumns(),
    feeMessage: "费用由俱乐部统一结算",
  };
}

function buildAvailabilityColumns(): AvailabilityColumn[] {
  return WEEK_DAYS.map((day) => ({
    day,
    slots: TIME_SLOTS.map((label) => ({
      label,
      stateClass: "c162-slot--unavailable",
      textClass: "c162-slot__text--unavailable",
    })),
  }));
}
