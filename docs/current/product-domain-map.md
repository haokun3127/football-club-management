# 产品域与数据所有权

2026-10-30核对；基线 `02baed1f`。用户批准的模块化单体目标，迁移后105张表全部有且仅有一个主要所有者，另列2张运行时元数据表。本页表格由同目录 `product-domain-map.json` 生成；修改所有权时先更新该清单并重验覆盖，不把目录/菜单当数据权限。

## 规则与实际边界

- 各域拥有自己的写入规则，应用服务协调跨域事务。统一日程拥有时间/地点；模板与课程快照分开；训练计次与到场/财务分开；测评、课堂表现与教练评价分开；正式赛/友谊赛分开。
- 基础设施表包括会话、导入、审计、幂等与附件。资料/隐私政策是俱乐部业务规则；认证、密钥与加密持久化是机制。导入暂存数据不是另一份权威业务结果。
- 首页、成长、工作台、BI组合事实并保留来源/日期/版本。BI快照可以持久化，但不反向成为训练/测评的写入来源。
- 现有通用Store和后台资源仓储仍跨多个域。本清单明确所有权，不声称已经完成物理拆分；后续随修改收窄接口。
- 两个正式发布单元：API+后台+内部计次任务的服务端镜像；家长+教练原生微信小程序。迁移/备份是运维步骤，各环境数据独立。

## 业务与基础设施映射

### 俱乐部基础资料（business）

表：`clubs`、`user_accounts`、`club_user_memberships`、`parent_profiles`、`student_profiles`、`coach_profiles`、`student_guardian_bindings`、`teams`、`team_members`、`coach_assignments`、`club_terms`、`training_locations`、`student_contacts`、`student_operational_profiles`、`insurance_policies`、`person_identities`、`person_identity_digests`、`club_player_identities`、`scout_profiles`、`custom_field_definitions`、`custom_field_values`、`backoffice_grants`。

**写入入口：** `apps/api/src/application/backoffice-management.ts`、`apps/api/src/application/services.ts`、`apps/api/src/application/scout-players.ts`。

**读取方：** 后台维护；角色范围解析；日程/训练/测评/服务引用。

**权限与约束：** 俱乐部与资源动作授权；监护绑定及球队范围由服务端确认。

**对应验证文件：** `apps/api/test/backoffice-management.test.ts`、`apps/api/test/auth-context.test.ts`、`apps/api/test/scout-identities.test.ts`。

### 俱乐部基础资料：隐私治理（business）

表：`consent_events`、`student_consent_records`、`privacy_field_policies`、`privacy_notice_versions`、`privacy_requests`、`privacy_retention_policies`。

**写入入口：** `apps/api/src/routes/data-capability.routes.ts`、`apps/api/src/persistence/data-capability-repositories.ts`。

**读取方：** 隐私流程及获准字段投影。

**权限与约束：** 按俱乐部、资料对象及已确认同意用途；授权与脱敏不可由客户端决定。

**对应验证文件：** `apps/api/test/persistence.test.ts`。

### 教学内容（business）

表：`session_plans`、`training_drills`、`training_templates`。

**写入入口：** `apps/api/src/application/training-templates.ts`、`apps/api/src/application/training-content-catalog.ts`、`apps/api/src/application/services.ts`。

**读取方：** 课程内容与授权模板选择/复制。

**权限与约束：** 有计划编辑权限；跨课复制有预览和revision；历史快照独立。

**对应验证文件：** `apps/api/test/training-templates.test.ts`、`apps/api/test/training-content-edit.test.ts`。

### 日程与训练运营（business）

表：`calendar_events`、`event_change_requests`、`event_participants`、`training_sessions`、`training_records`、`temporary_event_participants`、`training_content_assessments`、`training_content_assessment_revisions`。

**写入入口：** `apps/api/src/application/services.ts`、`apps/api/src/application/training-records.ts`、`apps/api/src/application/temporary-rosters.ts`、`apps/api/src/routes/app-client.routes.ts`。

**读取方：** 家长/教练日程与详情；训练统计。

**权限与约束：** 教练课程范围、家长绑定孩子；请假直接生效；自动计次与财务分离。

**对应验证文件：** `apps/api/test/training-record-leave.test.ts`、`apps/api/test/training-record-job.test.ts`、`apps/api/test/temporary-rosters.test.ts`、`apps/api/test/event-presentation.test.ts`、`apps/api/test/training-content-assessment-batch.test.ts`。

### 测评（business）

表：`ability_metrics`、`derived_metric_definitions`、`metric_dependencies`、`metric_graph_versions`、`metric_lineages`、`metric_view_nodes`、`metric_views`、`assessment_mapping_versions`、`assessment_metric_bindings`、`assessment_raw_results`、`assessment_scores`、`assessment_tasks`、`assessment_template_versions`、`assessment_templates`、`assessment_test_items`、`assessment_workflow_students`、`assessment_workflow_tasks`、`backoffice_model_definitions`、`backoffice_standard_versions`、`player_assessments`、`player_metric_records`。

**写入入口：** `apps/api/src/application/assessment-workflow.ts`、`apps/api/src/application/backoffice-assessment-tasks.ts`、`apps/api/src/application/backoffice-mappings.ts`、`apps/api/src/application/backoffice-models.ts`、`apps/api/src/application/backoffice-standards.ts`。

**读取方：** 教练草稿/核对；家长仅确认结果；成长/BI投影。

**权限与约束：** 角色/队伍/任务/学员范围；原始值映射与规则版本；单学员齐项目确认。

**对应验证文件：** `apps/api/test/assessment-workflow.test.ts`、`apps/api/test/assessment-workflow-repository.test.ts`。

### 教练评价（business）

表：`student_evaluations`、`evaluation_phrases`。

**写入入口：** `apps/api/src/application/student-evaluations.ts`、`apps/api/src/application/backoffice-management.ts`。

**读取方：** 教练队伍/学员；获准监护人成长页。

**权限与约束：** 每队每学员当前版本及历史；独立于课堂表现和标准测评。

**对应验证文件：** `apps/api/test/student-evaluations.test.ts`、`apps/api/test/student-evaluation-client-integration.test.ts`。

### 比赛与战术（business）

表：`matches`、`match_rosters`、`match_events`、`tactical_boards`、`training_games`、`training_game_participants`、`training_game_events`、`training_game_revisions`。

**写入入口：** `apps/api/src/application/training-games.ts`、`apps/api/src/routes/match.routes.ts`、`apps/api/src/store.ts`。

**读取方：** 教练比赛目录/编辑；家长获准比赛投影。

**权限与约束：** 正式比赛与友谊赛独立；事件不替代总比分；完成友谊赛修订仍完成；战术不自动变更出场。

**对应验证文件：** `apps/api/test/training-games.test.ts`、`apps/api/test/formal-matches.test.ts`。

### 专业服务（business）

表：`communication_logs`、`private_lesson_requests`、`scout_work_records`、`service_cases`、`service_catalog`。

**写入入口：** `apps/api/src/application/backoffice-service-resources.ts`、`apps/api/src/routes/app-client.routes.ts`。

**读取方：** 服务工作台与获准咨询/跟进。

**权限与约束：** 按服务资源动作权限；内部球探意见不自动向家长公开；咨询不自动交易。

**对应验证文件：** `apps/api/test/backoffice-management.test.ts`、`apps/api/test/scout-player-client-integration.test.ts`。

### 内容与展示（business）

表：`club_branding`、`content_articles`、`news_banners`、`optional_feature_catalog`、`share_templates`。

**写入入口：** `apps/api/src/application/backoffice-content.ts`、`apps/api/src/application/backoffice-content-resources.ts`。

**读取方：** 小程序公开内容和授权配置投影。

**权限与约束：** 公开内容白名单与俱乐部范围；个体成长事实仍需监护权限。

**对应验证文件：** `apps/api/test/public-content-release.test.ts`。

### 课包账本（business）

表：`lesson_credit_ledger`、`payment_events`、`payment_reviews`。

**写入入口：** `apps/api/src/persistence/data-capability-repositories.ts`、`apps/api/src/application/backoffice-management.ts`。

**读取方：** 后台授权账本/运营查询。

**权限与约束：** 授权调整留痕；不由普通训练计次自动扣账；不据表名宣称已支持在线支付。

**对应验证文件：** `apps/api/test/lesson-correction.test.ts`、`apps/api/test/backoffice-management.test.ts`。

### 认证与密钥机制（infrastructure）

表：`app_client_role_preferences`、`app_client_sessions`、`club_app_clients`、`backoffice_credentials`、`backoffice_sessions`、`backoffice_login_attempts`、`identity_key_versions`。

**写入入口：** `apps/api/src/auth/session-registry.ts`、`apps/api/src/auth/backoffice.ts`、`apps/api/src/persistence/app-client-session-repository.ts`。

**读取方：** 认证/session resolver；不直接作为人员档案。

**权限与约束：** 环境隔离与会话验证；角色切换重建范围；凭据不得进入页面DTO。

**对应验证文件：** `apps/api/test/app-client-role-switch.test.ts`、`apps/api/test/backoffice-auth.test.ts`、`apps/api/test/environment-isolation.test.ts`。

### 外部数据接入（infrastructure）

表：`backoffice_import_batches`、`backoffice_import_secrets`、`external_field_mappings`、`external_raw_records`、`external_record_links`、`external_sync_policies`、`external_sync_runs`、`external_system_connections`、`external_table_mappings`。

**写入入口：** `apps/api/src/application/backoffice-imports.ts`、`apps/api/src/application/backoffice-import-special.ts`、`apps/api/src/persistence/data-capability-repositories.ts`。

**读取方：** 导入状态、映射及可追踪来源；导入后的业务由各域拥有。

**权限与约束：** 来源与密钥隔离；导入不能绕过业务权限/发布/历史保护。

**对应验证文件：** `apps/api/test/excel-import.test.ts`、`apps/api/test/wps-connector.test.ts`。

### 审计、附件与幂等（infrastructure）

表：`attachments`、`backoffice_audit`、`backoffice_mutations`、`http_idempotency_records`、`privacy_audit_logs`。

**写入入口：** `apps/api/src/persistence/data-capability-repositories.ts`、`apps/api/src/persistence/backoffice-management-repository.ts`。

**读取方：** 授权历史/回执/附件访问。

**权限与约束：** 附着于所属业务对象权限；保存请求回执不代表发布；审计不改写业务状态。

**对应验证文件：** `apps/api/test/backoffice-management.test.ts`、`apps/api/test/training-games.test.ts`。

### BI读取投影（projection）

表：`backoffice_bi_snapshots`。

**写入入口：** `apps/api/src/application/backoffice-bi.ts`。

**读取方：** 后台BI。

**权限与约束：** 按获准范围聚合；原业务事实是权威，不把快照反向写回。

**对应验证文件：** `apps/api/test/backoffice-management.test.ts`。

## 范围与待核实项

- 数据清单仅基于本地迁移和源码；不是10月30日线上库盘点。对应验证文件表示验收入口，不表示本次全部重新执行。
- `schema_migrations`由迁移器维护，`runtime_environment`由运行时归属校验维护，不混入业务域。
- 旧 `SessionDelivery`/`SessionObservation` 在 SeedBackedStore 有内存实现；实际课堂表现另有 `training_content_assessments` 持久化路由。它们的可达性和兼容风险已交固定基线审计，不能因类型存在就声称持久化完整，也不能仅因无同名表就断言真实课堂记录丢失。
- `payment_events` 等保留表不代表本轮新增收款、结算或支付功能；保持原后台账本边界。
