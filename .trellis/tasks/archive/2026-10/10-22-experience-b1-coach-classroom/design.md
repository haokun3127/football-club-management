# 设计

复用TDesign、app-header、submit-bar和现有语义token。导航注册表集中到navigation.ts，保留discover旧别名。仅提取球队context-bar（纯展示+动作事件），页面持有范围和请求状态。

训练工作台不改变领域事实；计次名单使用明确的已计/不计/待生成，搜索与筛选仅改变视图。球队工作区在授权球队确定后并行读取近期课程和测评，分区失败分别提示，stale generation不回写其他球队。
