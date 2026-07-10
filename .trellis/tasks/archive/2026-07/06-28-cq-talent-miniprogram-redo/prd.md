# 重做重庆天才小程序 MVP

## Goal

按主项目产品文档和技术文档重做 `apps/miniprogram-cq-talent`，交付可被微信开发者工具导入、可连接本地 BFF 和导入测试数据模拟体验的重庆天才足球俱乐部小程序 MVP。当前演示壳中的可见 mock 角色选择、硬编码演示数据、页面内伪导航和 toast-only 主流程必须移除。

## Requirements

- 使用主项目 `/Users/dongjun/Documents/football-club-management`，不得以旧 worktree 作为来源。
- 保留微信原生小程序 + TypeScript、测试 AppID 和 DevTools 导入配置；不引入 Taro、uni-app、React/Vue 跨端框架。
- 启动必须先调用 app-client resolve，保存 `clubId/clientId/capabilities`，再根据后端/开发身份进入家长端或教练端。
- 生产 UI 不允许用户自行选择家长/教练身份；本地测试身份只能通过开发配置或隐藏调试方式控制。
- 家长端 Tab 为 `日程 / 成长 / 我的孩子`，只读展示孩子日程、活动详情、训练/比赛摘要、能力成长、课时和保险状态。
- 教练端 Tab 为 `日程 / 训练管理 / 我的`，展示今日/周课表、活动详情、点名、销课、比赛录入、训练内容、评测录入和权限范围。
- API 只能调用 app-client BFF；不得拼 admin API，不得在前端写死重庆天才 WPS 字段、评测字段或课时规则。
- 统一 `wx.request` 封装，携带 session、`clubId`、`clientId`、`requestId`；写操作预留 `Idempotency-Key`。
- `RadarCanvas` 使用微信原生 Canvas 2D 自绘，不引入 ECharts/F2/uCharts。
- 缺失 BFF 以明确待接入/待同步状态呈现，并更新 BFF gap 文档。

## Acceptance Criteria

- [x] 启动页无可见“家长 mock 登录/教练 mock 登录”按钮。
- [x] 页面模板和主 UI 不再硬编码演示学员/教练姓名。
- [x] dev 家长身份进入家长三 Tab；dev 教练身份进入教练三 Tab。
- [x] 真实 BFF 可用时，家长孩子、日程、成长雷达和教练课表/活动 workbench 从接口读取。
- [x] BFF 不可用或缺失时显示合规 loading/empty/error/pending 状态，不伪造业务结果。
- [x] 类型检查通过；微信开发者工具 CLI 已在 2026-06-28 完成 open/preview，2026-07-10 复验时本机 CLI 未登录。
- [x] 已使用会话 `019efcb5-8fe3-7951-a534-502d0abff8ce` 导入的 200 人数据作为主验收数据源完成模拟测试。

## Notes

- 基线文档：`docs/miniprogram-product-design-cq-talent.md`、`docs/miniprogram-development-workflow.md`、`docs/miniprogram-next-work-plan.md`、`docs/miniprogram-page-spec-cq-talent.md`、`docs/miniprogram-bff-gap-cq-talent.md`。
