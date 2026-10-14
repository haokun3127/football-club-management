import {
  createHash,
  createHmac,
  createDecipheriv,
  randomUUID,
} from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { StudentProfile } from "@football-club/domain";
import type {
  ScoutCreateInput,
  ScoutPlayer,
  ScoutPlayerRepository,
} from "../application/scout-players.js";
import {
  encryptIdentity,
  identityDigest,
  keyFingerprint,
  normalizeIdentityNumber,
  ScoutError,
  type IdentityKeyring,
} from "../application/scout-identity.js";
import { transaction } from "./transaction.js";
export class SqliteScoutPlayerRepository implements ScoutPlayerRepository {
  constructor(
    private readonly database: DatabaseSync,
    private readonly keyring?: IdentityKeyring,
  ) {
    if (keyring) this.validateKeys();
  }
  get configured() {
    return Boolean(this.keyring);
  }
  private validateKeys() {
    if (!this.keyring)
      throw new ScoutError(
        503,
        "identity_not_configured",
        "人员身份登记尚未配置，请联系管理员",
      );
    for (const row of this.database
      .prepare("SELECT version, fingerprint FROM identity_key_versions")
      .all()) {
      const key = this.keyring.keys.find((k) => k.version === row.version);
      if (!key || keyFingerprint(key) !== row.fingerprint)
        throw new ScoutError(
          503,
          "identity_key_mismatch",
          "人员身份密钥版本不完整，请联系管理员",
        );
    }
  }
  list(clubId: string): ScoutPlayer[] {
    return this.database
      .prepare(
        `SELECT s.id, s.name, s.birth_date, p.masked_document, sp.status, sp.created_at
      FROM scout_profiles sp JOIN student_profiles s ON s.club_id = sp.club_id AND s.id = sp.student_id
      JOIN club_player_identities c ON c.club_id = sp.club_id AND c.student_id = sp.student_id
      JOIN person_identities p ON p.id = c.person_id WHERE sp.club_id = ? ORDER BY sp.created_at DESC, s.id`,
      )
      .all(clubId)
      .map((row) => ({
        id: String(row.id),
        name: String(row.name),
        birthDate: String(row.birth_date),
        maskedDocument: String(row.masked_document),
        status: row.status as ScoutPlayer["status"],
        createdAt: String(row.created_at),
      }));
  }
  importFingerprint(value: unknown): string {
    this.validateKeys();
    const key = this.keyring!.keys.find(
      (key) => key.version === this.keyring!.activeVersion,
    )!;
    return createHmac("sha256", Buffer.from(key.digestKey, "hex"))
      .update("backoffice-import:" + JSON.stringify(value))
      .digest("hex");
  }
  /** Caller holds the shared transaction. Store only encrypted identity and masked preview. */
  stageImportIdentity(
    clubId: string,
    rawId: string,
    name: string,
    number: string,
  ) {
    this.validateKeys();
    if (!name.trim() || name.trim().length > 60)
      throw new ScoutError(400, "invalid_player_name", "Invalid name");
    const identity = normalizeIdentityNumber(number),
      key = this.keyring!.keys.find(
        (key) => key.version === this.keyring!.activeVersion,
      )!;
    for (const key of this.keyring!.keys)
      this.database
        .prepare(
          "INSERT INTO identity_key_versions(version,fingerprint) VALUES (?,?) ON CONFLICT DO NOTHING",
        )
        .run(key.version, keyFingerprint(key));
    const encrypted = encryptIdentity(
      identity.value,
      `import:${clubId}:${rawId}`,
      key,
    );
    this.database
      .prepare(
        "INSERT INTO backoffice_import_secrets(club_id,raw_id,encrypted_identity) VALUES (?,?,?) ON CONFLICT(club_id,raw_id) DO UPDATE SET encrypted_identity=excluded.encrypted_identity",
      )
      .run(clubId, rawId, encrypted);
    return identity.maskedDocument;
  }
  openImportIdentity(clubId: string, rawId: string): string {
    this.validateKeys();
    const row = this.database
      .prepare(
        "SELECT encrypted_identity FROM backoffice_import_secrets WHERE club_id=? AND raw_id=?",
      )
      .get(clubId, rawId);
    if (!row)
      throw new ScoutError(
        400,
        "invalid_import_identity",
        "Missing encrypted preview",
      );
    try {
      const payload = JSON.parse(String(row.encrypted_identity)),
        key = this.keyring!.keys.find((key) => key.version === payload.version);
      if (!key) throw new Error("key");
      const decipher = createDecipheriv(
        "aes-256-gcm",
        Buffer.from(key.encryptionKey, "hex"),
        Buffer.from(payload.iv, "base64"),
      );
      decipher.setAAD(
        Buffer.from(`scout-identity:import:${clubId}:${rawId}:${key.version}`),
      );
      decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
      return Buffer.concat([
        decipher.update(Buffer.from(payload.ciphertext, "base64")),
        decipher.final(),
      ]).toString("utf8");
    } catch {
      throw new ScoutError(
        400,
        "invalid_import_identity",
        "Invalid encrypted preview",
      );
    }
  }
  async create(
    input: ScoutCreateInput,
    hooks?: {
      authorize: () => Promise<void>;
      audit: (player: ScoutPlayer) => void;
    },
  ) {
    return transaction(this.database, () =>
      this.createInTransaction(input, hooks),
    );
  }
  /** Reuse natural identity registration inside an already-held transaction. */
  async createInTransaction(
    input: ScoutCreateInput,
    hooks?: {
      authorize: () => Promise<void>;
      audit: (player: ScoutPlayer) => void;
    },
  ) {
    this.validateKeys();
    const name = input.name.trim().normalize("NFC");
    if (!name || name.length > 60)
      throw new ScoutError(
        400,
        "invalid_player_name",
        "请填写姓名（不超过60字）",
      );
    const identity = normalizeIdentityNumber(input.identityNumber);
    return (async () => {
      this.validateKeys();
      await hooks?.authorize();
      const keys = this.keyring!.keys,
        active = keys.find((k) => k.version === this.keyring!.activeVersion)!;
      const matches = keys.flatMap((key) => {
        const row = this.database
          .prepare(
            "SELECT p.* FROM person_identity_digests d JOIN person_identities p ON p.id = d.person_id WHERE d.key_version = ? AND d.digest = ?",
          )
          .get(key.version, identityDigest(identity.value, key));
        return row ? [row] : [];
      });
      if (new Set(matches.map((p) => p.id)).size > 1)
        throw new ScoutError(
          409,
          "identity_review_required",
          "身份资料需要后台核对",
        );
      const existing = matches[0];
      if (existing && existing.name !== name)
        throw new ScoutError(
          409,
          "identity_name_conflict",
          "身份信息不一致，请核对或联系后台",
        );
      const linked =
        existing &&
        this.database
          .prepare(
            "SELECT student_id FROM club_player_identities WHERE club_id = ? AND person_id = ?",
          )
          .get(input.clubId, existing.id!);
      if (
        !linked &&
        this.database
          .prepare(
            "SELECT student_id FROM student_operational_profiles WHERE club_id = ? AND (external_ref = ? OR id_document_hash = ? OR id_document_hash = ?) LIMIT 1",
          )
          .get(
            input.clubId,
            identity.value,
            identity.value,
            createHash("sha256").update(identity.value).digest("hex"),
          )
      ) {
        throw new ScoutError(
          409,
          "legacy_identity_review_required",
          "已有历史档案需要后台核对，请勿重复建档",
        );
      }
      const now = new Date().toISOString(),
        personId = existing ? String(existing.id) : `person-${randomUUID()}`;
      if (!existing)
        this.database
          .prepare(
            "INSERT INTO person_identities (id,name,encrypted_document,masked_document,encryption_version,created_at) VALUES (?,?,?,?,?,?)",
          )
          .run(
            personId,
            name,
            encryptIdentity(identity.value, personId, active),
            identity.maskedDocument,
            active.version,
            now,
          );
      for (const key of keys) {
        this.database
          .prepare(
            "INSERT INTO identity_key_versions (version,fingerprint) VALUES (?,?) ON CONFLICT DO NOTHING",
          )
          .run(key.version, keyFingerprint(key));
        this.database
          .prepare(
            "INSERT INTO person_identity_digests (key_version,digest,person_id) VALUES (?,?,?) ON CONFLICT DO NOTHING",
          )
          .run(key.version, identityDigest(identity.value, key), personId);
      }
      const studentId = linked
        ? String(linked.student_id)
        : `student-${randomUUID()}`;
      if (!linked) {
        this.database
          .prepare(
            "INSERT INTO student_profiles (id,club_id,name,birth_date,created_at,updated_at) VALUES (?,?,?,?,?,?)",
          )
          .run(studentId, input.clubId, name, identity.birthDate, now, now);
        this.database
          .prepare(
            "INSERT INTO club_player_identities (club_id,student_id,person_id,created_at) VALUES (?,?,?,?)",
          )
          .run(input.clubId, studentId, personId, now);
        this.database
          .prepare(
            "INSERT INTO scout_profiles (club_id,student_id,created_by,created_at,status) VALUES (?,?,?,?, 'active')",
          )
          .run(input.clubId, studentId, input.actorUserId, now);
      }
      const row = this.database
        .prepare("SELECT * FROM student_profiles WHERE club_id = ? AND id = ?")
        .get(input.clubId, studentId)!;
      const student: StudentProfile = {
        id: studentId,
        clubId: input.clubId,
        name: String(row.name),
        birthDate: String(row.birth_date),
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      };
      const player = this.list(input.clubId).find((p) => p.id === studentId);
      if (!player)
        throw new ScoutError(
          409,
          "identity_review_required",
          "现有档案需要后台核对",
        );
      if (!linked) hooks?.audit(player);
      return { created: !linked, student, player };
    })();
  }
}
