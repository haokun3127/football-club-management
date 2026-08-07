# P5 Ability Radar 视觉对照取证（2026-08-07）

> 批次 2：只取证 + 差异记录，不改码。判定权留用户。
> 审核：Terra xhigh 有条件批准（6 条件已全部落实：TabBar 项改写、前置条件、胶囊量化规则、D0–D3 分级、路径限定 commit、仅成功态）。

## 范围

- 设计侧：`zZ6wKyOHKcO4UYXDd9jGwv / 93:278 / P5 Ability Radar`（375×812）。
- 运行侧：`pages/parent/radar/index`（批次 13 已实现），微信开发者工具 Stable v2.01.2510290 模拟器，iPhone X 视口 375×812。
- 仅对照成功态（ready）；空态/错误态/交互态声明排除。

## 证据清单（均存仓库外 `C:\Users\ASUS\cq-talent-visual-evidence\`）

| 证据 | 文件 | 尺寸 | sha256（前 16） | 状态 |
|---|---|---|---|---|
| Figma P5 官方渲染 | figma-p5-ability-radar-93-278-20260807.png | 375×812（maxDimension 1624，未触发缩放） | dd72aa3b109f30ce | 采纳（设计基准） |
| Figma design_context | 本文件"设计基准摘要"节转录 | — | — | 采纳（几何/色值主基准） |
| 运行 radar 页 | radar-runtime-375x812-20260807.png(+sidecar) | 563×1218 原始 / 逻辑 375×812，DPR 3 | f775563676c994d7 | 采纳（路由校验通过；用户确认与屏幕一致） |
| 运行 growth 页 | growth-runtime-375x812-20260807.png(+sidecar) | 同上 | bf706d9c969adb3e | 参考（路由校验通过） |
| 运行 schedule 页 | schedule-runtime-375x812-20260807.png(+sidecar) | 同上 | bf706d9c969adb3e | **排除**：与 growth PNG 哈希完全相同 = 弹出式模拟器窗口 PrintWindow 后缓冲陈旧帧；用户证实当时屏幕上日程页实时渲染完整。按"不可信证据不发布"原则不计入对照 |

## 运行态判定

- 会话：真实家长授权会话有效（`requireRole("parent")` 未弹回 launch；路由校验通过）。
- 页面状态：**ready 成功态**。依据：`radar-canvas` 多边形已渲染 ⇒ `canDrawRadar=true` ⇒ 当前学员 ≥3 项有效指标；维度条红色填充已渲染（像素 rgb(168,15,27)）。
- 用户人工检查点：截图含胶囊渲染区（胶囊区域像素 stddev 76，非均匀）。

## 设计基准摘要（get_design_context 转录）

- Header：白底 h=88px，下边框；`Back` 40×40；标题「能力雷达」22px bold + 副标题 13px；右侧「历史对比」胶囊按钮 brand `#a80f1b` rounded-20；**`padding-right:100px` 为胶囊避让**。
- **微信胶囊占位节点 `272:860`**：absolute，`left:281 top:28 w:87 h:32`，rounded-16，rgba(255,255,255,0.85) + 边框 rgba(0,0,0,0.12)（用户 08-07 添加，画板右上角）。
- 学员 chips：4 枚，选中枚 brand 底白字，未选 `#e7eaf0` 底 `#667085` 字。
- Radar Hero：`#07111f` rounded-16 p-20；「六维能力模型」16px bold 白；雷达区 h=280（网格/多边形/中心点/6 维标签 12px 白/6 个分数 chip）；综合评分 48px extrabold 白。**画布区无独立白底容器，直接落在深色 Hero 上**。
- 维度详情卡：白卡 rounded-12；6 行：标签 `#667085` / 轨道 120×4 `#e7eaf0` / 填充 brand / 数值 14px bold brand。
- 底部 `TabIconsOverlay`：白底 h=70，3 tab（日程/成长/我的孩子），成长 active brand + 圆点。
- 页面底色 `#f6f7f9`。

## 逐项对照

| # | 区域 | Figma 基准 | 运行侧 | 分级 | 状态 |
|---|---|---|---|---|---|
| 1 | 雷达画布区 | 画布直接落深色 Hero，线条/标签为浅色（dark 模式） | **画布容器白底（`pages/parent/radar/index.wxss:25` `.rhero__canvas { background:#ffffff }`）+ radar-canvas `dark=true` 白色线条/标签 = 白上白，仅红色多边形可见**。像素证据：画布中心 rgb(255,255,255) vs Hero 头部 rgb(7,17,31) | **D3 结构** | 待用户裁决 → 转修复批次 |
| 2 | 成长页雷达卡跳转 | P4 雷达卡「进入详情 ›」→ P5 | 用户报告：点击未跳转详情页，成长页仅显示 CSS 多边形。静态核查：`growth/index.wxml:46` `bindtap="openRadar"` → `growth/index.ts:92` → `openPage("/pages/parent/radar/index")` → `utils/navigation.ts:16` `wx.navigateTo`，链路存在且路径正确；`openPage` 无 fail 回调，失败时静默。自动化无法模拟点击（DOM 查询全超时），待复现 | **D3 结构（用户报告，待复现核实）** | 转修复批次 |
| 3 | 底部 Tab 覆盖层 | 画板含 `TabIconsOverlay`（3 tab，成长 active） | 运行页 wxml 无 tab-bar 组件，`app.json` 无 tabBar 配置（Terra 核实） | D2 样式/结构 | 待用户裁决（设计意图解读） |
| 4 | 胶囊避让 | Header `padding-right:100px`，胶囊占位 (281,28,87,32) | 运行页 `.p5-nav` 用动态 `navInset`（`utils/presentation.ts:101` `resolveNavInset`）；本批未能量化取值（DOM/evaluate 超时） | 待复测 | 修复后复测时量化（±2px） |
| 5 | 胶囊本体 | 设计占位胶囊 | 运行页真实微信胶囊已渲染 | **D0 豁免**（用户规则：胶囊本体像素差异不计） | 已确认豁免 |
| 6 | Hero 底色 | `#07111f` | rgb(7,17,31) 像素一致 ✓ | 一致 | — |
| 7 | 品牌色 | `#a80f1b` | 「历史对比」按钮、维度条填充像素一致 ✓ | 一致 | — |
| 8 | 页面底色 | `#f6f7f9` | rgb(246,247,249) 像素一致 ✓ | 一致 | — |
| 9 | Hero 圆角/评分字号 | rounded-16 / 48px | 32rpx=16px / 96rpx=48px（代码一致） | 一致（代码级） | — |
| 10 | 数据内容（学员名/分数/日期） | 设计占位文案（陈小宇、76 分等） | 真实生产数据 | **D0 豁免** | 已确认豁免 |

## 结论（事实记录，判定权留用户）

- P5 视觉验收**未完成**：发现 2 个 D3 级差异（白底画布致雷达不可读；成长页跳转待复现），修复后须重新截图对照（含胶囊避让量化）。
- 进度记录措辞上限遵守：本条仅为「已对照，差异见清单」，不构成通过/不通过判定。

## 工具链备注（本次新确认）

1. 弹出式模拟器窗口的 PrintWindow 后缓冲可能不随导航刷新（陈旧帧与前一帧哈希完全相同）——捕获后若与上一张哈希相同，必须视为不可信并重取。
2. 本 DevTools 版本（Stable v2.01.2510290）上 `page.data()` / `page.$()` / `page.$$()` / `evaluate` 全部超时；仅 `launch/connect/currentPage/systemInfo/reLaunch` 可靠。`reLaunch` 的 promise 可能悬挂但导航实际成功，须以 `currentPage` 复核。
3. 全退 DevTools 后 `cli auto --auto-port 9421` 可恢复自动化端口；本版本也支持在运行中的 IDE 上补开自动化端口。
4. 弹出模拟器为独立窗口是用户手动动作，全退后不保持。
