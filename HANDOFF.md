# 交接文档 — 重庆天才足球俱乐部管理系统（→ Kimi）

交接时间：2026-08-13
仓库路径：`C:\Users\ASUS\Desktop\football-club-management-codex-windows-2026-08-02`
当前分支：**dev（HEAD = `1ab6785`）**；分支模型 = **master（稳定）+ dev（日常）**，本地远端各两个，无其他分支。

这份文档假设你没读过之前的对话。全部结论都可以自己复核，路径和行号都给了。

---

## 〇、接手后最先做的四件事

1. `git checkout dev && git pull origin dev`
2. 跑门禁（本机 pnpm 不在 PATH，必须用 npx 钉版）：
   ```bash
   npx --yes pnpm@10.33.0 run check
   ```
   预期全绿。小程序单独跑是 `54 files / 307 tests`。
3. **让用户在微信开发者工具模拟器里手动点一次「微信手机号授权并继续」**。授权弹窗自动化点不动，这是唯一的人工步骤；没有真实会话就做不了任何页面截图验收。
4. 读 `docs/design/specifications/figma-online-frame-map-2026-08-12.md`（Figma 在线画板 ↔ 路由映射表，复原任务的施工图纸）。

---

## 一、当前主任务：家长端 + 教练端按 Figma 全量复原

用户的要求是**完全按 Figma 复原**，验收标准是**真实 375×812 截图逐页对照设计稿**。静态检查和单元测试通过不算验收通过——这条是用户明确定过的，别用测试绿来充当视觉验收。

- 权威设计：Figma 文件 `zZ6wKyOHKcO4UYXDd9jGwv`，家长端在页面 `4:6`（21 画板），教练端在 `4:7`（28 画板），共 49 个业务状态。
- **`CODE /` 前缀的画板不是权威**（用户 2026-08-07 裁定）。
- 49 张设计稿已导出为离线 PNG 存进仓库：`docs/design/reference/figma/`，`README.md` 里有画板↔文件对照表。**优先用本地 PNG，不必每次调 Figma MCP。**
- 已完成：P1 Schedule Home（对齐新设计 `269:250`，提交 `4e0bd64`，截图验收过）、内容中心/场地/活动详情（`d7a3309`）。
- 未完成：家长端其余画板、教练端 28 板。

### 逐页施工循环

```bash
# 1. 截当前实现（force 强制重导航，同路由不同 query 时必须加，否则拍到旧页）
node scripts/devtools/mp-route-shot.cjs "pages/parent/xxx/index" "C:\...\tmp\figma-restore\xxx-current.png" force

# 2. 与设计稿合成左右对比图
python scripts/devtools/sidebyside.py docs/design/reference/figma/<页面>.png tmp/figma-restore/xxx-current.png tmp/figma-restore/xxx-cmp.png
```

看对比图找差异 → 改 wxml/wxss/ts → `typecheck` + `vitest run` → 重截图复验 → **路径限定 `git add` 单独提交**。

批量截多页用 `scripts/devtools/mp-batch-shot.cjs`（单连接跑完整条清单，比每页重连快一个量级）。只想快速知道某页是真错页还是空态页，用 `scripts/devtools/mp-smoke.cjs`——它只回读 `state`/`message`，不截图。

工具链的完整说明和全部已知坑在 `scripts/devtools/README.md`，动手前先看一眼。

---

## 二、上一轮（2026-08-13）刚做完的事

### 已提交

| 提交 | 内容 |
|---|---|
| `d674b15` | 家长端底部导航三格补为设计稿的四格（新增「发现」）；tab 根页跳转改 `reLaunch` |
| `df7085f` | 打通 `lesson-correction`、`test-tasks` 两个孤儿页；训练任务改跳 `content-select` |
| `d7a3309` | 内容中心/场地/活动详情对齐设计稿，补实景图与线性图标 |
| `2613721`、`1ab6785` | DevTools 工具链收编进 `scripts/devtools/` |

两个值得记住的修复原因：

- **tab 跳转必须用 `reLaunch`**。tab 根页之间原来用 `navigateTo`，页面栈会一直堆叠，超过 10 层后静默失败——表现是"点了没反应"，很难查。`utils/navigation` 里的 `openTab` 已经封好，新代码直接用。
- **训练任务原本跳错页**。日程页跳 `/coach/training/index?eventId=x`，但训练管理页是 tab 根页、不读 `eventId`，点进去等于丢掉活动上下文。现在跳 `content-select`。

### 未提交（工作树里现成的一处修复）

`apps/miniprogram-cq-talent/pages/parent/content/index.ts` + 同目录 `index.test.mjs`。

内容中心整页空白的根因修复：`state` 原来把「加载失败」和「文章列表为空」混为一谈，文章数为 0 就置 `state: "empty"`，而 WXML 把分类导航、推荐卡、快速入口四格这些**静态设计内容整体挂在 `state === 'ready'` 之下**，于是后端返回空文章列表会连带擦掉整页。修法是加载成功一律 `ready`，文章数为 0 只驱动「最近文章」段内的空提示。

测试已同步（段级空提示 + 结构守卫防止静态块再被文章数据门禁），`54 files / 307 tests` 全绿，模拟器实测整页正常渲染。**可以直接提交，只加这两个文件。**

这个模式值得推广：**任何页面只要有静态设计内容，就不能把它挂在依赖 API 数据的 `state === 'ready'` 之下。** 复原其他页面时留意同类写法。

---

## 三、待办第一优先：快速入口页面没有内容（数据侧，未修）

用户报告：家长端「发现」的快速入口点进去，除了教练团队都没内容。

**已定位到根因，是数据缺失，不是页面 bug。** 用真实会话逐个打接口的实测结果：

| 接口 | 结果 |
|---|---|
| `/content/articles` | `200` `{"articles":[]}` |
| `/content/faqs` | `200` `{"questions":[]}` |
| `/venues` | `200` `{"venues":[]}` |
| `/coach-team` | 有真实数据 |

`contentArticles` / `contentFaqs` / `venues` 三个集合**只存在于验收 seed** `apps/api/src/seed/cq-talent-acceptance.ts:653`（4 篇文章、5 条 FAQ、3 个场地，都是写好的中文内容），而该 seed 在 `apps/api/src/seed/index.ts:44` 被限制为：

```ts
process.env.NODE_ENV !== "production" && process.env.FCM_CQ_TALENT_ACCEPTANCE_SEED === "1"
```

**生产按设计永不加载**，所以线上三个集合是空的。教练团队页有内容，是因为 `coach-team` 路由（`apps/api/src/routes/app-client.routes.ts:2097`）读的是 `listTeams` / `listCoaches` 运营实体表，那里有 2026-08-12 补数写进去的真实数据。

页面侧不需要改：`venues`/`help`/`coaches` 三页整页空态是**正确行为**（它们本身没有静态设计内容，和内容中心的情况不同）。

**用户已裁决（2026-08-13）：一律使用线上环境，小程序任何环境都直连生产，不走本地 API。** 路径 2（本地 seed）被否决。剩余待裁决：路径 1（受控 INSERT 进生产）或路径 3（空态引导做完整）。

**新发现（同日实测）：生产部署的 API 版本落后于 dev 分支**——小程序当前调用的 `/content/venues`、`/content/coaches` 在生产返回 **404 路由不存在**，而旧路由 `/venues` 在生产存在（403 是鉴权拦截）。本地 dev 代码两条路由都有。含义：快速入口页要在线上出内容，除了灌数据，还需要把当前 API 代码部署到生产（用户授权的运维操作），或小程序改回旧路由。

本轮没有执行任何生产写库操作。

---

## 四、项目结构与技术约束

单仓 pnpm workspace：

- `apps/api/` — Fastify + 文件型 SQLite。BFF 路由在 `src/routes/app-client.routes.ts`，数据访问在 `src/store.ts`，种子在 `src/seed/`。
- `apps/miniprogram-cq-talent/` — 微信小程序（TypeScript）。44 条路由：家长 15 + 教练 25 + 启动/登录 2 + 其他 1。
- `packages/` — 领域层。
- `docs/` — 见第八节文档地图。
- `.trellis/` — 任务与规范层，工作流规则在 `.trellis/workflow.md`。`AGENTS.md` 说明 Trellis 是强制流程。

小程序侧的硬性约束（踩过才立的规矩）：

- **WXML 里禁用 `.map()` / `.filter()` / `.slice()` / `.indexOf()` 等 JS 方法**，展示值一律在 TypeScript view model 里预计算好再 `setData`。
- WXSS 禁长 base64。图标用 `/assets/icons/*.svg` + `<image mode="aspectFit">`。
- 页面统一复用 `app-header` / `role-tabbar` / `status-view` 三个组件加 `styles/tokens.wxss` 的 token 变量，不要新造一套。
- 路由跳转走 `utils/navigation` 的 `openPage` / `openTab`，不要直接调 `wx.navigateTo`。
- 会话存在 storage 键 `cqTalentSession`（含 `clubId` / `clientId` / `token`）。**token 绝不要打印到输出、日志、截图或提交里。**

API 侧：

- 改完 `apps/api` 必须重新 build 再重启对应 API，否则请求还打在旧 `dist` 上，表现是莫名 404。
- 本机 shell 有 `HTTP_PROXY=127.0.0.1:7890`，curl 打 localhost 或生产都要加 `--noproxy '*'`。

---

## 五、生产环境

- 生产 API：`https://cqtc.pomi.tech`，容器 `cq-talent-api`，文件型 SQLite `/var/lib/cq-talent/api.sqlite`。
- 服务器 `43.136.114.225`，Ubuntu 24.04，用户 `ubuntu`。**密码问用户要，不要写进任何仓库文件。** 用户此前在聊天里贴过密码，建议提醒用户择机轮换。
- 接入方式：`uv run --with paramiko python <script.py>`。复杂 SQL/JS 用 base64 编码后在容器内 `node -e` 执行（`node:sqlite` 的 `DatabaseSync`）。
- **铁律一：任何直接写库操作后必须 `docker restart cq-talent-api`。** 运行进程启动时用 `mergePersistedPlatformData` 做内存快照，不会自动重载，不重启前端看不到新数据。2026-08-12 的「测试账号登录受限」就是这个原因——导入晚于进程启动。
- **铁律二：写库前必先备份** `VACUUM INTO '/var/lib/cq-talent/api-backup-<标签>.sqlite'`。已有备份：`pre-51028d0-20260812T100034Z`、`api-backup-pre-enrich-20260812`。
- 生产 API **不接受 `x-user-id` 头鉴权**（`createProductionMembershipResolver` 硬关），只能用真实微信登录会话。
- 生产**不要重跑全量 seed**，会覆盖用户绑定手机号（`fb1e268` 修过这个缺陷）。补数只能受控 INSERT。

**任何生产操作都需要用户明确授权后另立任务**，顺序是：只读确认目标 → 受限备份 → dry-run → 向用户确认 → 执行 → 有界只读回查 → 仅重启 API → 真机后验。详细流程见 `docs/current/agent-handover-2026-08-12.md` 第 6 节。

---

## 六、数据现状（2026-08-12 补数后）

三个测试账号，都是家长+教练双角色。手机号之一是 `19922961921`，另外两个问用户。每个账号：

- 2 个孩子
- 17 个事件，跨 2026-07-14 → 08-17，每周 2 次训练 + 双周赛，其中 4 场在未来
- 32 条 metric 记录（8 个雷达维度 × 4 个采样点：07-15 / 07-22 / 07-29 / 08-05）
- 课时台账（充值 24 / 余额 21）、保险至 2027-01-15、运营档案

「最近一个月每天有数据」的要求已满足。未来赛事参与状态是 `enrolled`（显示"状态待确认"），已完成赛事是 `confirmed`（显示"已到场"）。

**注意：** 所有补数行 ID 带 `secure-test` 命名空间，但它们**不在** `secure-test-accounts` 命令的 canonical manifest 里，rollback 命令不会清理，需要按 `%secure-test%` 模式手动清。

---

## 七、已知坑（全部踩过，别再踩）

### 环境

1. **终端 `cd` 会改会话工作目录**，之后相对路径的文件读写全部失效。cd 过就一律用绝对路径。
2. 路径含中文时 ripgrep 会炸（os error 3），用 terminal 的 grep/find 兜底。
3. Windows 是 CRLF，git 会提示 `LF will be replaced by CRLF`，这是正常噪音不是错误。
4. 控制台显示中文可能乱码，那只是终端编码，文件本身是好的——别照着乱码去"修复"文件。

### 微信开发者工具

5. **`automator` 的 `reLaunch` / `navigateTo` promise 会挂起或报空错 `{}`**，必须走 `mp.callWxMethod("reLaunch", {url})` 通道。`scripts/devtools/` 的脚本已经封好了，不要改回去。
6. **`mp.screenshot` 超时先查 DevTools 主窗口是否失焦或最小化。** 实测窗口不在前台会让截图通道挂死，把窗口置前台就恢复，不用重启。可以用 `scripts/devtools/focus-devtools.ps1`。还不行再 `cli.bat quit` 重开。
7. 自动化端口会莫名失效（`Failed connecting to ws://...`），换个新端口重新注册即可，别在死端口上重试：
   ```bash
   "/d/微信web开发者工具/cli.bat" auto --project "C:\Users\ASUS\Desktop\football-club-management-codex-windows-2026-08-02\apps\miniprogram-cq-talent" --auto-port 9430
   ```
   换端口后同步改脚本里的端口号，或用 `MP_AUTO_PORT=9430 node ...` 覆盖。
8. **不要用 `DEV_AUTO_SESSION=true` 验生产页面。** 生产硬关 x-user-id 鉴权，假会话只会 403，而且它把伪造会话写进 wx storage，回滚配置后残留会话还在，导致持续 403。补救是 `mp.callWxMethod("clearStorage")` + 干净重启。
9. 授权弹窗和身份选择自动化点不动，必须用户手动点。
10. **强杀 DevTools 进程会导致 GUI 白屏**（`Ctrl+Win+Shift+B` 重置显卡驱动可恢复）且丢登录态。要退就用 `cli.bat quit`。
11. 截图前留 8-15s 给编译，脚本内已含等待与轮询。
12. canvas 内容在 `mp.screenshot` 里可能不显示（雷达图就是），这是采集限制不是页面缺陷，用 dxcam 可验证。

---

## 八、提交纪律

- **路径限定 `git add <具体路径>`，禁 `git add -A`。** 每个逻辑批次独立验证、独立提交。
- 提交前跑 `typecheck` + `vitest run`。
- 以下文件**不要带进提交**（用户文件或他人在途工作）：
  - `apps/miniprogram-cq-talent/project.config.json`（仅 EOL 差异）
  - `apps/api/tmp-phone-repro.mjs`
  - `docs/superpowers/`
  - 根目录的 WPS `.xlsx`
  - `assets/icons/settings.svg`、`assets/icons/login-wechat.svg`
- 不要删除分支、archive 文件、数据库或 worktree，除非用户明确授权。
- master 目前落后 dev，是否同步由用户决定。

---

## 九、文档地图

| 文档 | 用途 |
|---|---|
| `HANDOFF.md`（本文） | 总交接，接手第一篇 |
| `docs/README.md` | 文档导航总入口 |
| `docs/current/progress.md` | 逐日进度流水，最新结论在末尾 |
| `docs/design/specifications/figma-online-frame-map-2026-08-12.md` | Figma 画板↔路由映射（施工图纸） |
| `docs/design/reference/figma/` | 49 张设计稿离线 PNG + 对照表 |
| `scripts/devtools/README.md` | 截图工具链用法与全部已知坑 |
| `docs/current/agent-handover-2026-08-12.md` | 上一轮交接，生产操作强制顺序在第 6 节 |
| `docs/current/deployment-requirements.md` | 部署与运维要求 |
| `AGENTS.md` | Trellis 工作流（强制规则） |

---

## 十、措辞纪律

这个项目对"验证到什么程度"要求很严，之前的文档都是这么写的，请保持：

- 静态检查、单元测试、`/health` 返回 200 **都不等于**视觉验收通过或"可稳定演示"。
- 没取到可信 375×812 截图，就明确写"未取得运行态视觉验收"，不要用推断补齐。
- 接口存在、历史 seed 有数据，不等于此刻线上有数据。
- 区分清楚本地证据和生产证据，别把本地结论写成生产结论。
- 设计稿里有但 API 没有的能力（比如某个按钮、某个字段），**不要伪造成可用**，保持缺失或显示"待同步"。这条用户反复强调过。
