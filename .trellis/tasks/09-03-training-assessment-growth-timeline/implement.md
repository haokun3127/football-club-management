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

**2026-09-03 C11/C15/P4 online-design follow-up:** browser-backed Figma edits and screenshot readback are complete for C11 `1617:2`, C15 `1623:2`, and P4 `1610:466`. C11 now makes team/term/date/progress legible; C15 uses the task context and short “输入原始值” copy; P4 establishes `41/46` as the real lesson-stat example and distinguishes training, match, and ability updates. The mini-program follow-up adds a regression-protected flexible C15 hint and a precomputed P4 fraction value class (`p4-hero__stat-value--fraction`) so real values do not truncate. C15/P4 focused Vitest is `18/18`, mini-program TypeScript and `git diff --check` pass. A fresh root check is not fully green: domain `21/21` passes, while mini-program is `453/454` because the unrelated DevTools screenshot syntax error and CRLF-sensitive parent-content assertion remain. The Figma PNGs are not runtime screenshots; no fresh DevTools/real-device visual acceptance is claimed for this final detail batch.

**2026-09-03 completion audit:** this task's code and contract acceptance is now verified against current `dev`. Server regressions cover the training-content assessment write scope, assessment task ownership/listing, training-only lesson stats, and child-scoped mixed growth timeline (`4/4`). File-SQLite reopens cover saved classroom assessments, assessment tasks, and task-bound app-client assessment/parent metric records (`3/3`). The relevant mini-program C2/C11/C15/P4/milestones entry and rendering suites pass (`63/63`), with mini-program TypeScript and `git diff --check` clean. The full root gate remains independently blocked by the already-recorded DevTools screenshot syntax error and CRLF-sensitive parent-content assertion; neither path belongs to this task. The browser-backed Figma readback is design evidence, not a new runtime screenshot claim.

**2026-09-03 P4 stats-row outline correction:** user reported a pale boxed outline around the “已到/应到课时 / 出勤率 / 本月训练” row. Root cause was two duplicate `.p4-hero__stats` rules: the earlier rule set full `border: 1rpx solid #334155`, while the later rule only added `border-top`, leaving the other three sides in effect. The online authoritative Figma node `1967:21` was first changed to individual strokes top=1, right/bottom/left=0; inner dividers `1967:25` and `1967:29` remain. The mini-program now has one corresponding rule with only `border-top`, and a red-green regression forbids restoring the full border. Focused P4 Vitest `9/9`, mini-program TypeScript, WXML/WXSS compiler checks, and `git diff --check` pass.

**2026-09-04 C12 three-level project selector:** completed the remaining frontend slice. The selector now derives level-1/level-2 navigation and level-3 project groups from the real training `contentTree`; assessment form fields contribute their real `metricId` values, and project cards retain task progress and multi-select state. Added primary/secondary navigation handlers, a content-tree-free legacy fallback, and the fixed multi-select confirmation bar. The production task used for runtime inspection has `metric-finishing`, which is absent from the current content tree; unmatched projects now use a dedicated “其他” primary entry and cannot appear under an unrelated ability domain. WeChatIDE MCP produced `C:\Users\ASUS\Desktop\cq-talent-assessment-project-select-v5.png` and selected-state `C:\Users\ASUS\Desktop\cq-talent-assessment-project-selected-v3.png`, both `375×812`. Validation: focused selector + related pages `39/39`, mini-program TypeScript pass, WXML/WXSS compiler pass, and root `pnpm.cmd run check` pass with domain `21/21`, mini-program `499/499`, API `130/130`.

**2026-09-04 C12 empty-category correction:** the first three-level implementation exposed all training-tree categories even when the assessment form had no matching project, which made the real C12 task look empty. The selector now builds a visible hierarchy from project-bearing branches only: direct metric matches remain in the training tree; unmatched real assessment groups are attached to a same-label primary when available, otherwise to a primary named after the real assessment group. The generic “其他” label is no longer used for this path. A regression covers `metric-finishing` mapped to the real `技术能力` dimension when that metric is absent from the training tree. Runtime screenshot `C:\Users\ASUS\AppData\Local\Temp\cq-talent-assessment-projects-after-fix.png` is `375×812`; the live task contains one bound input project, so one card is expected. Validation: selector `5/5`, related coach pages `23/23`, TypeScript, MCP WXML/WXSS compilation, and `git diff --check` pass.

**2026-09-04 spreadsheet-backed project readback:** the customer-provided `D:\UU\GameViewer\Download\天才精英队评分表.xlsx` is now the source of truth for the active technical assessment version: 8 level-1 domains, 28 level-2 items, and 62 level-3 test items. C12 renders one selectable card per real test item. The app-client entries route now resolves `projectId` by `binding.testItemId` first, then `binding.metricId`, with legacy `metric.dimensionId` compatibility. A red-green regression submits the full 62-item table version and verifies that reading `assessment-test-cq-talent-03` returns only that project's value. API/server fixture coverage and C12/C12.1 focused coverage are green; no new online Figma write or runtime visual acceptance is claimed in this batch.

**2026-09-04 production deployment and data refresh:** the committed release `0bc5907` was packaged from the committed Git tree and deployed to the API container only. Before the container rebuild and before the controlled data write, a restricted SQLite snapshot was created on the server; no database volume was replaced. The first post-restart health poll timed out during Node cold start and briefly observed a reverse-proxy `502`; read-only diagnosis confirmed the container remained running, the API logged normally, and both internal and HTTPS health subsequently returned `200`. Application startup inserted the new active `assessment-template-version-technical-table-20260904` into the existing database without deleting old templates or scores. The controlled seven-account importer then returned `refreshed` after its dry-run and restart.

**2026-09-04 production acceptance evidence:** `https://cqtc.pomi.tech/health` returned `200`; the default and explicit assessment-form reads both returned `assessment-template-version-technical-table-20260904` with `62` fields. The seven-slot server audit passed: every slot has 19 coach roster players, 2 guardian-bound parent students, rolling current/previous/future calendar coverage, Chinese venue/display copy, 19 assessments, 152 radar records, 2 matches, 8 match events, and a saved 19-player tactical board with 11 starters and 8 substitutes. The role-scoped BFF readback passed for all seven slots: 14 parent children total, 133 coach roster entries, seven parent calendars, seven coach calendars, seven radar reads, and seven saved tactical boards. This is server/API evidence; real WeChat authorization and device visual acceptance remain separate operator steps.
