# 设计

只改React/AntD表示层。resource-navigation维护稳定叶节点和五组，所有叶URL保持；嵌套组只组织菜单。workbench复用原API，待办/近期日程在统计之前，加载/失败/空分离，失败可重试。

Management继续持有加载/权限/保存/revision；ResourceFields只呈现现有Field，根据稳定字段key作小型分组，未登记字段始终显示在其他资料，不能因分组丢字段/改验证。日期/枚举/数值/关联仍按原kind编辑。抽屉显示对象名、更新时间与只读状态，历史独立，脏表单关闭/相关跳转/复制需一次明确确认。原写入序列与409显式核对不改。全局AntD颜色、字体和控件token统一。

回退此批表示层提交即可，不撤销数据。浏览器仅本地SQLite fixture，fixture生命周期结束自动清理。

浏览器补充发现：Management旧search handler只reload，不传关键词，已改用ProTable options.search合同。已有课程后台改期后，PersistentApiStore.mergeCalendarEvents用旧内存覆盖DB，导致工作台/小程序日程仍旧；新增先失败回归再调整合并优先级，以持久化课程为准，内存仅补未持久化项，不改写入与计次规则。
