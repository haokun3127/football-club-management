import { describe, expect, it } from "vitest";
import { createSeedData } from "../src/seed.js";
import { createPlatformRepositories, seedPlatformData } from "../src/persistence/platform-persistence.js";
import { migrate, openSqliteDatabase } from "../src/persistence/sqlite.js";

describe("platform persistence", () => {
  it("runs migrations idempotently", () => {
    const database = openSqliteDatabase(":memory:");

    const first = migrate(database);
    const second = migrate(database);

    expect(first.applied).toEqual(["0001_platform_foundation.sql"]);
    expect(second.applied).toEqual([]);
    expect(second.skipped).toEqual(["0001_platform_foundation.sql"]);

    database.close();
  });

  it("keeps repository reads scoped by club", async () => {
    const database = openSqliteDatabase(":memory:");
    migrate(database);

    const repositories = createPlatformRepositories(database);
    const data = createSeedData();
    const now = "2026-06-25T00:00:00.000Z";

    data.clubs.push({
      id: "club-other",
      name: "Other Academy",
      code: "other",
      timezone: "Asia/Hong_Kong",
      locale: "zh-CN",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    data.students.push({
      id: "student-other",
      clubId: "club-other",
      name: "Other Student",
      birthDate: "2015-01-01",
      createdAt: now,
      updatedAt: now,
    });

    await seedPlatformData(repositories, data);

    const demoStudents = await repositories.students.listByClub("club-demo");
    const otherStudents = await repositories.students.listByClub("club-other");
    const crossClubLookup = await repositories.students.getByClubAndId("club-demo", "student-other");

    expect(demoStudents.map((student) => student.id)).toEqual(["student-1"]);
    expect(otherStudents.map((student) => student.id)).toEqual(["student-other"]);
    expect(crossClubLookup).toBeNull();

    await expect(repositories.students.getById("student-other")).rejects.toThrow("Club-scoped repositories require");

    database.close();
  });
});
