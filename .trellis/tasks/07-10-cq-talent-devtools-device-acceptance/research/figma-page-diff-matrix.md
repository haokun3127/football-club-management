# 重庆天才小程序 Figma ↔ 当前代码逐页差异矩阵

## 1. 审计基线

- Figma 完整设计源：`zZ6wKyOHKcO4UYXDd9jGwv`。
- 历史草稿 `7AVltoFaYTW2goH4Zp287N` 的 Parent/Coach Flow 为空，只作历史参考。
- Figma 完整源包含 10 个页面分区、23 组组件、4 个模板、20 个家长/通用页面和 28 个教练页面。
- 当前微信原生小程序包含 15 个路由、3 个共享组件（`radar-canvas`、`role-tabbar`、`status-view`）。
- 当前业务实现优先级高于旧静态稿：真实 BFF、权限裁剪、capabilities、无假 0、无跨孩子数据、评测按项目录整队、无助攻默认、训练项目回填均不得为了视觉还原而回退。

分类：

- **直接还原**：信息结构和业务边界基本一致，可按 Figma 视觉结构实现。
- **适配重构**：保留当前新业务结构，迁移 Figma 的视觉语言和组件模式。
- **设计系统派生**：Figma 没有当前真实状态，使用同一 token/组件生成新状态。
- **暂不实现**：缺业务模型/BFF，或明确不在当前试用版范围内。

## 2. 全局设计系统差异

| 维度 | Figma 完整源 | 当前代码 | 结论 | 优先级 |
| --- | --- | --- | --- | --- |
| 品牌主色 | `#A80F1B`，pressed `#7F0B14`，soft `#FCEEEF` | `#E60012` / `#C4000F` / `#FFF1F0` | 以 Figma Contract Tokens 为视觉基线，同时同步开发配置与后端主题，避免双重品牌色 | P0 |
| 页面/文字 | page `#F6F7F9`，text `#202124/#667085` | page `#F7F8FA`，text `#1F2329/#60646F` | 统一为 Contract Tokens | P0 |
| 圆角/密度 | 卡片常用 12–16px，页面左右 16–22px，间距 8–24px | 卡片约 6px，页面左右约 12px，整体更挤 | 提升卡片圆角、外边距和点击区，降低信息拥挤感 | P0 |
| 字号 | caption/body/title/pageTitle 为 11/13/18/22px | 常用 12/15/18px，缺 pageTitle 层级 | 建立 WXSS 字体层级；中文优先系统字体/Noto Sans SC fallback | P0 |
| 顶部导航 | 白色自定义 AppHeader，支持返回、筛选、提交等动作 | 全局原生红色 navigation bar | 新建安全区感知 AppHeader；关键页使用 custom navigation，否则无法对齐动作区 | P0/高风险 |
| TabBar | 图标＋标签＋活动点，70px/安全区 | 只有圆点＋文字，116rpx | 直接还原视觉，保留当前 `reLaunch` 防栈堆积逻辑 | P0 |
| 状态反馈 | success/warning/error/info/pending token 完整 | `status-view` 主要只有 loading/pending 样式 | 直接扩展组件，不展示 API/BFF/接口等技术文案 | P0 |
| 组件复用 | 23 组组件＋4 个模板 | 3 个共享组件，大量页面直接拼 `.card/.field-row` | 先补 AppHeader、ActivityCard、StatusChip、StudentSwitcher、SubmitBar 等核心组件 | P0 |
| 动效 | fast 160ms、base 200ms | 基本没有明确 transition/pressed feedback | 卡片按压、Tab、提交状态使用 160–200ms；不做复杂动画 | P1 |
| 图标资产 | Figma MCP 临时 asset URL（7 天） | 无统一图标资产 | 禁止直接引用过期 URL；转成本地静态图标或可维护的本地 SVG/PNG | P0 |

> Figma 内有两套 token collection；页面生成代码引用 `CQ Talent Contract Tokens`（`color/...`），应以该集合为实现基线，避免同时迁移旧的 `CQ Talent / Mini Program` 集合。

## 3. 当前路由逐页矩阵

| 当前路由 | Figma 对应 | 分类 | 主要差异 | 决策 | 优先级 |
| --- | --- | --- | --- | --- | --- |
| `pages/launch/index` | G1 `93:2` | 适配重构 | Figma 是通用连接状态；当前已执行 resolve/session/wx.login 和 dev 身份逻辑 | 保留真实启动链路，采用 Figma 居中品牌、加载/重试/阻塞状态；开发身份切换继续隐藏 | P0 |
| `pages/login/index` | G2 `93:29`、G3 `93:56` | 适配重构＋派生 | Figma 使用手机号输入/验证码；当前正确使用微信手机号授权，且有未登记、多身份、停用等状态 | 不恢复短信表单；复用 Figma 登录卡片和 blocked 状态，派生微信授权、拒绝授权、无孩子状态 | P0 |
| `pages/parent/schedule/index` | P1 `93:83`、P1.1 `93:111` | 适配重构 | Figma 以单孩子日程为主；当前默认全部孩子，含家庭筛选、日期数量、类型筛选 | 保留全部孩子和一页式筛选；采用 Figma 白色 header、周条、彩色类型边、状态 chip 和活动卡密度 | P0 |
| `pages/parent/event/index` | P2 `93:139`、P2.1 `93:170`、P2.2 `93:198` | 适配重构 | 当前一个动态路由渲染三类 section；Figma 是三张独立视觉稿 | 保留统一路由和真实类型字段，按 type 套三种视觉 variant；训练/比赛/其他不能退回通用 field-row | P0 |
| `pages/parent/growth/index` | P4 `93:250`、P5 `93:278` | 适配重构 | 当前把成长首页、MetricView 雷达、点击下钻摘要合并；Figma 含其他学员姓名、固定六维和综合分 | 保留当前 metricId/视图切换/缺数据逻辑；采用 Figma dark radar panel、横向选择器和维度条；删除他人对比与假综合分 | P0 |
| `pages/parent/metric/index` | P6 `93:308` | 适配重构 | Figma 有 TOP18%、同龄排名、固定折线和教练头像；当前只有真实趋势、来源活动和隐私说明 | 采用 Figma header、指标 hero、趋势卡和评语视觉；只有 BFF 有值才显示百分位/趋势，不伪造排名 | P0 |
| `pages/parent/child/index` | P7 `93:336`、P7.1 `93:364`、P10 `93:550` | 适配重构 | 当前把档案、课时保险、俱乐部服务、私教意向、账号占位合并；Figma 是 hub＋详情＋账号页 | 保留当前 3-Tab 信息架构，重排为孩子 hero、摘要指标、服务入口、课时/保险卡；无账号数据不展示假绑定详情 | P1 |
| `pages/coach/schedule/index` | C1 `93:578` | 适配重构 | Figma 是普通课表摘要；当前已升级为今日/本周任务工作台、统计、筛选和唯一下一步 | 保留任务工作台；采用 Figma header/周条/摘要卡/活动卡，突出唯一 CTA 和待办，不恢复旧课表 | P0 |
| `pages/coach/event/index` | C2 `93:606` | 适配重构 | Figma 只画训练工作台并含计时、学分、结束训练；当前支持训练/比赛并按权限显示动作 | 保留 event type/capabilities/workflow；复用 dark session header、完成度卡和 quick actions，未有数据的计时/学分/结束训练不出现 | P0 |
| `pages/coach/attendance/index` | C4 `93:665`、C4.1 `93:696`、C4.2 `93:715` | 直接还原（行为保留） | 当前已支持批量到课、单人状态、备注、失败保留；主要缺 Figma 头像、摘要、固定提交和结果态 | 按 Figma 还原视觉与 success/error state，不改变保存契约 | P1 |
| `pages/coach/lesson/index` | C5 `93:734`、C5.1 `93:765` | 适配重构 | 当前默认全员销课，可排除、填原因、返还/补扣；Figma 分确认和纠正两页 | 保留统一页和真实余额状态，采用 LessonConfirmationRow、异常卡和固定确认栏；删除“后端/PATCH”文案 | P0 |
| `pages/coach/match/index` | C6 `93:796`、C6.1 `93:827`、C6.2 `93:858` | 适配重构 | 当前一页含摘要、capabilities 事件、无助攻默认和校验；Figma 硬编码黄牌/红牌/换人并默认展示助攻 | 保留 capabilities 与无助攻安全规则；采用比分 hero、事件时间线、添加事件 sheet/卡和保存状态，不硬编码未知事件 | P0 |
| `pages/coach/training/index` | C8 `93:896`、C10 `93:952` | 适配重构 | 当前是活动选择＋项目树＋搜索＋已选＋固定保存；Figma C8 是管理首页，C10 是扁平项目选择 | 当前路由先定位为 C10 内容选择；保留树/搜索/已选/回填，采用 Figma 搜索、项目卡、选中条和 SubmitBar。C8 管理首页另行评估 | P0 |
| `pages/coach/test-entry/index` | C12 `93:1030`、C12.1 `93:1061`、C15 `93:1132`、C15.1 `93:1163` | 适配重构 | 当前按项目录整队、62 项分组、草稿、缺测、部分失败；Figma C12/C15 都偏学员优先或多指标同屏 | 业务结构以当前为准；借用 C12 dark task header、学员行、固定保存和 autosave state；C15 学员优先结构标记为被新方案取代 | P0 |
| `pages/coach/me/index` | C16 `93:1182`、C16.1 `93:1210` | 适配重构 | 当前只有身份、球队、权限和占位；Figma 有固定 46/18/89% 等假统计及独立权限页 | 采用 Figma profile hero、菜单层级和权限卡；仅显示真实字段，禁止固定统计。账号/私教/帮助入口无 BFF 时隐藏或显示业务化空状态 | P1 |
| `pages/coach/tactical-board/index`（新增） | C7 `93:877` | 适配重构 | Figma 有完整视觉稿但使用深色球场、固定 11v11，并含首版排除的绘制/分享/录像；代码与 BFF 均缺失 | 按产品规格改为绿色竖屏球场、真实比赛名单/替补池、阵型模板、拖拽相对坐标、保存/重置、赛后只读和教练权限 | P0 |

## 4. Figma 页面当前无对应路由

| Figma 页面 | 分类 | 决策 | 原因/依赖 |
| --- | --- | --- | --- |
| P3 Reminder Center `93:222` | 暂不实现 | 当前日程页移除“提醒待接入”技术 tag；待 notifications BFF 后独立任务 | 正式提醒/已读/公众号链路不在本轮 |
| P8 Content Center、Venues、Help、Coach Team `93:388/416/444/472` | 暂不实现 | 不为凑齐 Figma 页面新增空路由 | 缺内容模型、场地和客服数据 |
| P9 Private Lesson Form/Success `93:500/531` | 暂不实现 | 当前只保留“意向”，不得还原日期、费用和预约成功 | 已锁定不做私教订单/排课 |
| P10 Account Binding `93:550` | 设计系统派生/后续 | 当前登录真实，但缺家庭成员管理；只展示后端真实会话字段 | 缺家庭成员绑定 BFF |
| C3 Activity Change `93:634` | 暂不实现 | 不新增伪保存/伪通知 | 缺活动变更与通知写接口 |
| C8 Training Management Home `93:896` | 设计系统派生/后续 | 可用 coach home 数据做真实训练管理 landing，但不要与内容选择混为一页 | 需要单独确定第二 Tab 信息架构 |
| C9 Team Detail `93:924` | 暂不实现 | 不展示固定 18 人/赛季统计 | 缺 team detail BFF |
| C10.1 Coverage Preview `93:983` | 暂不实现 | 训练项目保存保留；覆盖预览不画假值 | 缺 coverage preview BFF |
| C11 Test Task List `93:1002` | 暂不实现 | 直接从活动工作台进入评测 | 正式 assessment-task 模型明确不在本轮 |
| C13 Student Radar、C14 Team Ability `93:1080/1106` | 暂不实现 | 不展示其他孩子或团队排名 | 全队排名明确不在本轮，且涉及隐私 |
| C16.2 Private Interest、C16.3 Account、C16.4 Help `93:1238/1262/1286` | 暂不实现 | 当前 Me 只展示真实身份/权限；后续有 BFF 再开路由 | 私教、设备管理、客服内容均未闭环 |

## 5. 明确禁止照搬的 Figma 内容

1. G2 的手机号输入、验证码与“绑定孩子并继续”：生产链路必须继续使用微信手机号授权和后端身份匹配。
2. P5/P6/C13/C14 的其他学员姓名、TOP 百分位、团队 TOP/底：没有授权数据不得展示。
3. P5 固定六维、综合 76 和假雷达：必须使用 MetricView/metricId，缺数据不补 0。
4. C2 的训练计时、学分和“结束训练”：没有 workflow/BFF 字段不展示。
5. C6.1 固定黄牌/红牌/换人：事件类型继续来自 capabilities；无助攻必须保持默认。
6. C12/C15 的学员优先多项填写：已被“按项目连续录整队”方案取代。
7. P9 的日期、费用、预约成功：当前只允许私教意向，不生成订单或排课。
8. 所有“接口待接入/BFF/P1/P2/后端/PATCH”等技术文案：统一改为业务化空状态或隐藏入口。

## 6. 推荐实施拆分

### UI-1：设计基础与直接页面

- Contract Tokens、AppHeader、安全区、RoleTabBar、StatusView、StatusChip、ActivityCard、SubmitBar。
- Launch/Login、Attendance、基础空/错/成功状态。
- 目标：消除全局颜色、导航、圆角、密度和组件不一致。

### UI-2：家长核心页面适配

- Family Schedule、三类 Activity Detail、Growth/Radar、Metric Detail、Child Hub。
- 目标：保留全部孩子、隐私和 metricId 下钻，达到 Figma 视觉语言。

### UI-3：教练核心页面适配

- Task Workbench、Activity Workbench、Lesson、Match、Training Content、Assessment、Coach Me。
- 目标：保留任务优先级、capabilities、回填、按项目录整队和部分失败草稿。

### UI-4：DevTools 与真机验收

- 每个主页面按 375×812 Figma 基线截图对比。
- 覆盖 2 个孩子、25 人名单、62 项评测的滚动/固定保存栏和空/错/成功状态。
- 最后执行 open/preview/二维码/真机，不在 UI 对齐前签署最终视觉通过。

## 7. 总结决策

- **直接还原的主要对象是设计系统和共享组件，不是旧业务流程。**
- 当前 15 个路由中，Attendance 可接近逐屏还原；其余核心路由均需在保留新业务结构的前提下适配。
- Figma 中额外的状态/页面不应一次性补齐；其中大多数依赖当前明确不做的业务模型。
- 推荐先完成 UI-1，再并行按家长/教练域推进 UI-2/UI-3，最后恢复当前 DevTools 验收任务作为集成门槛。
