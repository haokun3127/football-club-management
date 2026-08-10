const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function currentLocalDate(now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function resolveParentPageDate(now = new Date(), developOverride: string | null = null): string {
  return developOverride && DATE_ONLY.test(developOverride) ? developOverride : currentLocalDate(now);
}

export function shiftCalendarDate(date: string, offsetDays: number): string {
  const shifted = new Date(`${date}T00:00:00.000Z`);
  shifted.setUTCDate(shifted.getUTCDate() + offsetDays);
  return shifted.toISOString().slice(0, 10);
}
