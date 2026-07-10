# 技术设计

## 页面映射

- schedule <- P1/P1.1，合并成家庭一页式工作流。
- event <- P2/P2.1/P2.2，统一路由＋三种 variant。
- growth <- P4/P5，成长摘要＋可交互雷达合并。
- metric <- P6，真实趋势和来源。
- child <- P7/P7.1/P10，仅使用当前真实数据。

## 数据原则

所有数据继续来自 app-client BFF。视图层只格式化，不推断权限、排名或假值。孩子筛选、MetricView、metricId 和来源 eventId 保持端到端身份一致。

## 组件复用

复用 UI-1 AppHeader、RoleTabBar、StatusView、StatusChip、ActivityCard、StudentSwitcher、SubmitBar。页面可以增加 domain-specific section，但不能复制组件基础样式。

## Figma 同步

最终根据渲染结果更新现有 Generated frames 的标题、筛选、状态和数据边界；不重建整个设计系统。每个页面保留 375×812 基准，并补 loading/empty/error 的状态说明。

## 风险

主要风险是长页面、双孩切换、雷达触点和固定 TabBar 互相遮挡。通过 DevTools 多尺寸、滚动到底和来源跳转验证。
