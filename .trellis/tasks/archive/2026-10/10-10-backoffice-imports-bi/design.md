# 后台导入导出和 BI 分析技术设计

## 边界
导入/分析页面、浏览器数据适配、现有 data-capability/import 管线、共享统计应用查询；不加通用仓库或双向自动同步。

## 契约
完整架构、安全、数据流、版本/历史、兼容和回滚策略沿用 ../10-10-backoffice-framework-completion/design.md。新接口契约在当前源码盘点后写入 owning schema/类型及本文件；不预设未经源码确认的实体字段或路由。

## 实施切片
逐对象模板/空值/更新策略；预览和带版本确认；失败行及幂等重试；字段裁剪/导出审计；统一分析查询与快照版本；主题图表/明细/导出；同版和变更反例测试。

## 依赖与回滚
基础对象和模型输入/版本定义稳定后开始；服务分析在服务子任务完成后集成复核。
临时数据库验证迁移和重启回读；部署保留旧构建和一致性备份。所有改动按父任务 research/working-tree-baseline.txt 保护已有工作，不重置、删除或提交他人改动。

2026-10-10 契约细化：固定资源描述符生成逐对象 v1 Excel 模板和字段/关联说明；客户列名只能映射获准字段。externalId 按俱乐部+来源+资源稳定，显式 targetId 更新须当前 revision；空值 preserve（默认）/clear 明确选择。复用 ExcelJS parser、external_system_connections/table/field mappings/sync runs/raw records/record links；新增0039只存批次预览和逐行状态，不另建业务事实。管理 saveInTransaction 内核复用同字段/引用/角色/事务校验，每行事实+原始来源链接+状态+审计原子提交；部分入库，重复确认跳过已成功行，失败行支持同请求恢复，改数据则新预览。现有 legacy confirm 对已知全用户/支付/计次/保险/精英模型表有定向core投影，不是仅link；其自BEGIN不用于新的管理行事务。源 raw IDs 当前legacy仍使用tablekey+hash，新通用边界使用club+connection+externalId+完整hash避免租户碰撞。
