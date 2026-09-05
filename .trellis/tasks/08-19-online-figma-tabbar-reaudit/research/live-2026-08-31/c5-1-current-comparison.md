# C5.1 课时更正在线 Figma / 运行态复验（2026-08-31）

## 页面与证据

- 在线 Figma：`zZ6wKyOHKcO4UYXDd9jGwv / 93:765`（C5.1 Lesson Correction）。
- 在线稿截图：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\c5-1-figma-93-765-2026-08-31.png`，`375×812`。
- 运行路由：`/pages/coach/lesson-correction/index?id=event-cq-talent-secure-test-1-trn-0818`。
- 运行截图：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\c5-1-runtime-2026-08-31.png`，严格 `375×812`。
- 运行 sidecar：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\c5-1-runtime-2026-08-31.png.json`。

## 对照结论

1. 在线稿与运行态均保留独立“课时更正”语义：异常提示、需要更正学员、系统差异标签、调整值和保存按钮均出现。
2. 运行态学员数量、姓名、原始课时值和调整值来自真实 `workbench + lesson-confirmation` 数据；与 Figma 示例的两名学员和示例数值差异属于数据差异。
3. 微信系统状态栏和原生胶囊属于平台层差异；应用内容结构未发现额外的截图通道问题。
4. 根据 2026-08-31 新产品规则“点名即销课”，本页当前业务语义已经过时，不能作为新规则的完成证据。后续应将其收敛为“出勤纠正”，并与点名提交产生的课时台账使用同一事件级修正链路。

## 当前处置

- 本轮只读验收，不修改业务代码。
- 在用户确认保留历史纠正能力后，重命名页面语义、更新 Figma 对应稿、统一前端入口和后端事务，再重新截图验收。
