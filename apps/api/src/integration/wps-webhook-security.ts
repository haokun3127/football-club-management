import { createHmac, timingSafeEqual } from "node:crypto";

export type WpsWebhookSigningMode = "disabled" | "hmac_sha256";

export interface WpsWebhookSecurityConfig {
  signingMode: WpsWebhookSigningMode;
  secretRef?: string;
  maxSkewSeconds: number;
}

export interface WpsWebhookSecurityEnvelope {
  timestamp?: string;
  nonce?: string;
  signature?: string;
}

export type WpsSecretResolver = (secretRef: string) => string | Promise<string>;

export interface WpsWebhookReplayGuard {
  remember(key: string, expiresAt: number): boolean | Promise<boolean>;
}

export function parseWpsWebhookSecurityConfig(config: Record<string, unknown>): WpsWebhookSecurityConfig {
  const signingMode = stringValue(config.webhookSigningMode) ?? "disabled";
  if (signingMode !== "disabled" && signingMode !== "hmac_sha256") {
    throw new Error("WPS webhook signing mode must be disabled or hmac_sha256.");
  }

  const parsed = {
    signingMode,
    secretRef: stringValue(config.webhookSecretRef),
    maxSkewSeconds: numberValue(config.webhookMaxSkewSeconds) ?? 300,
  } satisfies WpsWebhookSecurityConfig;

  if (parsed.signingMode === "hmac_sha256" && !parsed.secretRef) {
    throw new Error("WPS webhook hmac_sha256 signing requires webhookSecretRef.");
  }

  return parsed;
}

export async function verifyWpsWebhookSecurity(input: {
  config: WpsWebhookSecurityConfig;
  envelope?: WpsWebhookSecurityEnvelope;
  payload: unknown;
  secretResolver: WpsSecretResolver;
  replayGuard: WpsWebhookReplayGuard;
  now?: number;
}): Promise<void> {
  if (input.config.signingMode === "disabled") {
    return;
  }

  const envelope = input.envelope ?? {};
  if (!envelope.timestamp || !envelope.nonce || !envelope.signature) {
    throw new Error("WPS webhook signature, timestamp, and nonce are required.");
  }

  const timestamp = Number(envelope.timestamp);
  if (!Number.isFinite(timestamp)) {
    throw new Error("WPS webhook timestamp must be a unix millisecond value.");
  }

  const now = input.now ?? Date.now();
  const maxSkewMs = input.config.maxSkewSeconds * 1000;
  if (Math.abs(now - timestamp) > maxSkewMs) {
    throw new Error("WPS webhook timestamp is outside the allowed replay window.");
  }

  const secret = await input.secretResolver(input.config.secretRef ?? "");
  const expected = signWpsWebhookPayload({
    timestamp: envelope.timestamp,
    nonce: envelope.nonce,
    payload: input.payload,
    secret,
  });

  if (!timingSafeEqualString(expected, envelope.signature)) {
    throw new Error("WPS webhook signature verification failed.");
  }

  const replayKey = `wps-webhook:${input.config.secretRef}:${envelope.timestamp}:${envelope.nonce}:${envelope.signature}`;
  const accepted = await input.replayGuard.remember(replayKey, timestamp + maxSkewMs);
  if (!accepted) {
    throw new Error("WPS webhook replay detected.");
  }
}

export function signWpsWebhookPayload(input: {
  timestamp: string;
  nonce: string;
  payload: unknown;
  secret: string;
}): string {
  return createHmac("sha256", input.secret)
    .update(`${input.timestamp}.${input.nonce}.${canonicalJson(input.payload)}`)
    .digest("hex");
}

export function createEnvWpsSecretResolver(env: Record<string, string | undefined> = process.env): WpsSecretResolver {
  return (secretRef) => {
    const envKey = `WPS_WEBHOOK_SECRET_${secretRef.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;
    const secret = env[envKey];
    if (!secret) {
      throw new Error(`WPS webhook secret ${secretRef} is not configured.`);
    }

    return secret;
  };
}

export class InMemoryWpsWebhookReplayGuard implements WpsWebhookReplayGuard {
  private readonly seen = new Map<string, number>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  remember(key: string, expiresAt: number): boolean {
    this.prune();
    if (this.seen.has(key)) {
      return false;
    }
    this.seen.set(key, expiresAt);
    return true;
  }

  private prune() {
    const now = this.now();
    for (const [key, expiresAt] of this.seen.entries()) {
      if (expiresAt <= now) {
        this.seen.delete(key);
      }
    }
  }
}

function timingSafeEqualString(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(",")}}`;
  }

  return JSON.stringify(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
}
