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
  };
  setData: (data: Record<string, unknown>) => void;
  triggerEvent: (name: string, detail: Record<string, unknown>) => void;
  draw: () => void;
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
  },
  methods: {
    draw(this: RadarComponentThis) {
      const component = this as unknown as RadarComponentThis;
      const metrics = (component.data.metrics ?? []).filter((item) => typeof item.value === "number");
      component.setData({ empty: metrics.length < 3 });
      if (metrics.length < 3) return;

      const query = component.createSelectorQuery();
      query.select("#radarCanvas").fields({ node: true, size: true }, (res) => {
        const canvas = res.node;
        const ctx = canvas.getContext("2d");
        const pixelRatio = wx.getSystemInfoSync().pixelRatio ?? 1;
        canvas.width = res.width * pixelRatio;
        canvas.height = res.height * pixelRatio;
        ctx.scale(pixelRatio, pixelRatio);
        renderRadar(ctx, metrics, res.width, res.height);
      }).exec();
    },
    handleTap(this: RadarComponentThis) {
      const component = this as unknown as RadarComponentThis;
      const metrics = component.data.metrics ?? [];
      if (metrics[0]) {
        component.triggerEvent("metrictap", { metricId: metrics[0].metricId });
      }
    },
  },
});

function renderRadar(ctx: CanvasRenderingContext2D, metrics: RadarMetricPoint[], width: number, height: number) {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.34;
  ctx.clearRect(0, 0, width, height);
  drawGrid(ctx, metrics.length, centerX, centerY, radius);
  drawPolygon(ctx, metrics, "peerAverage", centerX, centerY, radius, "rgba(96, 100, 111, 0.18)", "#8A8F99");
  drawPolygon(ctx, metrics, "value", centerX, centerY, radius, "rgba(230, 0, 18, 0.18)", "#E60012");
  drawLabels(ctx, metrics, centerX, centerY, radius + 28);
}

function pointAt(index: number, total: number, centerX: number, centerY: number, radius: number) {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / total;
  return {
    x: centerX + Math.cos(angle) * radius,
    y: centerY + Math.sin(angle) * radius,
  };
}

function drawGrid(ctx: CanvasRenderingContext2D, total: number, centerX: number, centerY: number, radius: number) {
  ctx.strokeStyle = "#E5E6EB";
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

function drawLabels(ctx: CanvasRenderingContext2D, metrics: RadarMetricPoint[], centerX: number, centerY: number, radius: number) {
  ctx.fillStyle = "#1F2329";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  metrics.forEach((metric, index) => {
    const point = pointAt(index, metrics.length, centerX, centerY, radius);
    ctx.fillText(metric.label, point.x, point.y);
  });
}
