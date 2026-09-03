# 训练评测、学期测评与成长足迹 — 设计方案

## Architecture

新增两个独立的持久化关联，而不是复用一个模糊的“assessment”字段：

1. `training_content_assessments` 连接 `event × student × training_project`，仅记录课堂训练内容表现。
2. `assessment_tasks` 扩展 `team_id` 与 `term_label`；`player_assessments` 扩展 `assessment_task_id`，仅记录阶段测评任务提交。

家长成长摘要在现有 `growth-summary` 出口增加 `lessonStats` 与 `timeline`。`timeline` 是服务端按当前孩子、时间倒序聚合的视图，不在小程序拼接跨接口隐私数据。

## Data contracts

### Training content assessment

```ts
type TrainingContentAssessment = {
  id: string;
  clubId: string;
  eventId: string;
  studentId: string;
  trainingProjectId: string;
  score: number;
  note?: string;
  assessedByCoachId?: string;
  assessedAt: string;
};
```

- 唯一键：`club_id, event_id, student_id, training_project_id`；重复保存更新分数、备注和更新时间。
- 写入端校验训练活动、活动训练内容、参与者 `present` 状态与教练活动权限。

### Semester assessment task

```ts
type AssessmentTask = {
  id: string;
  clubId: string;
  teamId: string;
  termLabel: string;
  title: string;
  templateId: string;
  startsOn: string;
  dueOn: string;
};
```

- 创建端要求 `teamId` 属于当前教练范围、`termLabel` 非空、开始/截止日期合法。
- C15 route 和提交 payload 带 `taskId`。后端验证任务模板、任务球队、学员范围以及任务窗口，随后写入 `player_assessments.assessment_task_id`。
- 完成度按该 `taskId` 的 `player_assessments` 去重学员数计算。

### Parent growth timeline

```ts
type LessonStats = { attendedLessons: number; expectedLessons: number; attendanceRate: number | null };
```

- `training` 只取已完成训练和当前学生点名到场后的已保存训练内容；没有评测也可以显示训练完成记录。
- `match` 只显示孩子参加的已完成比赛，以及该孩子相关的事件。
- `ability_update` 来自 `PlayerMetricRecord`，来源解析为训练内容评测或有 `assessment_task_id` 的学期测评；每项变化前值取同一指标前一条可见记录。

## UI boundaries

- Coach C2：训练活动卡提供“训练内容评测”全屏入口；未完成点名或无训练内容时明确禁用原因。
- Coach C11/C11.1：创建任务显示当前训练球队、学期输入和模板选择；任务卡显示球队、学期、项目与真实进度。
- Coach C15：仅从 C11 任务进入，顶部显示球队/学期/测评项目；不用于课堂训练评测。
- Parent P4：Hero 显示 `已到/应到课时`；成长足迹卡展示最新三条混合时间线，点击进入现有全屏 `pages/parent/milestones`，按训练、比赛、能力更新查看详情。

## Figma and rollback

- 先读取当前 V6 P4、C2、C11、C15 节点；在当前 Parent/Coach 产品页新增或克隆对应状态，保留旧画板。
- 每个画板严格 `375×812`；现有组件、字体、颜色与 TabBar 复用。
- 回滚：每批 migration 是只增列/新表；代码路由保留旧读取兼容，删除/隐藏新入口即可停止新流程。生产部署前必须另建备份与回滚步骤。
