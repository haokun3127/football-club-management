# 小程序技术选型与组件适配评审

评审日期：2026-10-20，香港时间。源码基线：`feature/ui-batch-1-p01 / 97419b47`，起点工作树干净。实际目录：`/Users/dongjun/projects/football-club-management`。

## 结论

当前原生微信小程序 + TypeScript 的基础路线合理，但实现还不能称为“完全科学”或已经最优。更值得投入的是类型有效性、请求身份竞态、业务组件复用和渲染更新粒度。没有证据支持全量改为Taro/uni-app、整体套UI库或全局迁移Skyline。

选型应服务于业务：微信单端和深度定制页面继续原生；重复的通用交互可小范围采用成熟组件；已有专用雷达和战术板先修边界、测性能，再决定是否替换。

## 事实基线

- `app.json:2` 注册62页，无subPackages、tabBar或renderer配置；`lazyCodeLoading=requiredComponents`，使用默认WebView路径。
- `package.json:15`仅有开发依赖，未引入运行时UI/图表/状态库。微信工具编译TypeScript，tsc负责静态检查。
- 8个本地组件；JSON注册引用统计：status-view 49、role-tabbar 38、app-header 13、radar-canvas 2。引用数不等于运行时实例数。
- `utils/api.ts` 1653行、`utils/types.ts` 640行，已有API适配/归一化层；不能说页面直接裸调所有HTTP。
- 已有环境隔离、统一请求ID、幂等键、会话过期处理、按环境缓存和不少页面请求代次保护。这些值得保留。
- 10-14官方上传记录约1.46MiB，仅代表当时上传制品；本次静态预算1.67MiB是不同口径，不能相减推算增长或称为官方超限。

## 决策总表

| 层/组件 | 结论 | 更好选择或改进 | 优先级与代价 |
| --- | --- | --- | --- |
| 原生WXML/WXSS/TS | 保留 | 只有明确多端交付需求才另评跨端框架 | 无需迁移 |
| 微信类型声明 | 替换方向明确 | 官方miniprogram-api-typings，逐页恢复Page/Component泛型 | P1；中等，可能暴露存量错误 |
| wx.request封装 | 保留并修正 | 当前身份/请求代次校验、401跳转收敛；按需暴露RequestTask取消 | P1；小至中等 |
| 课表日历 | 保留业务界面，提取共用内核 | date-grid + 显式显示模式；普通日期/区间选择才试TDesign/Vant Calendar | P2；中等 |
| 浮层/选择器 | 成熟库适合试点 | 优先比较TDesign Popup，Vant为备选；原生picker等继续用于简单场景 | P2；小范围试点 |
| 雷达图 | 暂时保留Canvas 2D | 生命周期、几何命中和数据边界补强；多图表需求成立后试裁剪ECharts | P2修边界，替换条件成立再做 |
| 战术板 | 保留现有业务模型 | 若测得拖拽不流畅，比较movable-view或页面级渲染侧手势原型 | P2实测，P3迁移 |
| 全局状态 | 保留小型store | 先划清会话、业务查询、临时页面状态；暂无引入大型状态库的依据 | P2局部完善 |
| 底栏导航 | 需要评估行为 | 保留角色设计，先验证状态保留；官方custom-tab-bar是有约束的候选 | P2；中至大 |
| API合同 | 分阶段加强 | 已有schema/OpenAPI基础，先对齐覆盖和必填语义再生成传输类型 | P2；中等 |
| 包体/加载 | 制定分包方案 | 按真实访问路径拆非首页功能；共享代码和真实tab页约束一并验证 | P2，随增长提前 |
| 渲染引擎 | 目前保留WebView | Skyline只针对测得热点做页面试验，不能默认开关即升级 | P3；高迁移成本 |

P1/P2/P3表示本次技术改进的相对顺序，不代表已发现线上严重事故。

## 1. 优先解决的两个确定问题

### 请求层身份竞态：已在最小模拟复现

定位：`utils/request.ts:23`捕获请求会话，`:87`收到任意401后直接clearSession/reLaunch，没有核对返回401的请求是否仍属于当前有效身份。

场景：A会话发出请求 → 用户切换/建立B会话 → A的旧响应返回401。当前代码把B会话也清除。使用当前request.ts经TypeScript转译、仅模拟config/store/wx回调的执行结果为`sessionAfter: null`。3个并发401产生3次reLaunch。可复现脚本见同目录`review-probes.cjs`。

这是本地模拟确认的代码行为，尚未证明线上已发生。建议认证失败处理感知会话代次、区分普通会话和临时角色选择token，并收敛并发导航；不能简单比较token后就忽略临时token的有效认证失败，现有测试明确要求清理该场景。

保留现有环境隔离、明确错误、显式幂等键。封装目前也没有返回可取消任务或显式超时选项，但不意味着微信请求无限等待；是否开放选项应按页面需求决定。取消不能代替“旧响应不能覆盖新状态”的代次校验；写入失败不得默认自动重试，必须复用同一业务幂等键并处理结果不确定状态。无需为这些能力先更换HTTP库。

### TypeScript严格模式被边界any削弱：负例验证确认

定位：`types/wechat.d.ts:62`的Page参数是any，`:63`的Component参数也是any，Page声明的泛型没有参与options的类型约束。

负例`Page<{count:number}>({data:{count:"wrong-type"},onLoad:"not-a-function"})`和`Component({methods:123})`在当前声明+strict配置下产生0条诊断。真实业务代码中的显式类型仍有价值，不能因此称整个项目没有类型检查。

建议优先用微信官方`miniprogram-api-typings`替代宽泛全局声明，保留确有需要的小范围补充；先试点一个业务页和一个组件，修正事件、Page this、setData和RequestTask类型，再逐批迁移。它属于开发期依赖，不是向小程序运行包增加一个UI框架。验收除了全量typecheck，还应保留这些错误示例应报错的负例，以及微信工具实际编译。

## 2. 组件怎样选更合适

### 通用UI：TDesign值得优先试点，尚无全量引入依据

当前`pages/coach/event/index.wxml:84`和`pages/coach/assessment-projects/index.wxml:81`各自实现遮罩/业务浮层。可比较TDesign Popup能否统一背景滚动、层级、关闭规则、安全区和键盘行为；现有原生picker、showModal和showActionSheet在简单场景依然适合。

TDesign提供原生小程序组件，可在页面JSON按组件注册；其Popup上游文档标注WebView/Skyline，而Calendar和Picker文档只标注WebView。不能从“库由腾讯维护”推出“所有组件适配所有引擎”。Vant Weapp也适合成熟通用交互，是同一试点的备选。两者均为第三方开源组件，不等于微信内置平台组件。[TDesign仓库](https://github.com/Tencent/tdesign-miniprogram)、[Popup能力](https://raw.githubusercontent.com/Tencent/tdesign-miniprogram/develop/packages/components/popup/README.md)、[Picker能力](https://raw.githubusercontent.com/Tencent/tdesign-miniprogram/develop/packages/components/picker/README.md)、[Vant仓库](https://github.com/youzan/vant-weapp)。

推荐仅选一个库、一类浮层、一张现有页面做对照，不同时铺开两个库。页面按需注册不保证官方上传包只包含这些文件，必须检查npm构建输出、依赖分析与实际包体；通过样式变量映射现有tokens，维持已确认的视觉设计。成本包括npm构建/CI、主题适配、兼容性回归和依赖升级维护。

现有status-view注册复用已较广，简单状态标签和品牌页头也无需为“统一成库组件”重写。activity-card/submit-bar没有在本轮JSON统计中出现引用；应核对业务差异再决定复用或清理，不能仅按组件目录数量认定复用充分。

### 日历：优先统一业务内核，区间选择器才比较现成库

定位：家长`pages/parent/schedule/index.ts:364`、教练`pages/coach/schedule/index.ts:387`都实现buildMonthDays。但家长固定42格且显示相邻月日期，教练按所需行数、边缘空白、每天两条事件及overflow显示。这些是不同显示合同，不能简单删除一个实现替换另一个。

建议提取日期格子与事件索引，显式保留两种布局模式；先验证跨月/跨年/闰年、周一起始、当天/选中、无数据及多活动，再决定是否统一外壳。日程时间按`startsAt.slice(0,10)`分组，API归一化目前不转换时区；须固定服务端日期合同并验证UTC跨日边界，尚未判定现有数据发生错日。不应仅为数个纯日期运算加入日期库。

TDesign Calendar支持单选/多选/区间、月切换及文案格式化；Vant Calendar也主要解决日期选择。它们不是现有带业务摘要课表的直接替代品。普通日期选择继续原生picker；新增区间筛选时，按需求比较两者。[TDesign Calendar](https://raw.githubusercontent.com/Tencent/tdesign-miniprogram/develop/packages/components/calendar/README.md)、[Vant Calendar](https://raw.githubusercontent.com/youzan/vant-weapp/dev/packages/calendar/README.md)。

### 雷达图：自绘并非错误，先保证绘制和交互使用同一几何

`components/radar-canvas/index.ts`327行，只有两个页面JSON引用，已经用Canvas 2D并处理DPR及重绘合并。对这类少量、视觉定制较强的图形，继续维护自绘合理。

静态检查发现待验证边界：`:119`查询回调直接取res.node，没有节点/离页防护；dark属性没有独立observer；`:135`命中采用默认角度，而`:172`的P5绘图用-120度起始角，普通模式为-90度，且P5分支不画通用选中高亮。应统一几何定义，并验证触点坐标、选中/主题变化、离页、缺失维度和maxValue边界。本轮没有运行真机Canvas，不把这些边界全部标为已发生故障。

若后续增长到多类趋势/对比图、tooltip、导出等需求，再评估`echarts-for-weixin`+必要图种裁剪。上游同时说明定制构建、Canvas 2D和小程序适配限制，不能直接承诺最新版ECharts与适配层任意组合可用。[上游文档](https://github.com/ecomfe/echarts-for-weixin)。

### 战术板：先保留，性能数据决定手势方案

`pages/coach/tactical-board/index.ts:106`在移动事件中约32ms节流setData更新拖拽影子；这约束了应用层推送频率，并不等于实测帧率。页面已有坐标归一化、跨球场/候补区投放、草稿、撤销、保存与离页处理，不能说它是没有工程保护的手写拖拽。

原生movable-view值得用于受限拖动原型，但不能默认等价支持当前跨区域业务；应比较滚动冲突、跨区命中、横屏/resize、拖拽取消和只读状态。官方示例确认其支持受限方向/区域和缩放，仅据此给出候选，不推导项目速度收益。[微信官方示例](https://raw.githubusercontent.com/wechat-miniprogram/miniprogram-demo/master/miniprogram/packageComponent/pages/view/movable-view/movable-view.wxml)。本轮不建议引入浏览器DOM拖拽库或大型通用Canvas编辑器。

## 3. 比换库更有价值的工程调整

- **底栏/页面状态**：`components/role-tabbar/index.ts:72`和`utils/navigation.ts:32`都用reLaunch，因此切换销毁页面并重新onLoad；需要真机核验是否造成用户感知到的重复加载/筛选丢失。官方custom-tab-bar可作为候选，但当前家长4项、教练3项，共7个目标页，必须验证平台tab配置数量、静态路由、角色隐藏项及权限，不能只把reLaunch换成switchTab。真实tab页要在主包，与分包方案一起设计。
- **渲染数据粒度**：`pages/coach/assessment-bulk-entry/index.ts:257`每次输入构造完整rows并setData，随后同步写草稿；先测目标人数×字段数下的payload和输入延迟，再用单行/字段更新与合适的草稿持久化时机优化。引入表格/虚拟列表前，要保证焦点、键盘和未保存输入不丢失，不能仅因列表长就换组件。
- **状态管理**：`utils/store.ts:1`是会话/上下文单例+本地存储，规模并不需要Redux/MobX。重点是环境、用户、角色、孩子切换时的缓存和失效合同。部分页面已有WeakMap/代次保护；家长schedule使用模块计数且无onUnload失效保护，提醒角标也没有独立离页保护，应按页面边界补核，避免再建立泛用抽象框架。
- **接口合同**：`utils/api.ts:86`等处以Record<string,unknown>读取后归一化，有兼容价值但维护负担在增长。服务端`apps/api/src/http/openapi.ts:112`已有OpenAPI 3.1生成；并非需要从零引入schema系统。先核对路线覆盖/版本/必填语义，尤其`:69`查询参数required写死false，再选择少量稳定DTO生成客户端类型；显示层view-model、错误解码和业务兼容仍须保留。类型生成不等于运行时验证，也不能把Node服务端依赖直接打入小程序。
- **样式复用**：已有`styles/tokens.wxss`和app.wxss共用样式，不应另建一套设计系统。局部页面600行控制器/样式只作为拆分线索，不是缺陷判据；按可独立验证的业务部件提取，避免把所有差异塞进一个巨大组件。

## 4. 包体、分包与Skyline

原始文件预算检查：432文件、1.67MiB，超过仓库1.50MiB预警线。下一次增加依赖前取得同SHA官方构建基线及新增库后的对照，检查主包/各分包、首屏及角色切换。requiredComponents懒加载不能代替下载包拆分，预下载也不减少包大小。

按家长/教练访问路径拆出非首页功能是合理方向，但不能把所有页面机械移入分包。共享资源位置、跨包引用、真实tab页必须留主包等约束见2026-10-14本地官方正文`docs/reference/wechat-miniprogram/pages/subpackages-basic.md`。路径变化必须覆盖跳转、分享、深链及登录回跳。

目前没有冷启动、setData耗时和拖拽性能数据，不能给“Skyline一定更快/必须迁移”的结论。当前样式、Canvas、cover-view和候选库应逐项核对。官方Skyline资料本轮在线读取失败，依据为2026-10-14留档`pages/skyline-introduction.md`；引擎迁移前必须再次核对最新平台文档。TDesign本轮上游Calendar/Picker文档仅标WebView，更不能一边选库一边默认全局切引擎。

## 5. 本次检查与验收边界

| 检查 | 结果 | 证明范围 |
| --- | --- | --- |
| 小程序typecheck | exit 0 | 现有声明下静态类型通过，不覆盖宽泛any或WXML编译 |
| 小程序现有Vitest | 80文件通过；569项通过、1项跳过；exit 0 | 现有控制器、工具和模板断言，不能代替真实模板/触摸/Canvas |
| check:miniprogram-policy | exit 0；1条MP-PKG-002预警 | 检查器报告模式，exit 0不等于所有平台规则已验收 |
| request最小模拟 | 旧401清新会话；3并发401触发3次跳转 | 当前代码在模拟回调序列下的行为，非线上事故证据 |
| Page/Component错误负例 | 0条诊断 | 确认手写参数any导致的类型约束缺口 |

准确命令见`../implement.md`；最小模拟可由同目录review-probes.cjs复现。依赖使用现有安装，未安装候选库。本次未跑全仓check:delivery、微信官方编译/Audits、Figma或真机交互/性能，也未核对线上状态；评审不是全页产品验收。

继续使用现有Vitest和miniprogram-automator；有组件树事件测试缺口时，微信官方miniprogram-simulate可作为补充，但其DOM模拟仍不能代替小程序渲染器或真机。[官方工具说明](https://github.com/wechat-miniprogram/miniprogram-simulate)。[官方类型仓库](https://github.com/wechat-miniprogram/api-typings)提供Page/Component和wx定义，是本轮最明确的开发期替换建议。

## 6. 推进顺序与完成条件

1. **先修正确性/检查能力**：401身份竞态与并发收敛；官方类型声明单页/单组件试点。验证旧响应、临时角色token、并发、切角色、重新登录及负例应报错。不要顺便引入请求库或状态库。
2. **再收敛重复业务**：日历共享日期核；底栏状态复核；批量录入单行更新。既有日期显示差异、权限、草稿和失败恢复必须维持。
3. **只做一个通用UI试点**：现有浮层与TDesign Popup比较，Vant为备选；通过npm构建、样式/键盘/安全区、官方包体与低端设备验证后决定推广。
4. **依增长和实测引入新能力**：先规划分包，再根据新增图表需求试裁剪ECharts；只有性能证据支持时，再试movable-view/页面级Skyline。每项单独保留可回退对照。

完整评审已完成；上述条目是未来实施建议，本轮没有修改业务源码、安装依赖、上传或部署。
