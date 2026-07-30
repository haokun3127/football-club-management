import type { ReminderItem } from "./types";

const READ_STORAGE_KEY = "cq-parent-reminder-read-ids";

export function getReminderReadIds(): string[] {
  const raw = wx.getStorageSync(READ_STORAGE_KEY);
  return Array.isArray(raw) ? raw.map(String) : [];
}

export function setReminderReadIds(ids: string[]) {
  wx.setStorageSync(READ_STORAGE_KEY, ids.slice(-500));
}

export function markAllRemindersRead(items: Array<{ id: string }>) {
  const readIds = new Set(getReminderReadIds());
  items.forEach((item) => readIds.add(item.id));
  setReminderReadIds(Array.from(readIds));
}

export function countUnreadReminders(items: ReminderItem[]): number {
  const readIds = new Set(getReminderReadIds());
  return items.filter((item) => !readIds.has(item.id)).length;
}
