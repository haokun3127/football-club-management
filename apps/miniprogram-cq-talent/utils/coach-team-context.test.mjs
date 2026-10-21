import {beforeEach,describe,it,expect,vi} from "vitest";
const mocks=vi.hoisted(()=>({getCoachTeam:vi.fn(),getSession:vi.fn()}));
vi.mock("./api",()=>({getCoachTeam:mocks.getCoachTeam}));
vi.mock("./store",()=>({getSession:mocks.getSession}));
vi.mock("./config",()=>({environmentStorageKey:key=>`develop:${key}`}));
import {resolveActiveTeam,rememberActiveTeam,loadActiveTeam} from "./coach-team-context";
const teams=[{id:"a",name:"同名队"},{id:"b",name:"同名队"}];
beforeEach(()=>{mocks.getSession.mockReturnValue({role:"coach",clubId:"club-a",userId:"user-a"});globalThis.wx={getStorageSync:vi.fn(),setStorageSync:vi.fn(),removeStorageSync:vi.fn()};mocks.getCoachTeam.mockReset();});
describe("single team context",()=>{
 it("separates accounts, rejects foreign explicit IDs, and discards the ownerless key",()=>{wx.getStorageSync.mockReturnValue("b");expect(resolveActiveTeam(teams)).toBe("b");expect(()=>resolveActiveTeam(teams,"revoked")).toThrow();expect(wx.removeStorageSync).toHaveBeenCalledWith("develop:coach-training-team-id");rememberActiveTeam("b");expect(wx.setStorageSync).toHaveBeenLastCalledWith("develop:active-team:club-a:user-a:coach","b");mocks.getSession.mockReturnValue({role:"coach",clubId:"club-b",userId:"user-b"});resolveActiveTeam(teams);expect(wx.getStorageSync).toHaveBeenLastCalledWith("develop:active-team:club-b:user-b:coach");});
 it("requires a choice for multiple teams and auto-selects only the unique team",()=>{wx.getStorageSync.mockReturnValue("revoked");expect(resolveActiveTeam(teams)).toBe("");expect(resolveActiveTeam([teams[1]])).toBe("b");expect(resolveActiveTeam([])).toBe("");});
 it("reads the exact chosen ID even when names match and never masks a server denial",async()=>{wx.getStorageSync.mockReturnValue("b");mocks.getCoachTeam.mockImplementation(async id=>({team:teams.find(t=>t.id===(id||"a")),teamOptions:teams}));expect((await loadActiveTeam()).id).toBe("b");expect(mocks.getCoachTeam).toHaveBeenLastCalledWith("b");mocks.getCoachTeam.mockRejectedValue(new Error("forbidden"));await expect(loadActiveTeam("b")).rejects.toThrow("forbidden");});
});

it("does not let a late team load overwrite the newest preference or another account",async()=>{
 let resolveOld;mocks.getCoachTeam.mockImplementationOnce(()=>new Promise(resolve=>{resolveOld=resolve;})).mockResolvedValueOnce({team:teams[1],teamOptions:teams});
 const old=loadActiveTeam("a");await loadActiveTeam("b");resolveOld({team:teams[0],teamOptions:teams});await old;expect(wx.setStorageSync).toHaveBeenLastCalledWith("develop:active-team:club-a:user-a:coach","b");
 let resolveAccount;mocks.getCoachTeam.mockImplementationOnce(()=>new Promise(resolve=>{resolveAccount=resolve;}));const pending=loadActiveTeam("a");mocks.getSession.mockReturnValue({role:"coach",clubId:"other",userId:"other"});resolveAccount({team:teams[0],teamOptions:teams});await expect(pending).rejects.toThrow("账号已切换");expect(wx.setStorageSync).toHaveBeenCalledTimes(1);
});
