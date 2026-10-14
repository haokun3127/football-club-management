import { request } from "./request";
import { getAppContext, getSession } from "./store";
import { environmentStorageKey } from "./config";
export interface ClubPresentation {
  branding: { name: string; logoUrl: string | null; primaryColor: string | null } | null;
  banners: Array<{ id: string; name: string; imageUrl: string; articleId: string | null }>;
  shareTemplates: Array<{ id: string; name: string; title: string; description: string | null; backgroundUrl: string | null }>;
  optionalFeatures: Array<{ key: string; name: string; path: string }>;
}
export async function getClubPresentation(): Promise<ClubPresentation> {
  const context = getAppContext();
  if (!context) throw new Error("请重新登录");
  const result = await request<{ presentation: ClubPresentation }>({
    path: `/clubs/${encodeURIComponent(context.clubId)}/app-clients/${encodeURIComponent(context.clientId)}/content/presentation`,
  });
  return result.presentation;
}
export interface ParentShortcut { key: string; label: string; icon: string; path: string }
const catalog: ParentShortcut[] = [
  { key: "leave", label: "请假", icon: "tab-calendar.svg", path: "/pages/parent/schedule/index" },
  { key: "records", label: "训练记录", icon: "tab-training.svg", path: "/pages/parent/training-history/index" },
  { key: "results", label: "测评结果", icon: "tab-growth.svg", path: "/pages/parent/confirmed-results/index" },
  { key: "service", label: "私教咨询", icon: "c164-category-private.svg", path: "/pages/parent/private/index" },
  { key: "growth", label: "成长记录", icon: "tab-growth.svg", path: "/pages/parent/growth/index" },
  { key: "content", label: "俱乐部内容", icon: "tab-discover.svg", path: "/pages/parent/content/index" },
  { key: "venues", label: "场地", icon: "tab-calendar.svg", path: "/pages/parent/venues/index" },
  { key: "faq", label: "常见问题", icon: "tab-user.svg", path: "/pages/parent/help/index" },
];
export const defaultParentShortcuts = catalog.slice(0, 4);
export function parentShortcutOptions(presentation: ClubPresentation): ParentShortcut[] {
  const options = [...defaultParentShortcuts];
  for (const feature of presentation.optionalFeatures) {
    const known = catalog.find(item => item.key === feature.key && (item.path === feature.path || item.key === "results" && feature.path === "/pages/parent/ability-history/index"));
    if (!known) continue;
    const index = options.findIndex(item => item.key === known.key);
    const item = { ...known, label: feature.name || known.label };
    if (index < 0) options.push(item); else options[index] = item;
  }
  return options;
}
function preferenceKey() {
  const session = getSession();
  return session?.userId && session.role === "parent"
    ? environmentStorageKey(`parent-shortcuts:${JSON.stringify([session.clubId, session.clientId, session.userId])}`) : null;
}
export function restoreParentShortcuts(options: ParentShortcut[]): ParentShortcut[] {
  const key = preferenceKey();
  let saved: unknown;
  try { saved = key ? wx.getStorageSync(key) : null; } catch { saved = null; }
  const keys = Array.isArray(saved) ? saved.filter((item): item is string => typeof item === "string") : [];
  return [...new Set([...keys, ...defaultParentShortcuts.map(item => item.key)])]
    .flatMap(id => { const item = options.find(option => option.key === id); return item ? [item] : []; }).slice(0, 4);
}
export function saveParentShortcuts(keys: string[], options: ParentShortcut[]) {
  if (keys.length !== 4 || new Set(keys).size !== 4 || keys.some(key => !options.some(item => item.key === key))) throw new Error("请选择四个不同的功能");
  const key = preferenceKey();
  if (!key) throw new Error("无法保存当前账号配置，请重新登录");
  wx.setStorageSync(key, keys);
  return keys.map(key => options.find(item => item.key === key)!);
}
