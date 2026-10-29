# HTTP幂等写入口覆盖（安全修复候选）

范围：非后台53个变更路由注册；48个授权后replay检查点、4个明确opt-out、1个退役接口。GET不在幂等写范围。后台路径沿用独立合同，仍被通用HTTP缓存排除。行号可用原始AST清单定位；以下路径省略共同的 `/clubs/:clubId`，`C` = `/app-clients/:clientId`。

| 路由（方法与后缀） | 每次请求的当前动作权限 | replay位置 |
|---|---|---|
| PUT C/coach/events/:eventId/tactical-board | active coach client + requireCoachEventAccess + match event identity | event检查后、状态/写入前 |
| PUT C/coach/events/:eventId/training-content-assessments | active coach client + requireCoachEventAccess | 事件授权后、CAS前；缺expectedRevision全局428零存储改动 |
| POST C/session/role；POST C/session/logout | resolveClubAuth + availableRoles；或有效且绑定本club/client的session | rotate/revoke前；旧token撤销后401 |
| POST C/coach/events/:eventId/match/events | 认证coach membership + active client + event ACL +当前比赛名单 | domain比赛去重与写入前 |
| POST C/parent/private-lessons | active parent client + parent membership + 当前guardian child binding | createPrivateLessonRequest前 |
| POST C/parent/students/:studentId/privacy/requests | active parent client + requireStudentAccess | createPrivacyRequest前 |
| POST C/coach/events/:eventId/finish | active coach client + coach/admin role + auth + club/event identity | scheduled业务状态前 |
| PUT C/coach/preferences | active coach client + coach/admin role + 当前用户coach profile | saveCoachPreferences前 |
| PUT C/coach/events/:eventId/training-projects；POST .../change-requests | requireCoachEventAccess(plan)，当前身份/client/课程检查 | 版本比较/创建申请前 |
| POST C/coach/assessment-tasks | 当前身份/client/role + coach管理team + publication gate | 授权后、首次创建实时名单资格校验前；已创建task固定名单不随退籍缩减，新key仍校验实时名单 |
| PUT C/coach/events/:eventId/attendance；POST C/coach/matches | 当前client/role + requireCoachEventAccess；matches使用body eventId | 名单业务冲突/比赛写入前 |
| POST C/coach/assessments | 当前coach/admin + 当前task/team/student scope | recordAssessment前 |
| PUT C/coach/assessment-tasks/:taskId/students/:studentId/entries；POST .../:taskId/publications | workflow scope：active client、role、active team、coach assignment、student roster；当前可编辑开关 | workflow.save/publish前；批量重放再检查body全部students |
| POST /assessments | requireClubRole(admin/coach) | managed-task业务校验与写入前 |
| POST /admin/calendar/events；PUT .../events/:eventId/participants；POST .../conflicts | requireClubRole(admin/coach) | create/record/check前 |
| PUT /teams/:teamId/coach-assignments/:coachId | requireClubRole(admin) + 当前club team/coach身份 | expectedRole比较/写入前 |
| POST /admin/integrations/sync-policies/run-due；POST .../sync-policies；PATCH .../sync-policies/:policyId；POST .../:policyId/run | requireClubRole(admin) | 执行/创建/更新前 |
| POST /admin/privacy/export-preview；PUT /admin/privacy/consents；PATCH /admin/privacy/requests/:requestId | requireClubRole(admin) | preview/save/resolve前 |
| POST /admin/students/:studentId/lesson-adjustments；POST .../insurance-policies | requireClubRole(admin) | 账本/保险写入前 |
| POST /admin/imports/excel/preview；POST /admin/external-records/:rawRecordId/confirm | requireClubRole(admin) | 工作簿解析/外部记录确认前 |
| POST /matches | requireClubRole(admin/coach) + 当前event club + coach team/owner scope | match conflict与写入前 |
| POST /students/:studentId/derived-metrics/attacking-contribution | requireStudentAccess(write) | compute前 |
| POST /teams；POST /teams/:teamId/members | requireClubRole(admin) | create/join前 |
| PUT C/students/:studentId/evaluations/:teamId | authorize：当前身份/client/guardian/team；排除parent写且team在scope | CAS前（实际base见student-evaluation.routes.ts） |
| POST C/coach/events/:eventId/training-games；PATCH .../:gameId | coachScope：当前身份/client/event/workbench范围 + writable功能开关 | create/updateTrainingGame前；其业务requestId去重仍保留 |
| PATCH C/students/:studentId/training-records/:eventId；POST .../:eventId/leave | scopedEvents + 当前目标event；leave还检查parent | reconcile/CAS/写入前（实际base见training-record.routes.ts） |
| POST C/coach/training-content/templates；POST .../preview；POST .../apply | identity + 来源课程canPlan或模板可见性；公开模板还需admin | 来源授权后；preview重放逐项校验缓存targets当前canPlan，apply逐项校验body targets当前canPlan；版本比较/写入前 |
| POST /training/sessions；POST /training/sessions/ensure | requireClubRole(admin/coach) + access(event,plan) + validPlan | create/ensure前 |
| POST /training/sessions/:trainingSessionId/observations | 当前membership/role + session/event/roster/coach scope | recordTrainingObservation前 |

独立验证与兼容性：

| 路线 | 原合同与当前行为 |
|---|---|
| POST C/wechat-login | 一次性微信code换session；不复用通用HTTP凭证缓存，始终重新验证code。仓库客户端该调用原本不附幂等key；过期/已消费code仍按登录合同失败，用户重新登录；不返回旧token。 |
| POST /admin/integrations/wps/webhook | 签名、时间窗、nonce由ingestWpsWebhook内部验证；禁用通用HTTP缓存，保留既有行哈希去重。重送相同nonce继续按原签名防重放规则拒绝；合法新envelope相同行按原row hash去重，不绕过证明。 |
| scout-player POST | 原已disableHttpIdempotency；保留自然身份去重，未改变。 |
| temporary-roster多方法注册 | 原已disableHttpIdempotency；原子名单合同未改变。 |
| C/coach/events/:eventId/lesson-confirmation多方法注册 | 原已退役，requireCoachEventAccess后410；未到缓存检查点，因此旧缓存也不能返回财务数据。 |

通用缓存key/fingerprint/TTL不变；合法已授权重试在CAS前取得原响应，不重写业务，也不刷新收据。未授权响应不创建/覆盖缓存。48个原可幂等handler均有检查点；新增路由漏接检查点会安全地不使用通用缓存，需明确接入及回归验证。

证据：Codex Security工具保留的 `artifacts/route-inventory.txt`、`focused.log`、`preview-scope.log`、`replay-review.md`，目录见implement.md。原始401/403探针修复前失败，修复后通过；非课堂账本正常重试仅入账一次，移除admin角色后403；预览来源授权保持但移除候选team授权，同key重放403，新预览200并排除该目标。无push/deploy/环境切换。
