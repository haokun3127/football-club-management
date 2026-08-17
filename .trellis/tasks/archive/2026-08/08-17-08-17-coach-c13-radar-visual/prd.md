# C13 学员能力雷达真实视觉验收

## 目标

以在线 Figma `zZ6wKyOHKcO4UYXDd9jGwv` 的 C13 节点 `93:1080` 为唯一基准，取得当前真实教练会话下 `pages/coach/student-radar/index` 的 375×812 模拟器截图；仅修复本页可证明的视觉偏差，不伪造学员、雷达、评语或 API 数据。

## 已确认事实

- 页面由 `getCoachTeam()` 取得允许查看的真实学员，再按选中学员调用 `getCoachStudentRadar(studentId)`；评分维度、总分、评估期均由真实响应投影。
- 在线稿定义：88px 软粉顶栏、32px 学员 chips、`343×260px` 深色雷达卡、维度进度卡、能力评语卡和 70px 教练 TabBar。
- 现有页面把 `navInset` 加到 `.radar-nav` 的 `176rpx` content-box 高度上；这可能使真实 iPhone X 顶栏总高变为约 132px，必须用截图验证后再修复。
- 画板姓名、日期、分数、评语是示例数据；真实数据差异不构成视觉缺陷。

## 要求

1. 每次改动前重读在线节点 `93:1080`，并保留在线图和真实运行态图。
2. 使用当前 DevTools 的屏幕像素裁剪通道取得严格 `375×812` 截图；不能用自动化 canvas 截图代替。
3. 若有代码差异，先增加定向红色回归，再做最小的 C13 TS/WXML/WXSS 修改。
4. WXML 不调用数组方法；不改 API、角色守卫、真实数据投影、canvas 数据源或无后端契约的评语。
5. 只暂存 C13 源码/测试、此任务记录、C13 设计规格和进度日志；不带入已有在途文件。

## 验收标准

- [x] 在线 Figma 图、真实路由和 375×812 运行态截图均有可追溯证据。
- [x] 顶栏、学员 chips、雷达卡、维度卡、评语卡、TabBar 的几何差异均分类为已修复、真实数据差异或系统层差异。
- [x] C13 定向测试、小程序 typecheck 和 `git diff --check` 通过。
- [x] 全仓检查的任何失败均按测试文件和行号准确记录；本次全仓门禁实际无失败。

## 运行态验收记录（2026-08-17）

- 在线 Figma 节点 `93:1080` 已在本轮通过 Figma MCP 重新读取；真实路由为 `pages/coach/student-radar/index`。设计参考图为 `docs/design/reference/figma/c13-student-radar.png`。
- 真实微信开发者工具屏幕像素通道输出严格 `375×812`：首屏 `tmp/coach-runtime-acceptance/C13-acceptance-phone-final.png`，滚动到底部后的评语区 `tmp/coach-runtime-acceptance/C13-acceptance-phone-bottom.png`，并排对照 `tmp/coach-runtime-acceptance/C13-acceptance-compare-final.png`。
- 运行态确认顶栏、学员 chips、`343×260px` 雷达卡、维度卡、评语卡容器、固定 70px 教练 TabBar 的结构和几何与画板一致。已修复 `.radar-nav` 将 `navInset` 叠加到 `176rpx` 内容高度的问题，改为 `88rpx` + `content-box`；对应回归断言已锁定。
- 当前真实会话只返回 2 名学员、8 个雷达维度，评估期为 `2026-08-05`、总分为 `83`，评语为“能力评语暂未同步”；这些与 Figma 示例数据不同，属于真实数据/空态差异，不伪造为画板样例。
- 验证：小程序 Vitest `54/54` 文件、`330/330` 测试通过；domain `19/19`、API `105/105` 通过；全仓 typecheck 和 `git diff --check` 通过。

## 范围外

- 新增或伪造评语、学员、评测记录、雷达维度或 API 响应。
- 修改家长端雷达、团队能力总览或 API persistence/test 在途文件。
