import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  openPage: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  getParentChildren: vi.fn(),
  getParentGrowth: vi.fn(),
  getParentMetricDetail: vi.fn(),
}));
vi.mock("../../../utils/auth", () => ({ requireRole: vi.fn() }));
vi.mock("../../../utils/navigation", () => ({ openPage: mocks.openPage }));
vi.mock("../../../utils/presentation", () => ({
  resolveMenuInset: () => 0,
  resolveNavInset: () => 0,
}));
vi.mock("../../../utils/store", () => ({ setCurrentStudentId: vi.fn() }));

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};

await import("./index.ts");

const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");

function createPageInstance(data = {}) {
  const instance = {
    ...pageDefinition,
    data: { ...pageDefinition.data, ...data },
  };
  instance.setData = (patch) => {
    instance.data = { ...instance.data, ...patch };
  };
  return instance;
}

describe("parent growth training history", () => {
  beforeEach(() => {
    mocks.openPage.mockReset();
  });

  it("binds the training-history view action to its handler", () => {
    expect(template).toContain('<view class="p4-card__title">训练历程 📊</view><view class="p4-card__link" bindtap="openTrainingHistory">查看›</view>');
  });

  it("opens the existing status page for the active student", () => {
    const page = createPageInstance({ activeStudentId: "student-1" });

    page.openTrainingHistory();

    expect(mocks.openPage).toHaveBeenCalledWith("/pages/parent/status/index?student=student-1");
  });

  it("does not navigate when no active student is available", () => {
    const page = createPageInstance({ activeStudentId: "" });

    page.openTrainingHistory();

    expect(mocks.openPage).not.toHaveBeenCalled();
  });
});
