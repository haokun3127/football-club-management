import { describe, expect, it } from "vitest";
import { HeaderMembershipResolver } from "../src/auth/context.js";
import { createPlatformPersistence } from "../src/persistence/platform-persistence.js";
import { buildServer } from "../src/server.js";
import { PersistentApiStore } from "../src/store.js";

describe("app-client coach match summary save", () => {
  it("updates the existing event match instead of inserting a second match", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });
    const app = buildServer(new PersistentApiStore(persistence.repositories), {
      logger: false,
      membershipResolver: new HeaderMembershipResolver(persistence.repositories.users, persistence.repositories.memberships),
    });

    try {
      const response = await app.inject({
        method: "POST",
        url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/coach/matches",
        headers: { "x-user-id": "user-coach-1" },
        payload: {
          eventId: "event-match-1",
          matchType: "friendly",
          status: "completed",
          opponentName: "渝北青训",
          homeScore: 2,
          awayScore: 1,
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().match).toEqual(expect.objectContaining({
        id: "match-1",
        eventId: "event-match-1",
        opponentName: "渝北青训",
        homeScore: 2,
        awayScore: 1,
      }));
      expect(persistence.repositories.matches.listMatches("club-chongqing-talent")).toHaveLength(1);
    } finally {
      await app.close();
      persistence.database.close();
    }
  });
});
