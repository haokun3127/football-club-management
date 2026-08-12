import { describe, expect, it } from "vitest";
import {
  createEntrypointMembershipResolver,
  createProductionMembershipResolver,
  HeaderMembershipResolver,
} from "../src/auth/context.js";
import { createPlatformPersistence } from "../src/persistence/platform-persistence.js";
import { createSeedData } from "../src/seed.js";

describe("membership identity resolution", () => {
  it("returns null for zero matches and for inactive-only matches", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });

    try {
      const resolver = new HeaderMembershipResolver(
        persistence.repositories.users,
        persistence.repositories.memberships,
        null,
      );

      expect(await resolver.resolveByPhone("club-chongqing-talent", "10000000000")).toBeNull();

      const parent = (await persistence.repositories.users.getById("user-parent-1"))!;
      await persistence.repositories.users.save({ ...parent, phone: "10000000000", status: "inactive" });
      expect(await resolver.resolveByPhone("club-chongqing-talent", "10000000000")).toBeNull();
    } finally {
      persistence.database.close();
    }
  });

  it("returns the only active club member when another duplicate phone row is inactive", async () => {
    const data = createSeedData();
    const original = data.users.find((user) => user.id === "user-parent-1")!;
    const originalMembership = data.clubMemberships.find((membership) => membership.userId === original.id)!;
    const persistence = await createPlatformPersistence({ databasePath: ":memory:", seedData: data });

    try {
      const phone = original.phone!;
      await persistence.repositories.users.save({
        ...original,
        id: "user-phone-inactive-duplicate",
        displayName: "Inactive duplicate",
        status: "inactive",
      });
      await persistence.repositories.memberships.save({
        ...originalMembership,
        id: "membership-phone-inactive-duplicate",
        userId: "user-phone-inactive-duplicate",
      });

      const resolver = new HeaderMembershipResolver(
        persistence.repositories.users,
        persistence.repositories.memberships,
        null,
      );
      const result = await resolver.resolveByPhone("club-chongqing-talent", phone);

      expect(result?.user.id).toBe(original.id);
    } finally {
      persistence.database.close();
    }
  });

  it("does not choose an arbitrary user when a phone matches multiple active accounts", async () => {
    const data = createSeedData();
    const original = data.users.find((user) => user.id === "user-parent-1")!;
    const originalMembership = data.clubMemberships.find((membership) => membership.userId === original.id)!;
    const persistence = await createPlatformPersistence({ databasePath: ":memory:", seedData: data });

    try {
      await persistence.repositories.users.save({
        ...original,
        id: "user-phone-ambiguous",
        displayName: "Ambiguous phone account",
      });
      await persistence.repositories.memberships.save({
        ...originalMembership,
        id: "membership-phone-ambiguous",
        userId: "user-phone-ambiguous",
      });

      const resolver = new HeaderMembershipResolver(
        persistence.repositories.users,
        persistence.repositories.memberships,
        null,
      );
      const result = await resolver.resolveByPhone("club-chongqing-talent", original.phone!);

      expect(result).toBeNull();
    } finally {
      persistence.database.close();
    }
  });

  it("disables header identity by default in production", async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });

    try {
      const resolver = new HeaderMembershipResolver(
        persistence.repositories.users,
        persistence.repositories.memberships,
        "user-parent-1",
      );
      const request = { headers: { "x-user-id": "user-parent-1" } } as never;

      expect(await resolver.resolve(request, "club-chongqing-talent")).toBeNull();
    } finally {
      persistence.database.close();
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
    }
  });

  it("uses the production resolver wiring that rejects X-User-Id", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });

    try {
      const resolver = createProductionMembershipResolver(
        persistence.repositories.users,
        persistence.repositories.memberships,
      );
      const request = { headers: { "x-user-id": "user-parent-1" } } as never;

      expect(await resolver.resolve(request, "club-chongqing-talent")).toBeNull();
    } finally {
      persistence.database.close();
    }
  });

  it("keeps header identity only for the development entrypoint and defaults to rejection", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });

    try {
      const request = { headers: { "x-user-id": "user-parent-1" } } as never;
      const development = createEntrypointMembershipResolver(
        persistence.repositories.users,
        persistence.repositories.memberships,
        { NODE_ENV: "development" },
      );
      const production = createEntrypointMembershipResolver(
        persistence.repositories.users,
        persistence.repositories.memberships,
        { NODE_ENV: "production" },
      );
      const unspecified = createEntrypointMembershipResolver(
        persistence.repositories.users,
        persistence.repositories.memberships,
        {},
      );

      expect((await development.resolve(request, "club-chongqing-talent"))?.user.id).toBe("user-parent-1");
      expect(await production.resolve(request, "club-chongqing-talent")).toBeNull();
      expect(await unspecified.resolve(request, "club-chongqing-talent")).toBeNull();
    } finally {
      persistence.database.close();
    }
  });
});
