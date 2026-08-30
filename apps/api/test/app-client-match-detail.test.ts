import { describe, expect, it } from "vitest";
import { HeaderMembershipResolver } from "../src/auth/context.js";
import { createPlatformPersistence } from "../src/persistence/platform-persistence.js";
import { createSeedData } from "../src/seed.js";
import { buildServer } from "../src/server.js";
import { PersistentApiStore } from "../src/store.js";

const clubId = "club-chongqing-talent";
const clientId = "app-client-cq-talent-wechat-main";
const basePath = `/clubs/${clubId}/app-clients/${clientId}/coach/events`;

function createApp(seedData = createSeedData()) {
  return createPlatformPersistence({ databasePath: ":memory:", seedData }).then((persistence) => ({
    persistence,
    app: buildServer(new PersistentApiStore(persistence.repositories), {
      logger: false,
      membershipResolver: new HeaderMembershipResolver(persistence.repositories.users, persistence.repositories.memberships),
    }),
  }));
}

function createScopedSeed() {
  const seed = createSeedData();
  const user = seed.users.find((item) => item.id === "user-coach-1")!;
  const membership = seed.clubMemberships.find((item) => item.userId === "user-coach-1")!;
  const coach = seed.coaches.find((item) => item.userId === "user-coach-1")!;
  const matchEvent = seed.events.find((item) => item.id === "event-match-1")!;

  seed.users.push({ ...user, id: "user-coach-out-of-scope", phone: "13700000000", displayName: "Out of scope coach" });
  seed.clubMemberships.push({ ...membership, id: "club-member-coach-out-of-scope", userId: "user-coach-out-of-scope" });
  seed.coaches.push({ ...coach, id: "coach-out-of-scope", userId: "user-coach-out-of-scope", name: "Out of scope coach" });
  seed.events.push({ ...matchEvent, id: "event-match-empty" });
  seed.participants.push(...seed.participants
    .filter((item) => item.eventId === "event-match-1")
    .map((item) => ({ ...item, id: `${item.id}-empty`, eventId: "event-match-empty" })));
  return seed;
}

describe("app-client coach match detail", () => {
  it("returns only the authorized match event, its participant-derived roster, and recorded events", async () => {
    const { app, persistence } = await createApp();

    try {
      const response = await app.inject({
        method: "GET",
        url: `${basePath}/event-match-1/match`,
        headers: { "x-user-id": "user-coach-1" },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toEqual(expect.objectContaining({
        event: expect.objectContaining({ id: "event-match-1", type: "match", teamName: "U10发展队" }),
        roster: [expect.objectContaining({ studentId: "student-1", status: "present" })],
        match: expect.objectContaining({ id: "match-1", eventId: "event-match-1" }),
        events: expect.arrayContaining([expect.objectContaining({ id: "match-event-goal-1", minute: 18 })]),
      }));
      expect(body).not.toHaveProperty("summary");
      expect(body.event).not.toHaveProperty("participants");
      expect(body.roster).toHaveLength(1);
    } finally {
      await app.close();
      persistence.database.close();
    }
  });

  it("returns a truthful empty match and denies type or roster probing before event scope", async () => {
    const { app, persistence } = await createApp(createScopedSeed());

    try {
      const empty = await app.inject({
        method: "GET",
        url: `${basePath}/event-match-empty/match`,
        headers: { "x-user-id": "user-coach-1" },
      });
      expect(empty.statusCode).toBe(200);
      expect(empty.json()).toEqual(expect.objectContaining({
        event: expect.objectContaining({ id: "event-match-empty", type: "match" }),
        match: null,
        events: [],
      }));

      const nonMatch = await app.inject({
        method: "GET",
        url: `${basePath}/event-training-1/match`,
        headers: { "x-user-id": "user-coach-1" },
      });
      expect(nonMatch.statusCode).toBe(400);

      const parent = await app.inject({
        method: "GET",
        url: `${basePath}/event-match-1/match`,
        headers: { "x-user-id": "user-parent-1" },
      });
      expect(parent.statusCode).toBe(403);
      expect(parent.body).not.toContain("event-match-1");

      const outOfScope = await app.inject({
        method: "GET",
        url: `${basePath}/event-training-1/match`,
        headers: { "x-user-id": "user-coach-out-of-scope" },
      });
      expect(outOfScope.statusCode).toBe(403);
      expect(outOfScope.body).not.toContain("training");

      const missing = await app.inject({
        method: "GET",
        url: `${basePath}/event-missing/match`,
        headers: { "x-user-id": "user-coach-1" },
      });
      expect(missing.statusCode).toBe(404);
    } finally {
      await app.close();
      persistence.database.close();
    }
  });
});
