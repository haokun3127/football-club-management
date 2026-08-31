import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getParentChildren: vi.fn(),
  getFamilyMembers: vi.fn(),
  requireRole: vi.fn(),
  openPage: vi.fn(),
  setCurrentStudentId: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  getParentChildren: mocks.getParentChildren,
  getFamilyMembers: mocks.getFamilyMembers,
}));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/navigation", () => ({ openPage: mocks.openPage }));
vi.mock("../../../utils/store", () => ({ setCurrentStudentId: mocks.setCurrentStudentId }));
vi.mock("../../../utils/presentation", () => ({
  resolveMenuActionTop: () => 24,
  resolveNavInset: () => 20,
}));

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};

globalThis.wx = {
  getStorageSync: vi.fn(),
  setStorageSync: vi.fn(),
  navigateBack: vi.fn(),
  showActionSheet: vi.fn(),
  showModal: vi.fn(),
  showToast: vi.fn(),
};

await import("./index.ts");

const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const controller = readFileSync(new URL("./index.ts", import.meta.url), "utf8");

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

describe("parent account binding", () => {
  beforeEach(() => {
    mocks.getParentChildren.mockReset();
    mocks.getFamilyMembers.mockReset().mockResolvedValue([]);
    mocks.requireRole.mockReset().mockReturnValue({ role: "parent" });
    mocks.openPage.mockReset();
    mocks.setCurrentStudentId.mockReset();
    globalThis.wx.getStorageSync.mockReset().mockReturnValue("");
    globalThis.wx.setStorageSync.mockReset();
  });

  it("precomputes the active learner team label from the real children response", async () => {
    mocks.getParentChildren.mockResolvedValue([{
      id: "student-1",
      name: "陈小宇",
      teams: ["U10 精英队"],
      coachNames: [],
    }]);
    const page = createPageInstance();

    await page.load();

    expect(page.data.activeChild).toMatchObject({
      id: "student-1",
      avatarLetter: "陈",
      teamLabel: "U10 精英队",
    });
  });

  it("synchronizes the selected learner into the active session before returning to growth", () => {
    const page = createPageInstance({
      children: [{ id: "student-2", name: "李小雨", teams: [], coachNames: [], avatarLetter: "李", teamLabel: "所属球队信息待同步" }],
    });

    page.switchChild({ currentTarget: { dataset: { id: "student-2" } } });

    expect(mocks.setCurrentStudentId).toHaveBeenCalledWith("student-2");
    expect(page.data.activeChildId).toBe("student-2");
  });

  it("renders real family members and shows the masked phone on the wechat row", async () => {
    mocks.getParentChildren.mockResolvedValue([{
      id: "student-1",
      name: "陈小宇",
      teams: ["U10 精英队"],
      coachNames: [],
    }]);
    mocks.getFamilyMembers.mockResolvedValue([
      { parentId: "parent-1", name: "陈爸爸", relationship: "father", relationshipLabel: "爸爸", phoneMasked: "138****6789", isPrimaryContact: true, isSelf: true },
      { parentId: "parent-2", name: "陈小芳", relationship: "mother", relationshipLabel: "妈妈", phoneMasked: "139****1234", isPrimaryContact: false, isSelf: false },
    ]);
    const page = createPageInstance();

    await page.load();

    expect(mocks.getFamilyMembers).toHaveBeenCalledWith("student-1");
    expect(page.data.wechatLabel).toBe("138****6789");
    expect(page.data.familyMembers).toHaveLength(2);
  });

  it("keeps the add-family CTA behind an admin-contact modal", () => {
    const page = createPageInstance();
    page.addFamilyMember();
    expect(globalThis.wx.showModal).toHaveBeenCalledWith(expect.objectContaining({ title: "添加家庭成员" }));
  });

  it("does not put collection indexing or a fictional family member in P10 WXML", () => {
    expect(template).not.toMatch(/\.[A-Za-z_$][\w$]*\s*\[\s*\d+\s*\]/);
    expect(template).not.toContain("主监护人");
    expect(template).toContain("添加家庭成员");
    expect(template).toContain("familyMembers");
    expect(controller).toContain("teamLabel:");
  });

  it("matches the live P10 navigation and family-member icon treatment", () => {
    const styles = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");
    expect(template).toContain('src="/assets/icons/p10-chevron-left.svg"');
    expect(template).toContain('src="/assets/icons/p10-user.svg"');
    expect(template).toContain('src="/assets/icons/p10-plus.svg"');
    expect(template).not.toContain("content-users.svg");
    expect(styles).toContain("margin-left: 48rpx;");
    expect(styles).toContain("font-size: 36rpx;");
    expect(styles).toContain("width: 48rpx; height: 48rpx; flex-shrink: 0;");
  });
});
