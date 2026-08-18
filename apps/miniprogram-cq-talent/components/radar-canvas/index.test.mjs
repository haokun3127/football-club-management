import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

let componentDefinition;
globalThis.Component = (definition) => {
  componentDefinition = definition;
  return definition;
};
globalThis.wx = {
  getWindowInfo: () => ({ pixelRatio: 1 }),
  getSystemInfoSync: () => ({ pixelRatio: 1 }),
};

await import("./index.ts");

const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const stylesheet = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");
const metrics = [
  { metricId: "one", label: "One", value: 60, maxValue: 100 },
  { metricId: "two", label: "Two", value: 70, maxValue: 100 },
  { metricId: "three", label: "Three", value: 80, maxValue: 100 },
];

function createContext() {
  return {
    scale: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    fillText: vi.fn(),
  };
}

function createInstance(measures) {
  const context = createContext();
  const instance = {
    data: { metrics, selectedMetricId: "", dark: false, width: "100%", height: "520rpx" },
    setData(patch) {
      this.data = { ...this.data, ...patch };
    },
    triggerEvent: vi.fn(),
    _queryCount: 0,
    createSelectorQuery() {
      return {
        select: () => ({
          fields: (_fields, callback) => ({
            exec: () => {
              const measure = measures[this._queryCount++];
              callback({
                node: { width: 0, height: 0, getContext: () => context },
                width: measure.width,
                height: measure.height,
              });
            },
          }),
        }),
      };
    },
  };
  instance.draw = componentDefinition.methods.draw.bind(instance);
  return { instance, context };
}

describe("radar canvas dimensions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the default 100% by 520rpx dimensions for existing callers", () => {
    expect(componentDefinition.properties.width.value).toBe("100%");
    expect(componentDefinition.properties.height.value).toBe("520rpx");
    expect(componentDefinition.externalClasses).toContain("host-class");
    expect(template).toContain('class="radar host-class"');
    expect(template).toContain('style="width: {{width}}; height: {{height}};"');
    expect(stylesheet).toMatch(/\.radar\s*\{[^}]*width:\s*100%[^}]*height:\s*520rpx/s);
    expect(stylesheet).toMatch(/\.radar-canvas\s*\{[^}]*width:\s*100%[^}]*height:\s*520rpx/s);
  });

  it("offers an opt-in P5 geometry without changing the default callers", () => {
    expect(componentDefinition.properties.geometry.value).toBe("default");
    expect(componentDefinition.properties.geometry).toMatchObject({ type: String });
  });

  it("accepts custom dimensions and remeasures then redraws after a size change", () => {
    const { instance, context } = createInstance([
      { width: 375, height: 260 },
      { width: 220, height: 180 },
    ]);

    instance.draw();
    expect(instance.data).toMatchObject({ canvasWidth: 375, canvasHeight: 260 });

    instance.data.width = "440rpx";
    instance.data.height = "360rpx";
    componentDefinition.observers["width, height"].call(instance, "440rpx", "360rpx");

    expect(instance._queryCount).toBe(2);
    expect(instance.data).toMatchObject({ canvasWidth: 220, canvasHeight: 180 });
    expect(context.clearRect).toHaveBeenCalledTimes(2);
  });
});
