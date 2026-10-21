import { init, type Chart } from "../../vendor/ec-canvas/echarts";
import { radarOption, type PlotSeries } from "../../utils/radar-option";
import type { RadarMetricPoint } from "../../utils/types";
type CanvasBridge = {
  init(
    callback: (
      canvas: unknown,
      width: number,
      height: number,
      dpr: number,
    ) => Chart | undefined,
  ): void;
};
function isCanvasBridge(value: unknown): value is CanvasBridge {
  return (
    !!value &&
    typeof value === "object" &&
    "init" in value &&
    typeof value.init === "function"
  );
}
const charts = new WeakMap<object, Chart>(),
  ready = new WeakSet<object>(),
  initializing = new WeakSet<object>();
Component({
  externalClasses: ["host-class"],
  properties: {
    metrics: { type: Array, value: [] },
    series: { type: Array, value: [] },
    configured: { type: Boolean, value: false },
    selectedMetricId: { type: String, value: "" },
    dark: { type: Boolean, value: false },
    width: { type: String, value: "100%" },
    height: { type: String, value: "300px" },
    geometry: { type: String, value: "default" },
  },
  data: {
    ec: { lazyLoad: true, disableTouch: true },
    empty: false,
    failed: false,
  },
  observers: {
    "metrics, series, configured, dark, width, height"() {
      if (ready.has(this)) this.draw();
    },
  },
  lifetimes: {
    ready() {
      ready.add(this);
      this.draw();
    },
    detached() {
      ready.delete(this);
      charts.get(this)?.dispose();
      charts.delete(this);
      initializing.delete(this);
    },
  },
  methods: {
    draw() {
      const metrics = this.data.metrics as RadarMetricPoint[],
        series = this.data.series as PlotSeries[];
      const option = radarOption(
        metrics,
        series,
        this.data.configured,
        this.data.dark,
      );
      this.setData({ empty: option.series[0]!.data.length === 0 });
      const chart = charts.get(this);
      if (chart) {
        try {
          chart.resize?.();
          chart.setOption(option, true);
          this.setData({ failed: false });
        } catch {
          this.setData({ failed: true });
        }
        return;
      }
      if (initializing.has(this) || !ready.has(this)) return;
      const canvas: unknown = this.selectComponent(".ec-chart");
      if (!isCanvasBridge(canvas)) return;
      initializing.add(this);
      try {
        canvas.init((node, width, height, dpr) => {
          initializing.delete(this);
          if (!ready.has(this)) return;
          try {
            const instance = init(node, null, {
              width,
              height,
              devicePixelRatio: dpr,
            });
            if (
              node &&
              typeof node === "object" &&
              "setChart" in node &&
              typeof node.setChart === "function"
            )
              node.setChart(instance);
            charts.set(this, instance);
            instance.setOption(
              radarOption(
                this.data.metrics as RadarMetricPoint[],
                this.data.series as PlotSeries[],
                this.data.configured,
                this.data.dark,
              ),
              true,
            );
            this.setData({ failed: false });
            return instance;
          } catch {
            this.setData({ failed: true });
            return undefined;
          }
        });
      } catch {
        initializing.delete(this);
        this.setData({ failed: true });
      }
    },
  },
});
