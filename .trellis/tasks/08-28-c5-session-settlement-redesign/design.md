# C5 销课流程设计

## 边界

本批只修改教练端 `pages/coach/lesson` 与 `pages/coach/lesson-correction` 的呈现和导航。后端继续使用：

- `GET .../coach/events/:eventId/workbench`
- `GET .../coach/events/:eventId/lesson-confirmation`
- `POST .../coach/events/:eventId/lesson-confirmation`
- `PATCH .../coach/events/:eventId/lesson-confirmation`

当前后端没有“教练销课历史聚合”接口，因此不在客户端拼造跨活动历史；历史设计板先作为目标状态记录，代码阶段只落地已有活动级真实数据和更正链路。

## 数据流

```text
真实教练会话
  -> workbench + lesson-confirmation
  -> TS 合并活动、参与学员和课时余额
  -> WXML 全屏呈现
  -> POST/PATCH 真实销课调整
  -> 重新 GET 验证持久化结果
```

## 视觉映射

- 在线 Figma fileKey：`zZ6wKyOHKcO4UYXDd9jGwv`
- C5 原稿：`93:734`
- C5 待处理改版：`537:2`
- C5 历史改版：`537:79`
- C5.1 详情改版：`537:156`
- 页面使用 `app-header`、`role-tabbar`、`status-view`，不创建第二套导航系统。

## 回滚点

如果定向测试或运行态出现问题，只回滚本批限定文件；不回滚用户工作区已有的 API、持久化、测试和配置改动。
