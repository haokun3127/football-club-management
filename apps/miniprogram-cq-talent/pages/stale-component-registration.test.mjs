import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const coachManifest = JSON.parse(readFileSync(new URL("./coach/schedule/index.json", import.meta.url), "utf8"));
const growthManifest = JSON.parse(readFileSync(new URL("./parent/growth/index.json", import.meta.url), "utf8"));
const coachTemplate = readFileSync(new URL("./coach/schedule/index.wxml", import.meta.url), "utf8");
const growthTemplate = readFileSync(new URL("./parent/growth/index.wxml", import.meta.url), "utf8");

describe("stale page component registrations", () => {
  it("does not register activity-card when the coach schedule template does not use it", () => {
    expect(coachManifest.usingComponents).not.toHaveProperty("activity-card");
    expect(coachTemplate).not.toMatch(/<activity-card\b/);
  });

  it("does not register student-switcher when the parent growth template does not use it", () => {
    expect(growthManifest.usingComponents).not.toHaveProperty("student-switcher");
    expect(growthTemplate).not.toMatch(/<student-switcher\b/);
  });
});
