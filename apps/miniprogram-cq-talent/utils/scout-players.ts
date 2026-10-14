import { request } from "./request";
import { getAppContext } from "./store";
export interface ScoutPlayer { id: string; name: string; birthDate: string; maskedDocument: string; status: "active" | "enrolled"; createdAt: string }
export interface ScoutList { players: ScoutPlayer[]; total: number; nextOffset: number | null; canCreate: boolean }
export interface ScoutDetail { player: ScoutPlayer; participations: Array<{ eventId: string; title: string; startsAt: string; type: string; status: string }> }
export interface EventRoster { event: { id: string; title: string; type: string; endsAt: string; ended: boolean; cancelled: boolean }; roster: { eventId: string; revision: string; participantIds: string[]; temporary: Array<{ studentId: string; active: boolean; revision: number; history: Array<{ action: "add" | "remove"; actorName: string; changedAt: string; participated?: boolean; note: string }> }> } }
function path() {
  const context = getAppContext(); if (!context) throw new Error("请重新登录");
  return `/clubs/${encodeURIComponent(context.clubId)}/app-clients/${encodeURIComponent(context.clientId)}/coach/scout-players`;
}
export function listScoutPlayers(search: string, offset = 0) { return request<ScoutList>({ path: `${path()}?search=${encodeURIComponent(search)}&offset=${offset}&limit=30` }); }
export function getScoutPlayer(studentId: string) { return request<ScoutDetail>({ path: `${path()}/${encodeURIComponent(studentId)}` }); }
export function createScoutPlayer(input: { name: string; identityNumber: string }) { return request<{ created: boolean; player: ScoutPlayer }>({ path: path(), method: "POST", data: input }); }
function rosterPath(eventId: string) { return `${path().replace(/\/scout-players$/, "")}/events/${encodeURIComponent(eventId)}/temporary-roster`; }
export function getEventRoster(eventId: string) { return request<EventRoster>({ path: rosterPath(eventId) }); }
export function changeEventRoster(eventId: string, input: { expectedRevision: string; action: "add" | "remove"; players: Array<{ studentId: string; participated?: boolean }> }) { return request<EventRoster>({ path: rosterPath(eventId), method: "POST", data: input }); }
