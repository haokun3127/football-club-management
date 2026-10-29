# CQ 独立合同审计

日期：2026-10-30（香港时间）。本报告只覆盖指定三条路径及指定提交；没有全站扫描、代码修复、push、部署、微信上传或真实业务库写入。

## 审计版本与方式

- 基线：`41f615d7a969770d985e8644356362cae5b67703`。
- 只读工作区：`/Users/dongjun/.codex/worktrees/050c/football-club-management`，分支 `codex/cq-independent-audit`。开工和结束时 Git 工作区干净；没有产品代码或任务/spec 修改。
- 变更审计：coach `cc99d21255e51762c55210f0e9a4202b40cc88de`；parent `445d4ed57a8ce52944764004fd370a6d7e27c2fd`（含 `0a304867e1e488297e260dbc6c8342d4c3a6e8ad`）；platform `d1805cfebbf127b3c445bf4d5459cc4030bef535`（含 `28de77fe3115c5eb9809c0179b2c4bc4d25cd504`、`a7578fa8f201ade67b3125b78e4710a66af2f7df`）。
- 使用 `git show/diff` 审查。`/tmp/cq-audit-41f615d7` 是 git archive 基线副本；`/tmp/cq-audit-changes` 是基线加上述指定提交文件的合成验证副本，**不是声称已存在的集成 SHA**。
- Node：`/opt/homebrew/opt/node@24/bin/node`。只复用主目录已安装依赖；API Vitest 配置将 `@football-club/domain` 显式别名到各自固定源码副本，避免误用主目录当前编译产物。合成身份与内存/临时 SQLite，没有连接业务库。

## 确定缺陷

### A01 / P1：课堂表现空分数被写成零分

基线文件：`apps/miniprogram-cq-talent/pages/coach/training-assessment/index.ts:246-248`；调用保存位置 `:173-184`。

触发：进入有训练内容、已到学员的课堂表现页，只填写某学员备注，不填写分数；或把已恢复的 84 分清空后保存。

原因及后果：`Number(value.scoreInput.trim())` 将空串转换为 0，通过整数/范围校验后提交。备注输入会创建该单元格，因此第一种情况也可真实触发。保存成功后，尚未评分被写成 0；清空会把原成绩覆盖成 0，并可进入家长课堂/成长投影。显式输入 `0` 应继续有效，空值必须保持缺失或明确阻止保存。

验证：在 `/tmp` 基线既有课堂表现测试上增加两个控制器探针；分别断言实际 API payload 为 `score:0`。共 8 项通过（原有 6 + 新探针 2）。日志：`/tmp/cq-audit-empty-score.log`；探针源码：`/tmp/cq-audit-41f615d7/apps/miniprogram-cq-talent/pages/coach/training-assessment/index.test.mjs`。

### A02 / P2：同一课程的更正发布在 ID 位数变化时仍被成长页取为旧结果

基线文件：`apps/api/src/persistence/assessment-repositories.ts:54`、`apps/api/src/store.ts:2752-2757`、`apps/api/src/routes/app-client.routes.ts:3981-3983`。IDs 由 `apps/api/src/store.ts:734-737` 生成无补零的十进制字符串。

触发：同任务同课程先发布 100 分，之后填写原因、更正为 60 并重新确认；新旧 metric record 的 occurredAt 相同，记录序号跨十进制位数边界。

原因及后果：仓储用 `ORDER BY occurred_at DESC, id DESC`，后续日期排序不改变同时间的字符串顺序，latest 按指标取首项。`metric-record-9901` 排在 `metric-record-10000` 前。实际探针的确认原始结果已是新版本 60，但家长 `growth-summary.latest` 仍是旧 assessment 的 100，造成同一孩子“确认结果”和成长页不一致。修订期保留旧结果是正确行为；这里是在重新确认成功以后仍错误保留。

验证：内存 SQLite、真实保存/发布服务、真实家长 GET。合成 seed 只将计数器起点设到 9900 以确定性覆盖自然 rollover；没有更改排序实现。结果：旧 ID `metric-record-9901`=100、新 ID `metric-record-10000`=60、家长 latest ID 仍为前者。结果文件：`/tmp/cq-audit-projection-result.json`。探针文件：`/tmp/cq-audit-41f615d7/apps/api/test/independent-audit.test.ts`；日志：`/tmp/cq-audit-http-probes.log`。

### A03 / P2：课堂表现保存整份旧快照，静默覆盖其他客户端已保存的数据

基线文件：`apps/miniprogram-cq-talent/pages/coach/training-assessment/index.ts:213-224,242-248`；`apps/api/src/routes/app-client.routes.ts:485-504`；`apps/api/src/persistence/training-content-assessment-repository.ts:34-39`。

触发：两个客户端读取同一课堂、同一学员两个项目（70、60）。A 将第一个项目改成 90 保存；B 只将第二个项目改成 80 保存。客户端 payload 仍包含所有已恢复的成绩。

实际结果：两次 PUT 均 200，B 的旧快照把 A 的 90 覆盖回 70，最终是 70、80；无 revision/冲突或逐项变化保护。自然键 upsert 能防重复行，但不能防丢更新。这与批准方案“多人冲突仍需保护”不一致。

验证：真实 Fastify 注入、持久化仓储、两个独立读取快照。日志：`/tmp/cq-audit-http-probes.log`；回读：`/tmp/cq-audit-concurrency-result.json`。探针与 A02 同文件。

### A04 / P2：课堂表现批量保存返回错误时，前面的行已经落库

基线文件：`apps/api/src/routes/app-client.routes.ts:485-504`。

触发：一次 PUT 中第一个单元格合法，后面的学员不再 present（例如页面打开后发生请假/名单变化），或后面的训练项目不再属于当前课。

原因及后果：循环逐条验证并立即保存，没有先全部验证或事务回滚。后续行失败返回整体 400，页面统一提示保存失败；前面合法行已经更改，接口没有成功/失败明细。用户无法从响应判断实际保存范围。

验证：真实 HTTP 发送第一行 50 分、第二行不在名单；响应 400 后 GET 第一行已是 50。`/tmp/cq-audit-http-probes.log` 中对应探针通过。

### C01 / P2：cc99d212 的旧课程链接遗漏合法周期任务

变更文件：`cc99d212:apps/miniprogram-cq-talent/pages/coach/test-entry/index.ts:27-28`。准确源码快照：`/tmp/cq-audit-changes/apps/miniprogram-cq-talent/pages/coach/test-entry/index.ts`。

触发：合法任务具有正确球队/日期窗口且服务端允许用当前课程录入，但 task 没有 `sourceEventId`（周期任务、历史任务均可）。从旧 `test-entry?eventId=...` URL 进入。

实际结果：现有 `getCoachAssessmentTaskOptions(sourceEventId,teamId)` 返回该任务；`AssessmentWorkflow.courses` 包含当前课，且相同任务已可成功保存/发布。但新解析器额外要求 `task.sourceEventId === eventId`，把它筛掉，显示“本课暂无可录入测评任务”。sourceEventId 是任务来源，不是所有可录入课程集合；它不等价于课程可用性。

验证：先用真实 HTTP 保存 options 响应到 `/tmp/cq-audit-legacy-options.json`，再原样送入新提交的原生控制器，复现 empty 且没有跳转。API 探针 2 项通过；控制器 6 项通过（既有 5 + 新探针 1）。日志：`/tmp/cq-audit-changes-http.log`、`/tmp/cq-audit-legacy-resolver.log`。这是 V07 修复的具体兼容遗漏，没有重复将原旧请求缺任务问题再列一条。

## 已核实的边界

- 当前课堂表现走 `GET|PUT .../training-content-assessments`，`PersistentApiStore` 的实现位于 `store.ts:2667-2674`，使用独立 SQLite 仓储；文件库关闭/重开回归通过。因此**不认定当前课堂表现因旧 SessionObservation 内存实现而重启丢失**。
- 旧 `SessionDelivery`/`SessionObservation` 的 store 方法是内存实现；旧 observation HTTP 路由仍存在，但本轮在当前原生与后台产品代码中没有找到调用。没有把“没有同名表”或“旧路由理论存在”扩大成生产课堂丢失缺陷。
- 保存草稿不生成新已发布指标、修订期间旧发布仍可见、发布幂等重试、409 保留本机草稿及显式重读，定向现有回归通过。
- 家长活动/成长的孩子切换迟到响应、页面卸载、旧 401 不清新会话，以及服务端角色切换门禁的定向现有回归通过；这不是对所有页面/所有账户切换做全量保证。
- `0a304867` 的首页拆读/孩子隔离、`28de77fe` 的启动计划/独立卷目标、`a7578fa8` 的安全版本字段，在此次指定范围未发现新的确定缺陷。随后增量审查 `d1805cfe` 的固定提交导出/制品哈希/清单关联，以及 `445d4ed5` 的家长详情计次文案/孩子参数与返回上下文；均未发现新的确定缺陷。制品工具本地测试通过不能代表实际镜像构建、版本烘焙和部署完成。
- A01-A04 在指定提交中没有被修改；合成变更副本中的 HTTP 探针也再次复现 A02-A04。

## 验证台账

使用 Node24 与现有 Vitest 4.1.9；以下只是各固定副本的定向检查，没有运行整仓 `check:delivery`。

1. 基线客户端：coach/event、assessment-bulk-entry、assessment-projects、training-assessment；parent/home、event、growth；utils/request：8 文件、133 项通过。`/tmp/cq-audit-client-baseline.log`。
2. 基线 API：assessment-workflow、assessment-workflow-repository、event-presentation、training-record-leave、persistence：5 文件、39 项通过。`/tmp/cq-audit-api-baseline.log`。
3. 角色 API：app-client-role-switch 4 项通过。`/tmp/cq-audit-role-baseline.log`。
4. 基线新增探针：客户端空分数 2 项、HTTP 2 项通过。探针断言的是已观察到的错误行为，**通过不代表业务缺陷已修复**。
5. 四提交合成客户端：coach/event、schedule、test-entry；parent/home；utils/version：5 文件、78 项通过。`/tmp/cq-audit-changes-client.log`。
6. 平台版本 API build-info：3 项通过。`/tmp/cq-audit-changes-api.log`。
7. 启动隔离 node:test：2 项通过。`/tmp/cq-audit-changes-start.log`。
8. 合成变更副本兼容探针：HTTP 2/2、旧链接控制器 6/6。上述日志保留。
9. `d1805cfe` 制品与启动测试：5/5；`/tmp/cq-audit-platform-d1805cfe.log`。包含临时 Git fixture、输出哈希与只读 Compose config 渲染，不执行部署。
10. `445d4ed5` 家长 event/controller 与 schedule/context：2 文件全部通过；`/tmp/cq-audit-parent-445d4ed5.log`。已由总控分配的全屏刷新和教练已确认任务主动作不重复列问题。

API 命令形式：
`/opt/homebrew/opt/node@24/bin/node /Users/dongjun/projects/football-club-management/node_modules/vitest/vitest.mjs run --configLoader native --config /tmp/cq-audit-41f615d7/api-audit.config.mjs <test files>`（cwd 为副本 apps/api；合成变更验证使用对应 config）。

客户端命令形式相同，不加载 API alias config，cwd 为副本 apps/miniprogram-cq-talent。启动脚本使用 Node24 `--test scripts/delivery/start-environment.test.mjs`。

## 尚未验证

没有真机/原生微信画布、键盘/大字/19与40人现场交互或性能测量；没有线上版本、真实负责人入口/登录、外部环境或真实业务数据回读；没有实际执行 Docker 启动/迁移/部署；没有审计指定提交以后的未提交修改或总控最终集成 SHA。以上测试不替代 B6 或最终交付验收。


## 供总控复核的精简探针命令

空分数探针的绝对路径：`/tmp/cq-audit-41f615d7/apps/miniprogram-cq-talent/pages/coach/training-assessment/index.test.mjs`。在 `/tmp/cq-audit-41f615d7/apps/miniprogram-cq-talent` 运行：

```sh
/opt/homebrew/opt/node@24/bin/node /Users/dongjun/projects/football-club-management/node_modules/vitest/vitest.mjs run pages/coach/training-assessment/index.test.mjs
```

排序、并发覆盖、错误前部分写入探针的绝对路径：`/tmp/cq-audit-41f615d7/apps/api/test/independent-audit.test.ts`。在 `/tmp/cq-audit-41f615d7/apps/api` 运行：

```sh
/opt/homebrew/opt/node@24/bin/node /Users/dongjun/projects/football-club-management/node_modules/vitest/vitest.mjs run --configLoader native --config /tmp/cq-audit-41f615d7/api-audit.config.mjs test/independent-audit.test.ts
```

C01 兼容探针：`/tmp/cq-audit-changes/apps/api/test/independent-audit.test.ts` 先生成真实合成 API options，再运行 `/tmp/cq-audit-changes/apps/miniprogram-cq-talent/pages/coach/test-entry/index.test.mjs`。分别用对应 cwd 和 `/tmp/cq-audit-changes/api-audit.config.mjs`；客户端不带 API config。所有新增探针断言的是已观察到的错误行为，通过不意味着缺陷已修复。
