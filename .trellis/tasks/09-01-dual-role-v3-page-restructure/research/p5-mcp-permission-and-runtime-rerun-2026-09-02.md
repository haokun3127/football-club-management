# P5 MCP 权限与运行态复拍 — 2026-09-02

## 权限核对

- 当前 Figma 文件：`zZ6wKyOHKcO4UYXDd9jGwv`，当前页面节点：`4:6`。
- 浏览器文件级共享面板显示账号 `haokun3127 / 1039746386@qq.com` 为“可编辑”。
- Figma MCP `whoami` 仍返回团队席位 `View`。这表示 MCP 连接的团队席位状态与浏览器文件级共享权限不是同一个判定；不能据此声称 MCP 已获得写入能力。
- 在线 Figma MCP 读取正常：`get_metadata(4:6)` 成功，`get_screenshot(1610:626)` 成功。

## P5 运行态证据

- 微信开发者工具 MCP 状态：已登录，`tokenRequired=false`。
- 模拟器：iPhone X，`screen=375×812`，`window=375×812`。
- 路由：`/pages/parent/radar/index`。
- 运行截图：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\p5-goal-rerun-20260902.png`。
- 在线稿截图：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\figma-live-P5-goal-rerun-20260902.png`。

## 对照结论

- 返回按钮、标题、历史对比、学员选择器、深色雷达卡、综合评分、维度详情和家长 TabBar 的结构一致。
- 运行态包含微信系统安全区/原生胶囊；Figma 画板不包含真实系统外壳，该差异豁免。
- 学员数量、姓名、维度标签、评分和评估日期来自真实 API，与 Figma 示例不同，不用伪数据覆盖。
- 本次没有发现需要修改小程序代码的确定性差异，也没有执行 Figma 写操作。

## 截图门禁

```text
node --test scripts/devtools/wechatide-mcp-capture.test.cjs scripts/devtools/visual-evidence-path.test.cjs
15 passed, 0 failed
```

`git diff --check` 通过；输出仅包含既有 LF/CRLF 提示。
