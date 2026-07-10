# 技术设计

## Domain

`TacticalBoard` 以 eventId 唯一，保存 formationName、pitchType、players、updatedByCoachId、updatedAt。`TacticalBoardPlayer` 保存 studentId/displayName/avatarUrl/role/positionLabel/x/y。坐标使用归一化值，不保存像素。

`FormationTemplate` 是只读配置，包含 name/label/positions；阵型模板只生成默认位置，不覆盖已保存快照。

## Persistence

新增 `tactical_boards` 表，以 `(club_id,event_id)` 唯一，players JSON 通过 repository 编解码。PUT 在事务中 upsert；GET 优先持久化快照，无快照时返回 roster＋默认阵型但 `saved=false`。

## BFF

- `GET .../coach/tactical-board/formations`
- `GET .../coach/events/:eventId/tactical-board`
- `PUT .../coach/events/:eventId/tactical-board`

复用 app-client/coach/event 权限检查。非比赛 -> `invalid_tactical_board_event`；完赛/取消写入 -> `tactical_board_read_only`；非法 roster/coords -> `invalid_tactical_board_snapshot`。

## Mini-program

球场使用 `movable-area/movable-view` 或等价原生能力。页面把相对坐标乘球场可用尺寸渲染，change/end 时反算并 clamp。替补池支持点选加入空位或拖入；阵型切换需要未保存确认/显式应用。

入口携带 eventId。页面加载 workbench/board/formations；保存走幂等 PUT。`completed/cancelled` 显示只读 badge，隐藏保存/重置。

## Figma

基于 C7 视觉语言重做而非照搬：白色 AppHeader、绿色球场、品牌红球员、真实替补池、阵型 segmented control、底部 Save/Reset。删除对方蓝队、绘制/撤销/分享/录像。

## 风险

拖拽和滚动冲突、坐标换算、横竖屏尺寸、JSON 持久化和权限是高风险。必须先纯函数/组件 PoC，再接真实写入。
