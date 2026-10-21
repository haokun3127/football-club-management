const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function currentLocalDate(now = new Date()): string {
  return new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function resolveParentPageDate(now = new Date(), developOverride: string | null = null): string {
  return developOverride && DATE_ONLY.test(developOverride) ? developOverride : currentLocalDate(now);
}

export function shiftCalendarDate(date: string, offsetDays: number): string {
  const shifted = new Date(`${date}T00:00:00.000Z`);
  shifted.setUTCDate(shifted.getUTCDate() + offsetDays);
  return shifted.toISOString().slice(0, 10);
}

/** Club business dates stay in Asia/Shanghai even when a device travels. */
export function calendarDateKey(value: string): string {
  const time = Date.parse(value);
  return Number.isFinite(time) ? currentLocalDate(new Date(time)) : "";
}

export function shiftCalendarMonth(date: string, offset: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  const day = value.getUTCDate();
  value.setUTCDate(1);
  value.setUTCMonth(value.getUTCMonth() + offset);
  const last = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0)).getUTCDate();
  value.setUTCDate(Math.min(day, last));
  return value.toISOString().slice(0, 10);
}
