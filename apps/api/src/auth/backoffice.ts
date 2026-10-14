import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import type { FastifyRequest } from "fastify";
import type { AuthContext, MembershipResolver } from "./context.js";
import type { BackofficeConfig } from "../runtime/backoffice.js";
import type { BackofficeAuthRepository } from "../persistence/backoffice-auth-repository.js";

const lifetime = 8 * 60 * 60;
const dummyHash = `scrypt$${"00".repeat(16)}$${"00".repeat(64)}`;
export const backofficeAdmin = (auth: AuthContext | null): auth is AuthContext => !!auth && auth.membership.roles.some(role => role === "owner" || role === "admin" || role === "operator");
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const derive = (password: string, salt: string): Promise<Buffer> => new Promise((resolve, reject) => {
  scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key));
});
export async function hashBackofficePassword(password: string): Promise<string> {
  if (password.length < 16 || password.length > 128) throw new Error("Password must contain 16–128 characters");
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${(await derive(password, salt)).toString("hex")}`;
}
async function verify(password: string, encoded: string): Promise<boolean> {
  if (!/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/.test(encoded)) return false;
  const [, salt, expected] = encoded.split("$");
  return timingSafeEqual(await derive(password, salt!), Buffer.from(expected!, "hex"));
}
export class BackofficeAuth {
  constructor(readonly config: BackofficeConfig, private readonly repository: BackofficeAuthRepository, private readonly memberships: MembershipResolver, private readonly now = () => new Date()) {}

  async login(clubId: string, username: string, password: string, ip: string): Promise<{ status: "ok"; cookie: string; auth: AuthContext } | { status: "invalid" | "limited" }> {
    const now = this.now();
    const normalized = username.trim().toLowerCase();
    if (!await this.repository.reserveAttempt([{ key: hash(`account:${clubId}:${normalized}`), limit: 10 }, { key: hash(`ip:${ip}`), limit: 100 }], now)) return { status: "limited" };
    const credential = this.repository.credential(clubId, normalized);
    const valid = await verify(password, credential?.passwordHash ?? dummyHash);
    const auth = credential && valid && this.memberships.resolveByUserId ? await this.memberships.resolveByUserId(clubId, credential.userId) : null;
    if (!credential || !backofficeAdmin(auth)) return { status: "invalid" };
    const token = randomBytes(32).toString("base64url");
    if (!await this.repository.createSession(credential, { tokenHash: hash(token), clubId, userId: auth.user.id, membershipId: auth.membership.id, expiresAt: new Date(now.getTime() + lifetime * 1000).toISOString() }, now.toISOString())) return { status: "invalid" };
    return { status: "ok", cookie: this.cookie(token, lifetime), auth };
  }

  async resolve(request: FastifyRequest, clubId?: string): Promise<AuthContext | null> {
    // Bearer credentials are a different, app-client scoped authentication boundary.
    if (request.headers.authorization !== undefined) return null;
    const token = this.token(request);
    const session = token ? this.repository.session(hash(token), this.now().toISOString()) : null;
    if (!session || (clubId !== undefined && session.clubId !== clubId) || !this.memberships.resolveByUserId) return null;
    const auth = await this.memberships.resolveByUserId(session.clubId, session.userId);
    return backofficeAdmin(auth) && auth.membership.id === session.membershipId ? auth : null;
  }

  async logout(request: FastifyRequest): Promise<string> {
    const token = this.token(request);
    if (token) await this.repository.revoke(hash(token), this.now().toISOString());
    return this.cookie("", 0);
  }

  private token(request: FastifyRequest): string | undefined {
    const matches = (request.headers.cookie ?? "").split(";").map(s => s.trim()).filter(s => s.startsWith(`${this.config.cookieName}=`));
    if (matches.length !== 1) return undefined;
    const value = matches[0]!.slice(this.config.cookieName.length + 1);
    return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : undefined;
  }
  private cookie(token: string, maxAge: number): string {
    return `${this.config.cookieName}=${token}; Path=${this.config.path}; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${this.config.secure ? "; Secure" : ""}`;
  }
}
