import { describe, expect, it } from "vitest";
import { HeaderMembershipResolver } from "../src/auth/context.js";
import { createPlatformPersistence } from "../src/persistence/platform-persistence.js";
import { createSeedData } from "../src/seed.js";
import { buildServer } from "../src/server.js";
import { PersistentApiStore } from "../src/store.js";

const clubId = "club-chongqing-talent";
const base = `/clubs/${clubId}/app-clients/app-client-cq-talent-wechat-main`;

async function setup() {
  const seed = createSeedData();
  const event = seed.events.find(item => item.id === "event-training-1")!;
  event.locationId = seed.venues.find(item => item.clubId === clubId)!.id;
  const student = seed.students.find(item => item.id === "student-1")!;
  const participant = seed.participants.find(item => item.eventId === event.id)!;
  const binding = seed.guardianBindings.find(item => item.studentId === student.id)!;
  seed.students.push({ ...student, id: "sibling", name: "同场的第二个孩子" }, { ...student, id: "unrelated", name: "其他家庭的孩子" });
  seed.participants.push(...["sibling", "unrelated"].map(studentId => ({ ...participant, id: `participant-${studentId}`, studentId })));
  seed.guardianBindings.push({ ...binding, id: "binding-sibling", studentId: "sibling" });
  const coachUser = seed.users.find(item => item.id === "user-coach-1")!;
  const coachMembership = seed.clubMemberships.find(item => item.userId === coachUser.id)!;
  const coach = seed.coaches.find(item => item.userId === coachUser.id)!;
  seed.users.push({ ...coachUser, id: "outside-coach-user", phone: "13700001111" });
  seed.clubMemberships.push({ ...coachMembership, id: "outside-coach-membership", userId: "outside-coach-user", roles: ["coach"] });
  seed.coaches.push({ ...coach, id: "outside-coach", userId: "outside-coach-user" });
  const persistence = await createPlatformPersistence({ databasePath: ":memory:", seedData: seed });
  const store = new PersistentApiStore(persistence.repositories, seed);
  const app = buildServer(store, {
    logger: false,
    membershipResolver: new HeaderMembershipResolver(persistence.repositories.users, persistence.repositories.memberships),
  });
  return { app, persistence, store, event };
}

describe("authorized event presentation", () => {
  it("returns the same actual teaching facts to the coach and guardian, with only the family's children", async () => {
    const { app, persistence } = await setup();
    try {
      const parent = await app.inject({ method: "GET", url: `${base}/events/event-training-1`, headers: { "x-user-id": "user-parent-1" } });
      const coach = await app.inject({ method: "GET", url: `${base}/coach/events/event-training-1/workbench`, headers: { "x-user-id": "user-coach-1" } });
      expect(parent.statusCode).toBe(200);
      expect(coach.statusCode).toBe(200);
      const facts = parent.json().presentation;
      expect(facts).toMatchObject({
        startsAt: "2026-07-01T09:00:00.000Z",
        team: { id: "team-u10-dev", name: "U10发展队" },
        venue: { id: expect.any(String), name: expect.any(String) },
        coach: { id: "coach-1", name: expect.any(String) },
        training: { state: "planned", summary: expect.any(String), groups: expect.any(Array) },
      });
      expect(facts.training.summary.length).toBeGreaterThan(0);
      expect(coach.json().presentation).toEqual(facts);
      expect(parent.json().event.participants.map((row: { studentId: string }) => row.studentId).sort()).toEqual(["sibling", "student-1"]);
      expect(parent.json().event.participants.find((row: { studentId: string }) => row.studentId === "sibling").studentName).toBe("同场的第二个孩子");
      expect(parent.body).not.toContain("其他家庭的孩子");
      expect(facts.coach).not.toHaveProperty("phone");
      expect(facts.training).not.toHaveProperty("coachingPoints");
      // Existing clients also receive the corrected venue and training summary.
      expect(parent.json().event.venue).toBe(facts.venue.name);
      expect(parent.json().training.summary).toBe(facts.training.summary);
      const calendar = await app.inject({ method: "GET", url: `${base}/parent/calendar?from=2026-07-01&to=2026-07-01`, headers: { "x-user-id": "user-parent-1" } });
      expect(calendar.statusCode).toBe(200);
      expect(calendar.json().events.find((item: { id: string }) => item.id === "event-training-1")).toMatchObject({ teamName: facts.team.name, venue: facts.venue.name });
    } finally { await app.close(); persistence.database.close(); }
  });

  it("does not invent a coach, venue or plan when they are unassigned", async () => {
    const { app, persistence, store, event } = await setup();
    try {
      await store.saveCalendarEvent({ ...event, locationId: undefined, ownerCoachId: undefined });
      const session = store.getTrainingSessionByEvent(clubId, event.id)!;
      await store.saveTrainingSession({ ...session, sessionPlanId: undefined });
      const response = await app.inject({ method: "GET", url: `${base}/events/${event.id}`, headers: { "x-user-id": "user-parent-1" } });
      expect(response.statusCode).toBe(200);
      expect(response.json().presentation).toMatchObject({ venue: null, coach: null, training: { state: "not_arranged", summary: "", groups: [] } });
    } finally { await app.close(); persistence.database.close(); }
  });
  it("rejects unrelated coaches before projecting event or child information", async () => {
    const { app, persistence } = await setup();
    try {
      const response = await app.inject({ method: "GET", url: `${base}/events/event-training-1`, headers: { "x-user-id": "outside-coach-user" } });
      expect(response.statusCode).toBe(403);
      expect(response.json()).not.toHaveProperty("presentation");
      expect(response.body).not.toContain("同场的第二个孩子");
    } finally { await app.close(); persistence.database.close(); }
  });

});
