import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ home: vi.fn(), open: vi.fn() }));
vi.mock("../../../utils/api", () => ({ getCoachHome: mocks.home }));
vi.mock("../../../utils/auth", () => ({ requireRole: () => ({ role: "coach" }) }));
vi.mock("../../../utils/navigation", () => ({ openPage: mocks.open }));
vi.mock("../../../utils/date", () => ({ currentLocalDate: () => "2026-09-24", shiftCalendarDate: () => "2026-08-26" }));
vi.mock("../../../utils/presentation", () => ({ formatShortDate: (s) => s, formatTimeRange: () => "09:00–10:30" }));
let definition;
globalThis.Page = (p) => { definition = p; };
await import("./index.ts");
function page() { return { ...definition, data: structuredClone(definition.data), setData(patch) { Object.assign(this.data, patch); } }; }
const event = { id: "e1", type: "training", title: "训练", startsAt: "2026-09-20T01:00:00Z", endsAt: "2026-09-20T03:00:00Z", status: "scheduled" };
beforeEach(() => { vi.clearAllMocks(); });
describe("training record history", () => {
  it("shows past training without requiring attendance confirmation or a financial ledger", async () => {
    mocks.home.mockResolvedValue({ events: [event, { ...event, id: "match", type: "match" }, { ...event, id: "future", endsAt: "2099-01-01T00:00:00Z" }] });
    const p = page(); await p.load(); expect(p.data.rows.map((r) => r.id)).toEqual(["e1"]);
    expect(mocks.home).toHaveBeenCalledWith({ from: "2026-08-26", to: "2026-09-24" });
    p.openDetail({ currentTarget: { dataset: { id: "e1" } } }); expect(mocks.open).toHaveBeenCalledWith("/pages/coach/lesson-detail/index?id=e1");
  });
  it("keeps the window label honest when expanding the list", async () => {
    mocks.home.mockResolvedValue({ events: Array.from({ length: 8 }, (_, i) => ({ ...event, id: String(i) })) });
    const p = page(); await p.load(); expect(p.data.rows).toHaveLength(5); await p.showAll(); expect(p.data.rows).toHaveLength(8); expect(p.data.recordWindowLabel).toBe("近 30 天全部记录");
  });
  it("exposes read failure and supports retry", async () => {
    mocks.home.mockRejectedValueOnce(new Error("network")); const p = page(); await p.load(); expect(p.data.state).toBe("error");
    mocks.home.mockResolvedValue({ events: [] }); await p.retry(); expect(p.data.state).toBe("empty");
  });
});
