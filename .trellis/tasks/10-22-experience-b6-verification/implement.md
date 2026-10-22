# B6 集成验收与交接

2026-10-22，主目录`/Users/dongjun/projects/football-club-management`，分支`feature/ui-batch-1-p01`。B0—B5代码均已按批提交；本地集成检查通过，**设备与部署验收未完成**，父任务和B6继续保留in_progress。

## 本地证据

- [x] 最终源码65f0fcc4的`pnpm check:delivery`通过，日志`/tmp/cq-experience-delivery-final3.log`：domain47、API266、mini687、后台4，合计1004通过/1既有Windows专属跳过；全部类型/构建、9项脚本测试、3项隔离启动检查通过。
- [x] 后台lint、差异空白检查通过。单测只读前一次编译结果不作为当前证据；最终禁用颜色加深后重新检查readonly浏览器，字段可读且写入仍403。
- [x] 最终小程序policy仍22项：4登录前缀静态命中、4生成依赖废弃API、13依赖隐私能力、1原始预算；1649文件3.60MiB，不是官方上传包体。未删除/屏蔽报告。
- [x] 40人课堂合成只读响应原生渲染，实际430×932逻辑窗口；课程/内容/主要动作不被40人名单挤出。`research/native-40-evidence.json`；session/context/drafts/request恢复。
- [x] 所有更改按原API/领域边界审阅，权限仍由服务端决定。新增友谊赛增量表独立，正式比赛/计次/测评分数无新规则。
- [ ] 真机375×812基准、Android/iOS软键盘、大字号、读屏与弱网实机链路。
- [ ] 部署数据库历史覆盖核查、真实双角色/双孩子全链路及官方上传包体；未经授权未部署或开启友谊赛。

较早失败保留：全量同时运行浏览器时两条5秒超时，单独14项通过；调整持久化优先级后，战术fixture只改内存导致409，已同步其持久化状态，原编辑/只读断言保留，最终全量通过。没有调大超时或删除失败用例来通过检查。

## A1—A9对应证据

| 验收 | 已完成的本地证明 | 明确限制 |
| --- | --- | --- |
| A1 同课事实/孩子范围 | B0有类型投影、白名单schema、双孩子/无权/空值回归；B4双孩子原生回读；B5改期/取消读DB即时生效 | 当前部署版本仍是上一轮，不等于新接口已线上联调 |
| A2 课堂主路径 | B1真实19人课程、记录、更正表单与名单只读；B6合成40人首屏；课程→记录/测评一层入口，记录→更正一层；头像无写入 | 入口层级由实现和原生操作证明，未做用户计时实验；375/真机未验 |
| A3 球队范围 | 原单队隔离偏好/无权teamId不回退回归；近期10课/2待办原生只读；名单19→搜索1；两类比赛目录共用明确来源 | 未做多设备同时切队实测 |
| A4 友谊赛 | B3持久化事务/去重/revision/草稿完成修订作废/历史名单、比分null与0、部分事件与正式Match隔离；家长双孩子只看各自事件 | 默认flag关闭；未核查部署库全部旧记录 |
| A5 测评 | 原始值校验/0与空、保存后继续、409保留；API16项完整发布/修订/跨课/家长可见性；原生19人多项目、TDesign实际enter事件 | 断网/重试以控制器/API故障测试为证据，非物理断网；手机软键盘待验 |
| A6 家长理解 | 完整年月日与孩子深链、请假前置、结果/评价先于图表、文本数值与日期、无数据不造柱形；四快捷位和Banner保留 | Home/growth/mine部分渲染使用合成页面状态 |
| A7 视觉反馈 | 61/63页面共享header，启动/战术专用壳登记；40剩余页原生打开；状态、冲突、只读/重试、桌面双视口检查 | 不宣称已完成真机可访问性验收 |
| A8 后台 | 29资源五组实际展开；既有四评测/BI/四服务/设置路由保留；工作台到课程抽屉一次点击；真实登录、搜索、保存/历史、409、导出、403、键盘/滚动、退出刷新、CSP0 | 尚未逐页对每种后台资源进行真实业务写入验收 |
| A9 可维护 | 62旧路由+1新增登记；按层DTO/服务/仓储/页面/组件；标准Field模型分组保留未知字段；所有批次已提交 | /tmp图片不是永久二进制附件，提交中保存范围/结果与SHA |

## 工程师入口

- 跨端课程事实：`apps/api/src/application/event-presentation.ts` → `http/event-presentation-schema.ts` → app-client响应 → 原生页面模型。禁止从中文标签解析领域字段。
- 课堂与范围：原生`utils/navigation.ts`/`coach-team-context`、`components/app-header`/`context-bar`与coach/event、lesson、training、team。UI发明确意图，不负责计算计次。
- 测评：`utils/assessment-input.ts`维护原始值校验；保存/核对/发布继续走既有assessment-workflow服务。修改数据不自动发布。
- 友谊赛：domain/training-game → application/training-games → repository接口 → persistence/training-game-repository → migration0045；路由与schema单独文件，详细合同见API training-games spec。
- 后台：Workspace只组织导航，resource-presentation只组织稳定资源/字段；Management持有加载/权限/保存/冲突，ResourceFields只呈现控件，Field/Option独立类型。列表关键词通过ProTable标准合同传到导出。

## 发布前交接

按现有交付流程核对目标环境、备份和0045增量迁移；保留新增记录，不做破坏性down migration。API兼容先行，客户端再发布；训练友谊赛默认关闭，核对授权俱乐部后才开启`FCM_TRAINING_GAME_CLUBS`。回退UI各批提交或关闭入口，不撤销真实计次/测评历史。develop部署记录仍为`b29d84e3`/0044；本轮没有读取部署库，不据此声称当前线上数据或新接口已验证。物理设备和目标环境验收完成后再归档父任务与B6。

清理已回读：后台会话退出、Playwright会话cq-b5关闭，最后fixture收到SIGTERM后私有目录不存在；原生请求mock/session/context/drafts恢复并返回launch。未删除其他工具数据、工作树或登录缓存。当前B6保持活动，下一步为设备/目标环境验收，不重复执行已经通过的本地检查。
