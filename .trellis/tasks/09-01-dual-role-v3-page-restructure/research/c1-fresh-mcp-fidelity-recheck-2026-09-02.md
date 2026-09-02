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
