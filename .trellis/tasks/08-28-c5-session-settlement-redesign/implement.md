# C5 销课流程实施计划

1. 为现有 C5 页面补充新版销课文案和可进入更正流程的回归断言。
2. 核对并保持 `lesson-correction` 的真实双读、幂等提交、重新读取和错误状态。
3. 修复小程序 API 层对嵌套 `lesson-confirmation.ledgers` 的归一化，保留余额和台账来源 ID。
4. 新增历史页：读取最近 30 天教练活动，筛选真实已完成且存在活动销课台账的训练。
5. 新增详情页：读取 workbench 与 lesson-confirmation，展示真实活动、训练内容、学员交集和更正入口。
6. 更新 `app.json` 路由及 C5 待处理页入口；仅在需要时调整 WXML/WXSS，保持全屏结构和底部安全留白。
7. 运行 C5 定向测试、小程序 TypeScript 检查、全仓门禁和 `git diff --check`。
8. 更新 `docs/current/progress.md`，再执行路径限定提交。

验证命令：

```powershell
pnpm --filter miniprogram-cq-talent exec vitest run pages/coach/lesson/index.test.mjs pages/coach/lesson-correction/index.test.mjs pages/coach/lesson-history/index.test.mjs pages/coach/lesson-detail/index.test.mjs utils/api.test.mjs
pnpm --filter miniprogram-cq-talent exec tsc --noEmit
pnpm run check
git diff --check -- apps/miniprogram-cq-talent/app.json apps/miniprogram-cq-talent/utils/api.ts apps/miniprogram-cq-talent/utils/types.ts apps/miniprogram-cq-talent/pages/coach/lesson apps/miniprogram-cq-talent/pages/coach/lesson-history apps/miniprogram-cq-talent/pages/coach/lesson-detail docs/current/progress.md .trellis/tasks/08-28-c5-session-settlement-redesign
```
