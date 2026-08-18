# Figma refreshed dual-role full acceptance

## Goal

基于用户刚更新的在线 Figma，将重庆天才小程序的家长端和教练端逐画板复原到当前设计，并以真实运行态与代码/接口契约分别验收；在不覆盖既有在途改动的前提下持续推进到双端收口。

## Requirements

- 在线 Figma `zZ6wKyOHKcO4UYXDd9jGwv` 是唯一视觉权威；本地 PNG 仅用于识别在线稿变化，不能反向覆盖在线设计。
- 覆盖家长端 21 张画板（G1–G3、P1–P10 的全部变体）与教练端 28 张画板（C1–C16.4），以 `docs/design/specifications/figma-online-frame-map-2026-08-12.md` 的节点 ID 和路由为基准。
- 每个页面开工前重新读取对应在线节点的 design context 与 screenshot；先复用现有小程序组件、数据和 API 契约，再做最小必要样式或交互修复。
- 不伪造手机号、授权结果、session、角色或 API 响应；Figma 示例数据与真实数据不一致时，保留真实数据并在验收记录中标注数据差异。
- WXML 不能调用 `.map()`、`.filter()`、`.slice()`、`.indexOf()` 等 JavaScript 方法；展示模型由 TypeScript 预计算。
- 禁止覆盖或夹带既有未提交内容；所有提交必须路径限定 `git add <path>`，每批独立验证、独立提交。
- 可信视觉证据优先为 WeChatIDE MCP 的严格 `375×812` 模拟器截图。无法获得时只记录静态/功能验收，不将其表述为运行态视觉通过。

## Acceptance Criteria

- [x] 每个家长端与教练端画板均有当轮在线 Figma 读取记录，且确认路由、节点 ID、结构与数据豁免。
- [x] 所有发现的实现差异均已按最小批次修复，或被明确列为真实 API 数据/平台系统壳层的非 UI 缺陷。
- [x] 每一批代码改动通过相关小程序测试、TypeScript 检查与 `git diff --check`；最终运行全仓门禁。
- [x] 可截图的页面具有当前 `375×812` 运行态对照证据；无法取证的页面不伪造通过结论。
- [x] 每批次代码与任务/设计记录均单独提交，`docs/current/progress.md` 和相关 design spec 如实记录状态、证据与尚存限制。

## Notes

- 用户已明确授权目标模式自主推进，无需为各页重复请求实施确认；但涉及生产写入、身份授权、真实数据导入或删除性操作时仍须另行获得明确授权。
- 本任务只覆盖小程序双端 Figma 复原与验收，不借机扩大 API 功能、改动生产数据或重构无关模块。
- 结案注记：用户已明确允许本轮不将新增真实截图作为代码完成前置；P5 因当前 DevTools 为 coach-only 会话未取得合法 parent runtime PNG，已作为取证限制记录，未伪称像素级运行态通过。
