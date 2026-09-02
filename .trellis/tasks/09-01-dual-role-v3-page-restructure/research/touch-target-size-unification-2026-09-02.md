# 双端可点击性尺寸统一（2026-09-02）

## 范围

- 在线 Figma：`zZ6wKyOHKcO4UYXDd9jGwv`
- Parent V6：`1609:2`，抽查 P1 `1610:2`
- Coach V6：`1609:3`，抽查 C1 `1610:1323`
- 目标：在保持 375×812 页面骨架、TabBar 高度和 Figma 比例的前提下，统一提升文字可读性与交互命中区。

## Figma 修改

- Parent V6 与 Coach V6 的可见小字号文案按 9–16px 范围小幅上调，最低保持 11px，避免继续出现难读的 9–10px 辅助文字。
- P/C V6 中的铃铛动作框调整为 40×40px，内部图标保持居中；底部 TabBar 可视项高度统一到 70px，图标框调整为 20×20px。
- 周/月切换与返回箭头的文字可见尺寸提高到至少 22px；页面整体仍保持原生 375×812。
- Figma 回读截图：P1 `1610:2` 与 C1 `1610:1323` 均返回原生 `375×812`，未发现画板越界。

## 小程序修改

- `app.wxss`：正文 `30rpx`、辅助文字 `26rpx`、标签/说明基准提升，通用按钮与页面底部安全预留同步增大。
- `components/app-header/index.wxss`：返回动作区 `80rpx`（内部图标通过 padding 保持原视觉尺寸），文字动作 `80rpx` 高，图标动作 `80rpx` 命中区，胶囊动作 `64rpx` 高。
- `components/role-tabbar/index.wxss`：整项命中区覆盖 `140rpx`，图标框 `40rpx`、图标 `36rpx`、标签 `20rpx`，保留 70px TabBar 外壳。
- `components/status-chip/index.wxss`、`components/activity-card/index.wxss`、`components/student-switcher/index.wxss`、`components/submit-bar/index.wxss`：胶囊、卡片动作、学员选择和提交按钮提升到可稳定点击的尺寸。
- `styles/tokens.wxss`：同步正文、辅助、说明字号 token。

## 验证

- 共享组件测试：`10/10`。
- 小程序全量 Vitest：`448/449`；唯一失败为未触碰的 `pages/coach/schedule/seven-day-strip.test.mjs` 旧 CSS 断言，断言期望旧 `.c1-week-nav` 片段，属于工作区既有问题，未在本批修复。
- 小程序 TypeScript：通过。
- WXML/WXSS 编译：通过。
- `git diff --check`：通过。
- Coach C1 WeChatIDE MCP 截图：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\touch-target-coach-2026-09-02.png`，严格 `375×812`，未见顶栏、TabBar 或文字溢出。
- Parent P1 直接导航时当前运行会话为教练角色，返回空白，不能将本批标为家长端真实截图验收通过；共享代码已同步，需在家长会话下复拍。
