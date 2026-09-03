# 训练评测、学期测评与成长足迹 — 实施计划

## Validation baseline

- API focused: `pnpm --filter @football-club/api test -- --runInBand` 或目标 Vitest 文件。
- Mini-program focused: `./node_modules/.bin/vitest.cmd run <target>` 与 `./node_modules/.bin/tsc.cmd --noEmit -p apps/miniprogram-cq-talent/tsconfig.json`。
- Gate: `pnpm run check`。
- Visual: 在线 Figma 截图 + 微信开发者工具真实 `375×812` 截图；截图只写 `%TEMP%\cq-talent-visual-evidence`。

## Batch 1 — API: training content assessment persistence

**2026-09-03 progress:** API implementation and focused regressions are complete locally. The new `training_content_assessments` table is keyed by club/event/student/project; the BFF rejects non-training events, content not selected for the event, and students not marked `present`. Both API round-trip and file-SQLite reopen evidence pass. The task-owned hunks have been separately staged for a bounded commit; unrelated shared route/store edits remain unstaged.

1. 读取当前训练项目保存、活动参与者和教练范围实现；新增 API focused regression tests，先证明缺席、非训练活动和未选训练内容会拒绝，且保存后重启读回。
2. 新增 migration、领域/数据能力类型和 repository；唯一性按 event/student/project upsert，分数限制整数 `0..100`。
3. 新增受教练权限保护的读写路由，返回活动、已到场名单、已选项目和已有评分，供全屏页面一次读取。
4. 运行 focused API tests、typecheck、build、`git diff --check`；限定路径提交 `feat(api): persist training content assessments`。

## Batch 2 — API: semester task ownership and honest progress

**2026-09-03 progress:** task creation now requires coach-accessible `teamId` and non-empty `termLabel`; `assessment_tasks` and `player_assessments` have additive SQLite scope columns. App-client assessment submissions require a task id, validate task template/date/team scope, persist `assessmentTaskId`, and task progress counts distinct students from matching persisted assessment rows. A red-green regression now rejects whitespace-only `termLabel` with `400 invalid_term_label`. Focused task/API tests and migration tests pass. The task-owned hunks have been separately staged for a bounded commit; the lesson-retirement schema work remains outside this batch.

1. 先写 failing tests：创建任务没有队伍/学期或队伍越权失败；提交模板不匹配、学员不在任务队伍或任务窗口外失败；同一学员再次提交不重复计入进度。
2. 迁移 `assessment_tasks.team_id/term_label` 与 `player_assessments.assessment_task_id`；扩展 domain input、repository 和持久化映射。
3. 扩展 C11 create/list 和 C15 submit 契约；任务进度按 task id 的真实 assessment rows 计算。
4. 运行 focused API tests、typecheck、build、`git diff --check`；限定路径提交 `feat(api): bind semester assessments to teams and tasks`。

## Batch 3 — Coach UI and current Figma screens

**2026-09-03 progress:** complete locally. C11 lists each task with its backend-projected team and term, while task creation now submits the server-required real `teamId` and `termLabel`. C15 accepts only an in-progress task route with matching template, loads that task's team rather than a default team, scopes its draft key by task id, and submits `assessmentTaskId` on every saved player record. C2 was reread from Figma node `1610:1462`; the workbench now links to a separate full-screen classroom assessment page. It reads the server's selected content/present-student scope, restores persisted scores/notes, and saves only valid real student × selected-project entries. The old activity-level “评测录入” shortcut was removed so semester tasks remain the only entry for stage assessment. Figma MCP was read-only, so no online design write is claimed.

1. 读取在线 Figma C2、C11、C15 当前节点和截图，创建/更新当前状态画板后回读节点与 `375×812` 截图。
2. 先写 failing mini-program tests：C2 从训练活动进入训练内容评测；C11 显示/提交球队与学期；C15 必须携带 `taskId`，不允许从任意模板 URL 进入学期测评。
3. 新增全屏 `pages/coach/training-assessment/`，以及 C2/C11/C15/API client/types/app route 的最小改动；WXML 所有展示字段在 TS view model 预计算。
4. 定向测试、TypeScript、WXML/WXSS 编译和真实 API 运行验证；逐页微信开发者工具 `375×812` 截图；限定路径提交。

## Batch 4 — Parent lesson stats and detailed growth timeline

**2026-09-03 progress:** the API/UI slice is complete locally. `growth-summary.trainingStats.lessonStats` returns `attendedLessons`, `expectedLessons` and training-only `attendanceRate`; completed matches are excluded from the denominator. The same BFF now returns a child-scoped mixed `timeline`: completed training with saved drill scores/notes, completed match with the child's own match events, and ability updates from classroom scoring or task-bound semester assessments. P4 normalizes the timeline and shows its latest three facts; `pages/parent/milestones` now renders the full-screen detail from that same server projection, without calendar-window aggregation. Online nodes P4 `1610:466`, C2 `1610:1462`, C11 `1617:2`, and C15 `1623:2` were reread; MCP is read-only, so no online Figma write is claimed.

1. 先写 failing API tests：lesson stats 仅计算训练、正确区分已到/应到、比赛不计入；timeline 只返回当前孩子可访问的训练/比赛/指标更新，并带来源与前后变化。
2. 扩展 `growth-summary` 的 `lessonStats` 和 `timeline` view model；复用持久化活动、训练内容评分、比赛事件、PlayerMetricRecord，不新增前端伪数据。
3. 读取/更新在线 Figma P4 与成长足迹全屏页；先写 failing mini-program tests，再接 P4 Hero 和 `pages/parent/milestones/` 详情渲染。
4. API + mini-program focused tests、TypeScript、全仓 gate、真实 `375×812` 父端截图；限定路径提交 `feat: show parent growth timeline and lesson attendance`。

## Batch 5 — Documentation and controlled demo data

**2026-09-03 documentation progress:** `docs/current/progress.md`, `docs/current/figma-source-of-truth.md`, and the BFF contract note now record this batch. No production import or deployment was performed.

1. 更新 `docs/current/progress.md`、`docs/current/figma-source-of-truth.md`、该任务证据和 API contract notes。
2. 仅在用户明确授权生产导入后，单独备份生产 SQLite、运行可回滚导入、重启 API、以七个测试账号逐一只读核验两周训练/比赛/测评记录；导入和部署不与业务代码提交混合。

**2026-09-03 final quality evidence:** all three TypeScript checks pass; the C2/C11/C15/coach-workbench page suite passes `44/44`, and the API full test command passes. The root gate is currently blocked before API tests by two files outside this batch: `apps/miniprogram-cq-talent/scripts/devtools-screenshot.test.mjs` has a syntax error, and `apps/miniprogram-cq-talent/pages/parent/content/index.test.mjs` has a CRLF-sensitive exact-string assertion. Both are intentionally excluded from this task-owned commit and are recorded in `docs/current/progress.md`.

**2026-09-03 Figma completion boundary:** the authenticated Figma MCP identity was rechecked and has a `View` team seat. Code and contract completion are pushed to `dev`, but online design writes for the new C2 classroom-assessment state and revised C11/C15/P4 task states are not proven through this MCP connection. Do not close the visual-design acceptance item until a browser editor session or an editable MCP seat updates and rereads the relevant V6 frames.

**2026-09-03 browser design state:** a user-owned browser editor session was able to make a non-destructive C2 clone, confirmed by MCP metadata as node `1955:7` at `1285,610`. It is deliberately recorded as an unfinished design seed, not as evidence that the classroom-assessment screen has already been visually designed or accepted.

**2026-09-03 C2.1 design synchronization:** the browser-backed Figma channel was subsequently used to turn `1955:7` into the C2.1 classroom-training-assessment reference. The original C2 remains untouched. The 375×812 readback proves the design frame has the full-screen back/save navigation, activity context, training-project choice, present-student score rows and bottom save action. The mini-program now derives date/team/time/venue from the real workbench event and gives the optional note a second row instead of a cramped third column. Classroom-assessment / training-management / assessment-task / semester-entry Vitest is `27/27`; all three TypeScript layers, API full Vitest `126/126` and `git diff --check` pass. Root `pnpm run check` remains blocked outside this batch by the DevTools screenshot syntax error and a CRLF-sensitive parent-content test (`453/454` mini-program tests). A WeChat DevTools single-file compiler request timed out and is explicitly not recorded as a pass or a runtime screenshot.
