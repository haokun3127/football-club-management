import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname);
const appConfig = JSON.parse(readFileSync(resolve(root, "app.json"), "utf8"));
const lessonController = readFileSync(resolve(root, "pages/coach/lesson/index.ts"), "utf8");
const lessonDetailController = readFileSync(resolve(root, "pages/coach/lesson-detail/index.ts"), "utf8");
const apiClient = readFileSync(resolve(root, "utils/api.ts"), "utf8");

describe("retired coach-only routes", () => {
  it("does not register correction or duplicate assessment pages", () => {
    expect(appConfig.pages).not.toContain("pages/coach/lesson-correction/index");
    expect(appConfig.pages).not.toContain("pages/coach/assessment-entry/index");
    expect(appConfig.pages).not.toContain("pages/coach/coverage/index");
  });

  it("removes the obsolete correction affordance and client write helper", () => {
    expect(lessonController).not.toContain("openCorrection");
    expect(lessonDetailController).not.toContain("openCorrection");
    expect(apiClient).not.toContain("correctCoachLesson");
  });

  it("removes the retired page sources instead of leaving unreachable code", () => {
    for (const page of ["lesson-correction", "assessment-entry", "coverage"]) {
      expect(existsSync(resolve(root, "pages/coach", page, "index.ts"))).toBe(false);
    }
  });
});
