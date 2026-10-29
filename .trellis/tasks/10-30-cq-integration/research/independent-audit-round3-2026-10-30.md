# CQ 第三轮独立只读审计

2026-10-30（香港时间）；目标固定 SHA：`7753a87a9d0693d7bfb4efcc4991b7917f20bca2`。

独立审计工作区 `/Users/dongjun/.codex/worktrees/050c/football-club-management` 从干净状态切到目标提交，结束仍干净。产品代码、任务与共享 specs 未改动；无部署、上传、push、真实业务库写入。目标提交用 git archive 导出到 `/tmp/cq-audit-7753a87a`；全部临时探针只在此副本或 `/tmp`。使用 Node24 和已有安装依赖，API alias 指向该固定副本的 domain 源码。

本轮仅验证已经完成的 A02、A03/A04 服务端合同/迁移/幂等/权限、C01、R2-01。正在接入的教练 CAS 页面、版本组件、成长打磨不作为未完成缺陷；本轮也不代表未来最终集成 SHA 验收。

## 确定问题 R3-01 / P2：幂等回放跳过当前会话和课程权限校验

定位：`apps/api/src/http/request-contracts.ts:36-55`。命中同 key/fingerprint 后直接返回保存的响应；该全局 preHandler 在 `apps/api/src/server.ts:119` 注册，先于 app-client 认证 preHandler（`routes/app-client.routes.ts:78-97`）及课堂 handler 的 `requireCoachEventAccess`。

已确证两条触发：

1. 有效教练 bearer 保存课堂成绩成功并建立幂等回执；撤销 token 后，用同 token、同 key、同 body 重试。该 token 的 GET 已 401；PUT 仍回放原 200。
2. 有权协作的助教保存成功；移除其球队任职后，GET 已 403；同 actor/key/body 的 PUT 仍回放原 200。

期望：回放前仍需通过当前认证及课程权限；上述请求应分别 401/403。实际两个正确断言均失败，实际都是 200。

范围与严重程度：这是已有 HTTP 回放机制在课堂新合同中的权限缺口，非“任意新请求可以写库”。回放并未重新写入成绩，需原身份信息、URL/key/body 相符且缓存尚有效；但在会话/任职已撤销后仍返回包含课堂成绩的成功响应，违反服务端当前访问门禁。当前角色旋转和成员降权未单独执行；不能将这两条证据扩展为已全量验证所有角色变化。修复只提前检查 bearer 仍不足以覆盖第二条课程任职撤销。

正确断言探针：`/tmp/cq-audit-7753a87a/apps/api/test/independent-round3-permissions.test.ts`。日志：`/tmp/cq-round3-permission-probe.log`（2/2 失败，期望 401/403、实际 200）。

在 `/tmp/cq-audit-7753a87a/apps/api` 执行：

```sh
/opt/homebrew/opt/node@24/bin/node /Users/dongjun/projects/football-club-management/node_modules/vitest/vitest.mjs run --configLoader native --config /tmp/cq-audit-7753a87a/api-audit.config.mjs test/independent-round3-permissions.test.ts
```

## 确定问题 R3-02 / P2：A02 新排序在混合合法 ISO 时区格式时退回旧课程成绩

定位：`apps/api/src/persistence/assessment-repositories.ts:54` 使用 `ORDER BY occurred_at DESC, created_at DESC, rowid DESC`；`apps/api/src/store.ts:2772-2776` 去掉原来的 `Date.parse` 排序，直接信任仓储字符串顺序。`listMetricRecords` 等其他读取同样使用仓储结果。

触发：正常建课 HTTP 接口 `POST /clubs/:clubId/admin/calendar/events` 可接受并保留以下两种合法时间：

- 旧课：`2026-10-01T10:00:00+08:00`，真实时间为 02:00 UTC，成绩 70。
- 新课：`2026-10-01T03:00:00.000Z`，真实时间为 03:00 UTC，成绩 80。

两次都通过真实测评工作流保存、确认，新课重新确认后，确认 raw 结果已是 80。SQL 文本比较却认为 `10:00+08:00` 大于 `03:00Z`，家长 growth latest 仍引用旧 assessment 的 70。单项目合法任务用于隔离该排序问题，没有混入综合分时间窗口假设。

期望：先按真实发生时刻排序，同一时刻再按记录时间/追加顺序；正确断言应取新 assessment 和 80。当前选择了旧 assessment，断言失败。原来的十进制 ID 边界和同毫秒更正回归通过，不足以证明全部时间排序正确。

正确断言探针：`/tmp/cq-audit-7753a87a/apps/api/test/independent-round3-order.test.ts`，测试名 `audit keeps latest chronological course when supported ISO timestamps use different offsets`。日志 `/tmp/cq-round3-order-probe.log`；具体时间与实际/期望值 `/tmp/cq-round3-order-result.json`。

在 `/tmp/cq-audit-7753a87a/apps/api` 执行：

```sh
/opt/homebrew/opt/node@24/bin/node /Users/dongjun/projects/football-club-management/node_modules/vitest/vitest.mjs run --configLoader native --config /tmp/cq-audit-7753a87a/api-audit.config.mjs test/independent-round3-order.test.ts -t 'audit keeps latest chronological'
```

这是对 A02 修复的兼容回归，当前正确断言失败；不要把该失败改成“接受旧值”的断言。

## 已通过的指定修复与边界

- **A02 原始问题：** 当前 `assessment-record-order.test.ts` 覆盖 ID 9901→10000、同毫秒确认、发布前旧值保持、发布后新值、文件重开及 memory store 顺序，2 项通过。R3-02 为额外合法时间格式边界。
- **A03/A04 批量合同：** 同快照两个真实教练 CAS 只允许一个成功；后行非法在任何成绩写入前拒绝；注入后行存储故障时所有成绩和 revision 回滚；失败后可恢复；相同已成功请求的正常有权幂等回放不覆盖后来更高 revision 的 95 分。缺 revision 的旧 PUT 428，且不裁剪/读取/写入幂等记录，不修改成绩。
- **GET 快照：** 行和 revision 来自同一 SQLite 查询，返回 no-store。PUT 比较、增 revision 和全批保存位于共享连接事务队列。代码及定向回归未发现混批/部分写入残留。普通权限仍由事件/角色范围检查，R3-01 是回放绕过该检查的例外。
- **0046 真实旧库升级：** 独立建立仅运行 0001～0045 的文件 SQLite，保存一条既有零分/备注/固定 ID/时间的课堂记录，再用当前正式迁移器升级。首次 GET snapshot 为 revision0 且既有成绩完全未变；首次 CAS 变 revision1；自然键原 ID、createdAt 保留；关闭重开仍 revision1/新成绩；旧 revision0 再写冲突。2 项独立兼容探针中的升级项通过。
- **C01：** 用真实 HTTP 任务 options 和各任务 courses 输出，经当前原生旧 URL 解析器处理，无 sourceEventId 的合法周期任务保持 ready、可明确进入。其他队伍、周期外、courses 不包含当前课、缺失/不匹配 sourceCourse 的负向既有回归通过。课程范围读取失败明确报错，未放开后端写入门禁。
- **R2-01：** 当前成长、新闻、展示均有单独 request 序号且成功/失败均校验。将第二轮原始成长重叠探针改为“旧响应返回后仍保留 new confirmed result”的正确断言，通过；未继续使用旧的错误行为断言。
- **领域清单：** 实际顺序执行 46 迁移后 105 表；JSON/Markdown 唯一覆盖，无遗漏、额外、重复或迁移哈希不符；新增课堂 revision 表归训练运营，两个运行时元数据仍独列。

## 当前 SHA 的执行证据

1. API 既有定向：assessment-record-order、training-content-assessment-batch、assessment-workflow、assessment-workflow-repository、persistence：5 文件 42 项通过。日志 `/tmp/cq-round3-api.log`。
2. 客户端既有定向：coach/test-entry、coach/event、parent/home、utils/training-content-assessments、utils/request：5 文件 108 项通过。日志 `/tmp/cq-round3-client.log`。
3. 独立旧库升级与 C01 HTTP options：`/tmp/cq-audit-7753a87a/apps/api/test/independent-round3-compatibility.test.ts`，2/2 通过。日志 `/tmp/cq-round3-compatibility.log`。C01 合成实际响应存于 `/tmp/cq-round3-periodic-options.json`。
4. 追加正确正向探针后的 C01/R2-01 两个原生测试文件：2 文件 57 项通过（与第2项部分重复，不合计成独立总数）。日志 `/tmp/cq-round3-positive-probes.log`。
5. 新缺陷的正确断言：权限 2 项失败；混合时间格式排序 1 项失败。只断言预期401/403/新成绩，不断言错误行为为正确。
6. 领域覆盖脚本 `/tmp/cq-round3-domain-coverage.mjs`；结果 `/tmp/cq-round3-domain-coverage.json`：46/105，全覆盖/唯一归属/哈希检查通过。

独立兼容项命令：同上述 API runner/config，改为 `test/independent-round3-compatibility.test.ts`。原生正向命令在副本 `apps/miniprogram-cq-talent` 中执行：

```sh
/opt/homebrew/opt/node@24/bin/node /Users/dongjun/projects/football-club-management/node_modules/vitest/vitest.mjs run pages/coach/test-entry/index.test.mjs pages/parent/home/index.test.mjs
```

领域覆盖：`/opt/homebrew/opt/node@24/bin/node /tmp/cq-round3-domain-coverage.mjs`。

## 未验证

未运行全仓 check:delivery；没有真实账户/库、真机或原生画布、软键盘、大字与现场规模/性能、实际迁移部署/镜像启动/微信编译上传。未做多进程/多 SQLite 连接压力验证，也不把单连接队列并发测试表述为该保证。未对尚未接入完成的课堂 CAS 页面、版本组件和成长后续改动下结论。等待总控新的最终固定 SHA 后再做最终窄回归。
