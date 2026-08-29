const MATCH_EVENT_DRAFT_PREFIX = "match-event-draft:v1";

const MATCH_EVENT_TYPES = [
  "goal",
  "assist",
  "save",
  "tackle",
  "foul",
  "yellow_card",
  "red_card",
  "penalty",
  "own_goal",
] as const;

export type MatchEventDraftType = (typeof MATCH_EVENT_TYPES)[number];

export interface MatchEventDraft {
  eventId: string;
  studentId: string;
  type: MatchEventDraftType;
  minute?: number;
  note?: string;
  updatedAt: string;
}

export function matchEventDraftStorageKey(eventId: string) {
  return `${MATCH_EVENT_DRAFT_PREFIX}:${eventId || "no-event"}`;
}

export function isMatchEventDraftType(value: string): value is MatchEventDraftType {
  return MATCH_EVENT_TYPES.includes(value as MatchEventDraftType);
}

export function loadMatchEventDraft(eventId: string): MatchEventDraft | null {
  if (!eventId) return null;

  try {
    const draft = toMatchEventDraft(wx.getStorageSync<unknown>(matchEventDraftStorageKey(eventId)));
    return draft?.eventId === eventId ? draft : null;
  } catch {
    return null;
  }
}

export function saveMatchEventDraft(value: unknown): MatchEventDraft | null {
  const draft = toMatchEventDraft(value);
  if (!draft) return null;

  try {
    wx.setStorageSync(matchEventDraftStorageKey(draft.eventId), draft);
    return draft;
  } catch {
    return null;
  }
}

export function clearMatchEventDraft(eventId: string) {
  if (!eventId) return;

  try {
    wx.removeStorageSync(matchEventDraftStorageKey(eventId));
  } catch {
    // Local storage failure must not change submission behavior.
  }
}

function toMatchEventDraft(value: unknown): MatchEventDraft | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const eventId = normalizeRequiredString(raw.eventId);
  const studentId = normalizeRequiredString(raw.studentId);
  const type = typeof raw.type === "string" && isMatchEventDraftType(raw.type) ? raw.type : null;
  const updatedAt = normalizeUpdatedAt(raw.updatedAt);
  const minute = normalizeMinute(raw.minute);
  const note = normalizeNote(raw.note);

  if (!eventId || !studentId || !type || !updatedAt || minute === null || note === null) return null;

  return {
    eventId,
    studentId,
    type,
    ...(minute === undefined ? {} : { minute }),
    ...(note === undefined ? {} : { note }),
    updatedAt,
  };
}

function normalizeRequiredString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeUpdatedAt(value: unknown) {
  if (typeof value !== "string" || !value.trim() || Number.isNaN(Date.parse(value))) return null;
  return value;
}

function normalizeMinute(value: unknown): number | undefined | null {
  if (value === undefined) return undefined;
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 300 ? value : null;
}

function normalizeNote(value: unknown): string | undefined | null {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return null;
  const note = value.trim();
  if (!note) return undefined;
  return note.length <= 500 ? note : null;
}
