# PRD: cq-talent Figma 全量页面对齐

## 当前范围覆盖（B0，2026-08-09）

本任务的当前目标是完整实现在线 Figma `zZ6wKyOHKcO4UYXDd9jGwv` 中的 **Parent 21** 与 **Coach 28** 个业务状态画板，共 49 个原始业务画板。此前“核心演示闭环”、其余页面冻结，以及以真机或模拟器截图作为完成阻塞条件的表述，均为历史阶段记录，不再限制当前 B1–B14 页面批次。

唯一当前设计权威是 `https://www.figma.com/design/zZ6wKyOHKcO4UYXDd9jGwv/`。旧文件 `ATlfBRO0ruOCDDY5ICagFD`、本地 `.fig`、旧导出几何和其中的节点 ID 仅保留作历史审计，禁止用于新的读取、实现或验收。不得跨文件继承节点 ID。

`CODE / ...` frames 是对应业务页的同页实现契约，不是可新增路由、可单独计数或可替代业务画板的页面。每个页面批次必须同时读取该业务画板和适用的 CODE frame。`zZ6wKyOHKcO4UYXDd9jGwv / 93:877 / LEGACY C7` 明确排除；C7 只使用 `zZ6wKyOHKcO4UYXDd9jGwv / 233:2 / C7 MVP`，并在实施时重新读取其当前名称与 design context。

## 目标与验收

1. 以 Parent 21 个原始画板与 Coach 28 个原始画板为完整范围，按 B1–B14 路线逐批实现；CODE frames 仅作为所配对页面的附加契约。
2. 每个页面批次开始前，独立取得其在线 Figma 目标节点的 metadata、screenshot 与 `get_design_context`。不得用上一个页面、旧导出或历史规格推断当前页面。
3. 每个页面批次遵循 TDD：先写能在旧实现失败的目标测试，再做最小实现，随后运行目标测试、相关包测试、类型检查与 `git diff --check`；检查通过后才可形成该批独立提交。
4. 用户已取消真实设备或模拟器截图作为完成阻塞条件。截图可作为补充运行态证据，但没有截图不得阻止本任务的页面批次完成；反过来，静态测试、类型检查或代码结构检查也不得被描述为 Figma 像素一致或视觉验收通过。
5. 设计不得迫使产品伪造数据。没有真实且已定义的 API/领域数据契约时，不得伪造手机号、session、角色、儿童、评测、训练、比赛、提醒或接口响应；应保留既有显式空态/错误态，或记录为独立契约阻塞并停止该数据依赖部分。

## B1–B14 页面路线

| 批次 | 业务画板 | 同页 CODE 契约或特别规则 |
| --- | --- | --- |
| B1 | G1 Launch、G2 Login Verification、G3 Login Blocked、P10 Account Binding | 不改变真实授权、绑定或角色契约。 |
| B2 | P1 Schedule Home、P1 Schedule Home — Empty | 同读 `222:86 / CODE / P1 Family Schedule`；正常与空态都属于同一路由状态。 |
| B3 | P2 Training Detail、P2.1 Match Detail、P2.2 Other Activity Detail | 同读 `222:87`、`222:88`、`222:89` 三个对应 CODE frame。 |
| B4 | P3 Reminder Center、P4 Growth Home | P4 同读 `222:90 / CODE / P4 Growth & Radar`。 |
| B5 | P5 Ability Radar、P6 Metric Detail | 同读适用的 `222:90` 与 `222:91 / CODE / P6 Metric Detail`；不凭视觉需求虚构指标数据。 |
| B6 | P7 Parent Profile Hub、P7.1 Lessons Insurance | 同读 `222:92 / CODE / P7 Child Hub`。 |
| B7 | P8 Content Center、Venues - Premium、P8.2 Help Center、Coach Team | 复用现有内容、场馆、帮助与教练数据契约；没有契约则不伪造。 |
| B8 | P9 Private Lesson Form、P9.1 Private Success | 表单与成功态必须保留真实提交/错误边界。 |
| B9 | C1 Coach Schedule Home、C2 Activity Workbench、C3 Activity Change | 保持活动 scope、权限与现有导航契约。 |
| B10 | C4 Attendance、C4.1 Attendance Success、C4.2 Attendance Failed/Correction、C5 Lesson Confirm、C5.1 Lesson Correction | 不以视觉层绕过签到、课时或权限保护。 |
| B11 | C6 Match Entry、C6.1 Add Match Event、C6.2 Save State、C7 MVP | C7 只读 `233:2`；`93:877 LEGACY C7` 永不作为实现依据。 |
| B12 | C8 Training Management、C9 Team Detail、C10 Training Content Select、C10.1 Coverage Preview、C11 Test Task List | 保留训练/内容库/队伍的已有 API 与空态语义。 |
| B13 | C12 Project Score Entry、C12.1 Autosave State、C13 Student Radar、C14 Team Ability Overview | 不把本地展示值伪装成已持久化的真实评测。 |
| B14 | C15 Assessment Entry、C15.1 Assessment Submit、C16 Coach Me、C16.1 Permission Scope、C16.2 Private Interest、C16.3 Coach Account、C16.4 Coach Help | 账号、权限、私教意向和帮助均保持既有身份与数据边界。 |

Parent 画板清单与当前节点三元组以 `docs/current/figma-source-of-truth.md` 的 2026-08-07 在线清单为准。Coach 画板在各自批次启动时从同一 Figma 文件重新读取三元组，不因本路线表而猜测节点 ID。

## 白名单与禁区

- **B0 白名单**：仅 `.trellis/tasks/07-30-figma-design-foundation/{prd.md,design.md,implement.md,implement.jsonl,check.jsonl,task.json}`。
- **后续页面批次白名单**：先在独立子任务中声明目标页面的 TS、WXML、WXSS、最小测试、已复用组件/图标以及必要任务记录；未声明不得编辑。
- **禁止**：Figma 写操作、旧 `ATlf...` 读取、`93:877` LEGACY C7、API/数据库/迁移/seed/鉴权/session/角色契约的顺手修改、`project.config*`、截图工具、WPS、归档目录及任何不属于当前页批次的脏文件。

## 回滚与证据

每个页面批次独立提交，以该提交作为回滚点；需要撤回时使用针对该提交的 `git revert`，不得使用 `reset`、`checkout`、`clean` 或覆盖其他未提交工作。B0 只建立文档与任务元数据，不修改业务代码，也不创建提交。

每个批次的记录必须区分：设计 context 已读取、静态/行为检查已通过、可选运行态截图（若有）以及尚未证明的视觉结论。历史的“核心演示闭环”与截图阻塞记录保留在版本历史中，不能覆盖本节的当前范围。
