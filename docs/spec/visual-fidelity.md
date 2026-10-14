# Figma 设计实施与视觉保真门禁

> Status: **Active** | Owner: **Design / Mini-program** | Reviewed: 2026-10-14

**视觉源**：唯一线上文件 [重庆天才小程序](https://www.figma.com/design/zZ6wKyOHKcO4UYXDd9jGwv/)。历史 93:* 原始稿、CODE 稿、2026-08-12 离线 PNG 和 V3/V6 当前区块不能随意混用。以 [Figma 源与节点迁移台账](../current/figma-source-of-truth.md) 的最新决策为查找入口；每个实施批次**仍必须现场确认在线节点**及其完整属性。

## 一页一证据

对每个实际 route + role + state：

1. 固定设计三元组：`fileKey / nodeId / design variant`，抓取设计 screenshot 和布局/Token/资产 context；记录获取日期。
2. 跑真实 API 支持的页面状态（成功、空、加载、错误和有数据时的完整列表），使用已授权的微信开发者工具或真机。默认按仓库 `scripts/devtools/wechatide-mcp-capture.cjs` 及 [现有手工取证说明](../current/miniprogram-manual-acceptance-cq-talent.md) 获取可信 375×812 PNG + sidecar。校验 SHA、路由、逻辑视口和来源。
3. 比较构图及信息层级、Header/TabBar/安全区、边距与密度、字体层级、圆角、色值、图标及静态资产、状态反馈；对动态姓名/日期/人数只核对位置和真实数据，不能把设计稿固定演示值写入代码。
4. 任何未复核的差异都列入 discrepancy 表，注明 `difference / design node / source code / measured delta / owner / verdict`。经批准的信息架构差异写 ADR 或 Figma 更新，不能自行重新设计却标“已还原”。
5. 视觉验收结果按 `Visual Pass / Visual Fail / Data Blocked / Capture Blocked / Not Checked` 单独记录，不得用 Vitest 绿色替代截图对比，也不得凭相似主题自动判定一致。

## 验收等级

- `Functional Pass`：真实接口、权限、交互与回归测试通过。
- `Visual Pass`：设计源明确、同态已登录 375×812 实际截图可信、对比问题关闭；允许有注明原因的微信胶囊/安全区平台差异。
- `Release Ready`：同时满足 Functional、Visual、集成、隐私/生产安全门禁；有证据链接、commit SHA 和测试环境。

Pixel diff/SSIM 可以做辅助信号，不能设置未经现场基线校准的“一刀切 95%”阈值；动态字段及系统 UI 必须有明确的屏蔽/豁免范围。

## 禁止的捷径

不得用通用 `.card/.field-row` 替代原稿主视觉结构而不经设计确认；不得缺失真实图标或临时引用到期 Figma asset；不得把历史 `49 页已实现` 翻译成 `49 页视觉已验收`；不得为了像素相似伪造队伍、成绩、人数、会话或额外业务功能。
