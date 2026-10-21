# A. 优化后独立审计报告

2026-10-21。审计结果是**通过本轮自动门禁的修复基线，尚不能宣称产品稳定或可发布**。未发现本轮证据可确认的P0；P1实现缺陷已修，真实业务/真机与旧数据边界仍有明确阻塞。没有部署、上传、合并dev/master或开启下一功能周期。

## 范围和方法

起点干净 `feature/ui-batch-1-p01/c98c7c37`，基线 `70f26151` 后实有40提交、103文件、+4627/-745，见[逐提交清单](commit-history.md)。检查提交主题、涉及文件和累计实现/测试/模板变更；检查架构、权限、数据生命周期、接口失败、原生兼容与依赖。没有把旧审计22项或“40提交完成”当成独立验证结果，也没有逐个checkout运行40次。

权威需求52 REQ及DATA/STATE/MET、待决O表与69个ACC入口均用于覆盖映射；本轮只对重点风险补复现，不宣称全量ACC端到端签收。Figma在线读取P01/P08/C34；旧审计的18张画板证据仅为历史线索。本轮原生390×844合成渲染P08/C34，非375×812全量像素验收，后台未做新的浏览器交互验收。

严重度：P0=已发生的全面中断/严重安全数据事故；P1=核心写入/事实可信性或保护机制失效，交付前修复/隔离；P2=局部功能、集成或验证风险；P3=可维护性/文案小项。依赖库CVSS、未来产品优先级与本项目缺陷级别分开。

## 已修发现

| ID / 等级 / 确认方式 | 证据与影响 | 修复/验证/提交 |
| --- | --- | --- |
| A01 P1 确认缺陷 | `utils/idempotency.ts`原键由请求摘要+内存计数组成；重启/200项淘汰重回a1，可在服务端30分钟窗口重放旧成功，丢掉新业务动作。4xx重试也被旧拒绝缓存锁住；原回归可复现 | 随机新操作身份、按环境/会话摘要隔离并持久化未决键，终态单调、4xx消费。重启/淘汰/迟到失败/409回归；`dac0b19e` |
| A02 P1 确认缺陷 | request成功回调在非2xx且body=null时解引用payload.error，可能抛出而不settle Promise，保存状态悬挂；源码确认该分支会抛出；修复后新增502/null回归 | 防御错误体并统一reject；`utils/request.test.mjs`；`dac0b19e` |
| A03 P1 确认缺陷 | 私教偏好[]被“本机未初始化”推断成默认20时段；新设备可把教练明确空闲时间改写成虚假可约时段；原测试失败 | 服务端数组含空值为权威，不用本机marker造默认；单测与C34原生空态；`787f0cef` |
| A04 P1 确认缺陷 | 课前撤假删除training record/history并重置revision，违背ATT-002且存在旧revision再次生效风险；原新回归失败 | 追加withdrawal历史并单调revision，恢复先前人工事实/自动待记；SQLite reopen、过期写拒绝、到课自动计次、前端待记文案；`32b1509f` |
| A05 P1 确认缺陷 | server原keyGenerator对任意Authorization哈希分桶，伪造/轮换头可不断取得新匿名额度；旧测试甚至以假token验证分桶 | 只有SessionRegistry验证有效会话才分桶；登录和伪造头按IP。`api-hardening.test.ts`轮换假头第三次429、真实会话独立；`a9900001`。初始login复现探针超时，不当作可利用证明 |
| A06 P2 确认缺陷 | growth将队伍教练点评evaluations.length叫“已确认测评”；两种业务事实不同 | 暂显“—”，不造数；真实聚合仍是G02未实现要求；`4769069f` |
| A07 P2 确认规格偏差 | metric把全俱乐部指标均值叫“同队”，growth/radar也显示同伴轮廓；PAR-004要求无正式标准仅看个人历史 | 删除错误对比展示/额外请求并阻止详细雷达接收同伴基准；已有后台标准不删除，G03另行接入；`4769069f` |
| A08 P1兼容风险（非本轮原版复现） | home新增Promise.all参数解构，与10-14本机增强编译arrayWithHoles缺失的已记录模式相同；Node测试无法排除原生失败 | 等价索引读取；本轮官方清缓存auto成功。风险规避，不能称原版故障已在本轮实测；`617c2065` |
| A09 P2依赖风险（上游已确认、项目利用未证实） | 初始生产审查31 advisory条目：23high/8moderate。并非31个可利用应用漏洞 | Fastify5.12.7、find-my-way/fast-uri/brace-expansion兼容更新；pro-layout精确依赖定向覆盖path-to-regexp8.4.0；`68921a8d`。最终0high/0critical、1moderate，冻结锁安装/完整测试/构建通过 |

对应源码在 `apps/api/src/{server,application/training-records,routes/training-record.routes}.ts` 与 `apps/miniprogram-cq-talent/{utils,pages}`；提交保留逐根因diff和回归测试。[版本报告](version-consistency.md)列可重现入口。

## 剩余事项及影响

| ID / 状态 | 等级 | 证据、影响与后续 |
| --- | --- | --- |
| B01 验收阻塞 | P1发布门禁 | IDE本轮恢复的是开发者登录，运行小程序仍在业务登录页；历史审计有空业务样本。未完成真实家长/教练写入及跨端数据闭环，也未重新验收线上环境。按G01提供授权非生产样本后验证，不宣称代码稳定 |
| B02 隐私/真机阻塞 | P1发布门禁 | 自定义隐私代码及单测存在；后台声明、首次授权/拒绝/重试、最低基础库和真实手机未验收。按G06留证 |
| R01 退出未撤销会话（确认） | P2 | 服务端session/logout存在，但parent/account、coach/account、coach/me只清本地；旧token至过期前可能仍可用。G07串接并回归 |
| R02 依赖剩余告警（确认存在，当前调用不受影响） | P2 | ExcelJS4.4.0→uuid8.3.2：GHSA-w5hq-g745-h8pq只涉及v3/v5/v6带输出buffer；检查到ExcelJS `cf-rule-ext-xform.js`只调用v4，无本项目直调受影响方法。保留风险，不强制跨major覆盖依赖；升级ExcelJS或新增uuid使用时重审 |
| R03 旧数据边界（待实际数据核查） | P1上线阻塞 / 未证实受影响数据 | 旧历史无action；若已有自定义原因请假，无法无歧义恢复请假前人工事实；过去已经删除的历史也无法由代码还原。上线前统计受影响记录，人工核对/受控迁移，禁止猜原因自动修数据。本轮没有访问生产数据库 |
| R04 记录/参与状态原子性（疑似） | P2 | leave路由先compareAndSave再recordEventParticipants，无同一业务事务的显式包装；后半写失败可能分裂。尚未故障注入复现，需加入失败回滚验收，不宣称已发生损坏 |
| R05 服务端同键并发（疑似） | P2 | 请求缓存重放不是通用并发执行锁；客户端未决键保留也有30分钟/200条/存储失败边界。针对非天然去重业务做并发和丢响应测试，再决定是否修复，不扩大为分布式锁项目 |
| R06 类型和维护债务（确认） | P2/P3 | Page过渡重载ThisType<any>、skipLibCheck及文本匹配测试使“类型通过”不等于完整页面类型安全；app-client.routes.ts较大。按触及页面收敛，当前不无关重构 |
| R07 平台检查限制（确认） | P2 | report-only检查5项：4条login路径前缀比较误报，1条原始预算1.72MiB>1.50MiB预警。前缀并非实际navigateTo目标；未发现这4项对应的未注册导航。原始预算不等于官方2MiB包结论 |
| R08 性能/后台UI（未验证） | P2 | 未获得真机cold/warm、Audits、大班压力、后台全工作流浏览器结果；没有足够同条件样本证明优化性能提升。构建成功不替代这些证据 |

G08多孩子抬头、G05设计差异与其余产品未实现/歧义详见[矩阵](product-gap-matrix.md)。没有把未测风险伪装成确定缺陷。

## 验证结果

| 检查 | 基线c98c7c37 | 最终代码68921a8d |
| --- | --- | --- |
| Node / pnpm | 24.21.0 / 10.33.0 | 同版本 |
| `pnpm check:delivery` | exit0；952通过/1跳过 | exit0；964通过/1跳过（domain38、API250、mini674、backoffice2） |
| 额外脚本/启动 | 9脚本通过，3启动检查通过 | 9脚本通过，3启动检查通过 |
| 构建与类型 | domain/API/backoffice build、各包typecheck通过 | 同；最后radar修正后又跑mini完整674和typecheck通过 |
| lockfile | 原锁可运行 | `pnpm install --frozen-lockfile --ignore-scripts` exit0；实际构建通过，未启用新的依赖安装脚本 |
| prod audit | 23high/8moderate | 0high/1moderate；非零exit因保留UUID告警，非“审查零告警” |
| native | 非独立旧截图不算本轮 | clearCompileCache成功→官方CLI auto exit0→SDK3.17.3运行→P08/C34合成读回；控制台error过滤为空 |
| git patch | 起点干净 | 隔离提交后干净；最终文档SHA见回执 |

跳过项为Windows专属窗口枚举测试，在macOS条件跳过。仓库没有独立lint命令，不声称lint通过。原生CLI自身有punycode弃用警告；pnpm有既有peer警告，完整构建通过但不称依赖图无任何警告。原生fixture首次因连接超时失败，核查未安装替身后重试成功，finally恢复所有替换函数；未写业务数据或身份存储。

完整临时日志路径及SHA256见[evidence.json](evidence.json)。持久化结论在本报告；本地/tmp原始日志可随系统清理，不能作为唯一长期证据。

依赖结论来源：[Fastify异步校验公告](https://github.com/fastify/fastify/security/advisories/GHSA-667r-xxjv-c9mm)、[Fastify错误URL公告](https://github.com/fastify/fastify/security/advisories/GHSA-p68q-wchp-6fh7)、[UUID方法边界公告](https://github.com/uuidjs/uuid/security/advisories/GHSA-w5hq-g745-h8pq)。Fastify前两项分别依赖async schema/受保护not-found handler，未把包命中自动认定项目鉴权已被绕过。

原生合成视图留证：[P08成长页](evidence/growth-synthetic.png)、[C34空时段](evidence/private-empty-synthetic.png)、[安装/页面断言/恢复回执](evidence/native-visual.json)。图片上的“审计样例”与24次训练均为夹具，不能解读为真实学员或环境数据。

云端复验：[GitHub Actions 39525813291](https://github.com/haokun3127/football-club-management/actions/runs/39525813291) 已success，SHA为 `68921a8d759501a0a26456f25373c543b5d74b2e`，包括Ubuntu冻结锁安装、完整delivery门禁。最终文档/日志提交的本地重跑与SHA见独立最终回执，不把这次运行冒称最终元数据提交的云CI。
