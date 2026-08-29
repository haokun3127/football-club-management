# Figma 权威来源

> 最后更新：2026-08-29

## 唯一设计基准

后续查看、审计、修改和验收重庆天才小程序设计时，唯一权威来源是以下在线 Figma 文件：

https://www.figma.com/design/zZ6wKyOHKcO4UYXDd9jGwv/

文件 Key：`zZ6wKyOHKcO4UYXDd9jGwv`

任何页面实现、设计规格、视觉回归和 Figma MCP 操作，均应以此在线文件当前内容为准。旧文件 `ATlfBRO0ruOCDDY5ICagFD` 仅用于历史审计，禁止新的读取、编辑、实现或视觉验收；本地 `.fig` 二进制副本也不是当前设计事实。来自不同设计文件的节点 ID 不得互相继承。

## 2026-08-19 当前交接事实

- 本文件仍以在线 Figma `zZ6wKyOHKcO4UYXDd9jGwv` 为唯一权威；家长端根页面为 `4:6`，教练端根页面为 `4:7`。
- P5 `93:278` 的新版顶栏已按在线稿收口：删除重复的学员/球队副标题，保留下方学员选择器，并将“历史对比”保持在标题右侧的固定设计预留内。本轮没有发现需要继续修改在线稿的问题。
- 2026-08-19 全端顶栏审计读取了 C1 `93:578`、C2 `93:606`、C3 `93:634`、C4 `93:665`、C11 `93:1002`、C12 `93:1030`、C14 `93:1106`、C15 `93:1132`、C16 `93:1182`；运行态截图和数据/平台豁免记录见 `.trellis/tasks/08-19-online-figma-tabbar-reaudit/research/live-2026-08-19/coach-header-action-audit.md`。
- 在线 Figma 读取、运行截图取得和视觉对照是三个独立事实。已有某一页的 PNG 或单测不能推导其他页面已验收；新的 TabBar/root-nav 任务仍需按当前任务文件逐页补证据。

## 当前设计引用三元组

页面级引用：

- `zZ6wKyOHKcO4UYXDd9jGwv / 4:6 / 05 Parent Generated`
- `zZ6wKyOHKcO4UYXDd9jGwv / 4:7 / 06 Coach Generated`

`4:6 / 05 Parent Generated` 页面画板（2026-08-07 经 Figma MCP `get_metadata` 实读观测，均为 375×812 顶层画板；设计内容与截图未核验，不构成视觉验收依据）：

- `zZ6wKyOHKcO4UYXDd9jGwv / 93:2 / G1 Launch`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:29 / G2 Login Verification`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:56 / G3 Login Blocked`
- `zZ6wKyOHKcO4UYXDd9jGwv / 269:250 / P1 Schedule Home`
- `zZ6wKyOHKcO4UYXDd9jGwv / 269:479 / P1 Schedule Home — Empty`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:139 / P2 Training Detail`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:170 / P2.1 Match Detail`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:198 / P2.2 Other Activity Detail`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:222 / P3 Reminder Center`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:250 / P4 Growth Home`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:278 / P5 Ability Radar`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:308 / P6 Metric Detail`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:336 / P7 Parent Profile Hub`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:364 / P7.1 Lessons Insurance`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:388 / P8 Content Center`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:416 / Venues - Premium`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:444 / P8.2 Help Center`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:472 / Coach Team`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:500 / P9 Private Lesson Form`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:531 / P9.1 Private Success`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:550 / P10 Account Binding`
- `zZ6wKyOHKcO4UYXDd9jGwv / 222:86 / CODE / P1 Family Schedule`
- `zZ6wKyOHKcO4UYXDd9jGwv / 222:87 / CODE / P2 Training Detail`
- `zZ6wKyOHKcO4UYXDd9jGwv / 222:88 / CODE / P2.1 Match Detail`
- `zZ6wKyOHKcO4UYXDd9jGwv / 222:89 / CODE / P2.2 Other Detail`
- `zZ6wKyOHKcO4UYXDd9jGwv / 222:90 / CODE / P4 Growth & Radar`
- `zZ6wKyOHKcO4UYXDd9jGwv / 222:91 / CODE / P6 Metric Detail`
- `zZ6wKyOHKcO4UYXDd9jGwv / 222:92 / CODE / P7 Child Hub`

实测构成：21 张原始设计 + 7 张 CODE 契约版（`222:86`–`222:92`）。此前本节的 5 条简表只是常用引用子集，不是全集；08-05 期间"P5/雷达节点不可得"的判断即源于把子集误读为全集。

## 本地 .fig 的定位

本地交接包中的以下文件仅作为历史离线备份和解析素材：

`02-Figma最新设计导出/重庆天才小程序 UIUX Design System.fig`

它不是可安全自动回写的工作副本。Figma MCP 修改的是在线文件；需要更新本地备份时，应从上述在线文件人工导出 `.fig` 后再替换本地文件，并记录新的导出时间和校验值。

## 当前 G2 设计引用

- 页面：`05 Parent Generated`
- 画板：`G2 Login Verification`
- 节点 ID：`93:29`
- 画板尺寸：`375x812`
- 当前来源三元组：`zZ6wKyOHKcO4UYXDd9jGwv / 93:29 / G2 Login Verification`

已完成的在线改动：

- 将 `绑定孩子` 改为 `身份验证`。
- 删除验证码、获取验证码和重复的微信一键登录组。
- 验证卡保留两行：`微信手机号 / 授权后自动读取`、`身份匹配 / 自动匹配俱乐部档案`。
- 保留唯一 CTA：`微信手机号授权并继续`。
- 两行标签和值均使用 `Noto Sans SC Regular`、`14px`；值列起点统一为 `x=111`。

## P1 运行态证据边界

- 当前成功态画板来源三元组：`zZ6wKyOHKcO4UYXDd9jGwv / 269:250 / P1 Schedule Home`，尺寸 `375×812`。
- 旧文件 `ATlfBRO0ruOCDDY5ICagFD` 的 `93:83` 节点和相关历史截图仅保留为切源前审计事实，不构成新的视觉验收依据；不代表 P1 Empty、其他家长页、教练页或真机矩阵已经验收。
- 每次视觉改动仍必须先读取当前在线目标三元组和截图；不能用本地 `.fig`、旧导出或切源前历史规格反推当前设计。

## 2026-08-29 P1 周日历／展开月历改版

- 甲方已确认：P1 的默认日期控件是周日历；月历只在点击日期区的展开提示后出现，不是固定首页模块，也不是弹窗。选择日期后更新下方日期摘要与日程列表，并收起回周日历。
- 在线 Figma 新增且已截图复核的非破坏性改版区块为 `1008:185 / 2026-08-28 甲方需求改版 · P1`。它保留历史画板 `269:250`、`269:479`、`521:339` 不变。
- 当前实现基准三元组：
  - `zZ6wKyOHKcO4UYXDd9jGwv / 1008:186 / P1 Schedule Home — Week + Month Picker / Collapsed`
  - `zZ6wKyOHKcO4UYXDd9jGwv / 1008:436 / P1 Schedule Home — Week + Month Picker / Expanded`
  - `zZ6wKyOHKcO4UYXDd9jGwv / 1008:348 / P1 Schedule Home — Week + Month Picker / Empty`
- 本批 Figma 三态均已通过在线 `375×812` 截图复核。小程序运行时截图仍须由能够进入家长会话的真实账号补取；教练会话跳转到家长 P1 会被真实角色守卫阻止，这不是视觉通过证据。

## 2026-08-11 双角色入口设计

- 在线 Figma 新增复用组件集：`304:14 / RoleSwitchEntry`；变体为 `304:2 / role=parent` 与 `304:8 / role=coach`。该组件仅用于后端已确认同时拥有家长、教练两种入口的账号。
- 家长日常入口：`zZ6wKyOHKcO4UYXDd9jGwv / 93:336 / P7 Parent Profile Hub` 中的 `305:340 / RoleSwitchEntry / parent / dual-role only`，位于孩子资料卡之后。
- 教练日常入口：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1182 / C16 Coach Me` 中的 `305:430 / RoleSwitchEntry / coach / dual-role only`，位于教练资料卡之后。已于 2026-08-11 重新读取节点并生成在线 Figma 截图复核其位置；这不是小程序运行态视觉验收。

## 2026-08-05 P1 运行态 superseding 记录

- 当前成功态对照节点为 `zZ6wKyOHKcO4UYXDd9jGwv / 269:250 / P1 Schedule Home`。已取得可信 Windows PrintWindow 模拟器截图，路由为 `pages/parent/schedule/index`，逻辑视口为 `375×812`，原始 PNG 为 `563×1218`。
- 本次取证不通过视觉验收：运行态 Hero 左侧酒红面积/边界明显偏离当前 Figma，且周序显示为 `SUN→SAT`，当前节点为 `MON→SUN`。数据内容差异不单独判作 CSS 缺陷。
- 取证成功只证明窗口、路由和视口可被可靠捕获，不等于角色/session/API 或当前 Figma 视觉验收通过；本轮没有代码改动。

## 维护规则

1. 修改在线 Figma 前，先读取目标页面与画板节点，确认文件 Key、页面名、画板名和节点 ID。
2. 修改后必须重新读取关键节点，并生成 Figma 截图检查文字、布局和可见性。
3. 未获得可信 DevTools 或真机 `375x812` 截图前，不得宣称小程序实现与 Figma 完全一致。
4. 需要将在线设计同步回交接包时，先导出本地 `.fig`，再更新此文档中的导出时间、文件大小与 SHA-256。
