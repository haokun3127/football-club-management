# 重庆天才Figma设计基础与共享组件

## Goal

把完整 Figma 文件中的 Contract Tokens、导航、TabBar、状态反馈和核心复用组件落到微信原生小程序，形成家长端、教练端和战术板后续页面共同使用的 UI 基础；同时完成启动、真实微信登录和教练点名页的首批对齐，证明组件体系可用。

## Background

- Figma 基线文件：`zZ6wKyOHKcO4UYXDd9jGwv`。
- 页面生成代码实际引用 `CQ Talent Contract Tokens`，主色为 `#A80F1B`；当前代码和 app-client theme 仍使用 `#E60012`。
- Figma 有 23 组组件和 4 个模板，当前只有 `radar-canvas`、`role-tabbar`、`status-view` 三个共享组件，大多数页面重复拼装 `.card/.field-row`。
- 当前全局原生红色导航无法承载 Figma 中的返回、筛选、提交等动作；自定义导航必须正确处理状态栏、胶囊和安全区。
- Figma MCP asset URL 只有短期有效期，生产代码不得直接引用远程临时链接。

## Requirements

- 将 Contract Tokens 落到 `app.wxss` 和运行时主题：brand `#A80F1B/#7F0B14/#FCEEEF`，page/card/line、text、success/warning/error/info/pending、spacing、radius、font 和 motion 均有单一语义命名。
- 同步 app-client seed theme、小程序 config、页面规格和验收文档中的旧主题色，避免后端 resolve 与前端视觉不一致。
- 新增安全区感知 `app-header`，支持标题、副标题、返回、右侧文字动作和无动作占位；不遮挡微信右上角胶囊。
- 重构 `role-tabbar` 为 Figma 的图标＋标签＋活动点，继续使用 `wx.reLaunch`，连续切换不堆栈。
- 扩展 `status-view` 覆盖 loading/empty/pending/error/success，支持业务化标题、说明和动作，不显示 API/BFF/接口/P1/P2 等技术词。
- 新增可复用 `status-chip`、`activity-card`、`student-switcher` 和 `submit-bar`，接口面向真实数据而非 Figma 假文案。
- 本地化所需图标；不得在运行时代码中保留 Figma MCP 临时 asset URL，不引入跨端框架或大型图标库。
- 启动页保留 resolve/session/wx.login/dev 隐藏身份逻辑，只迁移 Figma 布局与状态反馈。
- 登录页保留微信手机号授权和后端身份匹配，不恢复短信验证码；覆盖授权前、验证中、绑定待处理、拒绝授权、无孩子、停用/错误状态。
- 点名页保留批量到课、单人状态、备注、失败不清草稿；按 Figma C4/C4.1/C4.2 对齐摘要、名单行、固定提交和结果态。
- 组件点击区域、固定栏和安全区适配小屏/常规屏/大屏；动效只使用 160–200ms 的按压/状态过渡。

## Acceptance Criteria

- [x] `app.wxss`、config、app-client seed 和文档只保留新的 Contract Token 品牌色，不存在业务页面继续硬编码旧 `#E60012` 系列。
- [x] AppHeader 在 DevTools iPhone 12/13 刘海屏不遮挡胶囊，返回和右侧动作可用；其它尺寸在最终真机矩阵继续复验。
- [x] RoleTabBar 有本地图标、标签和活动状态，家长/教练 6 个 variant 正确；切换统一使用 `reLaunch`，不经过页面栈追加。
- [x] StatusView 五种状态和四个新增共享组件有明确 properties/events，能够被后续页面复用。
- [x] 运行时代码不引用 `figma.com/api/mcp/asset`，不新增第三方 UI/图标依赖。
- [x] Launch、Login、Attendance 的 ready/loading/empty/error/success/pending 状态符合 Figma 视觉语言，真实业务逻辑和权限没有回退。
- [x] 页面不出现 API、BFF、接口待接入、P1/P2、后端、PATCH 等技术文案。
- [x] 小程序/API/domain 类型检查和测试通过；DevTools 能编译并渲染三类首批页面。
