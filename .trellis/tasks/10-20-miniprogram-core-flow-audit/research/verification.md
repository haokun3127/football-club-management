# 本轮验证与限制

2026-10-20/21（香港时间）；产品源码HEAD97419b47未变。

## 已执行

- 微信官方CLI0.3.11：状态/当前路由/设备、正常双角色切换、13个独立只读页面样本及重复加载；截图由 simulator_screenshot optimize=false取得。起初无runtime/超时，打开唯一主窗口后恢复。电脑控制运行时启动失败，未用于取证。
- Figma官方MCP：当前文件18个节点截图；P01/P08/C01/C03 get_design_context及截图。所有原始Figma截图与原生/合成视图/对照图已实际打开检查。
- `PATH=/opt/homebrew/opt/node@24/bin:$PATH pnpm --filter @football-club/api exec vitest run test/training-record-routes.test.ts test/training-record-job.test.ts test/assessment-workflow.test.ts test/assessment-workflow-repository.test.ts`：退出0，4文件22例。
- 小程序首批：home/private/training-history、coach event/private-interest/assessment-bulk-entry/tactical-board共7个现有测试文件，72例通过，退出0。命令额外传入的utils/student-results-page.test.mjs不存在，Vitest仅匹配7文件；不虚记其覆盖。
- 小程序补充：content-select/content-copy/scout/test-task-create/assessment-projects、shared/student-evaluation、parent radar/metric，共8文件77例，退出0。
- `node .trellis/tasks/10-20-miniprogram-core-flow-audit/research/logic-probes.cjs`：退出0，7个执行复现加1个源码守卫核对；合成依赖完全不发送真实业务请求。发现问题即为探针预期，不是“缺陷已修复”。
- 原生四字姓名出现省略，三字样本可完整显示；按钮实际184px，姓名105px。测评新增按钮原生矩形已取得；底栏查询组件返回null，遮挡高度仅使用源码140rpx与截图/按钮矩形计算，未伪称底栏原生矩形测量成功。
- 观察器恢复、合成视图经重新导航清除；最终教练日程，正常非dev-token双角色会话仍保留，无已知fixture标识。

## 不作通过声明

无真实绑定孩子/课程/测评任务，未对真实业务执行新增/更正/确认。API及控制器测试不等同原生端到端。只读GET可能触发系统既有的训练记录对账，不把正常系统副作用称为本轮人工业务写入。正常角色切换是鉴权操作。

页面dataReady不是绘制/可交互/冷启动；当前环境develop不是trial。重复空态样本不代表完整首页或大名单；未测真实手机弱网、首次隐私/手机号、当前公众平台版本、全量安全及全部页面。

未修改产品代码，没有必要为文档审计重跑全量构建。审计产物在提交前仍需按当前Git差异复核，其他会话任务归档不纳入本任务提交范围。
