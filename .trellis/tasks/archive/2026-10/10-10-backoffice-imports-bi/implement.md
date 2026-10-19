# 后台导入导出和 BI 分析执行清单

## 激活门禁
- [x] 用户于 2026-10-10 确认“开始开发”，批准规划实施。
- [x] 前置依赖达到验收；运行 task.py start 激活本子任务。
- [x] 加载 trellis-before-dev 及相关层 spec，核对当前代码与未提交工作。

## 实施
- [x] 逐对象模板/空值/更新策略；预览和带版本确认；失败行及幂等重试；字段裁剪/导出审计；统一分析查询与快照版本；主题图表/明细/导出；同版和变更反例测试。
- [x] 将实际端点、schema、对象动作、迁移与受影响测试写回设计及验收矩阵。

## 验证
- [x] 预览不写事实、重复确认/重试不生成重复对象、失败行可定位；未经授权不能导出敏感字段；BI 卡片/明细/导出在同一事实版本对账，草稿/缺失/临时参加人群口径正确，变更后提示刷新或新版本。
- [x] 运行父任务 implement.md 所列与本变化相关的 API/domain/backoffice 检查；跨边界跑 check:delivery。
- [x] 在隔离浏览器和可销毁真实数据库验证关键交互，检查截图及输入/权限/冲突状态。
- [x] 检查完整子任务差异；trellis-check 和 update-spec；更新最后验证命令、源码状态及缺口。

## 恢复记录
以下为过程恢复记录；当前最终状态以父任务 implement.md 和 docs/current/backoffice-delivery-2026-10-10.md 为准。

2026-10-10 已激活，依赖管理/模型核心规则及针对性测试稳定，评测浏览器补验仍跟踪在其子任务。已读管理/database/error specs；第一实现包含0039批次、resource typed templates/Excel parser、版本预览/行级原子确认/稳定来源链接及安全恢复，API typecheck正在运行。尚未验证导入测试/前端/BI；尚缺训练更正及测评草稿类型模板、完整导出权限/审计/同版BI。不能标为完成。

2026-10-10 更新：类型化资源 Excel 导入与导出 API/page已实现。内部management.validate增加固定描述符必填/类型/日期/范围校验，避免内部导入绕过HTTP schema。16管理tests通过后又增export/BI回归；当前API typecheck、backoffice typecheck与33tests/2files(管理18+persistence15)通过。文件SQLite包含preview/no facts、partial确认、重复预览/确认、外部标识稳定更新、并发变更拒绝、修正新preview/reopen；导出fields/export grant/current viewed snapshot/revoke/audit；BI卡片/明细/导出固定快照、shared训练更正后stale提示、旧版导出保持同版、新query新版本、file reopen。0040保存BI不可变快照，运营/训练/测评执行/成长使用shared facts，临时参与名单与正式历史成员分列，缺值不计零；模型版本不混算。
尚未完成：训练更正/测评草稿/球探类型化导入，BI服务主题、模型/项目模板范围最终核对；导入和BI的新UI尚未browser验证或build。已完成测评浏览器成绩修订：合成任务原4已确认→填写更正原因→5草稿保存200，旧修订1确认仍保留，截图/private/tmp/fcm-task-correction.png已查看，CSP=[]。完整评测UI(复用/展示/不测评)补验仍待，最终全门禁/diff/spec待。

2026-10-10 测评草稿/训练更正类型导入均完成，整组重复项目拒绝且修订不变，audit失败回滚draft/raw link，原confirm UUID安全重试通过。球探加密导入与失败行授权下载加入，项目/指标/练习固定字段模板开放并复用不可变规则。服务BI作为第五主题，grant在create/replay/get/export复核。实际Excel预览200（1待确认、1必填失败）、CSP=[]；确认/导出/BI浏览器及最终全门禁/矩阵待。

## 2026-10-10 最终本地集成状态
本子任务业务代码与本地检查已完成，详见父任务 BO 验收矩阵和交付报告。全仓 check:delivery 退出0；API228/domain35/小程序563+1skip/管理端2，以及构建与环境启动通过。backoffice实际ESLint通过；规格已同步 backoffice-management.md / backoffice-integration.md。工作树原有282项改动保持；未提交、未归档、未生产部署。最后新增快捷入口的浏览器回读与临时服务清理在父任务收口，不将历史阶段的“待完成”当作当前结论。
