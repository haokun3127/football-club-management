import { getRadarComparison } from "../../utils/api";
import {
  comparisonView,
  type ComparisonData,
} from "../../utils/radar-comparison";
import type { RadarMetricPoint } from "../../utils/types";
const mounted = new WeakSet<object>(),
  generations = new WeakMap<object, number>(),
  identities = new WeakMap<object, string>();
Component({
  properties: {
    studentId: { type: String, value: "" },
    role: { type: String, value: "parent" },
    teamId: { type: String, value: "" },
    fallbackMetrics: { type: Array, value: [] },
  },
  data: {
    state: "idle",
    message: "",
    data: null as ComparisonData | null,
    viewId: "",
    selectedIds: [] as string[],
    hiddenIds: [] as string[],
    historyResultId: "",
    standardId: "",
    metrics: [] as RadarMetricPoint[],
    plots: [] as ReturnType<typeof comparisonView>["plots"],
    issues: [] as Array<{ id: string; text: string }>,
    legends: [] as ReturnType<typeof comparisonView>["legends"],
    rows: [] as ReturnType<typeof comparisonView>["rows"],
    axisOptions: [] as Array<{ label: string; value: string }>,
    viewOptions: [] as Array<{ label: string; value: string }>,
    historyOptions: [] as Array<{ label: string; value: string }>,
    standardOptions: [] as Array<{ label: string; value: string }>,
    selectionLabel: "",
    viewName: "",
    allHidden: false,
    panel: "",
    historyReason: "",
    standardReason: "",
  },
  observers: {
    "studentId, role, teamId"() {
      if (mounted.has(this)) this.load();
    },
  },
  lifetimes: {
    attached() {
      mounted.add(this);
      this.load();
    },
    detached() {
      mounted.delete(this);
      generations.set(this, (generations.get(this) ?? 0) + 1);
      identities.delete(this);
    },
  },
  methods: {
    async load(force = false) {
      if (
        !this.data.studentId ||
        !["parent", "coach"].includes(this.data.role)
      ) {
        generations.set(this, (generations.get(this) ?? 0) + 1);
        identities.delete(this);
        this.setData({
          state: "idle",
          data: null,
          metrics: [],
          plots: [],
          rows: [],
          legends: [],
          issues: [],
          panel: "",
        });
        return;
      }
      const identity = JSON.stringify([
          this.data.studentId,
          this.data.role,
          this.data.teamId,
        ]),
        changed = identity !== identities.get(this);
      if (!changed && !force) return;
      identities.set(this, identity);
      const version = (generations.get(this) ?? 0) + 1;
      generations.set(this, version);
      if (changed)
        this.setData({
          data: null,
          viewId: "",
          selectedIds: [],
          hiddenIds: [],
          historyResultId: "",
          standardId: "",
          rows: [],
          metrics: [],
          plots: [],
          legends: [],
          issues: [],
        });
      this.setData({
        state: "loading",
        message: "正在读取已确认能力",
        data: null,
        metrics: [],
        plots: [],
        rows: [],
        legends: [],
        issues: [],
      });
      try {
        const data = await getRadarComparison(
          this.data.studentId,
          this.data.role as "parent" | "coach",
          this.data.teamId || undefined,
          {
            historyResultId: this.data.historyResultId || undefined,
            standardId: this.data.standardId || undefined,
          },
        );
        if (!mounted.has(this) || generations.get(this) !== version) return;
        const view =
          data.views.find((item) => item.id === this.data.viewId) ??
          data.views[0];
        const selectedIds = changed
          ? (view?.metricIds ?? []).slice(0, 8)
          : (this.data.selectedIds as string[]).filter((id) =>
              view?.metricIds.includes(id),
            );
        this.setData({
          state: "ready",
          message: "",
          data,
          viewId: view?.id || "",
          selectedIds,
          viewOptions: data.views.map((item) => ({
            label: item.name,
            value: item.id,
          })),
          historyOptions: [
            { label: "不添加历史", value: "" },
            ...data.comparisonOptions.history.map((item) => ({
              label: item.label,
              value: item.id,
            })),
          ],
          standardOptions: [
            { label: "不添加标准", value: "" },
            ...data.comparisonOptions.standards.map((item) => ({
              label: item.label,
              value: item.id,
            })),
          ],
          historyReason: data.comparisonOptions.historyReason,
          standardReason: data.comparisonOptions.standardReason,
        });
        this.present();
      } catch {
        if (mounted.has(this) && generations.get(this) === version)
          this.setData({
            state: "error",
            message: "已确认能力对比读取失败，请重试。",
          });
      }
    },
    present() {
      if (this.data.data)
        this.setData(
          comparisonView(
            this.data.data as ComparisonData,
            this.data.viewId,
            this.data.selectedIds as string[],
            this.data.hiddenIds as string[],
          ),
        );
    },
    openMetrics() {
      this.setData({ panel: "metrics" });
    },
    openComparisons() {
      this.setData({ panel: "comparisons" });
    },
    closePanel() {
      this.setData({ panel: "" });
    },
    changeView(event: { detail: { value: string } }) {
      const view = (this.data.data as ComparisonData | null)?.views.find(
        (item) => item.id === event.detail.value,
      );
      if (!view) return;
      this.setData({
        viewId: view.id,
        selectedIds: view.metricIds.slice(0, 8),
      });
      this.present();
    },
    changeAxes(event: { detail: { value: string[] } }) {
      const values = event.detail.value;
      if (!Array.isArray(values) || values.length > 8) {
        wx.showToast({ title: "雷达最多选择8项，可取消后替换", icon: "none" });
        return;
      }
      const allowed = new Set(
        (this.data.axisOptions as Array<{ value: string }>).map(
          (option) => option.value,
        ),
      );
      this.setData({ selectedIds: values.filter((id) => allowed.has(id)) });
      this.present();
    },
    changeHistory(event: { detail: { value: string } }) {
      if (
        !(this.data.historyOptions as Array<{ value: string }>).some(
          (option) => option.value === event.detail.value,
        )
      )
        return;
      this.setData({ historyResultId: event.detail.value });
      return this.load(true);
    },
    changeStandard(event: { detail: { value: string } }) {
      if (
        !(this.data.standardOptions as Array<{ value: string }>).some(
          (option) => option.value === event.detail.value,
        )
      )
        return;
      this.setData({ standardId: event.detail.value });
      return this.load(true);
    },
    toggleSeries(event: { currentTarget: { dataset: { id: string } } }) {
      const id = event.currentTarget.dataset.id;
      if (
        !(this.data.legends as Array<{ id: string }>).some(
          (item) => item.id === id,
        )
      )
        return;
      const hidden = new Set(this.data.hiddenIds as string[]);
      hidden.has(id) ? hidden.delete(id) : hidden.add(id);
      this.setData({ hiddenIds: [...hidden] });
      this.present();
    },
    openMetric(event: { currentTarget: { dataset: { id: string } } }) {
      if (this.data.role === "parent")
        this.triggerEvent("metrictap", {
          metricId: event.currentTarget.dataset.id,
        });
    },
    restoreSeries() {
      this.setData({ hiddenIds: [] });
      this.present();
    },
    clearComparisons() {
      this.setData({historyResultId:"",standardId:"",hiddenIds:[]});
      return this.load(true);
    },
    retry() {
      return this.load(true);
    },
  },
});
