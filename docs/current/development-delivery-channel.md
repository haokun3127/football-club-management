# 重庆天才：当前交付状态与待办

> 2026-10-23最新：develop已为重庆天才俱乐部开启训练内友谊赛；用户正常手机号登录后，家长/教练、双孩子闭环和重启持久化通过。登录灰字与比分布局已修正。API/后台仍为a5c074ce，trial/release未变，未上传微信。

## 2026-10-23 友谊赛启用与真实双角色验收

- 开关仅在develop私有配置中允许`club-chongqing-talent`；备份数据库及私有配置后重建同一镜像。未新增账号或改绑，手机号、后台密码与令牌均未写入仓库。
- 旧目录没有可记录友谊赛的项目，经正常后台受审计接口新增俱乐部专属“训练内友谊赛（dev验收）”，并追加到10月25日“周末进攻训练”；保留原8项内容。教练可从本课“训练内友谊赛”进入，家长可从各自孩子的同课详情查看结果。
- 2个孩子、19人球队；草稿隐藏、空/0比分、部分事件、完成/修订、重放、409冲突、作废及角色/孩子/球队隔离均已验证。当前保留一场完成记录（2:1、revision5）与一场作废记录（revision5），明确标记为验收数据。
- 23张核心业务表摘要不变，覆盖训练计次/考勤、课时账本、正式比赛、测评、监护和成员关系；重启前后106表一致，真实会话继续读取记录。备份在`/opt/cq-talent-nonproduction/backups/friendly-games-develop-20261023/`，不恢复旧库覆盖这些新记录。
- 登录说明改用深色正文token，比分输入采用现有TDesign垂直标签；只改展示，不改授权、计次或数据结构。原生截图和相关回归通过。
- 尚待物理设备375、软键盘、大字号/读屏、真实弱网、多设备切队及官方包体/微信上传。原生模拟器430×932与页面处理器联调不冒充这些结果，B6/父任务保持in_progress。

当前证据见[B6验收记录](../../.trellis/tasks/10-22-experience-b6-verification/implement.md)和[脱敏验证结果](../../.trellis/tasks/10-22-experience-b6-verification/research/develop-games/verification.json)。下方为此前部署时点记录。

## 2026-10-23 GitHub dev与develop环境已更新

- **源码与CI**：`feature/ui-batch-1-p01`和GitHub `dev`已正常快进到业务源码`a5c074ce6ba5b5ac59af2d71551f4204c0e83848`；之后交付记录提交仅更新文档。该SHA的[GitHub CI](https://github.com/haokun3127/football-club-management/actions/runs/39818215142)通过完整交付门禁：1001项测试通过、1项既有跳过，另9项脚本测试、3项隔离启动检查通过。此前本地1004计数包含3条dist编译产物重复用例，本次已核准干净源码口径。
- **实际运行版本**：`cq-talent-api:develop-a5c074ce6ba5`，镜像ID`sha256:ed8c7f97f86d0bfb17b39e626f1bc0f82d41b221367b76ae0a7766480353084a`。从已提交源码归档构建Linux amd64镜像，独立Compose仅重建develop。后台入口为[develop后台](https://cqtc.pomi.tech/__env/develop/backoffice/)。
- **迁移与数据**：先备份并演练0045，再实际新增4张友谊赛表；原102张表的业务行逐值核对不变，迁移记录44→45。OpenAPI补齐后再次备份106张表、验证迁移为空并切换，全部106张表不变。SQLite完整性及外键检查通过，两次切换前均完成0600一致性备份，目录为`/opt/cq-talent-nonproduction/backups/experience-{783f74f9768c,a5c074ce6ba5}-20261023/`。
- **线上验证**：HTTPS health/客户端登记200、错误环境403、正确后台环境下无会话401、后台HTML和3个入口资源200/CSP存在；公开OpenAPI已包含友谊赛4路径/6操作及必填球队/孩子参数。默认node用户、无网络/无业务卷模块加载通过；私有配置就绪检查通过。trial/release容器ID和镜像ID与操作前一致。
- **修复与边界**：部署回读补齐了此前遗漏的OpenAPI目录及必填query标注，未改变业务处理、权限或数据模型。`FCM_TRAINING_GAME_CLUBS`仍为空，未开启线上友谊赛记录。当前原生`wx.login`返回`binding_required`，未触发手机号授权，未声称完成本轮真实双角色页面联调。

回退保留旧镜像与受限备份；仅切回develop镜像，保留已新增表，不覆盖恢复业务库。完整证据、失败记录和后续设备验收见[B6交接](../../.trellis/tasks/10-22-experience-b6-verification/implement.md)及[最终部署回读](../../.trellis/tasks/10-22-experience-b6-verification/research/deployment/final-rollout.json)。真机、手机号绑定后双角色/双孩子完整业务链路、官方包体及微信上传仍未完成，B6和父任务保持in_progress。

## 2026-10-22 全产品体验提升：B0—B5本地完成，B6设备/部署验收待完成

按批准方案先完成跨端课程事实与教练课堂，再推进测评、训练内友谊赛、家长和后台。主工作区分支`feature/ui-batch-1-p01`，业务源码最新提交`65f0fcc4`。本轮未推送、部署或上传微信，未向现有develop保存业务成绩；上方部署记录仍是上一轮版本。

- 跨端与课堂：类型明确的课程投影/孩子范围，内容和下一步优先，计次更正有明确入口；球队提供近期/待办与名单搜索。后台课程改期/取消后读取持久化最新事实。
- 测评：两层输入、原始值校验、保存再继续、409保留输入、核对后独立发布；原评分/发布规则保持。
- 训练内友谊赛：独立记录、实际名单、可空比分/部分事件、修订/作废/去重与家长孩子范围；增量迁移0045，`FCM_TRAINING_GAME_CLUBS`默认关闭，尚未线上启用。
- 家长与导航：完整日期/孩子/地点、请假前置、成长来源与文本数值、账号服务优先；61/63路由共享header，启动/战术保留专用壳，62旧URL全部保留。
- 后台：29资源五组，待办先于统计，详情/历史与字段分组，未保存确认、失败重试；修复搜索关键词未传递及导出条件问题。

最终`pnpm check:delivery`通过：1004项测试通过、1项既有跳过，9项脚本测试、3项隔离启动检查通过；后台lint通过。原生覆盖真实19人只读与合成40人课堂、40个迁移路由和代表页；浏览器1440/1024布局、真实登录/保存/冲突/导出/只读403/键盘焦点/退出刷新通过，CSP事件0。小程序policy仍22项既有发现、原始预算3.60MiB，未声称官方包体通过。

真机375基准、软键盘/大字号/读屏、弱网实机、目标环境数据库与双角色联调、官方上传包体仍待验；因此父任务与B6保持in_progress。工程入口、逐项证据、已知失败及发布边界见[B6验收与交接](../../.trellis/tasks/10-22-experience-b6-verification/implement.md)，完整范围见[父任务](../../.trellis/tasks/10-22-club-experience-redesign/implement.md)。

## 2026-10-22 本轮审查优化 v1.1（实施与 develop 联调）

[需求与验收spec](../../.trellis/tasks/10-21-review-ui-unification-spec/prd.md)保持v1.1及后续用户决定：TDesign1.17通用控件、共享日历仅日期和醒目色块、自动身份、ECharts雷达、球队工作区和全页移动端收口均已实现并分批验证。根交付检查、后续定向回归、官方npm构建和原生检查结果见任务实施记录。

服务器develop当前镜像`cq-talent-api:develop-b29d84e35b66`，ID`sha256:816baab45eea20365680f019932cff95b1f5ae7aec22bffcc710c8c139797537`；原101表备份、迁移副本演练、实际0044迁移及前后业务数据一致性通过。正常联调只产生会话轮换和最后身份偏好。HTTPS health、后台与资源、新接口和错误环境拒绝通过；trial/release容器与镜像未变。

原生真实账号读取家长2个孩子/教练19人，双端历史对比请求成功。现有样本缺批准映射与适用标准、默认视图仅2轴，组件显示数值/未映射原因，不能据此审查多条雷达线的实际效果。首次真实手机授权、image2.5最终素材、窄屏/真机、官方包体和B队完整链路仍待验；任务in_progress，未上传微信、未改Figma。安全验证与截图见[部署证据](../../.trellis/tasks/10-21-review-ui-unification-spec/research/deployment/develop-verification.json)。

## 2026-10-21 审查账号与 develop 样本恢复

用户明确授权后，仅在 develop 恢复合成审查样本：保留既有账号的家长/教练/管理员角色与真实登录绑定，配置一支19人队伍及2名绑定孩子、26项活动、6项测评任务、已确认结果与草稿。日期覆盖10月6日至11月8日；写入前完成受限一致性备份，事务导入后重启同一 develop 镜像 `trial-939676f325b9`。真实模拟器会话验证家长/教练数据、主教练编辑权限及首页 ready 后切回家长。

这是审查环境恢复，不代表完整产品验收或 API 新版本部署。trial/release 未变，页面与应用业务源码未改；界面意见已于本阶段审查结束后转入上方优化spec，后续实施与部署以本文顶部最新状态为准。操作与验证边界见[恢复记录](../../.trellis/tasks/archive/2026-10/10-21-review-account-test-data/verification.md)。

## 2026-10-21 优化后独立审计

源码修复基线 `68921a8d759501a0a26456f25373c543b5d74b2e`，分支 `feature/ui-batch-1-p01`，已push并回读同名远端一致。完整门禁964例通过、1项Windows专属测试跳过；另9项脚本测试、3项启动检查通过。原生官方CLI清编译缓存后auto成功；P08/C34合成渲染与回读成功，已恢复登录页及原运行函数。最终文档提交SHA及三端回执见[版本报告](post-optimization-audit-2026-10-21/version-consistency.md)。

未部署/上传；真实业务会话、完整数据闭环、真机隐私及性能验收仍未完成，不能据此宣布产品稳定可发布。当前缺口与下一周期建议集中在[本轮报告](post-optimization-audit-2026-10-21/README.md)。下方历史体验版/API事实继续按其日期解读。

> 复核：2026-10-19（香港时间）。日常路径与打开方式见[唯一主开发入口](development-workspace.md)。本文是当前交付状态入口；历史交接、任务记录与外部盘点均按各自时点解读。

2026-10-21 专项补充：[家长与教练核心流程审计](miniprogram-core-flow-audit-2026-10-21.md)已形成24步覆盖矩阵、功能/视觉/性能问题与修复顺序。审计未修改业务源码或发布版本；真实账号缺少绑定孩子与课程任务，有数据的原生写入和真机验收仍未通过，不将源码/隔离测试成功当作完整交付。

## 2026-10-19 及此前交付快照（非当前源码状态）

| 项目 | 当前结论 | 证据和边界 |
| --- | --- | --- |
| 工作树/分支 | 主仓库为projects真实路径；本轮起点`feature/ui-batch-1-p01 / 2e8a6d96`，比dev/origin/dev的`3fcaa774`多两次提交 | 10-18 Git读回。整理不会切分支、重置或删除原有未提交工作；后续以实时Git为准 |
| 小程序配置 | 原生62页（家长26/教练33/启动1/登录1/共享1）；AppID `wx4c588cd106e520e0`；3.17.3、urlCheck=true；无分包 | 当前app/project配置；工具基础库不代表后台最低支持版本 |
| 体验版 | 9.7.5，来源`939676f325b9`；总包1,531,864字节，约1.46MiB | [10-14官方上传与平台回读记录](trial-backoffice-release-2026-10-14.md)。当前源码两次新增提交未据此宣称已上传 |
| develop/trial API与后台 | 10-14已晋级同一不可变镜像`trial-939676f325b9`，各自独立卷/凭据 | 同上历史部署证据；本轮未SSH重查，不称当前镜像已复验 |
| release API | 本次未部署或修改正式数据；当前运行镜像尚未复验 | 不用旧镜像记录或公开health推断生产具体版本 |
| 公开健康与TLS | 本会话10-18读取`/health`为200；证书到2026-10-31 16:33:48香港时间 | 公开TLS/HTTP实测；未检查续期任务。健康接口不代表认证或业务流程验收通过 |
| CI/测试 | [运行38530211783](https://github.com/haokun3127/football-club-management/actions/runs/38530211783)为success，来源`939676f325b9`；本会话42个相关定向用例通过 | CI是该SHA的结果，不覆盖新HEAD全部改动。API包有31个后台测试，不能用后台前端包2例代表整个后台覆盖；本次未重跑全量交付门禁 |
| 隐私授权 | 有手机号/剪切板调用，未自写隐私同步代码；微信有默认官方弹窗 | [纠正后的隐私解释](../reference/wechat-miniprogram/notes/04-隐私与个人信息合规.md)。后台声明/真机同意拒绝未核实，不能断言登录直接不可用 |
| 备案与额度 | 10-14记录小程序未备案、手机号累计73/1000；不作为10-18实时值 | 小程序备案在微信公众平台办理；服务器域名备案另核对。当前状态须平台回读 |
| 管理员后台 | develop/trial当时已为既有管理员设置凭据，完成真实HTTPS登录/写入/重启/注销验收 | [交付记录](trial-backoffice-release-2026-10-14.md)；不是“未新建用户所以没有管理员”。管理员网页后台与家长/教练微信流程分别验收 |
| 训练事实/旧销课 | 旧lesson-confirmation GET/POST/PATCH返回410；训练统计及更正不改财务账本 | 当前路由和测试；不能根据旧路径名称推断仍有三条财务写入路径 |
| 工程规模 | dev已提交43份SQL迁移；顺序执行后99张非SQLite内置表；路由文件187个静态注册点 | 本机会话统计口径，不含额外迁移记录表/动态展开，不能当成线上库盘点 |
| 视觉与身份验收 | 仍有体验版/Figma差距；当前深色顶栏状态栏配色和底栏选中PNG对比度已有审计发现 | 代表页审计不等于全页验收；真实手机隐私/手机号及关键家长、教练流程待闭合 |


## 2026-10-19 干净基线记录

- 当前分支保留`feature/ui-batch-1-p01`；合规提交`f015ab2d`、完成任务归档`fd1695d1`、剩余资料与忽略规则整理`828526c7`。这些提交保留原有两次UI/设计基准提交，不切换或重写dev。
- 在`828526c7`上实际读回主工作树无暂存/未暂存改动、未跟踪文件0；本记录随后单独提交，最终HEAD以Git实时读回为准。六个其他worktree的路径/HEAD/分支均未变化。
- 新归档16项完成任务，另纳入此前已归档的10-14两项；未完成设计/产品任务仍保留并纳入版本控制，不为“干净”虚标完成。原本漏提交的Figma画板目录及配套证据已纳入Git。
- GitHub引用已fetch；本轮没有push、部署或改Figma。与origin/dev的差异是上述本地提交及既有UI提交；不将本地干净误称线上版本已同步。下一批次尚未启动。

## 历史待办优先级（当前以优化后审计为准）

**P0：本次未发现已确认正在发生的全量故障。** 若实际出现证书失效/续期失败临近到期、数据或凭据事故，应立即升级；“未知”不等于“无风险”。

| 优先级 | 事项 | 完成证据/时限 |
| --- | --- | --- |
| P1 | 统一主开发入口和纠正知识基线（本任务） | 文档和团队/私有显示名已统一；用户开启服务端口后官方CLI打开成功，工具元数据确认路径/名称/AppID。10-19官方列表读回仅保留一条重庆天才真实主路径，其他应用保留；列表缓存旧名仍待工具刷新，不删副本 |
| P1 | 核查证书自动续期与生产镜像 | 建议10-25前确认定时任务、最近续期结果及当前容器镜像/卷；证书到10-31到期。只读核查不自动授权改配置或重启 |
| P1 | 微信后台与真实手机门禁 | 回读小程序备案、隐私指引/接口声明、最低基础库与额度；新用户验证默认官方弹窗同意、拒绝与显式重试；家长/教练关键路径及后台管理员闭环分别留证 |
| P1 | 产品与视觉验收 | 修复已确认界面问题，对照[在线唯一Figma](figma-source-of-truth.md)验证代表页和业务链路，再扩大全页；补齐当前文档引用的未跟踪依赖，保证干净检出可读 |
| P1 | 体验二维码入口 | 10-14记录二维码10-21前有效；需要继续验收时先确认平台重新获取方式，不把码失效等同于版本失效，也不默认重复上传 |
| P1（提审前） | 账号权益与测试材料 | 核对注销/数据删除申请路径、承诺、测试身份和实际权限；退出登录不能代替注销；备案不是唯一验收条件 |
| P2 | 包体与加载优化 | 以新版本官方包体趋势决定资源外置/分包；网络资源会增加网络、缓存与降级要求，预下载不减少包体 |
| P2 | 工程补强 | 按具体缺口补前端交互测试；评估小程序Bearer退出撤销、错误暴露和公共接口限流。后台已有logout和登录尝试限制，不按缺少某插件直接判无防护 |

**尚未在本轮完成**：真实微信身份授权、全页视觉验收、平台当前备案/隐私状态、服务器当前镜像与自动续期读回、微信工具列表缓存名称刷新及可见窗口截图核对。下列旧章节是历史执行记录，出现的旧镜像、端口和“未上传”等结论仅适用于各自日期。

---

## 历史执行记录：2026-09-28至2026-10-09

原记录边界：配置检查通过不代表已完成真实身份登录、手机验收、微信上传或正式发布。

## 固定边界

| 环节 | 入口与工具 | 必须通过 | 当前状态 |
| --- | --- | --- | --- |
| Codex / 本地 | Node 24、pnpm 10.33.0、锁文件 | `pnpm check:delivery` | Node 24.21.0 实测通过 |
| 微信开发者工具 | 优先稳定版 CLI；IDE HTTP 56031，Automator 9420（本次） | 有效登录、正确项目、基础库 3.17.3、域名/TLS 校验开启 | 已实测进入身份验证页 |
| develop | `https://cqtc.pomi.tech/__env/develop` | 路由、登记、独立库、凭据、测试身份、业务联调 | 路由/登记/凭据/单账号三角色已配置；登录码兑换通过 |
| trial | `https://cqtc.pomi.tech/__env/trial` | 同一已验证代码制品、独立库、真机三角色验收 | 配置及登录码兑换通过；手机授权登录/体验验收待完成 |
| 正式发布前 | release 根入口、原生产卷 | 审阅变更/迁移、兼容旧客户端、回滚方案、明确发布操作 | 本轮只读检查，未执行生产升级 |

源码、镜像可以按步骤晋级；数据库、缓存、会话、测试身份和私有 env 不跨环境晋级。不同环境配置始终显式提供，失败禁止回退生产。

## 1. 本地与 CI 使用同一检查入口

仓库 `.nvmrc` 声明 Node 24，`package.json.engines` 限定 24，CI/Docker 同为 24 主版本。本机已通过 Homebrew 安装 `node@24`，保留原 Node 22；不要把其他项目的全局环境改掉。本项目执行：

```sh
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
node --version
pnpm install --frozen-lockfile
pnpm check:delivery
```

使用 nvm 的机器可先 `nvm use`。`check:delivery` 会拒绝其他 Node 主版本和私有配置关闭域名/TLS校验、覆盖基础库/AppID，随后运行类型检查、全量测试、构建、客户端登记回归和三个环境的隔离启动测试。

GitHub Actions 已改为同一入口，但本轮尚未提交/推送并运行远端 CI，不能把本地成功称为远端 CI 成功。当前工作区还有此前任务的未提交改动，提交时必须审阅完整依赖，不可只提交一个引用了未跟踪文件的工作流。

## 2. 微信工具统一入口

```sh
MP_IDE_HTTP_PORT=56031 pnpm --filter @football-club/miniprogram-cq-talent devtools:automator:open
```

共享解析器优先 `/Applications/wechatwebdevtools-stable.app/Contents/MacOS/cli`，不存在才回退旧安装；`WECHAT_DEVTOOLS_CLI` 可显式覆盖。macOS/Windows 均能从最近的 `.ide` 标记读取端口；并行安装或端口变化时，以正在运行 IDE 的服务端口显式指定。输出的 Automator 端口才用于 WebSocket。不要把 IDE HTTP 端口当作 Automator 端口。

本次恢复了本机 `project.private.config.json` 的 `libVersion=3.17.3` 和 `setting.urlCheck=true`；修改前副本保留在 `/tmp/cq-project-private-before-channel-20260928.json`。私有配置不提交。模拟器截图仅是运行诊断，不是完整 Figma 或真机验收。

## 3. 非生产首次初始化只登记必要配置

正常服务启动只迁移自己的库，不自动播种。空库需要独立登记 club/app-client，否则 `/app-clients/resolve` 返回 404。先验证非生产卷和数据库归属、完成其自身 SQLite 一致性备份，然后在仓库或容器根目录执行：

```sh
node deploy/environment-isolation/bootstrap-client.mjs --apply
```

环境由已有运行配置提供：`FCM_RUNTIME_ENV=develop|trial`、`NODE_ENV=production`、专用 `DATABASE_URL`、公开 `WECHAT_MINIPROGRAM_APP_ID`。数据库必须已经存在、完成迁移且归属一致。脚本复用本次代码的公开俱乐部/客户端模板，以运行时 AppID 覆盖演示 AppID，只写 club/app-client；不创建任何用户、手机号、会话、训练、财务或外部连接。重复运行返回 `already_present` 并保留已有配置；身份冲突、归属冲突或 release 直接拒绝。

现有服务器可执行同一脚本，不需要临时改容器代码：

```sh
ssh -i ~/.ssh/football_club_codex -o IdentitiesOnly=yes ubuntu@43.136.114.225 \
  'sudo docker exec -i -w /app cq-talent-nonproduction-develop-1 node --input-type=module - --apply' \
  < deploy/environment-isolation/bootstrap-client.mjs
```

trial 显式替换为 `cq-talent-nonproduction-trial-1`，禁止指定生产容器。本次两个环境已登记，登记前备份分别在 `/opt/cq-talent-nonproduction/backups/20260928-client-bootstrap/{develop,trial}.sqlite`，权限 0600。

## 4. 凭据与测试身份是独立门禁

```sh
pnpm check:environments
ssh -i ~/.ssh/football_club_codex -o IdentitiesOnly=yes ubuntu@43.136.114.225 \
  'sudo docker exec -i -w /app cq-talent-nonproduction-develop-1 node --input-type=module -' \
  < deploy/environment-isolation/check-runtime.mjs
```

第一条仅做固定 HTTPS 目标的路由、客户端登记和拒绝检查；不携带真实令牌，不跟随重定向，不写业务数据。第二条仅检查非生产自己的库和凭据是否存在，输出布尔值/缺口；trial 同样检查。缺 AppSecret 或三角色身份时第二条必须退出 1，不能忽略后继续声称“体验就绪”。配置完整仍必须做真实微信登录与跨角色业务验收。

非生产私有配置使用 `/opt/cq-talent-nonproduction/private/develop.env`、`trial.env`，权限 0600、不进 Git。用户已确认现有 AppID `wx4c588cd106e520e0`，并单独明确授权复用服务器现有的对应微信登录凭据；已在服务器内选择性读取这两项并配置到非生产，没有复制整份生产 env、人员或会话数据。两个服务已用原镜像重建，配置检查全部通过。测试身份为用户本人一个账号兼任家长、教练、管理员。

真实 `wx.login` 登录码兑换在两个环境均通过；未获取手机号，尚未建立真实用户会话。接下来需用包含环境隔离配置的新体验包完成手机授权登录与业务验收。不能将配置就绪或模拟器登录码兑换等同于完整体验验收。

## 5. 同一制品逐环境推进

1. 审阅并提交完整变更及所依赖文件，记录 Git SHA；`check:delivery` 和远端 CI 通过。不得从当前混杂工作区直接宣称可发布。
2. 从该提交的干净检出构建 Linux amd64 镜像，使用 Git SHA 的唯一标签，记录源 SHA、镜像 ID/digest、构建日志；已有标签不覆盖。不打包私有 env、数据库或本地截图。
3. 使用 `deploy/environment-isolation/compose.nonproduction.yml`，显式传 `FCM_NONPROD_IMAGE`、两份私有 env 路径；先 `docker compose ... config` 审阅实际合成配置，不与根生产 Compose/override 合并。首次部署先运行 `data-init`，之后只更新 develop 服务。
4. develop 完成配置、登录、读写持久化、权限与环境隔离验收；将同一个镜像 ID/digest用于 trial，不能悄悄重新构建相同标签。
5. 小程序从同一提交用官方工具编译/上传，记录版本号、源码 SHA、官方包体结果；上传、选体验版、提审、正式发布是不同动作，逐项留证。API_BASE_URL 由微信 envVersion 自动选择，禁止手动把体验包改到生产地址。
6. trial 真机与三角色业务闭环验收后形成候选发布清单。生产数据库迁移、生产服务切换、微信提审/正式发布在正式授权与专用发布计划前停止，本轮不执行。

本轮没有构建新的服务器候选镜像，也没有上传/切换小程序版本。当前非生产镜像仍是 `cq-talent-api:trial-1224e07bf5f4`；已完成客户端/测试身份登记和经明确授权的私有微信凭据配置。

## 6. 故障和回退

- 任一门禁失败即停止该环节，保留证据；不得切回生产地址“临时跑通”。
- 部署前记录当前非生产镜像 ID 与专用 SQLite 一致性备份。失败时仅回退对应服务；如果新代码执行了不兼容迁移，不能盲目回退旧镜像。
- 不把生产备份恢复进测试。恢复非生产登记前备份只能在确认登记后无新增业务数据且停止对应服务后执行；有新业务数据时先审阅差异，不能覆盖丢失。
- 本轮观察到 SSH 偶发握手中断和 Homebrew 下载 TLS 中断；后续重试成功。对写操作必须先检查前一次结果，再决定重试，不能自动重复执行发布命令。

### 单账号测试身份配置记录

已在 develop/trial 各配置用户本人一个账号，membership 含 parent/coach/admin；仅创建用户、成员关系与家长/教练档案，未导入生产人员、学生或财务数据。运行时手机号不入 Git 或证据日志。操作入口 `deploy/environment-isolation/bootstrap-identity.mjs --apply`，需要 `FCM_TEST_PHONE` 和备份后设置的 `FCM_IDENTITY_BACKUP_ATTESTED=1`；重复配置保留现有资料，冲突或 release 拒绝。两服务已重启并核验权限配置。

小程序现有角色切换只有家长/教练，管理员属于后台；账号权限配置完成不代表后台页面或真实微信登录验收通过。AppSecret 配置缺口已按用户明确授权补齐；手机授权登录与完整业务验收仍待完成。


## 2026-10-09 后台浏览器接入增量（代码已验证，远端未配置）

新镜像包含后台静态文件和0030认证迁移。非生产每份私有env分别增加`BACKOFFICE_PUBLIC_URL=https://cqtc.pomi.tech/__env/develop/backoffice`或对应trial值，未配置则浏览器边界关闭。原有固定前缀Nginx转发保持，不伪造微信Referer，也不添加X-User-Id。后台API使用X-FCM-Environment、页面Referer路径和变更请求Origin校验；Cookie独立于小程序Bearer。

只有新版镜像已迁移自身非生产卷、备份完成后，才能用`node apps/api/dist/ops/provision-backoffice-command.js --apply`配置既有授权管理成员。通过stdin私密JSON传clubId/userId/username/password，设置FCM_IDENTITY_BACKUP_ATTESTED=1；不要在命令行、日志或Git中放密码。原账号重配必须明确--rotate；命令拒绝release，不创建身份或提升权限。实际配置后还要验证HTTPS登录、刷新、退出、权限撤销及跨环境拒绝。开发/体验密码与身份加密密钥分别配置，不能使用本地合成测试密码。

本地新后台仅有登录和五类只读业务列表，不是完整四模块后台。2026-10-09只读回查仍为旧trial-1224e07bf5f4镜像；不能根据本段描述认定已部署。
