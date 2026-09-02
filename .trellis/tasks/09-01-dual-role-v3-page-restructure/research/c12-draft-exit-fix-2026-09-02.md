# C12/C12.1 草稿退出运行态修复（2026-09-02）

## 重现

- 路由：`/pages/coach/test-entry/index?eventId=event-cq-talent-secure-test-1-trn-0818`
- 直接 `reLaunch` 打开页面时，存在本机草稿会显示 C12.1 恢复遮罩。
- 点击“退出”后，微信开发者工具没有返回栈，`wx.navigateBack({ delta: 1 })` 不会离开页面；旧实现已经把 `draftExitInProgress` 置为 `true`，因此遮罩和底层录入状态会永久卡住。

## 最小修复

`exitDraft()` 现在在调用返回前关闭遮罩，并恢复“项目评分录入”、可提交状态和提交按钮样式；草稿内容不清除。这样正常入口仍会返回上一页，直接打开或自动化验收入口没有返回栈时也能继续录入。

## 证据

- 修复前 C12.1 遮罩：`C:\Users\ASUS\AppData\Local\Temp\wechatide-simulator-screenshot-1788312558838-0tsoqy.png`，`375×812`。
- 修复后 C12 录入页：`C:\Users\ASUS\AppData\Local\Temp\wechatide-simulator-screenshot-1788312568988-tqevo1.png`，`375×812`。
- 运行时断言：`draftResumeVisible=false`、`canSubmit=true`、`navTitle=项目评分录入`；无返回栈时页面仍停留在 C12，但不再被遮罩阻塞。

## 验证

- C12 定向 Vitest：`19/19`。
- 小程序 TypeScript：`tsc --noEmit` exit `0`。
- 微信开发者工具 MCP WXML 编译：成功，`codeLength=32400`。
- 微信开发者工具 MCP WXSS 编译：成功，`files=2`。
