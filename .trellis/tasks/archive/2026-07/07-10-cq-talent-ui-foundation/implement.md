# 执行计划

1. 读取适用 Trellis specs、Figma component variants 和当前小程序组件契约。
2. 建立 Contract Tokens，更新 API seed theme、config、app/window 基础色和文档口径。
3. 本地化基础图标，实现 AppHeader 并补微信窗口/胶囊类型。
4. 重构 RoleTabBar、StatusView；新增 StatusChip、ActivityCard、StudentSwitcher、SubmitBar。
5. 适配 Launch/Login，保留真实登录状态机。
6. 适配 Attendance 的摘要、名单行、固定提交和成功/失败状态。
7. 静态搜索旧颜色、临时 Figma URL和技术文案；修复遗留。
8. 运行 typecheck/tests，启动隔离 API，执行 app-client smoke。
9. DevTools 打开并逐个检查 Launch/Login/Attendance、胶囊、安全区、Tab 栈和多尺寸布局。
10. Trellis check、更新 durable spec、提交并归档；再进入 UI-2/UI-3/战术板。

## 验证命令

```bash
pnpm check
pnpm --filter @football-club/miniprogram-cq-talent smoke:app-client
pnpm --filter @football-club/miniprogram-cq-talent devtools:preview
rg -n "#E60012|#C4000F|#FFF1F0|figma.com/api/mcp/asset|BFF|接口待接入|后端|PATCH" apps/miniprogram-cq-talent apps/api/src/seed docs/miniprogram-page-spec-cq-talent.md
```

## 回滚点

- Token/theme 一批提交；共享组件一批提交；三张首批页面一批提交，便于定位视觉或路由回退。
- UI-2/UI-3 不在本任务修改，防止基础组件和业务页面同时失控。
