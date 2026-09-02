# C1 教练全队日程 MCP 新鲜证据复核（2026-09-02）

## 证据

- 在线 Figma：`zZ6wKyOHKcO4UYXDd9jGwv / 1610:1323`（Coach V6，C1 全部球队日程）。
- Figma 截图：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\figma-c1-recheck-1610-1323-20260902.png`，原生尺寸 `375×812`。
- 真实运行截图：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\goal-c1-recheck-20260902.png`，由 `scripts/devtools/wechatide-mcp-capture.cjs` 取得，尺寸 `375×812`。
- 运行路由：`/pages/coach/schedule/index`；截图输出仅写入系统临时证据目录。

## 对照结论

- 顶栏、周切换、`全部球队课程` 说明、内容容器和教练端固定 TabBar 的首屏几何关系一致；运行态没有出现球队选择入口，符合 C1/C8 边界。
- 运行态使用真实当前日期 **2026年9月2日**，当前权限范围没有可展示课程，因此显示真实空态；Figma 画板是有课程示例状态。课程卡数量、日期、球队和人员属于 API/时间状态差异，不通过硬编码示例数据消除。
- 微信原生右上角菜单胶囊和运行态头像/身份标识属于运行环境或真实会话，不纳入业务画板差异。

## 会话排查结论

- 直接通过 MCP `wx.setStorage` 写入 `role=coach` 会立即成功，但在同一运行时重启/启动流程中可能被旧的模块级缓存恢复为家长角色。
- 通过家长端真实“双角色切换”入口调用真实 `session/role` 接口后，成功进入 `/pages/coach/schedule/index`；服务器双角色会话和角色接口正常。
- 因此本次教练视觉取证采用真实角色切换链路，不把测试注入绕过当作产品登录证据。

## 验证

- `node --test scripts/devtools/visual-evidence-path.test.cjs scripts/devtools/wechatide-mcp-capture.test.cjs`：`15/15` 通过。
- 本次没有修改业务代码、API、数据库或 Figma。

## 2026-09-02 C1 课程卡信息层级修正

- 在线 Figma `1610:1323` 已先完成非破坏性视觉修正并回读：隐藏“全部球队课程”后面的说明文字，移除课程卡右侧教练姓名胶囊，课程标题与场地改为自然左对齐并允许两行展示；Figma 截图保存为 `C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\figma-c1-course-card-fix-1610-1323-20260902.png`，原生 `375×812`。
- 小程序同步修改 `/pages/coach/schedule/index`：课程卡继续依据真实 API 的 `event.type` 预计算“训练/比赛”标签和卡片主题；移除课程卡 `coachName` 展示字段；标题和地点不再使用单行省略。顶部教练头像姓名仍保留，因为它表达当前会话身份，与课程卡无关。
- 定向测试 `pages/coach/schedule/index.test.mjs` 为 `23/23`，其中覆盖训练/比赛类型区分、无教练姓名胶囊和标题/地点完整展示；小程序 `tsc --noEmit`、C1 WXML/WXSS 编译和限定路径 `git diff --check` 均通过。
- 微信开发者工具 MCP 运行态路由为 `/pages/coach/schedule/index`，当前会话为真实教练态。`automation_viewport_action.screenshot` 证据为 `C:\Users\ASUS\AppData\Local\Temp\cq-talent-c1-viewport-20260902.png`（`375×812`），另取得下一周真实数据截图 `C:\Users\ASUS\AppData\Local\Temp\cq-talent-c1-next-week-20260902.png`。画面确认课程标题“第3天综合训练”、场地“U10精英队 · 九龙坡足球公园”均完整可读，课程卡右侧仅保留真实状态和箭头。
- `simulator_screenshot` 兼容入口本轮返回白屏 PNG，虽然页面 DOM 和 data 均为 ready；切换到 MCP 的 `automation_viewport_action.screenshot` 后得到有效模拟器像素，因此白屏属于截图采集通道差异，不是页面渲染失败。不得把兼容入口的白屏当作视觉验收截图。
