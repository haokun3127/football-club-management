# C10.1 / C11 / C12 / C12.1 运行态复核

## 基准

- 在线 Figma 文件：`zZ6wKyOHKcO4UYXDd9jGwv`
- 当前 V3 节点：C10.1 `1571:7`、C11 `1564:7`、C12 `1565:7`、C12.1 `1566:7`
- 运行设备：微信开发者工具 iPhone X，逻辑视口 `375×812`，`devicePixelRatio=3`
- 可信采集方式：WeChatIDE MCP `simulator_screenshot`；标准脚本输出到系统临时目录 `%TEMP%\\cq-talent-visual-evidence`

## 发现与处理

1. C10.1 首次按旧文档路由 `/pages/coach/coverage` 打开时，运行时明确返回 `onPageNotFound`。代码目录、`app.json` 和当前任务记录实际使用 `/pages/coach/coverage/index`。
2. 已最小修正两个权威路由映射：
   - `docs/design/reference/figma/README.md`
   - `docs/design/specifications/figma-online-frame-map-2026-08-12.md`
3. C10.1 使用正确路由复拍成功，当前页面显示真实学员覆盖和真实维度数量；比 Figma 示例更多的学员/维度属于 API 数据差异，不用样例数据覆盖。
4. C11 真实测评任务列表复拍成功；卡片数量、日期、状态和进度来自真实 API。顶栏、筛选胶囊、任务卡、进度条、悬浮新增按钮和训练管理 TabBar 与在线稿结构一致。
5. C12 以真实活动 `event-cq-talent-secure-test-1-trn-0818` 进入，读到真实模板、8 名真实学员和中文指标。当前设备已有真实本机草稿，因此同时呈现 C12.1 恢复遮罩；没有 mock API 或伪造数据。
6. C12.1 恢复遮罩的布局、按钮、遮罩层和训练管理 TabBar 与在线稿对应；“本机草稿 2026-08-28 19:57”是本机真实保存时间，Figma 的“1分钟前”属于示例文案差异。

## 证据

| 页面 | 运行态证据 | 结果 |
| --- | --- | --- |
| C10.1 | `%TEMP%\\cq-talent-visual-evidence\\goal-c10-1-20260902.png` | 正确路由、结构和真实数据通过；无控制台错误命中 |
| C10.1 对照 | `%TEMP%\\cq-talent-visual-evidence\\goal-c10-1-compare-20260902.png` | 在线稿与运行态并排复核 |
| C11 | `%TEMP%\\cq-talent-visual-evidence\\goal-c11-20260902.png` | 结构通过；动态任务数据豁免 |
| C12 / C12.1 | `%TEMP%\\cq-talent-visual-evidence\\goal-c12-20260902.png` | 真实模板和本机草稿恢复状态通过 |

三个运行态 sidecar 均确认：

- `captureMethod = wechatide-mcp simulator_screenshot`
- 归一化 PNG 为 `375×812`
- 路由分别为 `/pages/coach/coverage/index`、`/pages/coach/test-tasks/index`、`/pages/coach/test-entry/index`
- sidecar 不记录项目绝对路径、手机号、token 或登录敏感信息

## 验证

- `node --test scripts/devtools/wechatide-mcp-capture.test.cjs scripts/devtools/visual-evidence-path.test.cjs`：`15/15`
- C10.1 正确路由 MCP 导航：成功
- C10.1/C11/C12 MCP 截图：成功
- 模拟器 console 过滤 `error|exception|wx:else|route is not defined|page not found`：无命中（旧错误只来自第一次错误路由尝试，未作为验收证据发布）

本批没有修改业务代码、API、数据库或 Figma；只修正 C10.1 文档路由映射并新增本复核记录。
