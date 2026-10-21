import { calendarDateKey, currentLocalDate, shiftCalendarDate } from "./date";
import type { ScheduleEvent } from "./types";

export const CALENDAR_WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];
export function calendarMonday(date: string): string {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return shiftCalendarDate(date, -((day + 6) % 7));
}
export function calendarDataRanges(
  date: string,
  expanded: boolean,
  utcPadding = false,
) {
  const first = `${date.slice(0, 7)}-01`,
    month = new Date(`${first}T00:00:00Z`);
  const last = new Date(
    Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0),
  )
    .toISOString()
    .slice(0, 10);
  const start = calendarMonday(expanded ? first : date),
    end = shiftCalendarDate(calendarMonday(expanded ? last : date), 6);
  const ranges: Array<{ from: string; to: string }> = [];
  for (
    let from = utcPadding ? shiftCalendarDate(start, -1) : start;
    from <= end;
  ) {
    const to =
      shiftCalendarDate(from, 30) < end ? shiftCalendarDate(from, 30) : end;
    ranges.push({ from, to });
    from = shiftCalendarDate(to, 1);
  }
  return ranges;
}
export function calendarDays(
  date: string,
  expanded: boolean,
  events: ScheduleEvent[],
  today = currentLocalDate(),
) {
  const first = `${date.slice(0, 7)}-01`;
  const start = calendarMonday(expanded ? first : date);
  const firstDate = new Date(`${first}T00:00:00Z`);
  const last = new Date(
    Date.UTC(firstDate.getUTCFullYear(), firstDate.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const length = expanded
    ? Math.ceil((last + ((firstDate.getUTCDay() + 6) % 7)) / 7) * 7
    : 7;
  const byDate = new Map<string, Map<string, ScheduleEvent>>();
  for (const event of events) {
    const key = calendarDateKey(event.startsAt);
    if (!key) continue;
    const group = byDate.get(key) ?? new Map<string, ScheduleEvent>();
    group.set(event.id, event);
    byDate.set(key, group);
  }
  return Array.from({ length }, (_, index) => {
    const key = shiftCalendarDate(start, index);
    const activities = [...(byDate.get(key)?.values() ?? [])].sort(
      (a, b) =>
        Date.parse(a.startsAt) - Date.parse(b.startsAt) ||
        a.id.localeCompare(b.id),
    );
    const firstEvent = activities[0];
    const type = firstEvent?.type ?? "other";
    const typeLabel =
      type === "training" ? "训练" : type === "match" ? "比赛" : "其他";
    const overflow = Math.max(0, activities.length - 1);
    return {
      date: key,
      number: String(Number(key.slice(-2))),
      selected: key === date,
      today: key === today,
      outside: key.slice(0, 7) !== date.slice(0, 7),
      title: firstEvent?.title ?? "",
      type,
      overflow,
      markers: (["training", "match", "other"] as const).filter((type) =>
        activities.some((event) => event.type === type),
      ),
      label: `${key}${key === today ? "，今天" : ""}${firstEvent ? `，${typeLabel}：${firstEvent.title}` : "，暂无日程"}${overflow ? `，另有${overflow}项` : ""}`,
    };
  });
}

export function calendarGridHeight(dayCount: number, availableHeight: number) {
  // Header44 + weekdays22 + footer44 + legend24 + vertical padding16 + border2.
  return Math.max(
    48,
    Math.min((dayCount / 7) * 48, Math.floor(availableHeight * 0.65) - 152),
  );
}
