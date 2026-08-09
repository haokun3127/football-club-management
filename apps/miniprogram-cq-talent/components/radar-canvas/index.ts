import type { RadarMetricPoint } from "../../utils/types";

interface CanvasNode {
  width: number;
  height: number;
  getContext: (type: "2d") => CanvasRenderingContext2D;
}

interface CanvasRenderingContext2D {
  scale: (x: number, y: number) => void;
  clearRect: (x: number, y: number, w: number, h: number) => void;
  beginPath: () => void;
  moveTo: (x: number, y: number) => void;
  lineTo: (x: number, y: number) => void;
  closePath: () => void;
  stroke: () => void;
  fill: () => void;
  arc: (x: number, y: number, radius: number, startAngle: number, endAngle: number) => void;
  fillText: (text: string, x: number, y: number) => void;
  setLineDash?: (segments: number[]) => void;
  strokeStyle: string;
  fillStyle: string;
  lineWidth: number;
  font: string;
  textAlign: "center" | "left" | "right";
  textBaseline: "middle" | "top" | "bottom";
}

interface RadarComponentThis {
  data: {
    metrics?: RadarMetricPoint[];
    selectedMetricId?: string;
    dark?: boolean;
    width?: string;
    height?: string;
    canvasWidth?: number;
    canvasHeight?: number;
  };
  setData: (data: Record<string, unknown>) => void;
  triggerEvent: (name: string, detail: Record<string, unknown>) => void;
  draw: () => void;
  _drawing?: boolean;
  _dirty?: boolean;
  createSelectorQuery: () => {
    select: (selector: string) => {
      fields: (
        fields: Record<string, unknown>,
        cb: (res: { node: CanvasNode; width: number; height: number }) => void,
      ) => { exec: () => void };
    };
  };
}

Component({
  properties: {
    metrics: {
      type: Array,
      value: [],
    },
    selectedMetricId: {
      type: String,
      value: "",
    },
    dark: {
      type: Boolean,
      value: false,
    },
    width: {
      type: String,
      value: "100%",
    },
    height: {
      type: String,
      value: "520rpx",
    },
  },
  data: {
    empty: true,
  },
  lifetimes: {
    attached(this: RadarComponentThis) {
      this.draw();
    },
  },
  observers: {
    metrics(this: RadarComponentThis, _value: unknown) {
      this.draw();
    },
    selectedMetricId(this: RadarComponentThis, _value: unknown) {
      this.draw();
    },
    "width, height"(this: RadarComponentThis, _width: unknown, _height: unknown) {
      this.draw();
    },
  },
  methods: {
    draw(this: RadarComponentThis) {
      const component = this as unknown as RadarComponentThis;
      const metrics = (component.data.metrics ?? []).filter((item) => typeof item.value === "number");
      component.setData({ empty: metrics.length < 3 });
      if (metrics.length < 3) return;
      // trailing coalesce：绘制进行中只记 dirty，回调结束后补画一次，避免 tap 选中等更新被丢弃
      if (component._drawing) {
        component._dirty = true;
        return;
      }
      component._drawing = true;

      const query = component.createSelectorQuery();
      query.select("#radarCanvas").fields({ node: true, size: true }, (res) => {
        const canvas = res.node;
        const ctx = canvas.getContext("2d");
        const pixelRatio = wx.getWindowInfo?.().pixelRatio ?? wx.getSystemInfoSync().pixelRatio ?? 1;
        canvas.width = res.width * pixelRatio;
        canvas.height = res.height * pixelRatio;
        ctx.scale(pixelRatio, pixelRatio);
        component.setData({ canvasWidth: res.width, canvasHeight: res.height });
        renderRadar(ctx, metrics, res.width, res.height, component.data.selectedMetricId, component.data.dark);
        component._drawing = false;
        if (component._dirty) {
          component._dirty = false;
          component.draw();
        }
      }).exec();
    },
    handleTap(this: RadarComponentThis, event: { detail?: { x?: number; y?: number } }) {
      const component = this as unknown as RadarComponentThis;
      const metrics = (component.data.metrics ?? []).filter((item) => typeof item.value === "number");
      const width = component.data.canvasWidth ?? 0;
      const height = component.data.canvasHeight ?? 0;
      if (!metrics.length || !width || !height) return;
      const x = event.detail?.x ?? width / 2;
      const y = event.detail?.y ?? height / 2;
      const centerX = width / 2;
      const centerY = height / 2;
      const labelRadius = Math.min(width, height) * 0.34 + 28;
      const selected = metrics
        .map((metric, index) => ({ metric, point: pointAt(index, metrics.length, centerX, centerY, labelRadius) }))
        .sort((left, right) => distance(left.point, { x, y }) - distance(right.point, { x, y }))[0];
      if (selected) component.triggerEvent("metrictap", { metricId: selected.metric.metricId });
    },
  },
});

function renderRadar(ctx: CanvasRenderingContext2D, metrics: RadarMetricPoint[], width: number, height: number, selectedMetricId?: string, dark = false) {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.34;
  ctx.clearRect(0, 0, width, height);
  drawGrid(ctx, metrics.length, centerX, centerY, radius, dark);
  if (metrics.every((metric) => typeof metric.peerAverage === "number")) {
    drawPolygon(ctx, metrics, "peerAverage", centerX, centerY, radius, "rgba(255, 255, 255, 0.08)", dark ? "rgba(255,255,255,0.5)" : "#8A8F99");
  }
  drawPolygon(ctx, metrics, "value", centerX, centerY, radius, "rgba(168, 15, 27, 0.28)", "#A80F1B");
  drawLabels(ctx, metrics, centerX, centerY, radius + 28, dark);
  drawSelection(ctx, metrics, selectedMetricId, centerX, centerY, radius);
}

function pointAt(index: number, total: number, centerX: number, centerY: number, radius: number) {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / total;
  return {
    x: centerX + Math.cos(angle) * radius,
    y: centerY + Math.sin(angle) * radius,
  };
}

function drawGrid(ctx: CanvasRenderingContext2D, total: number, centerX: number, centerY: number, radius: number, dark = false) {
  ctx.strokeStyle = dark ? "rgba(255,255,255,0.20)" : "#E5E6EB";
  ctx.lineWidth = 1;
  for (let ring = 1; ring <= 4; ring += 1) {
    ctx.beginPath();
    for (let index = 0; index < total; index += 1) {
      const point = pointAt(index, total, centerX, centerY, (radius * ring) / 4);
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    }
    ctx.closePath();
    ctx.stroke();
  }
  for (let index = 0; index < total; index += 1) {
    const point = pointAt(index, total, centerX, centerY, radius);
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }
}

function drawPolygon(ctx: CanvasRenderingContext2D, metrics: RadarMetricPoint[], key: "value" | "peerAverage", centerX: number, centerY: number, radius: number, fill: string, stroke: string) {
  ctx.beginPath();
  metrics.forEach((metric, index) => {
    const raw = metric[key];
    const value = typeof raw === "number" ? raw : 0;
    const point = pointAt(index, metrics.length, centerX, centerY, radius * Math.max(0, Math.min(value / metric.maxValue, 1)));
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();
}

function drawLabels(ctx: CanvasRenderingContext2D, metrics: RadarMetricPoint[], centerX: number, centerY: number, radius: number, dark = false) {
  ctx.fillStyle = dark ? "#FFFFFF" : "#1F2329";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  metrics.forEach((metric, index) => {
    const point = pointAt(index, metrics.length, centerX, centerY, radius);
    ctx.fillText(metric.label, point.x, point.y);
  });
}

function drawSelection(ctx: CanvasRenderingContext2D, metrics: RadarMetricPoint[], selectedMetricId: string | undefined, centerX: number, centerY: number, radius: number) {
  const index = metrics.findIndex((metric) => metric.metricId === selectedMetricId);
  if (index < 0) return;
  const metric = metrics[index]!;
  const value = typeof metric.value === "number" ? metric.value : 0;
  const point = pointAt(index, metrics.length, centerX, centerY, radius * Math.max(0, Math.min(value / metric.maxValue, 1)));
  ctx.beginPath();
  ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = "#A80F1B";
  ctx.fill();
}

function distance(left: { x: number; y: number }, right: { x: number; y: number }) {
  return Math.hypot(left.x - right.x, left.y - right.y);
}
