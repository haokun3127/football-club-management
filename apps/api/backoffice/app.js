const find = (id) => document.getElementById(id);
const environment = document.documentElement.dataset.environment;
const labels = { develop: "开发环境", trial: "体验环境", release: "正式环境" };
const base = new URL("./api/", location.href);
let table = "students", offset = 0, total = 0, search = "", sequence = 0, signedIn = false;
find("login-environment").textContent = find("environment").textContent = labels[environment] ?? "环境未配置";
find("login-submit").disabled = true;
async function api(path, body) {
  const response = await fetch(new URL(path, base), { method: body === undefined ? "GET" : "POST", credentials: "same-origin", cache: "no-store", redirect: "error", headers: { "X-FCM-Environment": environment, ...(body === undefined ? {} : { "Content-Type": "application/json" }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json();
  if (!response.ok) { const error = new Error(data?.error?.message || "请求失败"); error.status = response.status; throw error; }
  return data;
}
function showLogin() {
  signedIn = false; sequence++; find("login").hidden = false; find("workspace").hidden = true;
  find("table-body").replaceChildren(); find("identity").textContent = "";
  find("login-form").elements.password.value = "";
}
async function showWorkspace(session) {
  if (session.environment !== environment || !session.user?.name) throw new Error("登录环境不匹配");
  signedIn = true; find("login").hidden = true; find("workspace").hidden = false;
  find("identity").textContent = `${session.user.name} · 管理员`;
  await loadTable();
}
function cell(tag, value) { const node = document.createElement(tag); node.textContent = value; return node; }
async function loadTable() {
  const ticket = ++sequence;
  find("total").textContent = "正在读取…"; find("table-error").textContent = "";
  find("table-head").replaceChildren(); find("table-body").replaceChildren();
  find("previous").disabled = find("next").disabled = true;
  try {
    const result = await api(`catalog/${table}?${new URLSearchParams({ search, offset: String(offset) })}`);
    if (ticket !== sequence || !signedIn) return;
    if (!Array.isArray(result.rows) || !Array.isArray(result.columns) || !Number.isInteger(result.total)) throw new Error("数据格式错误");
    find("table-title").textContent = result.title; total = result.total;
    const heading = document.createElement("tr"); result.columns.forEach(name => heading.append(cell("th", name))); find("table-head").append(heading);
    for (const row of result.rows) { const element = document.createElement("tr"); row.values.forEach(value => element.append(cell("td", value))); find("table-body").append(element); }
    if (!result.rows.length) { const row = document.createElement("tr"), empty = cell("td", search ? "没有匹配的记录" : "暂无记录"); empty.colSpan = result.columns.length; row.append(empty); find("table-body").append(row); }
    find("total").textContent = `共 ${total} 条 · 每页 20 条`;
    find("previous").disabled = offset === 0; find("next").disabled = offset + 20 >= total;
  } catch (error) {
    if (ticket !== sequence) return;
    if (error.status === 401) { showLogin(); find("login-error").textContent = "登录已失效，请重新登录。"; }
    else { find("table-error").textContent = "数据暂时读取失败，请刷新重试。"; find("total").textContent = "读取未完成"; }
  }
}
find("login-form").addEventListener("submit", async event => {
  event.preventDefault(); const button = find("login-submit"); if (button.disabled) return;
  button.disabled = true; button.textContent = "正在登录…"; find("login-error").textContent = "";
  try {
    const form = event.currentTarget;
    const session = await api("login", { clubId: "club-chongqing-talent", username: form.elements.username.value.trim(), password: form.elements.password.value });
    form.elements.password.value = ""; await showWorkspace(session);
  } catch (error) {
    find("login-error").textContent = error.status === 429 ? "尝试次数较多，请15分钟后再试。" : error.status === 401 ? "账号或密码不正确，或账号暂无后台权限。" : "暂时无法登录，请稍后重试。";
  } finally { button.disabled = false; button.textContent = "登录工作台"; }
});
find("logout").addEventListener("click", async () => {
  find("logout").disabled = true;
  try { await api("logout", {}); showLogin(); }
  catch { find("table-error").textContent = "退出未完成，请重试。"; }
  finally { find("logout").disabled = false; }
});
find("tables").addEventListener("click", event => {
  const button = event.target.closest("button[data-table]"); if (!button) return;
  table = button.dataset.table; offset = 0; search = ""; find("search").value = "";
  find("tables").querySelectorAll("button").forEach(item => { item.classList.toggle("active", item === button); item.setAttribute("aria-current", item === button ? "page" : "false"); });
  find("table-title").textContent = button.textContent; void loadTable();
});
find("search-form").addEventListener("submit", event => { event.preventDefault(); offset = 0; search = find("search").value.trim(); void loadTable(); });
find("previous").addEventListener("click", () => { offset = Math.max(0, offset - 20); void loadTable(); });
find("next").addEventListener("click", () => { if (offset + 20 < total) { offset += 20; void loadTable(); } });
find("refresh").addEventListener("click", () => void loadTable());
try { await showWorkspace(await api("session")); } catch (error) { showLogin(); if (error.status !== 401) find("login-error").textContent = "暂时无法连接工作台，请稍后重试。"; }
finally { find("login-submit").disabled = false; }
