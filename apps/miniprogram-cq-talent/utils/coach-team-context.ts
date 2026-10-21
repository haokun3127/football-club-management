import { getCoachTeam } from "./api";
import { environmentStorageKey } from "./config";
import { getSession } from "./store";
import type { TrainingTeamOption } from "./types";

function preferenceKey() {
  const session = getSession();
  return session?.role === "coach" && session.userId
    ? environmentStorageKey(
        `active-team:${session.clubId}:${session.userId}:coach`,
      )
    : null;
}
export function resolveActiveTeam(
  options: TrainingTeamOption[],
  explicit?: string,
): string {
  // This old key had no account owner. Never carry its value into a new account.
  try {
    wx.removeStorageSync(environmentStorageKey("coach-training-team-id"));
  } catch {
    /* Nonessential preference cleanup. */
  }
  if (explicit) {
    if (!options.some((team) => team.id === explicit))
      throw new Error("当前球队无权访问或已停用");
    return explicit;
  }
  const key = preferenceKey();
  let stored: unknown;
  try {
    stored = key ? wx.getStorageSync(key) : null;
  } catch {
    stored = null;
  }
  return (
    options.find((team) => team.id === stored)?.id ??
    (options.length === 1 ? options[0]!.id : "")
  );
}
export function rememberActiveTeam(id: string) {
  const key = preferenceKey();
  if (key) {
    try {
      wx.setStorageSync(key, id);
    } catch {
      /* Navigation remains usable without a preference cache. */
    }
  }
}
const pendingLoads = new Map<string,number>();
let loadSequence = 0;
export async function loadActiveTeam(explicit?: string) {
  const owner = preferenceKey(), version = ++loadSequence;
  if (owner) pendingLoads.set(owner,version);
  const initial = await getCoachTeam(explicit);
  if (preferenceKey() !== owner) throw new Error("账号已切换，请重新选择球队");
  const options = initial.teamOptions ?? (initial.team ? [initial.team] : []);
  const id = resolveActiveTeam(options, explicit);
  const detail = id
    ? initial.team?.id === id
      ? initial
      : await getCoachTeam(id)
    : null;
  if (detail?.team?.id !== id && id)
    throw new Error("球队数据与选择不一致，请重新选择");
  if (id && owner && preferenceKey() === owner && pendingLoads.get(owner) === version) rememberActiveTeam(id);
  return { id, options, detail };
}
