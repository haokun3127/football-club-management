import { createCipheriv, createHmac, createHash, randomBytes } from "node:crypto";
export class ScoutError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) { super(message); }
}
export interface IdentityKey { version: string; digestKey: string; encryptionKey: string }
export interface IdentityKeyring { activeVersion: string; keys: IdentityKey[] }
export function readIdentityKeyring(value?: string): IdentityKeyring | undefined {
  if (!value) return undefined;
  let input: IdentityKeyring;
  try { input = JSON.parse(value) as IdentityKeyring; } catch { throw new Error("SCOUT_IDENTITY_KEYRING must be valid JSON"); }
  if (!input || !Array.isArray(input.keys) || !input.keys.length || input.keys.length > 10 || typeof input.activeVersion !== "string"
    || input.keys.some(key => !key || !/^[a-zA-Z0-9_-]{1,32}$/.test(key.version) || !/^[0-9a-f]{64}$/i.test(key.digestKey) || !/^[0-9a-f]{64}$/i.test(key.encryptionKey) || key.digestKey.toLowerCase() === key.encryptionKey.toLowerCase())
    || new Set(input.keys.map(key => key.version)).size !== input.keys.length || !input.keys.some(key => key.version === input.activeVersion)) throw new Error("Invalid scout identity keyring; independent 256-bit keys are required");
  return input;
}
/** GB 11643 structure/date/MOD 11-2 input validation; not an identity-authentication service. */
export function normalizeIdentityNumber(input: string, today = new Date().toISOString().slice(0, 10)) {
  const value = input.trim().toUpperCase();
  const birthday = `${value.slice(6, 10)}-${value.slice(10, 12)}-${value.slice(12, 14)}`;
  const parsed = new Date(`${birthday}T00:00:00Z`);
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  if (!/^[1-9]\d{16}[\dX]$/.test(value) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== birthday || birthday > today
    || "10X98765432"[weights.reduce((sum, weight, i) => sum + weight * Number(value[i]), 0) % 11] !== value[17]) {
    throw new ScoutError(400, "invalid_identity_number", "请核对身份证号码、出生日期和校验位");
  }
  return { value, birthDate: birthday, maskedDocument: `**************${value.slice(-4)}` };
}
export function identityDigest(value: string, key: IdentityKey) { return createHmac("sha256", Buffer.from(key.digestKey, "hex")).update(`cn-national-id:${value}`).digest("hex"); }
export function keyFingerprint(key: IdentityKey) { return createHash("sha256").update(`${key.digestKey.toLowerCase()}:${key.encryptionKey.toLowerCase()}`).digest("hex"); }
export function encryptIdentity(value: string, personId: string, key: IdentityKey) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", Buffer.from(key.encryptionKey, "hex"), iv);
  cipher.setAAD(Buffer.from(`scout-identity:${personId}:${key.version}`));
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return JSON.stringify({ version: key.version, iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), ciphertext: ciphertext.toString("base64") });
}
