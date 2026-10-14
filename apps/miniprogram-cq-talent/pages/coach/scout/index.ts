import { requireRole } from "../../../utils/auth";
import { formatDateTime, resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import { listScoutPlayers, getScoutPlayer, createScoutPlayer, getEventRoster, changeEventRoster } from "../../../utils/scout-players";
import type { ScoutPlayer, ScoutDetail, EventRoster } from "../../../utils/scout-players";
import type { LoadState } from "../../../utils/types";
type Mode = "list" | "create" | "detail";
const initial = { eventId: "", eventRoster: null as EventRoster | null, included: false, temporary: false, mustReload: false, navInset: resolveNavInset(), menuInset: resolveMenuInset(), mode: "list" as Mode, pageTitle: "球探人员库", state: "idle" as LoadState, message: "", search: "", loadedSearch: "", players: [] as ScoutPlayer[], nextOffset: null as number | null, canCreate: false, name: "", identityNumber: "", saving: false, loadingMore: false, player: null as ScoutPlayer | null, participations: [] as Array<ScoutDetail["participations"][number] & { date: string; statusLabel: string }> };
Page<typeof initial>({
  data: initial,
  onLoad(query: { mode?: string; student?: string; eventId?: string } = {}) {
    if (!requireRole("coach")) return;
    this.setData({ eventId: query.eventId || "" });
    if (query.mode === "create") return this.newPlayer();
    if (query.student) return this.loadDetail(query.student);
    return this.load();
  },
  onUnload() { (this as unknown as { _scoutDisposed?: boolean })._scoutDisposed = true; next(this); this.setData({ identityNumber: "", name: "" }); },
  async load(more = false) {
    if (!requireRole("coach") || this.data.saving || this.data.loadingMore || (more && this.data.nextOffset === null)) return;
    const token = next(this), offset = more ? this.data.nextOffset! : 0, search = more ? this.data.loadedSearch : this.data.search.trim();
    this.setData({ mode: "list", pageTitle: this.data.eventId ? "添加临时球员" : "球探人员库", message: "", loadingMore: more, ...(more ? {} : { state: "loading", canCreate: false }) });
    try {
      const [result, eventRoster] = await Promise.all([listScoutPlayers(search, offset), this.data.eventId ? getEventRoster(this.data.eventId) : Promise.resolve(null)]); if (!current(this, token)) return;
      if (!Array.isArray(result.players) || !result.players.every(validPlayer) || (result.nextOffset !== null && (!Number.isInteger(result.nextOffset) || result.nextOffset <= offset))) throw new Error("Invalid scout list");
      if (eventRoster) validateRoster(eventRoster, this.data.eventId);
      this.setData({ eventRoster, mustReload: false, state: "ready", players: more ? [...this.data.players, ...result.players.filter(p => !this.data.players.some((old: ScoutPlayer) => old.id === p.id))] : result.players, nextOffset: result.nextOffset, loadedSearch: search, canCreate: result.canCreate === true, loadingMore: false });
    } catch { if (current(this, token)) this.setData({ state: more ? "ready" : "error", loadingMore: false, message: "球探档案读取失败，请重试。" }); }
  },
  inputSearch(event: { detail: { value: string } }) { this.setData({ search: event.detail.value.slice(0, 60) }); },
  searchPlayers() { return this.load(); },
  loadMore() { return this.load(true); },
  newPlayer() { if (!requireRole("coach") || this.data.saving) return; next(this); this.setData({ mode: "create", pageTitle: this.data.eventId ? "新建临时球员" : "新建球探档案", state: "ready", message: "", name: "", identityNumber: "" }); },
  inputName(event: { detail: { value: string } }) { if (!this.data.saving) this.setData({ name: event.detail.value.slice(0, 60) }); },
  inputIdentity(event: { detail: { value: string } }) { if (!this.data.saving) this.setData({ identityNumber: event.detail.value.trim().toUpperCase().slice(0, 18) }); },
  async save() {
    if (!requireRole("coach") || this.data.saving || this.data.mode !== "create") return;
    const input = { name: this.data.name.trim().normalize("NFC"), identityNumber: this.data.identityNumber.trim().toUpperCase() };
    if (!input.name || !/^[1-9]\d{16}[\dX]$/.test(input.identityNumber)) { this.setData({ message: "请填写姓名和18位身份证号码。" }); return; }
    const token = next(this); this.setData({ saving: true, message: "" });
    try {
      const result = await createScoutPlayer(input); if (!current(this, token)) return;
      if (!validPlayer(result.player) || result.player.name !== input.name || !result.player.maskedDocument.endsWith(input.identityNumber.slice(-4)) || typeof result.created !== "boolean") throw new Error("Unconfirmed scout save");
      this.setData({ saving: false, identityNumber: "", name: "" });
      wx.showToast({ title: result.created ? "档案已保存" : "已找到现有档案", icon: "none" });
      await this.loadDetail(result.player.id);
      if (!(this as unknown as { _scoutDisposed?: boolean })._scoutDisposed && this.data.state === "ready" && this.data.eventId) return this.addToEvent();
    } catch (error) {
      if (!current(this, token)) return;
      const code = (error as { code?: string }).code;
      const messages: Record<string, string> = { invalid_identity_number: "请核对身份证号码、出生日期和校验位。", identity_name_conflict: "身份信息不一致，请核对或联系后台。", legacy_identity_review_required: "已有历史档案需要后台核对，请勿重复建档。", identity_not_configured: "人员身份登记尚未配置，请联系管理员。" };
      this.setData({ saving: false, message: messages[code || ""] || "未能确认保存结果，输入已保留。重试会核对同一身份，避免重复建档。" });
    }
  },
  openPlayer(event: { currentTarget: { dataset: { id: string } } }) { return this.loadDetail(event.currentTarget.dataset.id); },
  async loadDetail(studentId: string) {
    if (!requireRole("coach") || this.data.saving) return;
    const token = next(this); this.setData({ mode: "detail", pageTitle: "球员档案", state: "loading", message: "", player: null, participations: [] });
    try {
      const [result, eventRoster] = await Promise.all([getScoutPlayer(studentId), this.data.eventId ? getEventRoster(this.data.eventId) : Promise.resolve(null)]); if (!current(this, token)) return;
      if (!validPlayer(result.player) || result.player.id !== studentId || !Array.isArray(result.participations)) throw new Error("Invalid scout detail");
      if (eventRoster) validateRoster(eventRoster, this.data.eventId);
      this.setData({ eventRoster, included: eventRoster?.roster.participantIds.includes(studentId) || false, temporary: eventRoster?.roster.temporary.some(p => p.studentId === studentId && p.active) || false, mustReload: false, state: "ready", player: result.player, participations: result.participations.map(p => ({ ...p, date: Number.isFinite(Date.parse(p.startsAt)) ? new Date(Date.parse(p.startsAt) + 8 * 3600000).toISOString().slice(0, 16).replace("T", " ") : "时间待核对", statusLabel: p.status === "cancelled" ? "已取消" : "活动名单记录" })) });
    } catch { if (current(this, token)) this.setData({ state: "error", message: "档案读取失败或已无访问权限，请返回人员库重试。" }); }
  },
  async addToEvent() {
    if (!this.data.eventId || !this.data.player || !this.data.eventRoster || this.data.eventRoster.event.cancelled || this.data.saving || this.data.mustReload || this.data.included) return;
    const token = next(this); let participated: boolean | undefined;
    if (this.data.eventRoster.event.ended) {
      try { const choice = await new Promise<number>((resolve, reject) => wx.showActionSheet({ itemList: ["本次参加", "本次未参加"], success: r => resolve(r.tapIndex), fail: reject })); if (!current(this, token)) return; participated = choice === 0; }
      catch { return; }
    }
    if (!current(this, token)) return;
    return this.changeRoster("add", participated);
  },
  async changeRoster(action: "add" | "remove", participated?: boolean) {
    if (!requireRole("coach") || !this.data.eventRoster || !this.data.player || this.data.saving || this.data.mustReload) return;
    const eventId = this.data.eventId, studentId = this.data.player.id, token = next(this);
    this.setData({ saving: true, message: "" });
    try {
      const result = await changeEventRoster(eventId, { expectedRevision: this.data.eventRoster.roster.revision, action, players: [{ studentId, ...(typeof participated === "boolean" ? { participated } : {}) }] });
      if (!current(this, token)) return; validateRoster(result, eventId);
      if (result.roster.participantIds.includes(studentId) !== (action === "add")) throw new Error("Roster change not confirmed");
      this.setData({ saving: false, eventRoster: result, included: action === "add", temporary: action === "add" });
      wx.showToast({ title: action === "add" ? "已加入本次活动" : "已移出本次名单", icon: "none" });
    } catch (error) { if (current(this, token)) this.setData({ saving: false, mustReload: true, message: (error as { code?: string }).code === "participant_has_facts" ? "已有活动记录，请到训练记录或比赛记录中更正。历史会保留。" : "档案已保存，名单操作结果尚未确认，请刷新核对后再操作。" }); }
  },
  manageRoster() {
    if (!this.data.included || !this.data.eventRoster || this.data.saving || this.data.mustReload) return;
    const token = next(this);
    const items = this.data.temporary && !this.data.eventRoster.event.cancelled ? ["查看名单修改记录", "移出本次名单"] : ["查看名单修改记录"];
    wx.showActionSheet({ itemList: items, success: r => { if (!current(this, token)) return; if (r.tapIndex === 1) { void this.changeRoster("remove"); return; }
      const entry = this.data.eventRoster?.roster.temporary.find((p: EventRoster["roster"]["temporary"][number]) => p.studentId === this.data.player?.id);
      wx.showModal({ title: "本次名单记录", content: entry?.history.map((h: EventRoster["roster"]["temporary"][number]["history"][number]) => `${formatDateTime(h.changedAt)} · ${h.actorName} · ${h.action === "add" ? "加入" : "移出"}${typeof h.participated === "boolean" ? h.participated ? " · 参加" : " · 未参加" : ""}`).join("\n") || "正式名单成员", showCancel: false });
    } });
  },
  retry() { return this.data.mode === "detail" && this.data.player ? this.loadDetail(this.data.player.id) : this.load(); },
  goBack() {
    if (this.data.saving) return;
    if (this.data.mode === "create" && (this.data.name || this.data.identityNumber)) { wx.showModal({ title: "离开建档", content: "未保存的输入将清除。", success: r => { if (r.confirm) { this.setData({ name: "", identityNumber: "" }); void this.load(); } } }); return; }
    if (this.data.mode !== "list") return this.load();
    wx.navigateBack();
  },
});
function validPlayer(player: ScoutPlayer) { return !!player && typeof player.id === "string" && !!player.id && typeof player.name === "string" && /^\*{14}[\dX]{4}$/.test(player.maskedDocument); }
function next(page: unknown) { const p = page as { _scoutRequest?: number }; return p._scoutRequest = (p._scoutRequest || 0) + 1; }
function current(page: unknown, token: number) { return (page as { _scoutRequest?: number })._scoutRequest === token; }

function validateRoster(value: EventRoster, eventId: string) { if (!value || value.event?.id !== eventId || value.roster?.eventId !== eventId || !/^[0-9a-f]{64}$/.test(value.roster.revision) || !Array.isArray(value.roster.participantIds) || !Array.isArray(value.roster.temporary)) throw new Error("Invalid event roster"); }
