# 技术设计

## 1. Token 单一来源

以 Figma `CQ Talent Contract Tokens` 为视觉源，转换为微信小程序 CSS variables，命名统一使用 `--color-*`，避免 `/` 在 WXSS/内联样式中的转义差异。

核心映射：

- `color/brand/primary` -> `--color-brand: #A80F1B`
- `color/brand/pressed` -> `--color-brand-pressed: #7F0B14`
- `color/brand/soft` -> `--color-brand-soft: #FCEEEF`
- surface -> `--color-page/#F6F7F9`、`--color-card/#FFFFFF`、`--color-line/#E7EAF0`
- text -> `--color-text/#202124`、`--color-text-secondary/#667085`
- state -> success/warning/error/info/pending 的 bg/fg 成对变量
- spacing -> 8/16/24/32/40/48rpx；radius -> 16/24/32/40rpx
- motion -> 160ms/200ms

组件内保留明确 fallback，使 style isolation 下仍有安全值。API seed theme 与 `utils/config.ts` 同步为品牌三色。

## 2. 导航与页面骨架

`app-header` 负责：

- 使用 `wx.getWindowInfo()` / `wx.getMenuButtonBoundingClientRect()` 计算状态栏与导航高度，并提供旧基础库 fallback。
- `showBack/title/subtitle/actionText/tone` properties。
- `back/action` events；默认 back 调用方决定，避免组件擅自改变路由。
- 右侧为微信胶囊预留宽度；无动作时保持标题视觉居中。

UI-1 先把 Launch/Login/Attendance 切到 custom navigation。其他页面由 UI-2/UI-3 迁移；全局 native navigation 先调整为白底黑字，避免迁移期出现红色旧壳。

## 3. 共享组件契约

- `role-tabbar`: `role=parent|coach`、`active`；本地图标；内部继续 `reLaunch`。
- `status-view`: `state=loading|empty|pending|error|success`、`title/message/actionText`、`action` event。
- `status-chip`: `state=default|success|warning|error|info|pending`、`label`。
- `activity-card`: `variant=training|match|other|cancelled|completed|pending`、title/meta/status/children/nextAction；只负责展示并触发 tap。
- `student-switcher`: children、activeStudentId、includeAll、compact；触发 `change`。
- `submit-bar`: label/help/actionText/loading/disabled；触发 `submit`，包含 bottom safe area。

组件不直接请求 API，不持有业务权限，不把 Figma mock 字段固化为 props。

## 4. 图标策略

从 Figma 设计上下文提取必要图标并保存为仓库本地静态资源；不得保留七天过期 URL。优先复用少量通用图标（back/calendar/trend/person/list），不引入图标库。颜色 variant 通过本地 active/inactive 资源或可靠的 WXSS 图形实现。

## 5. 首批页面适配

### Launch

保留启动链路，只替换结构为品牌区＋状态区；隐藏 dev 切换仍用原长按入口。错误时提供明确重试。

### Login

Figma G2 只作为视觉参考。真实控件仍为 `open-type=getPhoneNumber`。binding_required、拒绝授权、无孩子和停用状态由 StatusView/InfoCard 派生，禁止伪造短信验证码流程。

### Attendance

采用 Figma C4 的摘要/学员行/固定提交栏和 C4.1/C4.2 的成功/纠错反馈；现有 roster status、note 和失败保留逻辑不变。

## 6. 风险与回滚

- custom navigation 是高风险项，先在三个页面验证胶囊/安全区，再扩散。
- 微信组件样式隔离可能影响 CSS variables，所有变量都有 fallback，并用 DevTools 真机尺寸验证。
- 图标资源必须本地化和进入包体检查。
- UI-1 不重写业务 API；发现行为回退可按组件/页面独立回滚。
