import type { CalendarEvent } from "@football-club/domain";
import type { ApiStore } from "../store.js";
export const catalogTables = ["students", "scouts", "teams", "coaches", "events"] as const;
export type CatalogTable = typeof catalogTables[number];
export interface CatalogRow { id: string; values: string[]; }
export interface CatalogData { title: string; columns: string[]; rows: CatalogRow[]; }
const gender = { male: "男", female: "女", unspecified: "未填写" };
const foot = { left: "左脚", right: "右脚", both: "双脚", unknown: "未填写" };
const eventStatuses: Record<string, string> = { draft: "草稿", scheduled: "已安排", completed: "已完成", cancelled: "已取消" };
const dateTime = (value: string) => Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value)) : "时间待核对";

/** Explicit business projections. Never expose arbitrary tables or raw personal documents. */
export function backofficeCatalog(store: ApiStore, clubId: string, table: CatalogTable): CatalogData {
  const scouts = store.scoutPlayers?.list(clubId) ?? [];
  if (table === "students") {
    const scoutOnly = new Set(scouts.filter(s => s.status === "active").map(s => s.id));
    return { title: "学员档案", columns: ["姓名", "出生日期", "性别", "惯用脚"], rows: store.listStudents(clubId).filter(s => !scoutOnly.has(s.id)).map(s => ({ id: s.id, values: [s.name, s.birthDate, gender[s.gender ?? "unspecified"], foot[s.dominantFoot ?? "unknown"]] })) };
  }
  if (table === "scouts") return { title: "球探人员", columns: ["姓名", "证件尾号", "状态"], rows: scouts.map(s => ({ id: s.id, values: [s.name, s.maskedDocument, s.status === "active" ? "球探档案" : "已转正式"] })) };
  if (table === "teams") return { title: "队伍", columns: ["队伍", "年龄组", "状态"], rows: store.listTeams(clubId).map(t => ({ id: t.id, values: [t.name, t.ageGroup, t.status === "active" ? "开展中" : "已停用"] })) };
  if (table === "coaches") return { title: "教练", columns: ["姓名", "专长", "状态"], rows: store.listCoaches(clubId).map(c => ({ id: c.id, values: [c.name, c.specialties.join("、") || "未填写", c.status === "active" ? "在任" : "已停任"] })) };
  return { title: "课程与活动", columns: ["活动", "开始时间", "结束时间", "状态"], rows: (store.listCalendarEvents(clubId) as CalendarEvent[]).map(e => ({ id: e.id, values: [e.title, dateTime(e.timeRange.startsAt), dateTime(e.timeRange.endsAt), eventStatuses[e.status] ?? "状态待核对"] })) };
}
