# 交接给 Kimi — 重庆天才足球俱乐部管理系统

交接日期：2026-08-19  
仓库：`C:\Users\ASUS\Desktop\football-club-management-codex-windows-2026-08-02`  
当前分支：`dev`  
当前 HEAD：`6b48372 fix(parent): align radar header action`  
分支状态：本地 `dev` 比 `origin/dev` 超前两个提交：`9fe4b94`、`6b48372`。本交接不默认推送，接手后先确认是否需要推送。

这份文档是 2026-08-19 起的当前交接入口。旧的 `HANDOFF.md`、`HANDOFF-2026-08-14.md`、`HANDOFF-NEXT.md` 保留用于历史追溯；其中部分正文和任务元数据仍有过期/在途内容，不能单独作为当前事实源。

## 1. 接手后先做只读检查

按顺序读取：

1. `AGENTS.md`
2. 本文件
3. `docs/current/progress.md`（最新记录在文件末尾）
4. `docs/current/figma-source-of-truth.md`
5. `docs/current/miniprogram-manual-acceptance-cq-talent.md`
6. `docs/current/deployment-requirements.md`
7. `docs/design/reference/figma/README.md`
8. 当前任务：`.trellis/tasks/08-19-online-figma-tabbar-reaudit/`

然后只读执行：

~~~powershell
git status --short
git branch -vv
git log --oneline -12
~~~

不要因为工作区不干净就回滚、覆盖或清理。当前工作区存在他人/其他任务的在途改动。

## 2. 当前设计权威

在线 Figma 是唯一设计基准：

- 文件 Key：`zZ6wKyOHKcO4UYXDd9jGwv`
- 家长端根页面：`4:6`（`05 Parent Generated`）
- 教练端根页面：`4:7`（`06 Coach Generated`）
- 常用页面↔节点映射：`docs/design/reference/figma/README.md`
- 更完整的在线节点映射：`docs/design/specifications/figma-online-frame-map-2026-08-12.md`

旧文件 `ATlfBRO0ruOCDDY5ICagFD` 只能用于历史审计；本地 `.fig` 和离线 PNG 只能作为缓存/对照材料。每个新视觉任务都必须先读取在线节点和截图，确认用户最近是否改过稿，再决定是否修改代码或同步离线参考图。

视觉验收必须区分三层证据：

1. 在线 Figma 节点已读取；
2. 真实微信开发者工具/真机已取得严格 `375×812` 截图；
3. 已把运行截图与在线稿逐模块对照，并记录通过、修复后通过、数据/平台豁免或阻塞。

`typecheck`、单测、构建和 `/health=200` 都不能单独证明视觉一致。

## 3. 当前完成状态

### 家长端

- 家长端 P1–P10 共 21 个板/状态分支已有完整复原和巡检记录。
- P1 周切换箭头已按在线稿恢复；但最新可信运行截图是在 coach 激活身份下取得的，打开 parent 路由会被真实角色守卫拦截。因此 P1 的 parent 真实运行态截图仍需用合法 parent session 补拍，不能把静态代码或 coach 截图写成 parent 视觉通过。
- P5 能力雷达已按新版在线稿完成数据化布局和顶栏收口：删除重复的“学员名·球队名”副标题，保留下方学员选择器；“历史对比”保留在标题右侧并修复动态微信胶囊避让叠加问题。
- P5 最新运行截图证据：`C:\Users\ASUS\AppData\Local\Temp\p5-radar-history-action-after-2026-08-19-final.png`。这是可信运行截图证据，但 parent 身份的后续复验仍应按当前账号状态重跑。

### 教练端

- C1–C16.4 的页面级 Figma 复原、必要最小修复和已有运行证据均已记录；不要再把 C4 起描述成“尚未开始”。
- 2026-08-19 针对顶栏右侧操作完成了 C1/C2/C3/C4/C11/C12/C14/C15/C16 的在线稿+真实路由截图审计，详细记录：`.trellis/tasks/08-19-online-figma-tabbar-reaudit/research/live-2026-08-19/coach-header-action-audit.md`。
- C2 的“结束训练”是时间窗口推导态。当前真实活动若不在进行中窗口，按钮不会出现；不能为了截图伪造进行中状态。需要验证该状态时，使用已有受控测试数据流程生成真实时间窗口，并在窗口内取证。
- C16 退出登录按钮已从微信原生 button 收缩态改为显式全宽自定义 CTA，提交为 `ef75409`；已有 MCP 证据位于 `tmp/coach-runtime-acceptance/C16-20260818-mcp-after-logout-fix.png`。

### TabBar / 顶栏专项

- 最近已确认的根页面基线：标准返回箭头 `24×24`、标题从约 `x=40` 开始、视觉字号约 `18px`、右侧文字动作按根页面字体和安全区处理。
- 当前 2026-08-19 Trellis 任务 `.trellis/tasks/08-19-online-figma-tabbar-reaudit` 仍为 `in_progress`。P5 和教练端顶栏专项已有结论，但不能据此宣称所有 38 个 `role-tabbar` 消费页面都已经重新取得一套完整的新鲜截图矩阵。接手后如继续该任务，按 PRD/设计/实施记录逐页补齐。
- 2026-08-19 审计结论：本轮没有发现需要继续修改在线 Figma 的 P5 同类顶栏问题；P5 是重复副标题与动态右预留叠加造成的页面特例。

## 4. 运行、截图和登录 SOP

### 本地检查

本机 pnpm 不在 PATH，使用钉版：

~~~powershell
npx --yes pnpm@10.33.0 run check
~~~

上一次完整门禁记录为 domain `19`、miniprogram `347`、API `110`，共 `476` 项通过；接手后如修改了工作区内容，必须重新运行并记录新的结果。

### 生产 API

- 公网 API：`https://cqtc.pomi.tech`
- 服务器 IP：`43.136.114.225`
- 操作系统：Ubuntu Server 24.04 LTS 64-bit
- API 健康检查：

~~~powershell
curl.exe --noproxy "*" -i https://cqtc.pomi.tech/health
~~~

当前文档记录的生产 API 受控发布为 `30d2869`；`da22dc5` 是较早的 C3 相关提交，不要把它误写成当前生产版本。任何 API 改动都必须重新 build、部署并重启 API，然后做 `/health` 和真实 API 读回；只修改本地 dist 不会改变线上。

服务器密码、微信凭据、手机号、Bearer token 和运行时变量值不写入仓库、交接文档、日志或 shell 历史。需要生产操作时，使用用户提供的安全认证方式或一次性私有运行时变量，并遵守：只读确认 → 受限备份（含 SQLite WAL/SHM）→ dry-run → 明确确认 → confirmed operation → 仅重启 API → 有界回读。

### WeChatIDE MCP 截图

默认使用微信开发者工具 MCP，不要 kill 微信开发者工具进程，也不要用 CLI auto 自拉起导致白屏：

~~~powershell
node scripts/devtools/wechatide-mcp-capture.cjs `
  --route /<exact-route> `
  --output C:\Users\ASUS\AppData\Local\Temp\<name>.png
~~~

要求：

- 微信开发者工具项目窗口由用户正常打开；
- 模拟器切到 iPhone X / 逻辑视口 `375×812`；
- 代码提交后先让用户在 IDE 点一次“编译”，再截图，避免旧 bundle；
- MCP 失败时记录失败原因，不要自动切换旧 Automator 或桌面整窗裁图冒充同等级证据；
- 白屏死态只能让用户手动完全退出微信开发者工具（含托盘）后重开；
- 输出 PNG 旁边的 JSON sidecar 只能证明路线和尺寸，仍需实际视觉比对。

教练会话必须先服务端种真实受控 coach session，再执行小程序侧会话脚本；parent session 同理。不要伪造 session、角色、手机号授权、API 响应或生产数据。

## 5. 真实测试账号与数据边界

生产中已按受控流程导入 7 个隔离的双角色测试账号。手机号值只存在私有运行时变量 `SECURE_CQ_TALENT_TEST_PHONE_1` 至 `_7`，交接文档不重复列出号码。

已记录的生产 API 回读证据：

- 每个 parent scope 只看到本账号绑定的 2 名学员；
- 每个 coach scope 只看到本账号所属的 8 人球队；
- 每个账号有相对导入时间生成的训练/比赛日程、参与记录、课时流水、能力指标和战术板数据；
- 回读未投影手机号、token 或凭据。

这仍然不等于真实微信设备已经完成首次授权、角色选择、双角色切换或所有页面视觉验收。设备侧必须用对应测试人员的真实手机号授权，不能用数据库读回代替登录证据。

## 6. 当前未完成与下一步

1. 补拍合法 parent session 下的 P1 / P5 等需要 parent 身份的真实 `375×812` 运行截图。
2. 在真实活动进入进行中时间窗口时，复验 C2 “结束训练”可见状态；过期窗口不得凭推断判定。
3. 继续完成 `.trellis/tasks/08-19-online-figma-tabbar-reaudit` 的逐页 TabBar/root-nav 新鲜证据矩阵，确认所有当前消费者都得到明确 disposition。
4. 对当前工作区未提交的 parent private、coach team ability、MCP 截图工具和任务元数据改动逐项判定归属后再提交；不要把它们和本交接文档混合提交。
5. 如果需要把 `dev` 的两个本地提交推送到 `origin/dev`，先单独查看 `git diff origin/dev..dev`，确认没有依赖未提交改动，再由用户明确决定是否推送。

## 7. 未提交改动白名单（严禁连带）

交接时 `git status --short` 显示存在 42 项未提交/未跟踪变化，主要包括：

- `.trellis/tasks/08-11-*` 任务元数据、已归档任务目录，以及 `.trellis/tasks/08-18-*`、`.trellis/tasks/08-19-*` 的在途研究文件；
- `HANDOFF-NEXT.md`、`HANDOFF-2026-08-14.md` 的其他 agent 文档修改；
- `apps/miniprogram-cq-talent/pages/coach/team-ability/*`；
- `apps/miniprogram-cq-talent/pages/parent/private/*` 与 `private-success/*`；
- `apps/miniprogram-cq-talent/package.json`、`project.config.json`、根 `package.json`；
- `docs/current/miniprogram-manual-acceptance-cq-talent.md`、`scripts/devtools/README.md`；
- 新增的 WeChatIDE MCP/诊断脚本、零引用 SVG、`.claude/`、`docs/superpowers/` 和根目录 xlsx。

提交时只能路径限定 `git add -- <明确文件>`，严禁 `git add -A`、`git reset`、`git checkout --`、删除分支、清理数据库或 kill DevTools。任何不属于当前任务的文件保持原样。

## 8. Kimi 接手后的第一轮命令

~~~powershell
Set-Location 'C:\Users\ASUS\Desktop\football-club-management-codex-windows-2026-08-02'
Get-Content -Raw AGENTS.md
Get-Content -Raw HANDOFF-KIMI-2026-08-19.md
git status --short
git branch -vv
git log --oneline -12
npx --yes pnpm@10.33.0 run check
~~~

完成只读体检后，先在交接文档和 `docs/current/progress.md` 中记录新的事实，再选择一个最小目标推进。任何视觉修改遵循“在线 Figma → 代码/数据契约 → 真实 `375×812` 截图 → 对照 → 最小修复 → 定向验证 → 路径限定提交”的循环。

