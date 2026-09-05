# C3 Activity Change 在线 Figma / 运行态复验（2026-08-31）

## 页面与证据

- 在线 Figma：`zZ6wKyOHKcO4UYXDd9jGwv / 93:634`（C3 Activity Change）。
- 在线稿截图：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\c3-figma-93-634.png`，原始尺寸 `375×903`。
- 运行路由：`/pages/coach/event-change/index?id=event-cq-talent-secure-test-1-trn-0818`。
- 运行首屏：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\c3-script-fixed-2026-08-31-02.png`，严格 `375×812`。
- 运行底部：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\c3-script-fixed-2026-08-31-bottom.png`，严格 `375×812`。
- 并排对照：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\c3-compare-2026-08-31.png`。
- 首屏 sidecar：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\c3-script-fixed-2026-08-31-02.png.json`。

## 运行条件

- 已通过 `prod-plant-session-coach.py` 写入真实教练验收会话，角色为 `coach`，活动为 `event-cq-talent-secure-test-1-trn-0818`。
- WeChatIDE MCP 状态：已授权，截图返回 `375×812`。
- 当前 iPhone X 系统信息报告 `screen=375×812`、`window=375×724`；窗口高度扣除系统外壳，不能作为截图失败条件。
- 首次重装后页面空白的根因是 55 个没有 `import/require` 的生成 `pages/**/index.js` 桩遮蔽了 TypeScript 页面入口。它们已移至系统临时可恢复备份目录，未删除、未提交。

## 对照结论

1. C3 顶栏、返回箭头、左对齐标题、右侧“保存”、活动信息卡、变更原因胶囊、新时间、新场地、说明卡、通知开关和教练 TabBar 均已在真实教练运行态出现。
2. 运行态活动标题、状态、原活动时间、场地选项数量和受影响家长人数来自真实 API，与 Figma 示例内容不同，属于数据/状态差异，不以示例数据覆盖真实接口。
3. 首屏和滚动底部均未发现确定性的结构缺失、越界、TabBar 遮挡或非法英文展示问题；底部截图确认通知卡完整可见。
4. 微信状态栏、原生胶囊按钮、Home Indicator 和 Figma 画板高度差异属于平台/画板外壳差异，按验收规则豁免。

## 截图脚本修复

- `scripts/devtools/wechatide-mcp-capture.cjs` 现在先刷新项目触发 TS 编译，再用 `automation_navigate` 精确重导航，避免新页面首次切换时空白或刷新回旧路由。
- 视口校验改为接受 `screen=375×812` 且 `window=375×724` 的新版 iPhone X 返回值，同时仍要求窗口宽度有效、屏幕尺寸正确、最终 PNG 严格 `375×812`。
- 定向测试：`node --test scripts/devtools/wechatide-mcp-capture.test.cjs`，`10/10` 通过。
