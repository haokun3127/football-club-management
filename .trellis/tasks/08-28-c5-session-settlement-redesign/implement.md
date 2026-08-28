# C5 销课流程实施计划

1. 为现有 C5 页面补充新版销课文案和可进入更正流程的回归断言。
2. 核对并保持 `lesson-correction` 的真实双读、幂等提交、重新读取和错误状态。
3. 仅在需要时修改 WXML/WXSS，使页面符合新版在线稿的全屏结构、返回键和底部操作区。
4. 运行 C5 定向测试和小程序 TypeScript 检查。
5. 用 `git diff --check` 检查限定路径，确认没有带入白名单外文件。
6. 更新 `docs/current/progress.md`，再执行路径限定提交。

验证命令：

```powershell
npx --yes pnpm@10.33.0 --filter miniprogram-cq-talent exec vitest run pages/coach/lesson/index.test.mjs pages/coach/lesson-correction/index.test.mjs
npx --yes pnpm@10.33.0 --filter miniprogram-cq-talent exec tsc --noEmit
git diff --check -- apps/miniprogram-cq-talent/pages/coach/lesson apps/miniprogram-cq-talent/pages/coach/lesson-correction docs/current/progress.md
```
