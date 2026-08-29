# 交付 — 2026-08-18 重庆天才足球俱乐部小程序（家长端收官 + 教练端 C4-C16.4 收口）

## 2026-08-18 截图通道交接更新

- 当前默认可信视觉证据改为 WeChatIDE MCP：`node scripts/devtools/wechatide-mcp-capture.cjs --route /<exact-route> --output <absolute.png>`。
- MCP 通过 `D:\微信web开发者工具\wechatide.cmd mcp` 编译/打开页面、复核路由和 `375×812` 逻辑视口，再用 `simulator_screenshot(optimize=false, waitForSelector="view")` 等待页面挂载后获取原始 PNG，归一化后输出 PNG + JSON sidecar；仅路由切换成功不足以证明页面已经渲染。
- MCP 失败即停止，不自动切换旧 Automator、PrintWindow 或桌面裁图。旧通道仅用于明确标注的紧急排障。
- Codex 配置已登记 `wechat-devtools` MCP server；重开 Codex 后原生工具才会出现在工具列表。微信开发者工具项目窗口仍需用户正常打开，真实登录/授权仍由用户完成。
- 当前打开的模拟器实测为 iPhone 12/13 (Pro) `390×844`；视觉验收前请在 DevTools 机型下拉切回 iPhone X `375×812`，然后直接重跑 MCP 命令。

## 环境
- 仓库：football-club-management-codex-windows-2026-08-02，分支 dev（HEAD `87ab316`，已推 origin/dev）
- 生产：https://cqtc.pomi.tech（43.136.114.225，compose 服务名 api，端口 3000），当前部署 = `87ab316`，镜像 `cq-talent-api:latest`，health=200
- 门禁：`npx --yes pnpm@10.33.0 run check` → exit=0（domain 20 / miniprogram 401 / api 115 全绿）；Windows npm 缓存冲突时使用任务专用临时 cache 重跑
- 交接文档：仓库根 `HANDOFF.md`（2026-08-13 全量）+ `HANDOFF-2026-08-14.md`（本次增量，SOP 以这份为准）

## 已完成验收（真实 375×812 截图对照设计稿）
- 家长端 21 板：全部 ✅
- 教练端 C1–C3、C4–C16.4 全部完成在线 Figma 对照收口；逐页节点、路由、动态数据豁免和截图证据见 `docs/current/progress.md` 与 `docs/design/reference/figma/README.md`。
- 最后修复：C16 退出登录 CTA 从微信原生 button 收缩态改为显式全宽自定义 CTA，提交 `ef75409`；真实 WeChatIDE MCP 375×812 复验图为 `tmp/coach-runtime-acceptance/C16-20260818-mcp-after-logout-fix.png`。
- 当前没有剩余的教练端视觉代码批次；未配置的权限、私教时段、账号字段、FAQ 内容等继续按真实 API 契约显示空态，不补造 Figma 样例数据。

## 服务端本次新增（已上生产）
- POST /coach/events/:eventId/finish（结束训练，scheduled→completed）
- coach/home 增 coachName / summary.attendance / weekStats
- change-requests 增 notifyParents（迁移 0011，列 notify_parents）

## 接手必看 SOP（血泪教训）
1. 教练会话：先 `tmp/prod-verify/prod-plant-session-coach.py` 服务端种 coach 会话，再 `PLANT_ROLE=coach PLANT_TOKEN=*** MP_AUTO_PORT=9432 node scripts/devtools/mp-plant-session.cjs`
2. 默认截图使用 `node scripts/devtools/wechatide-mcp-capture.cjs --route /<exact-route> --output <absolute.png>`；MCP 失败即停止。旧 `automator screenshot`/窗口裁图只在用户明确要求紧急回退时使用，并标注证据来源。
3. 代码提交后模拟器常跑旧 bundle → 让用户点一次「编译」再截图
4. DevTools 白屏死态：唯一恢复 = 用户手动完全退出 IDE 重开；**绝不要 kill DevTools 进程**
5. 「进行中」是推导态（scheduled 且 now∈[start,end]），不是存储状态；C2 验收用的进行中窗口数据会过期，过期重跑 tmp/prod-verify/c2-extend-run.py
6. **每页开工前先抽查该板在线稿是否变更**：离线 PNG 是 2026-08-12 快照（已验证与在线一致），但若用户后来在线改过，必须重拉。方法：frame-map 查该板 node id → Figma MCP `get_screenshot`（file `zZ6wKyOHKcO4UYXDd9jGwv`）→ 与离线 PNG 像素 diff；有实质差异就下载覆盖 `docs/design/reference/figma/<页面>.png` 并提交，再按新稿复原。

## 2026-08-28 家长端学期报告与通知 Banner 收口

- 提交 `87ab316` 已推送 `origin/dev` 并部署到生产；部署前创建了服务器卷内受限 SQLite 一致性备份，未把凭据、手机号或 token 写入仓库。
- 生产 API 通过 `sudo docker compose ... up -d --no-build --force-recreate api` 重建；内部与公网 `https://cqtc.pomi.tech/health` 均返回 200。
- WeChatIDE MCP 实际打开 `pages/parent/schedule/index`，取得严格 `375×812` 截图：`tmp/goal-p1-notice-banner-runtime-after-deploy.png`。通知 Banner 已从生产真实 `content/articles` 数据渲染；报告页运行态证据为 `tmp/goal-p4-3-semester-report-runtime.png`。
- 本批已完成报告入口、真实通知 Banner、中文内容种子与空态处理；后续若继续总目标，先检查 active tasks，再按 Goal 的未闭环项推进，不要把本批结果误报为全 Goal 完成。

## 2026-08-28 C5 销课历史与详情运行态补证

- 已重新读取在线 Figma `zZ6wKyOHKcO4UYXDd9jGwv` 的 `537:2 / 537:79 / 537:156`，并用真实教练会话在 WeChatIDE MCP 取得待处理、历史、详情三条链路的严格 `375×812` 截图。
- 在 `pages/coach/lesson/index?id=event-cq-talent-secure-test-1-trn-0818` 通过现有“确认全部”操作写入一条真实测试销课台账；历史页现在能显示记录并进入 `pages/coach/lesson-detail`，详情页滚动到底部能看到“更正本次销课”。
- 证据文件：`tmp/goal-c5-coach-current-live.png`、`tmp/goal-c5-history-after-confirm-live.png`、`tmp/goal-c5-detail-live.png`、`tmp/goal-c5-detail-live-bottom.png`。当前活动训练内容真实返回 `0 项`，这是数据状态，不得用 Figma 示例训练项目填充。
- 本轮无业务代码/Figma 写回；console 错误过滤无命中，全仓门禁 domain `20/20`、小程序 `401/401`、API `115/115` 通过。下一步继续补其他仍缺“有数据运行态”证据的页面，先检查 active tasks 和工作区未提交边界。

## 2026-08-29 当前收口补充

- 当前 `dev` 已推送至 `b450705`；本轮新增的两个独立文档提交为 `92b3517`（C13/C14 MCP 白屏恢复复验）和 `b450705`（C7 隔离 SQLite 重启读回证据）。工作区其余在途改动仍未纳入提交。
- C13 `93:1080` 与 C14 `93:1106` 已重新读取在线 Figma，并通过 WeChatIDE MCP 重新打开精确路由、等待 `view` 挂载后取得严格 `375×812` 截图：`tmp/goal-c13-after-refresh-20260829.png`、`tmp/goal-c14-after-refresh-20260829.png`。两页真实 API 请求为 `200`，控制台错误过滤无命中。
- 之前出现的 `Component is not found in path "components/radar-canvas/index"` / `wx://not-found` 属旧惰性编译依赖状态。不要手工补写共享组件 `index.js`，也不要删除雷达组件；通过 MCP 的 `simulator_open_page` 重新编译后再截图即可恢复。
- C7 隔离回归 `persists the acceptance dual-role demo through SQLite restart and supports targeted rollback` 已通过，证明战术板保存后关闭并重新创建 API/持久化层仍能读回阵型与球员坐标；本轮未写生产库。
- 最新门禁：任务专用 npm 缓存下 `npx --yes pnpm@10.33.0 run check` exit `0`，domain `20/20`、小程序 `428/428`、API `117/117`；不要把旧日志中的历史 fixture 失败或旧白屏状态当作当前结果。
