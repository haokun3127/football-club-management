import { describe, expect, it } from "vitest";
import { normalizedToPixel, pixelToNormalized } from "./tactical-board";

describe("tactical board coordinates", () => {
  it.each([280, 340, 430])("round-trips relative positions on a %spx pitch", (size) => {
    const pixel = normalizedToPixel(0.42, size, 24);
    expect(pixelToNormalized(pixel, size, 24)).toBeCloseTo(0.42, 8);
  });

  it("clamps movement to the pitch", () => {
    expect(pixelToNormalized(-100, 320, 24)).toBe(0);
    expect(pixelToNormalized(999, 320, 24)).toBe(1);
  });
});
