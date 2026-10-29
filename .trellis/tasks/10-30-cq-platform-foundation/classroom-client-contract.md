# 课堂表现公共客户端接入（A03/A04）

2026-10-30总控明确批准旧写调用的安全兼容例外。旧URL和读取继续可用；缺版本的旧PUT返回428，必须更新客户端、重新读取并核对后提交。禁止自动GET新版revision后重试旧快照。

## 公共签名

```ts
getCoachTrainingContentAssessments(eventId: string): Promise<CoachTrainingContentAssessmentScope>
// Scope 新增 revision?: number：仅为读取旧服务响应保留可选；本版服务始终返回非负整数。

saveCoachTrainingContentAssessments(
  eventId: string,
  assessments: Array<Pick<CoachTrainingContentAssessment, "studentId" | "trainingProjectId" | "score" | "note">>,
  expectedRevision?: number,
): Promise<{ eventId: string; revision: number; assessments: CoachTrainingContentAssessment[] }>
```

第三参数可选只为旧调用的类型兼容。缺失、非安全整数或负数在公共函数本地以precondition_required/428拒绝，零网络请求；服务端独立拒绝遗漏版本，不做幂等缓存读取/裁剪/写入。接口仍允许真实0分；空分数处理由教练页面负责人修复。

## 页面操作

1. GET得到的revision与本次展示的assessments一起保存。服务端快照读取no-store，revision和行是同一SQLite语句的快照。
2. 保存时传这个已读revision；200后采用响应revision。更新后仍只替换此次实际保存的行，其他旧输入不得偷偷视为新版本。
3. 409 `training_assessment_revision_conflict` 保留本机输入，显示“课堂表现已被其他客户端更新”；人工重读和核对后再提交。错误details中的最新revision只是冲突提示，不能直接拿来重发旧行。
4. 428 `precondition_required` 明确提示更新小程序并重新打开，重新读取后提交。GET旧服务缺revision时保持可读，但禁止写。

## 响应未知重试

无新增业务requestId字段。公共request已有 `X-Request-Id`（每次请求追踪）和 `Idempotency-Key`（操作重试身份），不能混用。helper为相同eventId、完全相同assessments数组、相同expectedRevision及相同会话/环境复用未决Idempotency-Key。超时/网络/5xx后保留原payload和原revision，明确重试同一操作；不要预先增加revision或重新GET后重发旧快照。改变payload会产生另一操作key，服务端CAS仍防覆盖。

正常成功的响应丢失后，同key重试回放原200结果（即使别的教练已保存更高revision，也不再执行写入）。本地/服务端幂等缓存30分钟/有容量边界；缓存丢失或过期后旧revision会409，仍不覆盖，需人工核对。不能宣称无限期离线exactly-once。首次收到确定HTTP结果后旧操作key消费；本地需要用响应revision发下一次新保存。

## 服务端合同与验证

GET返回`{clubId,client,eventId,selectedProjectIds,presentStudentIds,revision,assessments}`；PUT body `{expectedRevision,assessments}`，200返回`{clubId,client,eventId,revision,assessments}`。整批先验证选定内容/已到学员；事务内比较revision、增加revision、写全部行；后行持久化失败回滚整个批次和revision。先前无revision行的事件以0起步，不重写既有成绩。使用迁移0046及既有SQLite事务队列，无新增业务工作流。

错误：非法行400；父母/无权限教练403；版本过期409；缺版本428；持久化故障500。HTTP schema/OpenAPI同源，缺版本由运行时返回428而非JSON schema泛化400；expectedRevision描述标明必须提供。

回归覆盖真实主教练/助教两个快照、并发CAS、非法后行无改动、SQLite触发器后行故障回滚、文件重开revision保留、未决重试不覆盖后续95分、公共helper保留真实0与未决key、不自动重读重发和428升级提示。页面接入及其本机草稿/真机交互由教练线程验证。
