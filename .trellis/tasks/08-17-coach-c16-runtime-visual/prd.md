# Coach C16 runtime visual verification

## Goal

将教练端「我的」页（C16）在真实微信开发者工具 iPhone X 375×812 模拟器中，与在线 Figma 画板保持一致；修复已证实的顶栏高度错误，不改变已接入的真实教练会话、角色切换、退出登录、导航或后端数据。

## Requirements

- 设计权威：Figma 文件 `zZ6wKyOHKcO4UYXDd9jGwv`，节点 `93:1182`（C16 Coach Me）。
- 目标路由：`pages/coach/me/index`。
- 顶栏须按在线稿的 88px 高度渲染；微信原生胶囊区域仍由 `menuInset` 避让。
- 保留服务器返回的身份、球队和统计数据；不得伪造 Figma 样例中的教练姓名、球队或统计。
- 保留双角色入口仅对服务端确认的双角色会话显示，且所有既有四项菜单与退出登录行为不变。
- 视觉验收使用实际 iPhone X 375×812 模拟器截图；微信原生胶囊画面不作为像素差异判定对象。
- 不纳入本任务的文件和在途改动不得被暂存、回滚或覆盖。

## Acceptance Criteria

- [x] 在线 Figma `93:1182` 已在实施前读取并记录为此页权威基准。
- [x] C16 顶栏高度为 `88rpx` 且采用 `box-sizing: content-box`，不再叠加形成 176rpx 视觉高度。
- [x] 页面单元测试先以新约束失败，再在最小 WXSS 改动后通过。
- [x] 真实微信开发者工具截图为严格 375×812，且顶栏、内容起点、底部 tabbar 与在线稿的垂直结构一致；真实数据文案差异单独豁免。
- [x] 小程序定向测试通过；仓库 `npx --yes pnpm@10.33.0 run check` 已在无重叠进程的串行会话中执行并以 exit 0 结束。
- [ ] 若全仓门禁通过，则仅提交本任务产生的页面、测试、进度记录和任务记录，并推送至 `origin/dev`；若门禁失败，记录精确失败后保持任务待收尾。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
