# 重庆天才教练端Figma全页面对齐

## Goal

基于 UI-1 共享组件和完整 Figma 文件，完成教练端七个现有核心路由的全部状态设计与实现：任务工作台、活动工作台、销课、比赛、训练内容、整队评测和我的；点名页由 UI-1 交付。保持 capabilities、权限裁剪、训练项目回填、无助攻默认和评测草稿安全。

## Requirements

- UI-1 必须先完成；教练页面统一使用共享导航、Tab、状态、卡片和提交栏。
- `coach/schedule` 保留今日/本周任务工作台、摘要、筛选和唯一下一步，适配 C1 视觉而不退回普通课表。
- `coach/event` 使用 C2 dark session header/完成度/quick actions，但只展示 event type、workflow、capabilities 允许的真实动作；无计时/学分字段不伪造。
- `coach/lesson` 保留默认全员销课、排除原因、返还/补扣和后端规则，适配 C5/C5.1；删除“后端/PATCH”等技术说明。
- `coach/match` 保留 capabilities 事件类型、无助攻默认、比分状态校验和失败草稿，适配 C6/C6.1/C6.2 的比分 hero、时间线和保存反馈。
- `coach/training` 保留明确活动、项目树、搜索、折叠、已选区、回填和固定保存，适配 C10；不伪造 coverage preview。
- `coach/test-entry` 保留按项目录整队、62 项分组、缺测、自动草稿、部分失败和重试，借用 C12 视觉；不得恢复 C15 学员优先结构。
- `coach/me` 只展示真实身份、球队和权限，适配 C16/C16.1；不展示固定 46/18/89% 或不存在的账号/私教设置。
- 比赛活动工作台和比赛页提供有权限的战术板入口，具体页面/接口由 Tactical Board 子任务交付。
- 同步完整 Figma 文件中受新业务结构影响的 Coach Generated frames。

## Acceptance Criteria

- [ ] 七个教练路由全部完成 ready/loading/empty/error/pending/success 所需状态并通过渲染检查。
- [ ] 任务卡只显示一个最高优先级 CTA；训练活动无比赛操作，比赛活动显示战术板/比赛录入。
- [ ] 无助攻、训练项目回填、Tab 栈、权限裁剪和评测草稿行为没有回退。
- [ ] 25 人名单和 62 项模板在小屏可滚动操作，固定提交栏不遮挡内容。
- [ ] 页面不展示 Figma 固定统计、未知 capabilities、假计时/学分或技术文案。
- [ ] Coach Generated frames 同步最终结构，逐页 DevTools 截图通过。
- [ ] 全量类型检查、API contract、纯函数测试和教练 smoke 通过。
