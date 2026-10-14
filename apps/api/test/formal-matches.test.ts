import { describe, it, expect } from "vitest";
import { createPlatformPersistence } from "../src/persistence/platform-persistence.js";
import { createSeedData } from "../src/seed.js";
import { PersistentApiStore } from "../src/store.js";
import { HeaderMembershipResolver } from "../src/auth/context.js";
import { buildServer } from "../src/server.js";

describe("formal match records in the team", () => {
 it("shares the calendar identity, keeps an absent score distinct from zero, persists metadata and excludes friendly games", async () => {
  const seed = createSeedData(); const clubId = "club-chongqing-talent";
  const persistence = await createPlatformPersistence({ databasePath: ":memory:", seedData: seed });
  const store = new PersistentApiStore(persistence.repositories, seed);
  const app = buildServer(store, { logger: false, membershipResolver: new HeaderMembershipResolver(persistence.repositories.users, persistence.repositories.memberships) });
  const headers = { "x-user-id": "user-coach-1" }; const base = `/clubs/${clubId}/app-clients/app-client-cq-talent-wechat-main/coach`;
  const event = await store.getCalendarEvent("event-match-1");
  await store.saveCalendarEvent({ ...event!, locationId: seed.events.find(item => item.locationId)?.locationId || "location-1" });
  try {
   const payload = { eventId: "event-match-1", matchType: "cup", opponentName: "测试对手", status: "completed", ageGroup: "U10", competitionFormat: "五人制", handbookUrl: "https://example.com/handbook.pdf" };
   const write = await app.inject({ method: "POST", url: `${base}/matches`, headers, payload }); expect(write.statusCode, write.body).toBe(201);
   const match = write.json().match;
   const stored = persistence.repositories.matches.listMatches(clubId).find(item => item.id === match.id)!;
   expect(stored).toMatchObject({ ageGroup: "U10", competitionFormat: "五人制", handbookUrl: payload.handbookUrl }); expect(stored.homeScore).toBeUndefined();
   const team = await app.inject({ method: "GET", url: `${base}/team?teamId=${event!.primaryTeamId}`, headers }); expect(team.statusCode, team.body).toBe(200);
   expect(team.json().formalMatches).toEqual(expect.arrayContaining([expect.objectContaining({ eventId: "event-match-1", match: expect.objectContaining({ id: match.id }) })]));
   expect(team.json().formalMatches.every((item: any) => ["league", "cup"].includes(item.match.matchType))).toBe(true);
   const zero = await app.inject({ method: "POST", url: `${base}/matches`, headers, payload: { ...payload, homeScore: 0, awayScore: 0 } }); expect(zero.statusCode, zero.body).toBe(201); expect(zero.json().match).toMatchObject({ homeScore: 0, awayScore: 0, id: match.id });
   const invalid = await app.inject({ method: "POST", url: `${base}/matches`, headers, payload: { ...payload, matchId: "another-match" } }); expect(invalid.statusCode).toBe(409);
   const noOpponent = await app.inject({ method: "POST", url: `${base}/matches`, headers, payload: { ...payload, opponentName: "" } }); expect(noOpponent.statusCode).toBe(400);
   const missingVenue = { ...event!, locationId: undefined }; await store.saveCalendarEvent(missingVenue);
   const noVenue = await app.inject({ method: "POST", url: `${base}/matches`, headers, payload }); expect(noVenue.statusCode).toBe(400);
  } finally { await app.close(); persistence.database.close(); }
 });
});
