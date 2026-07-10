import { randomUUID } from "node:crypto";
import type { AuthContext } from "./context.js";

export class SessionRegistry {
  private readonly sessions = new Map<string, { auth: AuthContext; expiresAt: number }>();

  create(auth: AuthContext, expiresInSeconds = 7200) {
    const token = `wx-session-${randomUUID()}`;
    this.sessions.set(token, { auth, expiresAt: Date.now() + expiresInSeconds * 1000 });
    return { token, expiresInSeconds };
  }

  resolve(token: string | undefined, clubId: string): AuthContext | null {
    if (!token) return null;
    const session = this.sessions.get(token);
    if (!session || session.auth.clubId !== clubId || session.expiresAt <= Date.now()) {
      if (session) this.sessions.delete(token);
      return null;
    }
    return session.auth;
  }
}
