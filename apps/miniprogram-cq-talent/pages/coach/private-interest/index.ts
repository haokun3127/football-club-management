import { getCoachPreferences, saveCoachPreferences } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { resolveNavInset } from "../../../utils/presentation";

type FeatureState = "enabled" | "unavailable" | "pending";

interface AvailabilitySlot {
  key: string;
  label: string;
  selected: boolean;
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
  accepting: boolean;
  interactive: boolean;
  availabilityColumns: AvailabilityColumn[];
  feeMessage: string;
  saving: boolean;
}

const WEEK_DAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const TIME_SLOTS = ["17:00", "18:00", "19:00", "20:00"];
// 设计稿默认：周一至周五全时段可选
const DEFAULT_SLOTS = WEEK_DAYS.flatMap((_, dayIndex) =>
  dayIndex < 5 ? TIME_SLOTS.map((_, slotIndex) => slotKey(dayIndex, slotIndex)) : []);

function slotKey(dayIndex: number, slotIndex: number) {
  return `${dayIndex}-${slotIndex}`;
}

Page<PageData>({
  data: {
    navInset: resolveNavInset(),
    featureState: "pending",
    featureTitle: "私教服务状态待同步",
    featureMessage: "暂无法确认俱乐部是否已开通私教服务",
    accepting: false,
    interactive: false,
    availabilityColumns: buildColumns(new Set(DEFAULT_SLOTS)),
    feeMessage: "费用由俱乐部统一结算",
    saving: false,
  },
  onLoad() {
    const session = requireRole("coach");
    if (!session) return;
    void this.load(session.capabilities?.features?.private_lessons);
  },
  async load(feature: unknown) {
    if (feature !== true) {
      this.setData(featureOnly(feature));
      return;
    }
    this.setData({ ...featureOnly(true), interactive: true });
    try {
      const preferences = await getCoachPreferences();
      const selected = new Set(preferences.availabilitySlots.length > 0 ? preferences.availabilitySlots : DEFAULT_SLOTS);
      this.setData({
        accepting: preferences.acceptsPrivateLessons,
        availabilityColumns: buildColumns(selected),
      });
    } catch {
      wx.showToast({ title: "私教偏好读取失败", icon: "none" });
    }
  },
  async toggleAccepting() {
    if (!this.data.interactive || this.data.saving) return;
    const next = !this.data.accepting;
    this.setData({ accepting: next, saving: true });
    try {
      await saveCoachPreferences({ acceptsPrivateLessons: next, availabilitySlots: collectSelected(this.data.availabilityColumns) });
    } catch {
      this.setData({ accepting: !next });
      wx.showToast({ title: "保存失败，请重试", icon: "none" });
    } finally {
      this.setData({ saving: false });
    }
  },
  async toggleSlot(event: { currentTarget: { dataset: { key: string } } }) {
    if (!this.data.interactive || this.data.saving) return;
    const key = event.currentTarget.dataset.key;
    const columns = this.data.availabilityColumns.map((column: AvailabilityColumn) => ({
      ...column,
      slots: column.slots.map((slot: AvailabilitySlot) => (slot.key === key ? { ...slot, selected: !slot.selected } : slot)),
    }));
    this.setData({ availabilityColumns: columns, saving: true });
    try {
      await saveCoachPreferences({ acceptsPrivateLessons: this.data.accepting, availabilitySlots: collectSelected(columns) });
    } catch {
      this.setData({ availabilityColumns: this.data.availabilityColumns });
      wx.showToast({ title: "保存失败，请重试", icon: "none" });
    } finally {
      this.setData({ saving: false });
    }
  },
  goBack() {
    wx.navigateBack();
  },
});

function featureOnly(feature: unknown): Pick<PageData, "featureState" | "featureTitle" | "featureMessage" | "interactive"> {
  if (feature === true) {
    return {
      featureState: "enabled",
      featureTitle: "私教服务已开通",
      featureMessage: "开启私教兴趣后，家长可向您发起私教预约",
      interactive: false,
    };
  }
  if (feature === false) {
    return {
      featureState: "unavailable",
      featureTitle: "俱乐部未开通私教服务",
      featureMessage: "当前无法提供私教意向服务",
      interactive: false,
    };
  }
  return {
    featureState: "pending",
    featureTitle: "私教服务状态待同步",
    featureMessage: "暂无法确认俱乐部是否已开通私教服务",
    interactive: false,
  };
}

function buildColumns(selected: Set<string>): AvailabilityColumn[] {
  return WEEK_DAYS.map((day, dayIndex) => ({
    day,
    slots: TIME_SLOTS.map((label, slotIndex) => ({
      key: slotKey(dayIndex, slotIndex),
      label,
      selected: selected.has(slotKey(dayIndex, slotIndex)),
    })),
  }));
}

function collectSelected(columns: AvailabilityColumn[]): string[] {
  return columns.flatMap((column: AvailabilityColumn) => column.slots.filter((slot: AvailabilitySlot) => slot.selected).map((slot: AvailabilitySlot) => slot.key));
}
