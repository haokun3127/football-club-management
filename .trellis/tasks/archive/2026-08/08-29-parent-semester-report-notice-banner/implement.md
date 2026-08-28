# 家长端学期成长报告与首页通知 Banner 实施计划

### Task 1：刷新在线 Figma 设计

**范围：** Figma `zZ6wKyOHKcO4UYXDd9jGwv`，家长页 `4:6`。

**已完成的设计证据：** P4.3 `701:177`；P1 Banner 变体 `714:185`；Banner 分组 `717:2`。Figma MCP 已返回并复核 375×812 画面；代码改动完成后仍需重新取得可信微信开发者工具截图。

- [x] 在 P4.2 后新增 375×812 的 `P4.3 Semester Growth Report`，复用 P4/P5 的顶栏、学员选择、深色能力卡和家长 TabBar。
- [x] 在 P1 `269:250` 的 Hero 与月历之间加入 `Notice Banner`，保持无通知时月历位置稳定。
- [x] 用 Figma MCP 截图复核无文字裁剪、遮挡和重叠；节点 ID 已记录到任务文档，代码完成后补运行态截图。

### Task 2：报告页回归测试

**文件：**

- Create: `apps/miniprogram-cq-talent/pages/parent/semester-report/index.test.mjs`
- Test: `apps/miniprogram-cq-talent/pages/parent/growth/index.test.mjs`

- [x] 测试 `currentStudentId` 为第二个绑定学员时，成长请求和日程过滤均使用第二个学员。
- [x] 测试无指标、无活动和无评语的 view model 输出分别为“暂无能力数据”“暂无训练或比赛记录”“暂无教练评语”。
- [x] 运行页面定向 Vitest，确认旧实现不能满足这些断言。

### Task 3：实现报告页与入口

**文件：**

- Create: `apps/miniprogram-cq-talent/pages/parent/semester-report/index.json`
- Create: `apps/miniprogram-cq-talent/pages/parent/semester-report/index.ts`
- Create: `apps/miniprogram-cq-talent/pages/parent/semester-report/index.wxml`
- Create: `apps/miniprogram-cq-talent/pages/parent/semester-report/index.wxss`
- Modify: `apps/miniprogram-cq-talent/app.json`
- Modify: `apps/miniprogram-cq-talent/pages/parent/child/index.ts`
- Modify: `apps/miniprogram-cq-talent/pages/parent/child/index.wxml`
- Modify: `apps/miniprogram-cq-talent/utils/types.ts`

- [x] `load()` 调用 `requireRole("parent")`、`getParentChildren()`、`getParentGrowth(active.id, active)` 和近 180 天分块日程读取；只在绑定列表中解析当前学员。
- [x] `buildSemesterReportView(growth, events, active)` 返回 `periodLabel`、`overallLabel`、`dimensions`、`trainingSummary`、`matchSummary`、`attendanceSummary`、`coachNoteLabel` 和明确的 `state`。
- [x] WXML 仅绑定预计算字段，使用全屏返回顶栏和现有 `role-tabbar`；不调用 JavaScript 方法。
- [x] 将“我的孩子”页成长报告动作改为 `openPage("/pages/parent/semester-report/index")`，保留其余动作不变。

### Task 4：Banner 内容契约与页面

**文件：**

- Modify: `apps/api/src/seed/cq-talent-acceptance.ts`
- Modify: `apps/api/src/seed/data-capability.ts`
- Modify: `apps/api/src/routes/app-client.routes.ts`
- Modify: `apps/api/src/http/openapi.ts`
- Modify: `apps/miniprogram-cq-talent/utils/api.ts`
- Modify: `apps/miniprogram-cq-talent/utils/types.ts`
- Modify: `apps/miniprogram-cq-talent/pages/parent/schedule/index.ts`
- Modify: `apps/miniprogram-cq-talent/pages/parent/schedule/index.wxml`
- Modify: `apps/miniprogram-cq-talent/pages/parent/schedule/index.wxss`

- [x] 扩展 `ContentArticle.category` 为 `notice`，加入至少一条俱乐部范围的中文通知种子；路由仍通过现有内容访问校验返回，不新增写接口。
- [x] `getContentArticles()` 保留既有字段并允许 `notice`；`presentNoticeBanner()` 只取真实 notice，摘要在 TS 中预计算，不在 WXML 使用 `.slice()`。
- [x] Banner 点击复用现有文章详情路由；无通知不渲染 Banner，错误按日程页重试状态处理。

### Task 5：验证与提交

- [x] 运行报告/Banner 定向测试、API 内容测试、小程序 TypeScript 和 WXML/WXSS 编译。
- [x] 运行 `npx --yes pnpm@10.33.0 run check` 和 `git diff --check`。
- [x] Figma MCP 截图与可信微信模拟器截图分别记录，不把静态检查当作视觉验收。
- [x] 只 `git add` 本任务列出的路径，提交信息为 `feat(parent): add semester report and notice banner`。
- [x] 更新 `docs/current/progress.md`，完成生产 API 部署和有通知的 `375×812` 运行态复拍，然后执行 `python ./.trellis/scripts/task.py finish` 和 `archive 08-29-parent-semester-report-notice-banner`。
