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

  it("registers the child switcher used by parent growth", () => {
    expect(growthManifest.usingComponents).toHaveProperty("student-switcher");
    expect(growthTemplate).toMatch(/<student-switcher\b/);
  });
});
