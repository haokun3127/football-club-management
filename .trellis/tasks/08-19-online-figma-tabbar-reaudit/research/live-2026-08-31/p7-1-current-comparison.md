# P7.1 当前在线 Figma / 真实运行态复核

日期：2026-08-31

## 证据

- 在线文件：`zZ6wKyOHKcO4UYXDd9jGwv`
- 在线节点：`93:364`（P7.1 Lessons Insurance）
- 在线稿截图：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\p7-1-figma-online.png`
- 运行路由：`/pages/parent/status/index`
- 真实运行截图：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\p7-1-runtime-2026-08-31.png`
- 并排对照图：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\p7-1-compare-2026-08-31.png`
- 运行截图 sidecar：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\p7-1-runtime-2026-08-31.png.json`
- 截图通道：微信开发者工具 MCP `simulator_screenshot`
- 运行截图和 sidecar 均严格为 `375×812`，sidecar 已核验路由。

## 在线稿读取

已调用在线 Figma `get_design_context` 和 `get_screenshot`。当前画板结构为：返回顶栏、训练课时总量、本月/本季统计胶囊、近期课时记录、运动保障卡、保险详情、联系俱乐部说明和家长 TabBar。

## 真实运行态对照

- 顶栏返回按钮、标题和微信原生胶囊占位关系正常。
- 训练课时卡、统计胶囊、近期课时列表、运动保障卡、保险状态和家长 TabBar 均已渲染。
- 运行态真实数据显示 `27` 累计课时、`21` 本月、`27` 本季，以及真实训练日期、训练名称和课时；Figma 为静态示例 `46 / 12 / 38` 和 `U10 训练`，属于真实 API 数据差异，不复制示例数据。
- 当前真实保险接口返回字段为“保险状态 / 保障中”，与 Figma 的“保险类型 / 运动意外险”等示例字段不同，属于后端数据能力差异；卡片结构和字段行布局仍存在。
- 微信状态栏、原生胶囊、Home Indicator 以及真实数据数量属于平台/业务运行态差异，按项目验收规则豁免。

## 结论

已分别完成：在线 Figma 读取、真实运行截图捕获、设计稿与运行态并排视觉检查。P7.1 归类为“通过当前在线稿结构复核；真实数据/平台外壳差异豁免”，本批没有发现需要修改业务代码或 Figma 的确定性缺陷。
