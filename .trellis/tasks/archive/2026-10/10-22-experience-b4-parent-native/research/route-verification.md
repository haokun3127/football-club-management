# 全量路由兼容核对

62条原路由全部保留，B3新增1条，当前共63条。61页使用app-header；启动页保留品牌恢复壳，战术板保留专用全屏画布壳和拖拽测量，避免不必要改变画布坐标/自由摆放。详情迁移使用customBack委托原方法，保留编辑确认与特殊返回；一级页沿用角色Tab。静态入链可能不含动态拼接，未检出不等于删除。

加载/失败/无参数态继续由原status-view/页面模型处理；写操作沿用原handler与服务。原生加载覆盖及代表页证据另记，不把静态登记当作真实用户验收。

| 路由 | 角色 | query/对象 | 壳 | 主/次调用方（最多3个） |
| --- | --- | --- | --- | --- |
| `pages/launch/index` | launch | 会话上下文 | 启动品牌壳 | pages/login/index.ts、pages/coach/me/index.ts、utils/auth.ts |
| `pages/login/index` | login | code, redirect | app-header | pages/launch/index.ts、pages/parent/account/index.ts、pages/coach/account/index.ts |
| `pages/parent/home/index` | parent | 会话上下文 | app-header | utils/navigation.ts、utils/auth.ts |
| `pages/parent/confirmed-results/index` | parent | student, team | app-header | pages/parent/growth/index.ts、utils/club-presentation.ts |
| `pages/parent/schedule/index` | parent | 会话上下文 | app-header | pages/parent/home/index.ts、pages/parent/private-success/index.ts、pages/parent/event/index.ts |
| `pages/parent/event/index` | parent | id, studentId | app-header | pages/parent/home/index.ts、pages/parent/schedule/index.ts、pages/parent/match-history/index.ts |
| `pages/parent/growth/index` | parent | 会话上下文 | app-header | pages/parent/home/index.ts、pages/parent/semester-report/index.ts、utils/navigation.ts |
| `pages/parent/radar/index` | parent | 会话上下文 | app-header | pages/parent/growth/index.ts、pages/parent/child/index.ts |
| `pages/parent/metric/index` | parent | metricId, studentId | app-header | pages/parent/ability-history/index.ts、pages/parent/growth/index.ts、pages/parent/radar/index.ts |
| `pages/parent/child/index` | parent | 会话上下文 | app-header | utils/navigation.ts |
| `pages/parent/semester-report/index` | parent | 会话上下文 | app-header | pages/parent/child/index.ts |
| `pages/parent/account/index` | parent | 会话上下文 | app-header | pages/parent/binding/index.ts、pages/parent/child/index.ts |
| `pages/parent/reminders/index` | parent | 会话上下文 | app-header | pages/parent/schedule/index.ts |
| `pages/parent/status/index` | parent | student | app-header | pages/parent/child/index.ts |
| `pages/parent/content/index` | parent | 会话上下文 | app-header | pages/parent/home/index.ts、pages/parent/child/index.ts、utils/navigation.ts |
| `pages/parent/article/index` | parent | id | app-header | pages/parent/guide/index.ts、pages/parent/home/index.ts、pages/parent/schedule/index.ts |
| `pages/parent/guide/index` | parent | 会话上下文 | app-header | pages/parent/content/index.ts |
| `pages/parent/milestones/index` | parent | 会话上下文 | app-header | pages/parent/growth/index.ts |
| `pages/parent/ability-history/index` | parent | 会话上下文 | app-header | pages/parent/milestones/index.ts、utils/club-presentation.ts |
| `pages/parent/training-history/index` | parent | 会话上下文 | app-header | pages/parent/growth/index.ts、utils/club-presentation.ts |
| `pages/parent/match-history/index` | parent | 会话上下文 | app-header | pages/parent/growth/index.ts |
| `pages/parent/help/index` | parent | 会话上下文 | app-header | pages/parent/content/index.ts、pages/parent/child/index.ts、utils/club-presentation.ts |
| `pages/parent/coaches/index` | parent | 会话上下文 | app-header | pages/parent/content/index.ts、pages/parent/status/index.ts、pages/parent/child/index.ts |
| `pages/parent/venues/index` | parent | trim | app-header | pages/parent/content/index.ts、pages/parent/child/index.ts、utils/club-presentation.ts |
| `pages/parent/private/index` | parent | student | app-header | pages/parent/child/index.ts、utils/club-presentation.ts |
| `pages/parent/private-success/index` | parent | request, student | app-header | pages/parent/private/index.ts |
| `pages/parent/day/index` | parent | date | app-header | pages/parent/schedule/index.ts |
| `pages/parent/binding/index` | parent | 会话上下文 | app-header | pages/parent/growth/index.ts、pages/parent/child/index.ts |
| `pages/coach/schedule/index` | coach | 会话上下文 | app-header | pages/coach/attendance-success/index.ts、utils/navigation.ts、utils/auth.ts |
| `pages/coach/team-selector/index` | coach | destination | app-header | pages/coach/schedule/index.ts、pages/coach/training/index.ts、pages/coach/team/index.ts |
| `pages/coach/event/index` | coach | id | app-header | pages/coach/schedule/index.ts、pages/coach/training/index.ts、pages/coach/student-radar/index.ts |
| `pages/coach/attendance/index` | coach | id | app-header | pages/coach/schedule/index.ts、pages/coach/event/index.ts |
| `pages/coach/lesson/index` | coach | id, studentId | app-header | pages/coach/attendance/index.ts、pages/coach/lesson-detail/index.ts、pages/coach/event/index.ts |
| `pages/coach/training-game/index` | coach | contentBlockId, eventId, gameId | app-header | pages/coach/team/index.ts、pages/coach/event/index.ts |
| `pages/coach/match/index` | coach | id | app-header | pages/coach/schedule/index.ts、pages/coach/team/index.ts、pages/coach/event/index.ts |
| `pages/coach/match-edit/index` | coach | eventId | app-header | pages/coach/match/index.ts |
| `pages/coach/tactical-board/index` | coach | eventId | 战术画布专用壳 | pages/coach/event/index.ts |
| `pages/coach/team/index` | coach | section, teamId | app-header | pages/coach/training/index.ts |
| `pages/coach/scout/index` | coach | eventId, mode, student | app-header | pages/coach/match/index.ts、pages/coach/training/index.ts、pages/coach/team/index.ts |
| `pages/coach/student-radar/index` | coach | section, student, team | app-header | pages/coach/team-ability/index.ts、pages/coach/team/index.ts |
| `pages/coach/team-ability/index` | coach | teamId | app-header | pages/coach/training/index.ts、pages/coach/assessment-submit/index.ts |
| `pages/coach/event-change/index` | coach | id | app-header | pages/coach/event/index.ts |
| `pages/coach/content-select/index` | coach | eventId | app-header | pages/coach/schedule/index.ts、pages/coach/training-assessment/index.ts、pages/coach/event/index.ts |
| `pages/coach/content-copy/index` | coach | eventId | app-header | pages/coach/event/index.ts |
| `pages/coach/training-assessment/index` | coach | eventId | app-header | pages/coach/event/index.ts |
| `pages/coach/test-tasks/index` | coach | teamId | app-header | pages/coach/training/index.ts |
| `pages/coach/test-task-create/index` | coach | eventId, teamId | app-header | pages/coach/test-tasks/index.ts、pages/coach/event/index.ts |
| `pages/coach/assessment-projects/index` | coach | review, taskId, templateId, title | app-header | pages/coach/schedule/index.ts、pages/coach/assessment-bulk-entry/index.ts、pages/coach/training/index.ts |
| `pages/coach/assessment-bulk-entry/index` | coach | projectId, projectIds, taskId, templateId, title | app-header | pages/coach/assessment-projects/index.ts |
| `pages/coach/assessment-submit/index` | coach | count, title | app-header | 旧深链/兼容入口（保留） |
| `pages/coach/attendance-success/index` | coach | eventId | app-header | pages/coach/attendance/index.ts |
| `pages/coach/lesson-history/index` | coach | 会话上下文 | app-header | 旧深链/兼容入口（保留） |
| `pages/coach/lesson-detail/index` | coach | id | app-header | pages/coach/lesson-history/index.ts |
| `pages/coach/match-event-add/index` | coach | eventId | app-header | pages/coach/match/index.ts |
| `pages/coach/permissions/index` | coach | 会话上下文 | app-header | pages/coach/me/index.ts |
| `pages/coach/private-interest/index` | coach | 会话上下文 | app-header | pages/coach/me/index.ts |
| `pages/coach/account/index` | coach | 会话上下文 | app-header | pages/coach/me/index.ts |
| `pages/coach/help/index` | coach | 会话上下文 | app-header | pages/coach/me/index.ts |
| `pages/coach/training/index` | coach | section, teamId | app-header | pages/coach/schedule/index.ts、pages/coach/team-selector/index.ts、utils/navigation.ts |
| `pages/coach/test-entry/index` | coach | eventId | app-header | pages/coach/schedule/index.ts |
| `pages/coach/me/index` | coach | 会话上下文 | app-header | pages/coach/schedule/index.ts、utils/navigation.ts |
| `pages/coach/student-results/index` | coach | student, team | app-header | pages/coach/student-radar/index.ts |
| `pages/shared/student-evaluation/index` | shared | mode, student, team | app-header | pages/parent/growth/index.ts、pages/parent/milestones/index.ts、pages/coach/student-radar/index.ts |
