# 教练全队日程与训练管理球队上下文 V3 实施计划

## 验证基线

- Figma：先读节点 `1364:673`、`1364:8`、`1364:151`、`1364:253` 的 design context 与截图；每次修改后回读截图。
- 前端：`npx --yes pnpm@10.33.0 --dir apps/miniprogram-cq-talent exec vitest run pages/coach/schedule/index.test.mjs pages/coach/training/index.test.mjs pages/coach/team-selector/index.test.mjs`
- 类型：`npx --yes pnpm@10.33.0 --dir apps/miniprogram-cq-talent exec tsc --noEmit`
- 差异：`git diff --check -- <task-owned paths>`
- 运行态（可用时）：`node scripts/devtools/wechatide-mcp-capture.cjs --route <route>`，只输出到 `%TEMP%\\cq-talent-visual-evidence`。

## 批次 1：Figma V3 语义整理

- [x] 读取四张 V3 的在线截图，确认现状：`1364:673`、`1364:8`、`1364:151`、`1364:253`。
- [x] 在不覆盖旧稿的前提下，将 C1 改成全部球队日程，将 C8/C8.1 改成训练管理队伍上下文；P1 作为整洁家长月历新版基准。
- [x] 每张改后截图回读，记录 node id 与决定。

## 批次 2：C1 全部球队日程

- [x] 在 `pages/coach/schedule/index.test.mjs` 补用例：两支队的活动都进入 `eventViews`/`visibleEvents`；模板不存在 `c1-team-selector`；控制器不包含 selected-team key 和 `openTeam`。
- [x] 先运行定向测试确认旧逻辑不满足新语义，再实现最小修改。
- [x] 移除 C1 的选择状态、选择卡及过滤，保留/强化活动卡队伍标签。
- [x] 重新跑定向测试、TS 检查、差异检查；待路径限定提交前再次复跑。

## 批次 3：C8 / C8.1 训练管理球队上下文

- [x] 在训练页和选择页补用例：training-project-tree 的 teamOptions 决定已选队；C8 仅显示同队事件；C8.1 写 team id 并返回。
- [x] 先运行定向测试确认旧逻辑不满足新语义，再实现最小修改。
- [x] 最小实现：新增 id 存储 key、C8 上下文卡、C8.1 真实 teamOptions 加载和选择；事件/统计以选队数据预计算。
- [x] 重新跑定向测试、TS 检查、差异检查；待路径限定提交前再次复跑。

## 批次 4：文档与运行态

- [x] 更新 `docs/current/figma-source-of-truth.md` 和 `docs/current/progress.md`，替换已废止的“C1 选队”结论。
- [x] 在可用的微信开发者工具中依次截图 C1、C8、C8.1；C1 初次为空态，随后选择 `2026-08-31`，取得含两节真实课程的 375×812 运行态截图：`%TEMP%\\cq-talent-visual-evidence\\c1-all-teams-running-2026-08-31.png`。当前账号只被后端分配到 U10 精英队，因此这张证据验证“全队日程结构 + 队伍/场地标识”，不将单队数据冒充为多队数据。
- [x] 对本任务所有修改完成定向验证并独立提交：`e6a866e refactor(coach): separate all-team schedule from training context`；定向 Vitest 32/32、Mini TypeScript 检查、根目录 typecheck、domain 21/21、Mini 444/444、API 123/123 均通过。
