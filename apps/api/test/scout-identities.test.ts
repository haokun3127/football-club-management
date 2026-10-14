import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import { createPlatformPersistence } from "../src/persistence/platform-persistence.js";
import { PersistentApiStore } from "../src/store.js";
import { normalizeIdentityNumber, readIdentityKeyring } from "../src/application/scout-identity.js";
const key = (version: string) => ({ version, digestKey: randomBytes(32).toString("hex"), encryptionKey: randomBytes(32).toString("hex") });
const input = { clubId: "club-chongqing-talent", name: "标准示例人员", identityNumber: "11010519491231002X", actorUserId: "user-coach-1" };
describe("scout identity registration", () => {
  it("validates the official sample checksum/date and rejects malformed input without echoing it", () => {
    expect(normalizeIdentityNumber(input.identityNumber.toLowerCase()).birthDate).toBe("1949-12-31");
    expect(() => normalizeIdentityNumber("11010519490231002X")).toThrow("核对");
    expect(() => normalizeIdentityNumber("110105194912310020")).toThrow("校验");
    const k = key("v1"); expect(() => readIdentityKeyring(JSON.stringify({ activeVersion: "v1", keys: [{ ...k, encryptionKey: k.digestKey }] }))).toThrow("independent");
  });
  it("serializes duplicate creates, masks response, encrypts storage, separates clubs and leaves membership/guardian/ledger alone", async () => {
    const p = await createPlatformPersistence({ databasePath: ":memory:", identityKeyring: { activeVersion: "v1", keys: [key("v1")] } });
    try {
      const store = new PersistentApiStore(p.repositories);
      const before = ["team_members", "student_guardian_bindings", "lesson_credit_ledger"].map(table => p.database.prepare(`SELECT count(*) n FROM ${table}`).get()!.n);
      const results = await Promise.all([store.createScoutPlayer(input), store.createScoutPlayer(input)]);
      expect(results.map(r => r.created)).toEqual([true, false]); expect(results[0].player.id).toBe(results[1].player.id);
      expect(JSON.stringify(results)).not.toContain(input.identityNumber); expect(results[0].player.maskedDocument).toBe("**************002X");
      const persisted = p.database.prepare("SELECT * FROM person_identities").all(); expect(persisted).toHaveLength(1); expect(JSON.stringify(persisted)).not.toContain(input.identityNumber);
      expect(store.listStudents(input.clubId).some(s => s.id === results[0].player.id)).toBe(true);
      expect(["team_members", "student_guardian_bindings", "lesson_credit_ledger"].map(table => p.database.prepare(`SELECT count(*) n FROM ${table}`).get()!.n)).toEqual(before);
      await expect(store.createScoutPlayer({ ...input, name: "不同姓名" })).rejects.toMatchObject({ code: "identity_name_conflict" });
      const club = (await p.repositories.clubs.getById(input.clubId))!; await p.repositories.clubs.save({ ...club, id: "club-other", code: "TEST-OTHER", name: "Another" });
      const other = await store.createScoutPlayer({ ...input, clubId: "club-other" }); expect(other.player.id).not.toBe(results[0].player.id);
      expect(p.database.prepare("SELECT count(*) n FROM person_identities").get()!.n).toBe(1);
      expect(p.repositories.scoutPlayers.list(input.clubId)).toHaveLength(1); expect(p.repositories.scoutPlayers.list("unrelated")).toEqual([]);
    } finally { p.database.close(); }
  });
  it("rolls back incomplete creation and supports restart/key rotation without creating another person", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cq-scout-")), firstKey = key("v1"), secondKey = key("v2");
    let p = await createPlatformPersistence({ databasePath: join(dir, "test.sqlite"), identityKeyring: { activeVersion: "v1", keys: [firstKey] } });
    try {
      p.database.exec("CREATE TRIGGER fail_scout BEFORE INSERT ON scout_profiles BEGIN SELECT RAISE(ABORT,'synthetic failure'); END;");
      await expect(p.repositories.scoutPlayers.create(input)).rejects.toThrow(); expect(p.database.prepare("SELECT count(*) n FROM person_identities").get()!.n).toBe(0);
      p.database.exec("DROP TRIGGER fail_scout");
      const original = await p.repositories.scoutPlayers.create(input); p.database.close();
      p = await createPlatformPersistence({ databasePath: join(dir, "test.sqlite"), identityKeyring: { activeVersion: "v2", keys: [firstKey, secondKey] } });
      const again = await p.repositories.scoutPlayers.create(input); expect(again.created).toBe(false); expect(again.player.id).toBe(original.player.id);
      expect(p.database.prepare("SELECT count(*) n FROM person_identities").get()!.n).toBe(1); expect(p.database.prepare("SELECT count(*) n FROM person_identity_digests").get()!.n).toBe(2);
    } finally { p.database.close(); rmSync(dir, { recursive: true, force: true }); }
  }, 15000);
});
