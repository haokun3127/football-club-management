# 截图通道与 Figma 权限复核（2026-09-02）

## Figma 当前权限证据

- 在线文件：`zZ6wKyOHKcO4UYXDd9jGwv`。
- 浏览器打开的目标节点：`4:6 / 05 Parent Generated`。
- 当前浏览器 URL 使用 `node-id=4-6&p=f`；页面处于“设计”模式。
- 只读观察到左侧页面/图层树、顶部矩形/文字/钢笔等编辑工具、右侧“设计/原型”面板和可编辑图层列表；因此当前浏览器会话具备编辑界面。
- 用户提供的 `m=dev` 参数只会把页面带入 Dev Mode；它不是文件只读权限的结论。需要编辑时使用设计模式链接，不带 `m=dev`。
- Figma MCP `whoami` 返回账号 `haokun3127`，团队席位为 `View`。该结果只证明 MCP 连接身份的团队席位，不覆盖浏览器会话看到的文件级编辑入口；后续不能把“浏览器可编辑”和“MCP 可写入”混为一个权限事实。

## 截图通道检查

当前可信验收通道仍是 `scripts/devtools/wechatide-mcp-capture.cjs`：

- 默认输出目录为系统临时目录 `%TEMP%\\cq-talent-visual-evidence`。
- 显式输出路径和环境变量目录拒绝桌面、当前仓库及其子目录。
- 目标路由必须以 `/` 开头且不含 query； query 单独由 `--query` 传入，sidecar 不写入 query。
- 捕获前会刷新项目、打开页面、重新导航，并轮询精确路由。
- 捕获前会轮询运行时视口；允许 iPhone X 的 `screen=375x812`、`window=375x724` 外壳差异。
- MCP 原始 PNG 先校验比例，再归一化为严格 `375x812`；PNG 与 sidecar 以原子方式发布，任何校验失败都不发布证据。
- sidecar 记录路由、视口、原始像素、归一化像素、SHA-256 和捕获方式，不写入项目路径或敏感 query。

## 验证结果

以下命令均使用正确的测试入口执行：

```text
node --test scripts/devtools/wechatide-mcp-capture.test.cjs scripts/devtools/visual-evidence-path.test.cjs
15/15 passed

apps/miniprogram-cq-talent/node_modules/.bin/vitest.cmd run scripts/devtools-screenshot.test.mjs
17/17 passed

py -3 apps/miniprogram-cq-talent/scripts/devtools-simulator-capture.test.py
6/6 passed
```

第一次把 Vitest/Python 测试文件直接交给 `node --test` 的失败属于测试启动方式错误，不是实现失败；随后已使用项目内 Vitest 和 Python 直接入口复核通过。`npx pnpm` 的一次 `EEXIST` 是本机 npm 缓存冲突，本轮未删除或覆盖缓存。

## 结论

截图工具链的路径、路由、尺寸、写入和测试门禁当前收口；后续双端视觉复核应继续使用 MCP 生成的新临时证据。Figma 页面浏览器编辑能力已再次观察确认，但若要通过 Figma MCP 写入，仍需单独处理 MCP 账号的 `View` 席位限制。

