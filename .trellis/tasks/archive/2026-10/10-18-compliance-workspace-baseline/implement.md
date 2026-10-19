# 实施计划

## 审核门槛
用户已于2026-10-18审核并批准按方案执行；任务状态in_progress。主会话inline执行，不派实施/检查子代理。

## 顺序
1. [x] 读取官方隐私正文、本项目旧notes和执行规范。
2. [x] 建立去敏工作区元数据盘点research/workspace-inventory.json；确认主路径、别名、已失效临时入口和六个worktree。
3. [x] 将现状与优先级草案放入research/status-draft.md，区分实测/历史/待核实。
4. [x] 用户审核后激活任务；读取trellis-before-dev并保存实施前限定文件diff/私有配置备份。
5. [x] 修订notes/04、notes/05、notes/08及MP-PRIV-002；旧官方pages不改。同步受影响引用，不重新宣传过期包体/基础库/urlCheck状态。
6. [x] 更新development-delivery-channel.md当前总览与待办；新增development-workspace.md。README、docs/README和AGENTS追加主入口导航，不改托管块。
7. [x] 主项目projectname更名；私有同名覆盖一并调整；保持AppID/基础库/urlCheck/envVersion映射不变。
8. [x] 用官方CLI打开canonical小程序路径，记录CLI结果；能读回则核实projectpath/projectname。电脑控制不可用时明确UI验收缺口，不操作运行中缓存文件。
9. [x] 检查引用、Markdown和JSON；运行策略检查器及既有检查器测试、配置校验。无业务逻辑改动，不为文案添加实现镜像测试，不跑无关全量构建。
10. [x] 审阅限定diff，记录durable规则与验证结果；仅处理本任务文件，保留现有脏工作区。外部工具记录如未清理应继续列待办，不能宣称全任务完成。

## 预计变更文件
- docs/reference/wechat-miniprogram/notes/04-隐私与个人信息合规.md
- docs/reference/wechat-miniprogram/notes/05-登录-手机号-订阅消息.md
- docs/reference/wechat-miniprogram/notes/08-本项目平台合规差距-2026-09-18.md
- .trellis/spec/miniprogram/frontend/privacy-and-capabilities.md
- docs/current/development-delivery-channel.md
- docs/current/development-workspace.md（新）
- README.md、docs/README.md、AGENTS.md（仅主入口说明和导航）
- apps/miniprogram-cq-talent/project.config.json（仅projectname）
- apps/miniprogram-cq-talent/project.private.config.json（本地覆盖，仅projectname，不提交）
- 本任务和journal记录

## 验证
- git diff --check -- <本任务路径>
- JSON解析并比对projectname以外字段不变，realpath与工作区清单一致。
- Node24执行node scripts/verify-delivery-config.mjs。
- Node24执行node scripts/miniprogram-policy/check.mjs和node --test scripts/miniprogram-policy/check.test.mjs；不把报告式exit0等同于零发现。
- 对新增/改动本地Markdown链接逐个检查存在性；检索旧误判只允许出现在明确历史/更正语境。
- 官方CLI open --project <canonical目录>；UI不可用则单列说明。

## 本次不做
无源码功能修复、真实微信授权、SSH配置变更、平台备案、上传、提审、发布、Git切分支/重置、删除worktree/临时目录、清理其他项目记录或IDE会话缓存。

## 实施中发现（2026-10-18）
- 用户已审核并授权执行，任务已激活。
- 原一致性测试硬编码所有规则复核日期为2026-09-18。同步增加MP-PRIV-002的reviewedAt，并让既有测试逐规则核对，无该字段仍用snapshot日期；不改检查器运行时能力规则。
- 当前安装CLI报告服务端口已关闭；旧stable安装56031端口失效。已请求用户开启官方设置，未编辑缓存或重启IDE。

## 当前检查点（2026-10-18）
- 工作目录：/Users/dongjun/projects/football-club-management；HEAD仍2e8a6d96，分支未切换。
- 已完成：旧合规笔记/MP-PRIV-002更正，规则日期一致性测试，当前状态与优先级，主入口文档/导航，团队与私有projectname统一。
- 主项目：用户开启服务端口后，当前安装官方CLI返回exit0/open；项目元数据读回canonical projectpath、重庆天才-主开发、AppID wx4c588cd106e520e0。未采集可见窗口截图。
- 验证：Node24交付配置passed；规则测试3/3；平台报告432文件/1.67MiB，仅MP-PKG-002预算warning；19个新增/变更本地链接有效；限定diff空白检查通过。
- 保全：原有本任务外跟踪文件修改哈希未变，所有Git worktree路径/HEAD/分支未变；未改其他项目/会话缓存。基线引用见research/local-baseline.json；独立审阅补丁见research/implementation.patch。
- 剩余范围：电脑控制工具仍因sandbox符号链接根目录无法启动，重复/失效项目记录未移除；该部分为单独待办，不直接编辑运行中IDE缓存。用户可按development-workspace.md辨认唯一主入口。
- Git：尚未暂存/提交。README/docs导航及AGENTS含原先未提交内容；提交须隔离本任务增量，不能整文件吞入原改动。任务保持in_progress，等待提交计划确认及最终收尾，不归档未完成的界面清理。

## 项目记录清理检查点（2026-10-18）
- 用户明确授权只清理重庆天才重复/失效记录，保留源码和旧worktree。
- 找到本机工具自带wechatide-skill v0.3.11的project-manager官方指引；兼容检查通过，CLI client codex已获用户原生授权，status equal/loginExpired=false/cliTokenRequired=false。
- 官方project_list(scope=all)当前5条：主路径、Documents别名，另3个其他应用；旧/tmp条目不在当前列表，不操作其他profile缓存。
- project_import主路径返回alreadyImported=true，列表名仍缓存miniprogram-cq-talent，团队/私有配置均为重庆天才-主开发。需后续通过受支持方式刷新列表名；不能声称当前列表名已变更。
- 已发起一次project_remove，精确目标Documents别名；taskId confirmation_project_remove_806196d9-b48b-4e80-b8b9-0bff6a312766，pending，需用户在微信工具确认。不得重复发起或主动轮询循环；用户返回后先查此任务，再读列表。官方确认只删列表项，不删磁盘，若目标窗口打开会关闭对应窗口。
- 尚未声称移除成功。研究记录见research/pending-ide-cleanup.json、ide-projects-before.json。

## 2026-10-19收尾决定
- 用户明确授权依次提交合规改动、归档完成任务、分类提交/忽略剩余文件，形成干净基线。无需重复请求同一提交授权。
- 旧project_remove任务已success；当前官方列表4条，CQ Talent仅canonical主路径1条，其他应用3条保留。列表名缓存尚旧，作为非阻塞工具显示限制如实记录；不再留作待移除任务。
- 后续Git分批提交并核对；不修改线上体验版/Figma、不删除旧worktree。完整交付门禁运行中，归档与基线检查结果将写入本任务收尾记录。

## 收尾与干净基线（2026-10-19）
- 合规工作提交f015ab2d；完整Node24 pnpm check:delivery退出0：API230、domain38、mini569+1skip、backoffice2，构建/9工具测试/3启动入口通过。
- Documents重复列表记录已移除，官方列表仅一条CQ Talent canonical路径；其他应用保留。工具列表缓存名称与配置窗口名称分别如实记录，不再阻塞文档任务收尾。
- 归档完成任务通过task.py archive --no-commit执行，统一审阅后批量提交；保留进行中的视觉/产品评审任务。
- 临时浏览器会话/输出截图、机器本地备份引用和审阅patch只忽略不删除；正式文档、资产和任务记录纳入Git。完整本机备份位于/private/tmp/fcm-clean-baseline-20261019-bhzt1z7l。
- 当前用户请求是收尾/分类/提交，未授权部署、修改Figma或push远端，本轮不启动新功能批次。

## 归档后基线分类记录（2026-10-19）
- 本任务文档与必要规则配置已提交f015ab2d，任务记录归档批次fd1695d1。当前运行时名称已更正，官方列表仅一条主路径；列表旧名缓存为非阻塞工具显示限制。
- 原工作区589个变更/未跟踪文件已先完整备份，再逐类提交/忽略。忽略规则仅覆盖本机临时产物，不忽略正式任务、图像证据和文档引用依赖。
- 模板中的旧“pending/未归档”描述为阶段记录，以本节和task.json completed状态为准。清理不删除源码、旧worktree、登录缓存或其他应用。
- 最终门禁为git status --porcelain为空、无未跟踪文件、无待归档completed任务；本轮不push、不部署、不启动下一批次。
