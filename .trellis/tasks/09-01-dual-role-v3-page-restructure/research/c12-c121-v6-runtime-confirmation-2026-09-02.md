# C12 / C12.1 V6 与真实运行态确认（2026-09-02）

## 设计基准

- C12：在线 Figma `zZ6wKyOHKcO4UYXDd9jGwv / 1905:2`，原生 `375×894`。
- C12.1：在线 Figma `zZ6wKyOHKcO4UYXDd9jGwv / 1907:2`，原生 `375×812`。
- C12 的设计语义是批量项目评分：任务摘要、待录入学员卡片、当前指标输入、缺测操作、指标分组/前后项导航、固定保存区和教练 TabBar。
- C12.1 是同一批量录入页的本机草稿恢复遮罩，不是独立的服务端提交成功页。

## 真实运行验证

- 微信开发者工具 MCP 状态：已登录，`tokenRequired=false`，技能版本 `0.3.9`。
- 真实路由：`/pages/coach/test-entry/index?eventId=event-cq-talent-secure-test-1-trn-0818`。
- 设备信息：iPhone X，逻辑屏幕 `375×812`，SDK `3.17.0`。
- C12.1 恢复态截图：`C:\Users\ASUS\AppData\Local\Temp\wechatide-simulator-screenshot-1788310475651-krco7j.png`，严格 `375×812`。截图显示真实本机草稿恢复遮罩、继续录入/退出按钮和教练 TabBar。
- 点击真实页面的“继续录入”后，C12 截图：`C:\Users\ASUS\AppData\Local\Temp\wechatide-simulator-screenshot-1788310600067-2rkifr.png`，严格 `375×812`。截图显示项目评分录入顶栏、真实任务摘要、待录入学员批量卡片、指标输入/缺测状态、固定保存评分区和教练 TabBar。
- 页面根节点测得高度约 `1209px`，因此首屏之外仍属于长页面内容；本轮未把一张首屏图误称为整页证据。

## 口径结论

- C12 与 C12.1 的当前 V6 设计和真实路由实现均是“批量录入”流程，已不再存在“必须与 C15 单学员结构统一”的未决问题。
- C15 `/pages/coach/assessment-entry/index?templateId=<templateId>` 是另一条单学员指标卡流程；它与 C12 分工不同，不能用 C15 的版式反推 C12 缺陷。
- 运行截图中的任务名称、学员数量、已录入数量、真实指标值和本机保存时间来自真实 API/本机草稿；不以 Figma 示例数据替换。
- 未执行提交、删除草稿或生产数据写入；“继续录入”只关闭本机恢复遮罩。

