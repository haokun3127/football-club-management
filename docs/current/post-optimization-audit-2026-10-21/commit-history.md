# 优化提交清单

起点 `70f26151` 不计入；终点 `c98c7c37`。实际40条、无合并提交；累计103文件，+4627/-745。审查逐提交主题/文件清单与累计生产代码/测试/UI差异，不代表逐个checkout运行40次门禁。

| 序号 | SHA | 主题 |
| --- | --- | --- |
| 1 | `86b48615fc179bcea6e805bb214a016dbe2e44e3` | fix(miniprogram): 雷达页按实际测评维度组织展示，不再截断为六维（F-03） |
| 2 | `7cc44c9eb2f760370e8c0ea553d21c55abd7fa3a` | fix(miniprogram): 雷达页综合分仅采用服务端 overall，缺失或 null 留空不自造（F-04） |
| 3 | `eae89173f0b8b8b2df363d4c2bb598db7ff7ec2d` | fix(miniprogram): 成长页对孩子未变的相关事实变更做失效刷新（F-06） |
| 4 | `29d0aa35cfe7c4bdcf0c0290e999283810bff030` | fix(miniprogram): 修复请求层401身份竞态与并发导航收敛 |
| 5 | `91311e0e8f3feb0dde44c6015ae1c2455db1f3e9` | refactor(miniprogram): 删除无调用点的 confirmCoachLesson 死代码 |
| 6 | `26d551200186f126b403aca49750d9f4325e6563` | fix(miniprogram): 请求层增加显式超时预算 |
| 7 | `7fa15729d9ba9cf84909e3145f064a0ea5a48a16` | feat(api): 新增 app-client 会话登出路由，撤销当前 Bearer 会话 |
| 8 | `9fd1e58a0fcd73d0d626ff8bca934a0c88c5a659` | fix(api): 全局错误处理器将未标记 statusCode 的异常按 500 处理 |
| 9 | `82328b105b4ca92f0551168b1ddc38bf4d55ab2c` | fix(miniprogram): 请求层统一错误映射为结构化对象 |
| 10 | `42bf9ba30f9705a14a0d49c54109b63db90db81f` | fix(miniprogram): 幂等键改为方法+路径+规范化请求体的确定性派生 |
| 11 | `a2901ff93b8d24f04345c9f2f6959be68c63e8f6` | fix(miniprogram): 401登录跳转携带回跳参数，登录后返回原页面 |
| 12 | `494983054c92a9e25ac550ba7399f7f266831b44` | feat(api): 接入 @fastify/rate-limit 全局限流与 @fastify/helmet 安全响应头 |
| 13 | `87ba395c12bc102252db0497d8e59e7f2f4b1464` | fix(miniprogram): 教练时段保存失败时恢复旧值并标识未保存（F-07） |
| 14 | `1a2cdd36a09f2f54f169dcf548925746d7c7b09c` | fix(miniprogram): 尊重明确保存为空的可用时段，不再复活默认 20 格（F-08） |
| 15 | `6478a6dcef60762db0022991a03e4bd0bbb8238f` | fix(miniprogram): 私教偏好读取成功前禁用编辑与提交并提供重试（F-09） |
| 16 | `486b773f982004299a35b0ed622eb143640c7619` | fix(miniprogram): 测评任务悬浮按钮抬到底栏之上避免遮挡（V-06） |
| 17 | `65595ea600439e0cac0ba05d21ea8f2e631fdaac` | feat(miniprogram): 接课配置页按 C34 信息层次重组并统一 club tokens（V-07） |
| 18 | `b832860da5918b7f7ddb039aa2aa1f8e9381ced7` | feat(api): 训练记录应用层新增家长请假/撤回函数并支持按版本删除 |
| 19 | `58dcefccd491492604aa8732ed29363d1d9fced8` | feat(api): 新增家长请假路由并保护教练点名不静默覆盖请假 |
| 20 | `e08efbb62a43dbdff82ee69840762b89a8199dba` | feat(miniprogram): 训练详情接入请假提交/撤回链路（F-01） |
| 21 | `6ca55b8076e366f952870f44cf30d8be683eb2f1` | fix(miniprogram): 私教咨询默认沿用当前已选孩子（F-02） |
| 22 | `9e890ba6d10449fe0a305ed338d2fca84378eb37` | fix(miniprogram): 私教成功页顶栏与文案统一为真实咨询状态（F-11） |
| 23 | `e473ae0d9d22f5a435830da85c92452cf24c3754` | feat(miniprogram): 整班点名按学员携带 previousStatus 快照并新增请假冲突公共处理 |
| 24 | `889c5ee27e86dc4c011c5365b153c1d1c22cb5f1` | feat(miniprogram): 点名页适配家长请假：已请假标识、409 冲突刷新核对与显式覆盖 |
| 25 | `aa53d7043e9c172073bdbfcfbf0333f37332566f` | feat(miniprogram): 活动页内嵌点名同步适配家长请假冲突保护 |
| 26 | `c9acf0036c905651b64321e37151eb39b49f9868` | feat(miniprogram): 首页按 P01 213:348 重排为暖白底白球员卡与整组白卡快捷入口（V-01/V-05） |
| 27 | `a2fab46af8ff6fc1207e18002d69660068891bf5` | feat(miniprogram): 成长页按 P08 213:526 重排为白底概览→能力组合→当前评价（V-02） |
| 28 | `637a48cba4baef33b1f00f51a92c30aaef73d5b4` | feat(miniprogram): 教练日程按 C01 214:2144 重排为授权队伍卡+带边距日历+课程任务卡+所选队伍入口（V-03） |
| 29 | `b0f0e8b2495efddb0352705b4ee26a8f8e8c36a2` | fix(miniprogram): 家长首页分块呈现，辅助模块独立三态与局部重试（L-02） |
| 30 | `960852c6f050214d8ff503155b21135e071aad32` | fix(miniprogram): 能力详情页不再把同队统计均值当作标准展示（F-05/REQ-PAR-004） |
| 31 | `3be39e08ec3cabdb8cc98d554ea6ed76c1291982` | fix(miniprogram): submitCoachAssessment assessedAt 改由调用方按提交生成，失败重试复用同一幂等键（REQ-ASM-002） |
| 32 | `e6dc32b2fb19fc3697e35501625208b89aad4d76` | fix(miniprogram): 成长页雷达预览为同队统计均值轮廓补充参考口径标注（REQ-PAR-004） |
| 33 | `2487fbdff43b4fce5cde1be0c17b53478f27d78f` | feat(miniprogram): 接入微信隐私授权全局处理（onNeedPrivacyAuthorization 官方弹窗协议） |
| 34 | `f2bf78da54f2e2022db445b17666fe55434afb0b` | feat(miniprogram): 登录页取号按钮改为隐私耦合授权（getPhoneNumber/agreePrivacyAuthorization） |
| 35 | `a0ce04bfd5bafbd2c8a7b2515c4d8fa20ac48dfe` | feat(miniprogram): 教练页复制微信号前置隐私授权门禁 |
| 36 | `381c6ae358bea56d0c4b8d2769e8a32792895d5e` | fix(miniprogram): coaches PageData 补 navInset/menuInset 声明（官方类型迁移暴露） |
| 37 | `fc3aef45e27904cd51647a83f3ebe1290b0690e3` | feat(miniprogram): 接入官方 miniprogram-api-typings 类型声明（收缩策略） |
| 38 | `e13cbcdfe69c1853eae1a76668697024373521c7` | feat(miniprogram): 家长日程页与状态组件试点迁移官方 Page/Component 泛型 |
| 39 | `3715e650a9e06df9d34386b78f9d0faebca40918` | test(miniprogram): 新增微信类型负例守卫（Page/Component 错误示例必须报错） |
| 40 | `c98c7c3731bfd8db9a8e79905395e57262a9714e` | test(miniprogram): 负例守卫放宽超时到 60s（tsc 子进程与 vitest worker 并发时可能超默认 5s） |
