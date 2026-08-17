# C14 执行计划

1. 重新读取在线 Figma `93:1106`，确认当前映射、页面路由和设计尺寸。
2. 使用真实教练会话导航到 `pages/coach/team-ability/index`，保存首屏 `375×812` 截图；必要时滚动保存下半段。
3. 与设计稿逐模块对照；先记录真实数据/系统壳层差异，再对确定的页面级差异做红→绿最小修复。
4. 运行 C14 测试、小程序 typecheck、全仓 `npx --yes pnpm@10.33.0 run check` 和 `git diff --check`。
5. 更新 C14 规格与 `docs/current/progress.md`，归档任务，路径限定提交并推送；完成后进入 C15。
