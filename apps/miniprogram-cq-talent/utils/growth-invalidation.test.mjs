import { describe, expect, it } from "vitest";

const { markGrowthStale, consumeGrowthStale } = await import("./growth-invalidation.ts");

describe("growth invalidation flag", () => {
  it("stays clean until marked, coalesces repeated marks, and resets after being consumed", () => {
    expect(consumeGrowthStale()).toBe(false);

    markGrowthStale();
    markGrowthStale();
    expect(consumeGrowthStale()).toBe(true);

    // 消费一次后即复位：无变更返回不得再次触发重拉
    expect(consumeGrowthStale()).toBe(false);
  });
});
