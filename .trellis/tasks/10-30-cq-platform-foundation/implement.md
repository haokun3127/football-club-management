# CQ-00 平台边界与部署制品执行

2026-10-30：已批准，待冻结基线后实施。Node24、仓库锁定pnpm、GPT-6.1-sol。

- [x] 读回worktree/HEAD/脏状态，激活本任务；使用trellis-before-dev读取相关规范。
- [x] 先核对运行环境、认证、制品及现有发布脚本。完成镜像和初始化隔离、制品记录、健康/客户端版本回读；同步 schema/OpenAPI。公共 UI/API 无必要不制造新抽象。提交 CQ-00 后报告接口、SHA 和证据；后续后台优化由总控安排。
- [x] 只更新 develop 不影响 trial/release；镜像配置、构建标识、旧响应兼容、缺失元数据行为；API/后台类型与相关 API/脚本/构建启动测试。
- [x] 审查diff、记录实际证据与缺口，独立提交并报告SHA。
- [ ] 总控固定版本审计、集成及跨端/环境验证。

不得自行push/deploy/微信上传。只更新本任务记录；父任务、B6、共享specs由总控负责。规范建议返回总控，不覆盖他人修改。

## 证据与续接

2026-10-30 / `/Users/dongjun/.codex/worktrees/0e3e/football-club-management`：干净 detached HEAD 6a71669f，按授权切至 `codex/cq-platform-foundation`，冻结起点 41f615d7；已 task.py start。直接实施/检查，不派子代理。

实施顺序：
1. 拆分 develop/trial 镜像与初始化服务；release 去除运行时构建/latest；提供显式单环境启动命令及 Compose 回归。
2. 在服务镜像内固化白名单构建元数据；health 保留 status/service，新增 build（缺失为 null）和可选 environment；schema/OpenAPI 同源；客户端公共版本读取支持旧服务。
3. 提供从固定 Git 提交构建/打包的入口、后台及迁移哈希、关联两个发布单元的制品清单；上传回执未知时保持空值，不制造官方构建证据。
4. 相关测试、全量 API/类型及构建/隔离启动、diff 审查；按可验收小批提交。Docker daemon 与官方上传如不可用如实标待验。

已读 trellis-before-dev/check/update-spec（主目录 ignored .agents/skills，只读复用）、API environment-isolation/quality/directory/database/error/logging、miniprogram 配置规范与2026-10-14官方版本留档。无页面或视觉改动；共享 specs 的7节合同建议留本任务交总控。

### 批次1：环境启动边界
- release Compose 只引用 FCM_RELEASE_IMAGE；nonproduction 分为 FCM_DEVELOP_IMAGE/FCM_TRIAL_IMAGE，各自 init 只挂自己的卷。
- start-environment.mjs 默认仅输出安全计划；--apply 才执行，先定向 run init，再 up --no-build --no-deps --pull never 单服务。启动不构建、不自动拉取、不读写别环境数据。
- 2026-10-30 `PATH=/opt/homebrew/opt/node@24/bin:$PATH node --test scripts/delivery/start-environment.test.mjs`：2/2 通过；使用真实 Docker Compose v5.5.1 渲染但不启动容器，验证 develop 变更后 trial 配置完全一致、独立卷、digest 拒绝及定向命令。
- Docker daemon 访问尚未验证；未部署。

### 批次2：安全版本回读
- GET /health 保留 status/service，增加 build: {sourceRevision,buildId,builtAt} | null；配置运行时另有 environment；no-store。只读镜像内 apps/api/build-metadata.json 的白名单，不输出凭证/路径/任意env。缺失或损坏元数据为null。OpenAPI复用同一响应schema，新增字段保持可选以描述旧合同。
- 小程序 utils/version.ts 的 getClientVersion() 同步读取平台 version 与本包 stamped build；getServiceVersion() 显式读取health，旧服务字段缺失为null，显式环境不一致抛错。没有页面改动或额外初载请求。
- 2026-10-30 Node24：API build-info/server/environment-isolation 3文件74项通过；小程序版本4项通过；已有 localhost smoke 在沙箱内EPERM，正以授权监听重跑。

### 批次3：固定提交制品与清单
- 新增固定 Git 提交导出、服务器独立构建、客户端暂存打包与双单元清单。Docker 镜像固化版本文件、后台及迁移文件哈希、锁文件哈希和 OCI 标签；不将 local image ID 误当 registry digest。候选元数据只由镜像回读。
- 公共接入/操作合同见 deploy/environment-isolation/DELIVERY.md；共享spec七节建议见本任务 spec-handoff.md，交总控落地。
- 2026-10-30 Node24/pnpm10.33.0 `pnpm check:delivery` 全门禁通过：domain47、后台4、小程序691通过/1既有skip、API266通过；所有包类型/构建通过；Node脚本14通过；三环境临时独立启动无seed、显式初始化及错误配置拒绝通过。原始日志 /private/tmp/cq-platform-check-delivery.log；精简结论持久保存在此任务。授权localhost重跑小程序version/environment14通过，API与小程序类型单独通过。
- 脚本5项覆盖真实Compose、固定提交不带脏文件、写入实际文件哈希、双单元清单及坏输入。补充检查物理volume名，防止逻辑volume别名映射到其他环境卷。
- 下一步：以本批提交构建本地候选镜像，网络禁用/无数据卷容器回读版本与模块加载。未push/deploy/微信上传，线上及真机仍待总控。

### 镜像与最终审查
- d1805cfebbf127b3c445bf4d5459cc4030bef535 从固定Git导出实际构建成功；local image ID及本地RepoDigest为 sha256:9408b8e5805a3b6a9368f30743562465a99dc26977cd27b28aca654aed37dca6，tag cq-talent-api:cq00-d1805cfe；未推远端。镜像自带 buildId cq00-d1805cfe。
- 禁网、只读、零数据卷、cwd /app/apps/api、UID1000 容器成功加载模块与注入 /health；版本吻合，7后台资源/45迁移逐文件hash及汇总hash吻合。
- 实际prepare-miniprogram与create-manifest链路通过；client buildId cq00-client-d1805cfe。reportedPlatformVersion/uploadReceipt仍为null。
- 最终审查发现manifest若传缺失builtAt会由工厂默认值补造时间；改为身份验证必须显式时间，仅构建/暂存时创建时间。另拒绝空回执及不支持元数据的旧客户端提交。新增附近坏输入断言，脚本5/5重跑通过。接下来以修正后的提交再次生成候选；API/客户端运行时代码未变，不重复无关全套门禁。

### CQ-00收尾与总控兼容修正
- 按总控明确现有镜像无registry流程，startup/manifest支持本地内容寻址sha256 ID与可选repository@sha256。字段分离imageReference/imageId/repositoryDigest；本地模式repositoryDigest=null，不新增registry或push。start命令只读inspect实际本地ID；不匹配拒绝。
- 修正后脚本5/5通过，真实Compose直接以sha256:61e2b2002f8a7c716508a5aa2ef6537b653ea6350e87fd84a1a7b8d93b41c655运行pull never；禁网/只读/零卷/UID1000回读与逐文件hash通过，容器--rm已退出。实际本地ID模式manifest生成通过。
- 最终运行时制品来源b51bfbb3cb85e1bba2070de50235e7e4e78e11aa，buildId cq00-b51bfbb3 / cq00-client-b51bfbb3；源码后续变化目前只在交付工具的本地ID兼容与记录，不改该镜像API/后台运行时代码。
- CQ-00代码完成，待总控集成和真实develop切换/角色流/微信构建验收；本任务不归档。未部署任何环境，trial/release真实服务未触碰。
- 后续新指令：暂缓CQ-23，追加三个正确性修复，独立提交：同时间测评更正排序、课堂表现整批原子性、课堂表现revision并发与旧客户端安全拒绝。实施合同另见本任务correctness-design.md，保留CQ-00可独立集成。

### A02独立修复
- 从真实保存/发布审计探针移植期望正确结果的回归，先失败：growth latest100而非60；内存同毫秒也取旧ID。
- 仓储同occurred_at按created_at、SQLite追加rowid倒序；内存按同等发生/记录/追加顺序输出，getStudentMetrics复用canonical顺序，避免按无补零ID猜时间。没有改分、删除历史或改变草稿可见性。
- Node24 `vitest run test/assessment-record-order.test.ts test/assessment-workflow.test.ts test/assessment-workflow-repository.test.ts`：3文件21通过，覆盖9901→10000、精确同毫秒、文件重开、100→60确认后真实家长GET、修订未确认仍旧值。API typecheck通过。

### A03/A04 原子保存与并发合同
- 先跑6项期望正确行为的测试全部失败，确认后行非法400/数据库故障500时前行已落库、两个快照静默覆盖、旧写仍200。
- 新迁移0046保存事件级revision；GET单SQL快照/no-store；PUT全部行先校验，事务队列内CAS与全批写入，失败回滚。旧无版本请求在幂等hook前428，零存储改动。
- 准确公共签名、升级例外和响应未知重试规则见classroom-client-contract.md。无新增业务requestId；沿用request生成的幂等key，原payload+expectedRevision重试；缓存过期仍由CAS阻止覆盖。
- 定向API batch/persistence/server 3文件81项通过；最新batch再补真实第二教练身份，6项通过。公共API/request/课堂运输3文件48项通过；API与小程序类型通过。
- 后续按总控新指令：CAS独立提交后，在现有后台账号入口提供安全版本信息，并新增小程序公共version-info折叠诊断组件。只显式展开/刷新读取服务版本，角色pages由各自owner注册，不新增路由。随后跑当前整包交付门禁和实际UI渲染。

### 共享版本诊断与后台入口
- 小程序组件components/version-info/index已实现，无props/业务写入/新路由。默认折叠、仅展开刷新读取；安全未知/重试与关闭卸载generation保护。接入见version-diagnostics.md，角色pages由各自owner注册。
- 后台账号区版本按钮/Modal已实现；区分本次HTML加载时bootstrap构建与显式health服务构建，白名单/no-store/不带cookie，不新增页面路由。沿既有AntD、TDesign和UI tokens。
- 当前完整pnpm check:delivery通过：API274、domain47、后台8、小程序698通过/1既有skip；所有类型/构建、14脚本及三临时环境启动通过。日志/private/tmp/cq-platform-final-check-delivery.log，持久证据摘要在此。
- Playwright Chromium真实cookie登录disposable synthetic fixture；初载health=0，打开/503模拟/重试后health=3，CSP事件=[]。1440/1024截图已直接查看，document overflow=false；额外长79字符buildId/完整SHA在1024对话框无溢出。截图research/version-*.png；错误响应仅此本地浏览器mock，重试恢复实际本地health，未触碰真实服务。
- 原生小程序画布未在worktree导入；控制器/模板8项通过不等于真机。后续总控主目录做原生接入。CQ-00 b51镜像不含正确性/版本UI，不是集成最终制品。

### CQ-23窄修（独立提交，原生/最终浏览器复验待安全修复后续接）
- 已生成29资源与既有权限映射cq23-resource-map.md，保留四业务模块及所有leaf keys。
- 真实cookie fixture：建立一个合成任务，工作台显示1人待处理；从“查看任务”真实深链进入，模拟503后抽屉只有“请重试”而无动作（research/cq23-task-error-before.png）。任务列表/工作台入口及对象标题本已有，不改写。
- 只在无detail的读取失败态为同一readTarget增加“重试读取任务”；不为保存/发布失败自动重读或重发。当前pnpm check:delivery已全部通过（API274/domain47/后台8/小程序698通过1skip，类型/构建/14脚本/三临时环境启动通过）。后台窄修实际重建后的按钮点击复验待安全优先项结束后继续；不得将此状态冒充全量CQ23体验验收。
- 总控新增安全优先项：现有HTTP幂等回放早于认证与动作授权，撤销token后可能回放成功响应；需覆盖当前幂等写入范围、有效重试/环境/428/CAS不回归。另需修正offset/Z发生时间的SQLite排序。此两项优先，后续再完成CQ23浏览器复验。
- 两次disposable fixture已停止，临时库/随机凭据随fixture清理；隔离浏览器当前仍开着，仅用于后续本地复验。

### A02 offset时间修正
- 第三轮正确断言在本分支先失败：10:00+08(02UTC)的70分排在03UTC新课80分前。
- SQLite仅按rowid提供稳定追加顺序，再由与内存共用的Date.parse比较器按occurredAt/createdAt实际瞬间排序；不依赖ISO字符串或ID字典序，也不引入SQLite/JS解析器差异。
- assessment-record-order/workflow/workflow-repository 3文件22项通过；覆盖offset混用、真实课程保存/确认/家长GET、offset库重开、同毫秒、十进制ID边界；API typecheck通过。

### HTTP幂等重放授权修复候选
- 修复前两个独立探针均重现200越权缓存回放；修复后撤销Bearer为401，移除课程教练授权为403。全局preHandler仅准备指纹，缓存读/重放移至各handler现有身份、角色、对象授权之后；onSend仅记录已到授权检查点的响应。
- AST枚举53个非后台变更路由注册：48个授权后检查点；4个明确opt-out（登录一次性证明、WPS签名nonce、既有scout自然身份、既有临时名单）；1个退役课时接口认证后410且不读写缓存。后台继续使用既有独立合同。批量发布重放重查当前可编辑/学员范围，模板应用重查所有目标课程计划权限。
- API typecheck、diff check通过；定向6文件101项通过。新增非课堂课时账本对照：正常同key仅入账一次，撤销管理员角色后403且账本不变；原课堂旧版428零写、CAS/回滚、响应未知重试保留后续95分、环境与比赛重试测试均通过。
- 用户明确禁止子代理，安全边界调查与候选绕过/兼容性审查在本chat分两遍自行完成。总控固定SHA独立审计仍是发布门禁。完整API测试运行中，随后补最终交付门禁与CQ23点击复验。
- 保留证据由Codex Security工具写入 /Users/dongjun/.codex/state/plugins/codex-security/scans/football-club-management/artifacts-a14b4a62423579f8d115e7711b9cd487403a0b3764b6798568833d2f33ccea43/artifacts/ ：before.log、focused.log、route-inventory.mjs/txt、replay-review.md。无推送、部署或环境切换。
- 补充候选：模板preview的缓存targets也逐项检查当前canPlan，防止来源仍可访问但目标授权已移除时泄露旧目标列表；定向2文件7项通过（新增目标范围撤销探针+正常重放对照），API typecheck通过。入口表见research/idempotency-entrypoints.md，包括登录/WPS等独立重试合同。
- 第一次完整API运行279项通过、2项仅因沙盒listen EPERM失败；升级至允许本机端口后完整check:delivery通过（API281、domain47、后台8、小程序698通过1skip、全部类型/构建/14脚本/3环境）。因preview补测发生在该轮测试收集之后，最终候选再跑一次门禁。

### 冻结交接与CQ23浏览器复验完成
- 本轮运行时代码冻结SHA：2a7bf9a58e84ed8c7c5039f85d007857b4b10ee0（含8b50f7ed通用修复）；其后仅任务记录/截图，无未提交产品代码。时区修复8a7e7f95、CQ23窄修c35755b3已由总控集成。
- 最终候选第二轮check:delivery：全部类型通过；domain47/后台8/小程序698通过1skip，API280通过、2项5秒超时（environment-isolation的valid session环境伪装探针、backoffice-management服务跨重开），无断言失败。未提高超时；与总控同时运行全量有本机争用线索，已结束并暂停全量复跑，交总控串行最终门禁。最终日志已由Security工具保留final-delivery-gate.log。此前完整门禁通过+最终preview范围定向7项/typecheck通过，不将本轮超时写成全绿。
- CQ23真实隔离Chromium/cookie/合成fixture验收完成：工作台“查看任务”→同taskId深链；仅浏览器模拟503→稳定可见“重试读取任务”；解除mock点击后只发同一taskId GET，恢复CQ23任务标题、U10队伍、周期、学员李明，错误动作消失，1024宽无document横向溢出。证据research/cq23-task-retry-error.png、cq23-task-retry-recovered.png，均直接看图核验。
- 额外既有对象工作流：从工作台“查看资料”进入学员档案，身份/出生日期清楚；修改合成教学备注，关闭→继续编辑保留输入；模拟503保存仍保留输入，解除mock重试实际保存，重开同学员回读备注；操作历史显示王管理员与备注从空值到新值。research/cq23-profile-save-error.png（保留输入）、cq23-profile-history.png（回读历史）已看图。此流程无需产品代码调整。覆盖29资源映射及这两条真实路径，不冒称29项全量人工验收。
- fixture进程已停止，临时数据库和随机凭据已清理；本任务隔离Chromium已关闭。没有push、真实服务写入、部署、环境切换或微信上传。原生小程序canvas仍由总控主目录验收。

### 最终审计P2：固定任务名单创建重放
- 总控明确授权冻结后一次最小修复：同key创建成功后学员退出现实时队籍，原任务固定名单仍可读，但重试被首次创建资格校验400拦截。原始探针/tmp/cq-audit-42d5ca75/apps/api/test/independent-replay-scopes.test.ts；本分支新增显式/默认/来源课程名单三种回归，改代码前均在重试201断言失败（实际400），日志/private/tmp/cq-task-replay-before.log。
- 只移动创建测评任务的replay检查点：仍在当前身份/client/角色、active授权队伍和partial-project功能开关之后，移至首次创建的动态名单/来源课程资格校验之前。未改变固定名单、schema、缓存key/TTL及其他路由。新key创建仍按实时资格400，移除助教队伍授权后原key仍403且任务数不变。
- API typecheck通过；idempotency-authorization/assessment-workflow/training-content-assessment-batch/training-templates定向4文件32项通过，日志/private/tmp/cq-task-replay-after.log。入口表已更新；完整API将单worker串行运行，避免多路全量争用。主目录最终交付门禁与镜像仍由总控负责；此前42镜像不作为本修复后制品。
- 当前运行时代码冻结SHA：b8a2a844cb09be0819ba99658a1329d476758523。`corepack pnpm --filter @football-club/api test --maxWorkers=1 --no-file-parallelism` 完整API串行49文件285项全部通过，123.17秒，原5秒默认保持不变，退出0；日志/private/tmp/cq-task-replay-api-suite.log。类型/定向/完整包检查及diff review完成；根目录全量和不可变制品由总控对集成SHA验证。此后只补本任务验证记录，无未提交产品变更、无运行中测试、无部署/环境切换。

### Linux CI发布拓扑渲染兼容性窄修
- 总控授权修复集成74f3a0e5的GitHub run40932346885/job123653775513交付测试失败；全包测试/构建已通过，唯一失败是start-environment.test.mjs发布拓扑渲染status1。CI日志/private/tmp/cq-74f3a0e5-github-ci-failed.log；完整job日志保存/private/tmp/cq-74-ci-complete.log（未输出原始配置）。runner为ubuntu-24.04，image20261025.353.1；该镜像软件清单链接当前404，未声称核实CI精确Compose版本。
- 根因复现：本机Compose v5.5.1原测试通过；官方Linux Compose v2.40.3支持--no-env-resolution，但同一发布config命令仍检查必需.env.runtime存在，因文件缺失status1。只输出status/错误分类，不输出渲染配置或原始错误。官方源码参考https://github.com/docker/compose/blob/v2.40.3/cmd/compose/config.go；原参数不承诺跨版本跳过文件存在校验。
- 只改scripts/delivery/start-environment.test.mjs：原始root docker-compose.yml逐字节复制到owned临时目录，在该目录写入合成.env.runtime，再用普通config --format json完整解析，沿用startPlan全部release隔离校验。生产根目录私密文件未读写。检查合成字段确实被加载、输出plan不带该字段；移除合成env后同一拓扑必须失败。未修改发布Compose、启动程序、CI校验强度或实际部署。
- Node24本机Compose v5.5.1定向2/2通过；固定官方compose-bin摘要sha256:e39da8206cc48c6e2c99ce371935eef9d7eff7db600a993fd357de8b75621edf，使用--platform linux/amd64、--network none、仓库/临时目录只读挂载，通过临时命令适配器运行同一原始测试，2/2通过（7.76秒，日志/private/tmp/cq-compose-v2-delivery-tests.log）。无业务容器、端口或Docker socket挂载；适配器/临时输入已删除。
- CI失败所在完整命令 `node --test scripts/delivery/*.test.mjs scripts/devtools/automation-session.test.cjs deploy/environment-isolation/bootstrap-client.test.mjs deploy/environment-isolation/bootstrap-identity.test.mjs` 本机14/14通过，日志/private/tmp/cq-compose-native-delivery-tests.log；git diff --check通过。业务包/产物代码未变，未重复全仓测试。GitHub修复SHA实际CI重跑仍由总控集成后完成，无push/部署/环境切换。
