# C14 团队能力总览在线 Figma 对照

- 日期：2026-08-29
- 在线设计文件：`zZ6wKyOHKcO4UYXDd9jGwv`
- Figma 节点：`93:1106`
- 运行路由：`/pages/coach/team-ability/index?source=goal`
- 运行截图：`c14-runtime-final-2.png`；边车：`c14-runtime-final-2.png.json`
- 在线稿截图：`c14-online-2.png`

## 证据等级

1. 在线设计读取：已通过 Figma MCP `get_design_context` 读取节点 `93:1106`，并通过 `get_screenshot` 获取当前在线稿。在线画板尺寸为 `375×1258`。
2. 运行时截图：已通过 WeChatIDE MCP 路由打开并捕获，原始截图 `564×1220`，归一化证据严格为 `375×812`，设备像素比 `3`。
3. 视觉对照：已检查在线稿与运行截图的首屏结构、顶栏、雷达图、综合分、趋势标签、维度统计卡和固定教练 TabBar。

## 对照结论

结论：**修复后通过**。

- 顶部粉色导航、返回按钮、左对齐标题和导出按钮结构与在线稿一致。
- 页面背景、赛季/球队上下文、深色团队能力卡、八维雷达图、综合分和趋势标签结构与在线稿一致。
- 维度统计采用在线稿要求的纵向结构：维度标题与队均分、进度条、`队均 / TOP / 底` 摘要；没有误用紧凑横排版本。
- 固定教练 TabBar 保持底部可见，首屏没有遮挡问题。
- 实际运行数据来自 API；在线稿中的示例赛季、姓名和分数未写入运行页面。当前运行数据文案与 Figma 示例不同，属于真实数据差异豁免。
- 微信状态栏、右上角系统胶囊和 Home Indicator 属平台外壳，不作为 Figma 页面差异。

## 回归与验证

- C14 定向测试：`6/6` 通过。
- 小程序 TypeScript：通过。
- `git diff --check`：通过。
- 控制台过滤 `error|exception|fail|undefined|route is not defined|wx:else|appid missing`：无命中。

本轮确认在线稿仍要求进度条结构，因此没有提交业务页面代码改动；新增的测试断言用于锁定该在线 Figma 结构，避免后续误改为横向统计行。
