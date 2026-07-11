# 重庆天才战术板 MVP 实施与验证

日期：2026-07-11

## 完成范围

- domain 新增 TacticalBoard、TacticalBoardPlayer、FormationTemplate，并提供 4-3-3、4-4-2、3-5-2 三套 11 人相对坐标。
- SQLite migration `0006_tactical_boards.sql`、repository 和 store 持久化完成，以 clubId/eventId 唯一保存 JSON 球员快照。
- app-client BFF 提供 formations GET、board GET/PUT；复用教练活动权限，家长拒绝、非比赛拒绝、完赛/取消只读。
- 小程序新增绿色竖屏球场、阵型切换、真实首发/替补、场上拖拽、换位、保存、重置、未保存/已保存/只读状态。
- 比赛活动工作台和比赛录入页均已加入战术板入口；没有家长入口、画线、录像、分享或多人协作。

## 验证结果

- domain 18 个测试、API 57 个测试、小程序 5 个测试全部通过。
- repository 测试关闭 SQLite 后用同一路径重开，仍恢复 x=0.42 的快照。
- API contract：3 个阵型均 11 个位置；非法 roster/重复/越界由 domain 校验；家长 403；完赛 PUT 409 `tactical_board_read_only`。
- DevTools：真实 25 人 roster 拆为 11 首发＋14 替补；拖拽、保存、重置再保存后 dirty=false；画布测量和相对坐标往返通过。
- 小/中/大三种球场宽度 280/340/430 px 的相对坐标往返测试通过。
- 全仓 `pnpm check`、19 项 app-client smoke、DevTools open/preview 通过；预览包体 215.6 KB。

## Figma

- 原节点 `93:877` 改名为 `LEGACY / C7 Tactical Board PoC`。
- 新增 `CODE / C7 Tactical Board MVP` 节点 `233:2`，与代码一致展示绿色球场、真实名单、替补席、阵型、保存和重置。
- DevTools 截图位于教练 UI 任务 `research/screenshots/coach-07-tactical-board.png`。
