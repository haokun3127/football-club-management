# Implement: B0 全量 Figma 页面实施计划

## B0 已完成的文档边界

B0 仅更新本任务的范围、设计与 context manifests：目标由历史“核心演示闭环”切换为在线 Figma `zZ6wKyOHKcO4UYXDd9jGwv` 的 Parent 21 与 Coach 28 个原始业务画板。B0 不读写业务代码、不启动开发工具、不做截图、不创建提交。

## B1–B14 执行路线

1. **B1 - 访问与绑定**：G1 Launch、G2 Login Verification、G3 Login Blocked、P10 Account Binding。
2. **B2 - 家长日程**：P1 Schedule Home 与 P1 Schedule Home — Empty，配对 CODE P1。
3. **B3 - 家长活动详情**：P2 Training Detail、P2.1 Match Detail、P2.2 Other Activity Detail，配对 CODE P2。
4. **B4 - 提醒与成长**：P3 Reminder Center、P4 Growth Home，配对 CODE P4。
5. **B5 - 家长能力与指标**：P5 Ability Radar、P6 Metric Detail，配对 CODE P4/P6。
6. **B6 - 家长档案与保障**：P7 Parent Profile Hub、P7.1 Lessons Insurance，配对 CODE P7。
7. **B7 - 家长服务资源**：P8 Content Center、Venues - Premium、P8.2 Help Center、Coach Team。
8. **B8 - 私教流程**：P9 Private Lesson Form、P9.1 Private Success。
9. **B9 - 教练活动工作流**：C1 Coach Schedule Home、C2 Activity Workbench、C3 Activity Change。
10. **B10 - 教练签到与课时**：C4、C4.1、C4.2、C5、C5.1。
11. **B11 - 比赛与战术**：C6、C6.1、C6.2、`233:2 / C7 MVP`；明确不读取或实现 `93:877 / LEGACY C7`。
12. **B12 - 训练、队伍与内容**：C8、C9、C10、C10.1、C11。
13. **B13 - 测试与能力概览**：C12、C12.1、C13、C14。
14. **B14 - 教练评测与账户**：C15、C15.1、C16、C16.1、C16.2、C16.3、C16.4。

## 每个页面批次的强制步骤

1. 建立独立子任务并写入：本批原始业务画板、CODE frame（若有）、Figma 三元组、页面路由和精确文件白名单。
2. 对每个目标页面独立调用当前在线 Figma `get_design_context`，同时读取 metadata 与 screenshot；禁止复用其它页面或旧 Figma 文件的节点/几何。
3. 调研现有 API、领域模型、路由与组件，确认页面所需的真实数据契约。如果不存在，记录阻塞并另起数据契约任务，不写伪造数据层。
4. 先写 RED，随后最小实现 GREEN。页面结构、交互状态、空/错态与路由都应有可观察的回归测试。
5. 运行目标测试、相关包测试、相关 typecheck 与 `git diff --check`；记录实际命令和结果。仅在验证通过后提交该批。
6. 记录设计 context 已读取、数据契约状态、测试层结论和可选运行态证据。没有真实设备/模拟器截图不能阻塞完成，也不能被静态检查替换成“视觉一致”结论。

## 不可伪造的数据规则

- 不写死或构造手机号、authorization code、token、session、角色、children、会籍、训练、评测、比赛、签到或提醒响应来填充 Figma。
- 不修改既有 API 契约、迁移、seed、persistence/store、请求工具或登录契约来让页面看起来“完成”。所需数据缺失时，使用已定义空态/错误态或停止并记录独立阻塞。
- 任何新增数据能力、持久化或权限变化都必须由单独批准的任务实施与提交，不能混入页面对齐批次。

## 白名单与回滚

- B0 白名单仅为本任务目录内的 `prd.md`、`design.md`、`implement.md`、`implement.jsonl`、`check.jsonl` 与 `task.json`。
- B1–B14 的业务文件必须由各自子任务事先逐项列入白名单；禁止顺带编辑 API、数据库、项目配置、Figma、截图工具、WPS、归档和其他工作树脏文件。
- 每页批次采用一个独立提交。回滚只允许对该提交做 `git revert`；不执行 `reset`、`checkout`、`clean`，也不覆盖其他未提交内容。

## B0 验证

- `python .trellis/scripts/task.py validate .trellis/tasks/07-30-figma-design-foundation`
- `git diff --check -- .trellis/tasks/07-30-figma-design-foundation`
- 任务范围审计：仅该目录有本次 B0 修改。
