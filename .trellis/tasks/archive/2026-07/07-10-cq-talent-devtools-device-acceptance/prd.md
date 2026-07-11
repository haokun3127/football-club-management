# 重庆天才小程序Figma全页面对齐与真机验收

## Goal

以完整 Figma 文件为视觉基线，在不回退已完成业务重构和权限约束的前提下，完善当前小程序全部已注册页面的功能与 UI；补齐比赛日战术板 MVP；最后完成测试 AppID 的 DevTools、preview、模拟器和真机验收。

## Background

- 2026-07-10 复查时 DevTools CLI 曾返回 `login=false`，导致 open/preview 和真机验收未完成。
- 本轮已通过 `/Applications/wechatwebdevtools.app/Contents/MacOS/cli islogin` 确认 `login=true`，IDE server 位于 `127.0.0.1:22783`。
- 测试 AppID 为 `wx3df49f3b936ab2ed`；develop 环境连接本地 `http://localhost:3000`，使用稳定开发身份。
- API smoke 已覆盖真实双孩家长、教练 25 人名单、训练、比赛、评测和雷达数据；本轮重点是 DevTools 编译/模拟器与手机端可用性证据。
- 用户说明现有前端此前已在 Figma 完成一轮 UI 优化，而近期功能重构改变了教练工作台、家庭日程、活动详情、评测和雷达等页面的信息结构；最终视觉验收必须先对齐 Figma 设计语言，不能把旧稿逐像素覆盖到新流程上。
- 已通过 Figma 连接器定位完整设计源：文件 key `zZ6wKyOHKcO4UYXDd9jGwv`，包含 `01 Design Language`、`02 Tokens`、`03 Components`、`04 Templates`、`05 Parent Generated`、`06 Coach Generated`、Prototype、Coverage/Diff 和 Mock Data Layer。
- 同名文件 `7AVltoFaYTW2goH4Zp287N` 是较早的审计/组件草稿；Parent Flow、Coach Flow 和 Prototype Map 为空，不作为当前实现基线。
- 已生成逐页差异矩阵：`research/figma-page-diff-matrix.md`。结论是直接还原设计系统/共享组件，核心业务页面采用适配重构；未注册且缺业务模型的扩展页面不为凑稿伪造功能。
- Figma 中存在完整的 `C7 Tactical Board PoC`（节点 `93:877`），但当前代码、API 和 domain 均无实现。该稿包含固定 11v11、深色球场、绘制/分享/录像等与产品首版范围不一致的内容，必须按产品文档重构为真实比赛名单、绿色竖屏球场、拖拽/移动、阵型模板、相对坐标、保存/重置、赛后只读和教练权限。

## Requirements

- 使用全新临时 sqlite 启动本地 API，先通过 health 和 19 项 app-client smoke，避免 DevTools 命中旧 seed。
- 运行小程序 typecheck 和 `devtools:preview`，记录登录状态、AppID、编译结果、包体大小、open 结果、preview/二维码结果。
- 使用 DevTools 模拟器检查启动、家长默认入口、Tab、双孩家庭日程、活动详情、成长雷达/指标下钻和我的孩子。
- 验证教练任务工作台、活动工作台以及点名/销课/训练/比赛/评测入口可打开；避免为验证而提交不必要的重复写入。
- 通过本地 API 日志确认模拟器确实请求当前本地服务，而不是只看到静态页面。
- 如 Computer Use 仍无法读取 DevTools 窗口，记录具体失败并保留 CLI、API 日志和 smoke 作为替代证据，不冒充视觉验收。
- preview 二维码生成后，由用户使用已授权的微信手机扫码；涉及手机型号、微信版本、基础库版本、弱网/拒绝授权等必须由用户反馈后才能标记通过。
- 如验收发现代码缺陷，只修复与当前 DevTools/真机可用性直接相关的问题，并重新执行对应检查。
- 在最终视觉验收前建立 Figma 页面/组件与当前小程序页面的映射：未改信息架构的页面按设计稿还原；已重构页面保留新业务结构并继承 Figma 的 token、组件、排版和交互语言；新增页面从同一设计系统派生。
- 当前 `app.json` 注册的 15 个页面全部纳入 UI 对齐，不允许只完成示例页；每页覆盖 ready/loading/empty/error 以及业务需要的 success/pending 状态。
- 新增教练战术板页面及比赛活动入口；首版支持真实名单、阵型模板、拖拽、球场内移动、相对坐标保存、重置、不同屏幕还原、赛后只读和权限裁剪，不做画线、录像、多人协作或家长可见。
- 战术板新增 app-client BFF 与 domain/seed 类型，保存使用幂等写入；没有权限或不是比赛活动时不得编辑。
- 每个 UI 子任务完成后同步完整 Figma 文件中对应的 Generated 页面或状态说明，使 Figma 不再保留与当前代码冲突的短信登录、单孩子默认、假排名、旧评测结构和错误战术板交互。

## Acceptance Criteria

- [x] CLI `islogin` 返回 true，小程序 typecheck 通过。
- [x] DevTools `open` 和 `preview` 成功，记录测试 AppID、包体和二维码生成结果。
- [x] 全新临时数据库上的 app-client smoke 19/19 通过。
- [x] DevTools 模拟器能启动小程序并访问本地 API；页面不是白屏或仅静态壳。
- [x] 家长端能看到 2 名真实家庭孩子，Tab、家庭日程、差异化详情、雷达切换/下钻和孩子档案可用，不泄露其他孩子。
- [x] 教练端能进入任务工作台和关键业务入口，页面操作与活动类型/权限一致。
- [x] 连续切换顶层 Tab 不堆积页面栈，页面无明显技术文案或阻断性报错。
- [ ] 真机扫码结果、机型、微信版本、基础库版本和人工结论被记录；未由手机实际验证的项目保持未完成状态。
- [x] Figma 与当前实现完成页面级差异清单，明确“直接还原、适配新结构、从设计系统派生”三类处理方式；未完成对齐前不宣称最终 UI 验收通过。
- [x] 当前 16 个注册页面全部完成 Figma 风格对齐并经过逐页渲染检查，不保留明显旧壳页面。
- [x] 战术板能从有权限比赛活动进入，使用真实名单与阵型模板，拖动后保存 `x/y: 0..1`，重进保持位置；重置、屏幕适配、赛后只读和无权限隐藏通过验证。
- [x] 战术板不包含首版明确排除的画线、录像、多人协作和家长入口。
- [x] 完整 Figma 文件中与当前注册路由和战术板对应的页面已同步最终信息结构，DevTools 截图与 Figma 对比没有结构性冲突。

> 归档说明（2026-07-11）：用户决定将唯一未完成的手机人工签署项延期，并先归档本任务。该项不视为验收通过；后续收到手机结果时另建任务补录。
