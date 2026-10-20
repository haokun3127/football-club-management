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
  saveFailed: boolean;
  loadFailed: boolean;
}

const WEEK_DAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const TIME_SLOTS = ["17:00", "18:00", "19:00", "20:00"];
// 设计稿默认：周一至周五全时段可选
const DEFAULT_SLOTS = WEEK_DAYS.flatMap((_, dayIndex) =>
  dayIndex < 5 ? TIME_SLOTS.map((_, slotIndex) => slotKey(dayIndex, slotIndex)) : []);

function slotKey(dayIndex: number, slotIndex: number) {
  return `${dayIndex}-${slotIndex}`;
}

// 服务端对「从未配置」与「明确保存为空」都返回空数组，无法区分。
// 用本地标记记录「教练已成功保存过偏好」，以尊重明确保存的空配置（F-08）。
const PREFERENCES_SAVED_KEY = "coach-private-interest-preferences-saved-v1";

function hasSavedPreferences(): boolean {
  try {
    return wx.getStorageSync(PREFERENCES_SAVED_KEY) === true;
  } catch {
    return false;
  }
}

function markPreferencesSaved() {
  try {
    wx.setStorageSync(PREFERENCES_SAVED_KEY, true);
  } catch {
    // 本地标记仅用于区分默认值与空配置，写入失败不阻断保存流程。
  }
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
    saveFailed: false,
    loadFailed: false,
  },
  onLoad() {
    const session = requireRole("coach");
    if (!session) return;
    void this.load(session.capabilities?.features?.private_lessons);
  },
  retryLoad() {
    const session = requireRole("coach");
    if (!session) return;
    void this.load(session.capabilities?.features?.private_lessons);
  },
  async load(feature: unknown) {
    if (feature !== true) {
      this.setData(featureOnly(feature));
      return;
    }
    // 读取成功前禁用编辑与提交，避免把未知默认值覆盖到已有设置（F-09）。
    this.setData({ ...featureOnly(true), loadFailed: false });
    try {
      const preferences = await getCoachPreferences();
      // 首次未配置（本地无保存标记）时给设计稿默认；已明确保存为空则尊重空配置。
      const slots = preferences.availabilitySlots.length > 0 || hasSavedPreferences()
        ? preferences.availabilitySlots
        : DEFAULT_SLOTS;
      const selected = new Set(slots);
      this.setData({
        accepting: preferences.acceptsPrivateLessons,
        availabilityColumns: buildColumns(selected),
        interactive: true,
        loadFailed: false,
      });
    } catch {
      this.setData({ interactive: false, loadFailed: true });
      wx.showToast({ title: "私教偏好读取失败", icon: "none" });
    }
  },
  async toggleAccepting() {
    if (!this.data.interactive || this.data.saving) return;
    const previousAccepting = this.data.accepting;
    const next = !previousAccepting;
    this.setData({ accepting: next, saving: true });
    try {
      await saveCoachPreferences({ acceptsPrivateLessons: next, availabilitySlots: collectSelected(this.data.availabilityColumns) });
      markPreferencesSaved();
      this.setData({ saveFailed: false });
    } catch {
      this.setData({ accepting: previousAccepting, saveFailed: true });
      wx.showToast({ title: "保存失败，请重试", icon: "none" });
    } finally {
      this.setData({ saving: false });
    }
  },
  async toggleSlot(event: { currentTarget: { dataset: { key: string } } }) {
    if (!this.data.interactive || this.data.saving) return;
    const key = event.currentTarget.dataset.key;
    const previousColumns = this.data.availabilityColumns;
    const columns = previousColumns.map((column: AvailabilityColumn) => ({
      ...column,
      slots: column.slots.map((slot: AvailabilitySlot) => (slot.key === key ? { ...slot, selected: !slot.selected } : slot)),
    }));
    this.setData({ availabilityColumns: columns, saving: true });
    try {
      await saveCoachPreferences({ acceptsPrivateLessons: this.data.accepting, availabilitySlots: collectSelected(columns) });
      markPreferencesSaved();
      this.setData({ saveFailed: false });
    } catch {
      this.setData({ availabilityColumns: previousColumns, saveFailed: true });
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
