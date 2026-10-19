# 后台评测与模型配置闭环执行清单

## 激活门禁
- [x] 用户于 2026-10-10 确认“开始开发”，批准规划实施。
- [x] 前置依赖达到验收；运行 task.py start 激活本子任务。
- [x] 加载 trellis-before-dev 及相关层 spec，核对当前代码与未提交工作。

## 实施
- [x] 核对当前模型能力；定义类型/单位/适用范围；配置三层关联和区间版本；边界试算/发布校验；任务下发/结果查询/显式确认；权限/并发/重启/历史回归。
- [x] 将实际端点、schema、对象动作、迁移与受影响测试写回设计及验收矩阵。

## 验证
- [x] 整数分值、区间交叠/空缺/边界反例、缺规则与单位错误、循环依赖、版本不可变和历史来源可追查；家长只见确认结果；未提供正式标准时草稿可配置但不发布演示阈值。
- [x] 运行父任务 implement.md 所列与本变化相关的 API/domain/backoffice 检查；跨边界跑 check:delivery。
- [x] 在隔离浏览器和可销毁真实数据库验证关键交互，检查截图及输入/权限/冲突状态。
- [x] 检查完整子任务差异；trellis-check 和 update-spec；更新最后验证命令、源码状态及缺口。

## 恢复记录
以下为过程恢复记录；当前最终状态以父任务 implement.md 和 docs/current/backoffice-delivery-2026-10-10.md 为准。

2026-10-10 已激活：基础共享事实与公共计划 API 稳定，浏览器新增/回读和 409 保留输入通过。未将数据管理全部范围标为完成；剩余内容配置随最终集成补齐。已加载 assessment-publication 与 domain directory/database/error/quality specs。两段区间 pure domain 实现与 5 tests 通过（domain 全套 31 tests）；配置 API 与迁移 0033 正在实施，尚未宣称模板绑定/任务/结果集成完成。

2026-10-10 当前已实现：测评采集项目/指标固定字段维护（迁移 0034），两段映射草稿/试算/正式依据发布/停用（0033），共同测评服务固定绑定规则和三层结果血缘（0035）。API 全套 216 tests / 36 files 通过；domain 全套 33 tests / 11 files 通过；根 build 通过。管理测试 12 cases 包括实际 SQLite close/reopen 与固定规则停用后的发布 replay。未完成：通用模型和培养标准配置、浏览器任务下发/结果工作流、映射最新浏览器验收、导入/BI/服务；不得标为父任务交付完成。

2026-10-10 浏览器映射验收：真实 cookie 会话下新增合成草稿→刷新→规则详情→输入50得到整数80；尝试无正式依据发布得到409且仍是草稿，弹窗/Drawer CSP violations=[]。截图 `/private/tmp/fcm-mapping-trial.png` 已查看。Umi hash 路由/Deep link、新构建/迁移 API 已启动合成临时 SQLite。上述配置仅在可销毁夹具，不是正式标准。新的模型库/培养标准/任务/导入/BI/服务仍未完成。

2026-10-10 新增模型/培养标准/任务实现：0036 原有模板版本的模型 blueprint、0037 培养标准不可变版本、0038 单独教学授权。模型使用原有 graph/formula/binding，草稿公开尺度隔离及删关联缓存刷新；正式发布归档旧模板版本，任务固定版本。标准显式项目/指标、单位、方向、参考日期/年龄、有效期和核定依据；试比明确人工选择，不自动选择未决年龄/重叠规则。管理员多队事务下发固定名单；成绩读/草稿/确认/不测原因复用共同 workflow，写入须 assessment_entry + 本人 active coach + 当前队伍任职，独立于专业配置 grant。无发布 allowlist 时只查阅/建立任务，不自行开放生产功能。
已验证：模型和标准 API、持久化、原 workflow 4 files / 49 tests；API typecheck；backoffice typecheck（修复 unknown value key 后）、根 build。新增前端 Models/Standards/Tasks 正在实际浏览器验收；最近又规范了可清空的 optional 字段，backoffice 正在重新 build；API 全套正在运行，尚未读取最终结果。未完成：全部新页面真实交互验收、发布/更正及 parent 确认边界浏览器、培养标准重启单独证据、跨模型固定外部输出/展示组织的最终范围核对；导入/BI/服务/内容设置及最终门禁。不得将阶段或父任务标为 complete。

最新补充：API 全套219 tests/36 files通过（严格新模型逐项目两段映射及 canonical score-scale 补充之前）；新增 canonical 映射拒绝未知/超出上限后 domain35 tests/11 files、domain build及API受影响34 tests/3 files通过；新模型正式发布所有项目必须绑定两段映射，试算可临时使用已有标准分值但不会发布/写事实。不测评即便保有录齐草稿，也从 completedStudents排除。最近APItypecheck通过。真实浏览器模型草稿已保存；试算第一次未找到预期值，检查实际页面确认是测试脚本将「最终得分/上限90」配置为归一输出尺度10，被API正确阻止试算；正在通过真实表单改为90验证45输出。尚未宣称新页面全部浏览器验收完成。当前夹具 http://127.0.0.1:59933/__env/develop/backoffice/ (session57637，源码pre新canonical guard/新逐项目发布要求)；临时目录fcm-backoffice-browser-bGbh83，凭证只在该目录credentials.json，禁止输出。后续新模块API或构建变化须重启夹具，资产allowlist启动时固定。
剩余：模型跨版本输出复用（同次测评的明确引用策略）和独立展示组织；任务计算输出查询 projection/UI、新页面真实交互及更正/重启；随后导入/BI、服务、内容设置和全BO验收。导入现有管线只stage raw / confirm link，不实际写全部业务对象，不能包装成导入已完成；需要类型化对象模板与实际事务/行级结果/安全重试。注意现有stageRaw ID使用tablekey+hash可能跨club冲突、confirm方法自BEGIN不支持嵌套事务，研究时核对后修正/适配。

2026-10-10 续：现代模型固定跨版本输出复用（same_assessment：同学员本次原始输入重算，不自动采用历史/最新成绩），来源 active/archived 不可变公式；新发布必须来源 active；独立展示分组/顺序 PUT /models/:id/display，调整不改变计算 revision，写审计，归档随模板/图谱同步。服务端任务详情投影计算值、公式版本和输入记录；页面展示映射时间及计算血缘。最新 API typecheck、受影响34tests/3files、backoffice typecheck/build通过；增加HTTP管理员教学身份录入/发布/回放/reopen后15管理tests通过。
浏览器当前使用新源夹具 session5371，URL http://127.0.0.1:63324/__env/develop/backoffice/，临时目录fcm-backoffice-browser-aEFeGN。真实操作：培养标准草稿保存200、50试比符合40..100、无正式依据发布409且保留输入；任务下发200固定技术模板和李明，选择真实event-training-1课程、成绩4保存200、显式修订1发布200，CSP=[]。截图 /private/tmp/fcm-standard-compare.png已查看（弹层关闭过渡尚可见，不作最终布局证据）。模型复用/展示的新页面和任务更正还待浏览器补验；标准单独reopen、不测原因reopen以及最终diff/全门禁待补。不标本子任务完成。当前开始导入子任务，并保持本子任务剩余清单。

## 2026-10-10 最终本地集成状态
本子任务业务代码与本地检查已完成，详见父任务 BO 验收矩阵和交付报告。全仓 check:delivery 退出0；API228/domain35/小程序563+1skip/管理端2，以及构建与环境启动通过。backoffice实际ESLint通过；规格已同步 backoffice-management.md / backoffice-integration.md。工作树原有282项改动保持；未提交、未归档、未生产部署。最后新增快捷入口的浏览器回读与临时服务清理在父任务收口，不将历史阶段的“待完成”当作当前结论。
