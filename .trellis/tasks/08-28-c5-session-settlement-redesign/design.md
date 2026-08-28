# C5 销课流程设计

## 边界

本批修改教练端 `pages/coach/lesson`、`pages/coach/lesson-history`、`pages/coach/lesson-detail` 与 `pages/coach/lesson-correction` 的呈现和导航。后端继续使用：

- `GET .../coach/events/:eventId/workbench`
- `GET .../coach/events/:eventId/lesson-confirmation`
- `POST .../coach/events/:eventId/lesson-confirmation`
- `PATCH .../coach/events/:eventId/lesson-confirmation`

当前后端没有“教练销课历史聚合”接口，因此不在客户端拼造跨活动历史。历史页通过最近 30 天的真实教练首页活动逐个读取已有活动级 `lesson-confirmation`，仅保留完成状态且存在活动销课台账来源的训练；详情页只展示 workbench 与 confirmation 的真实学员交集。

## 数据流

```text
真实教练会话
  -> workbench + lesson-confirmation
  -> TS 合并活动、参与学员和课时余额
  -> WXML 全屏呈现
  -> POST/PATCH 真实销课调整
  -> 重新 GET 验证持久化结果
```

历史读取流：

```text
真实教练首页活动（最近 30 天）
  -> 完成状态训练活动
  -> 逐活动 GET lesson-confirmation
  -> 校验 app-client-lesson-${eventId}-${studentId} sourceId
  -> 历史列表 -> 活动详情
```

`lesson-confirmation.ledgers` 的后端形态是 `{ studentId, ledger: { balance, entries } }`。小程序 API 层必须展开 `ledger`，并从 `entries[].sourceId` 预计算 `sourceIds`；同时兼容历史扁平字段。

## 视觉映射

- 在线 Figma fileKey：`zZ6wKyOHKcO4UYXDd9jGwv`
- C5 原稿：`93:734`
- C5 待处理改版：`537:2`
- C5 历史改版：`537:79`
- C5.1 详情改版：`537:156`
- 页面使用 `app-header`、`role-tabbar`、`status-view`，不创建第二套导航系统。
- 历史页和详情页均为独立全屏路由；C5 待处理页提供“查看历史销课”入口，详情页提供“更正本次销课”入口。

## 回滚点

如果定向测试或运行态出现问题，只回滚本批限定文件；不回滚用户工作区已有的 API、持久化、测试和配置改动。
