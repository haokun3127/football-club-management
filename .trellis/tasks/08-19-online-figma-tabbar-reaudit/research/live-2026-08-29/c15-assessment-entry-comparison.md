# C15 能力评估录入在线 Figma 对照

- 日期：2026-08-29
- 在线设计文件：`zZ6wKyOHKcO4UYXDd9jGwv`
- Figma 节点：`93:1132`
- 运行路由：`/pages/coach/assessment-entry/index`
- 运行参数：`templateId=assessment-template-technical&title=体能综合测评`
- 在线稿截图：`c15-online-2.png`
- 运行首屏：`c15-runtime-2.png`；边车：`c15-runtime-2.png.json`
- 运行底部视口：`c15-runtime-bottom-2.png`；边车：`c15-runtime-bottom-2.png.json`

## 证据等级

1. 在线设计读取：已通过 Figma MCP `get_design_context` 读取节点 `93:1132`，并通过 `get_screenshot` 获取当前在线稿。在线画板尺寸为 `375×1002`。
2. 运行时截图：已通过 WeChatIDE MCP 路由打开真实教练会话并捕获首屏；首屏与底部视口均归一化为严格 `375×812`，设备像素比 `3`。
3. 视觉对照：已检查顶栏、能力分组胶囊、学员卡、指标轨道、保存草稿、底部保存动作和固定教练 TabBar。

## 对照结论

结论：**通过，数据差异豁免**。

- 顶部软粉导航、返回箭头、左侧标题、右侧“保存草稿”与在线稿结构一致。
- 能力分组胶囊、学员卡圆形头像、学员身份信息、右侧分数、指标标签、红色进度轨道和数值列结构一致。
- 底部“保存所有”在长页面底部完整显示，固定教练 TabBar 不遮挡按钮或学员卡。
- 真实接口返回的学员数量、指标数量、学员姓名和数值与 Figma 示例不同，属于真实数据/契约差异；没有写入 Figma 示例数据。
- 微信状态栏、系统胶囊和 Home Indicator 属平台外壳差异。

## 验证

- C15 定向测试：上一轮已通过 `8/8`；本轮未修改 C15 业务代码。
- 小程序 TypeScript：上一轮已通过；本轮未修改 C15 业务代码。
- 首屏和底部截图路由均核验为 `/pages/coach/assessment-entry/index`。
- 控制台过滤 `error|exception|fail|undefined|route is not defined|wx:else|appid missing`：无命中。
