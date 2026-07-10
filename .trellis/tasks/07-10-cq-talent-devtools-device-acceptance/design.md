# 技术设计

## 验证分层

1. 设计基线层：读取 Figma 页面、组件和 token，建立与当前页面的映射和差异清单。
2. 静态层：`pnpm check` 或小程序 typecheck，确保当前提交可编译。
3. API 层：新建临时 sqlite，运行 19 项 app-client smoke，确认数据和读写链路。
4. DevTools CLI 层：`islogin -> open -> preview`，记录 AppID、包体和二维码。
5. 模拟器层：使用 Computer Use 读取 DevTools 窗口，点击家长/教练核心路径，同时观察 API 请求日志。
6. 真机层：用户扫码并在手机完成网络、授权、Tab 和关键页面检查；Codex 只记录用户实际反馈。

## Figma 对齐策略

- 设计源固定为 `https://www.figma.com/design/zZ6wKyOHKcO4UYXDd9jGwv/`；`7AVltoFaYTW2goH4Zp287N` 仅作历史审计参考。
- `直接还原`：登录、我的、基础列表等信息架构没有变化的页面，以 Figma 为视觉基线。
- `适配新结构`：教练任务工作台、家庭全部孩子日程、差异化活动详情、按项目整队评测和可下钻雷达保留当前业务结构，只迁移 Figma 的色彩、字号、间距、圆角、卡片、状态和反馈模式。
- `设计系统派生`：指标详情等 Figma 未覆盖的新页面，复用已识别的组件/token，不另造一套风格。
- 先形成差异矩阵再改代码；功能正确但视觉未对齐的页面不算最终验收通过。

## 任务结构建议

当前任务转为最终集成/验收父任务，保留 Figma 基线、跨任务验收标准和最后的 DevTools/真机签署；代码改造拆为四个可独立验证的子任务：

1. `UI-1 Design Foundation`：Contract Tokens、AppHeader、安全区、TabBar、状态/卡片/提交栏组件，以及 Launch/Login/Attendance。
2. `UI-2 Parent Core`：家庭日程、三类详情、成长雷达、指标详情和孩子中心。
3. `UI-3 Coach Core`：任务工作台、活动工作台、销课、比赛、训练内容、评测和教练我的。
4. `Tactical Board MVP`：domain/API/app-client 契约、真实名单与阵型、拖拽相对坐标、保存/重置、权限和赛后只读。

依赖顺序为 UI-1 先完成；UI-2/UI-3 基于 UI-1，可以分别验收；Tactical Board 在 UI-1 后实施并由 UI-3 接入比赛工作台；四者完成后回到本任务执行最终 DevTools/真机验收。

## 数据与环境

- API 固定监听 `127.0.0.1:3000`，匹配 develop 配置中的 `http://localhost:3000`。
- 每轮使用新的 `/tmp/fcm-cq-talent-devtools-acceptance.sqlite`，避免重复写入污染。
- 默认家长身份为 `user-parent-cq-talent-acceptance`（真实双孩家庭）；教练身份为 `user-coach-1`。
- 不修改 trial/release API 地址，不把 localhost 或开发身份带入体验版/正式版。

## 证据与边界

- CLI 输出证明登录、编译、open、preview 和包体，不等价于页面交互通过。
- API 日志证明模拟器真实连接后端，不等价于真机网络可达。
- Computer Use 截图/可访问性树证明当前 Mac 模拟器页面状态。
- 真机扫码、型号、微信版本和授权行为必须由用户手机完成；没有反馈时明确标记待验收。

## 缺陷处理

若发现阻断问题，先保留失败输出，再做最小修复并复跑所属层级及所有下游层级。若只是 DevTools/系统权限导致无法读窗，不修改业务代码绕过。

## 回滚

验收本身不修改业务状态之外的临时 sqlite。若产生代码修复，单独提交；删除临时数据库即可清理本地验证数据。
