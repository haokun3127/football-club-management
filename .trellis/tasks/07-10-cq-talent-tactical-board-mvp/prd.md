# 重庆天才战术板MVP

## Goal

把 Figma `C7 Tactical Board PoC` 重构为可用的比赛日战术板 MVP：教练从比赛活动进入，使用真实参赛名单和阵型模板拖拽排位，以相对坐标持久化本场快照；家长不可见、无权限不可编辑、比赛结束后只读。

## Requirements

- 新增 domain 类型 `TacticalBoard/TacticalBoardPlayer/FormationTemplate`，坐标限制为 `0..1`，球员角色为 starter/substitute/reserve。
- 新增 SQLite 持久化和 repository；重启 API 后快照仍可读取，不以进程内 Map 冒充完成。
- 新增 app-client BFF：formations GET、event tactical-board GET/PUT；沿用 club/client/coach auth、Idempotency-Key 和错误格式。
- 仅有 event 权限的教练可读写；家长不可见；非比赛活动首版拒绝编辑；completed/cancelled 比赛只读。
- formation templates 至少覆盖 4-3-3、4-4-2、3-5-2，返回 11 个标准相对位置；真实 roster 中其余学员进入替补池。
- PUT 校验 formation、学生属于本场可见 roster、studentId 唯一、坐标有限且在 0..1、角色有效；后端写 updatedByCoachId/updatedAt。
- 新增 `pages/coach/tactical-board/index`，使用绿色竖屏球场、真实头像/姓名缩写、替补池、阵型选择、拖拽、球场内移动、保存、重置和未保存提示。
- 拖拽使用相对坐标，页面滚动在拖拽期间禁用；不同屏幕还原位置。
- 比赛工作台/比赛录入显示战术板入口；无权限隐藏或禁用并给业务化原因。
- 不实现画线、录像、分享、多端协同、自动生成比赛事件或家长入口。
- 更新 Figma C7：绿色球场、真实名单/替补池、阵型选择、保存/重置、只读状态；删除固定双队 11 人和画线/分享/录像。

## Acceptance Criteria

- [ ] formations API 返回至少三套合法模板和 11 个 `0..1` 位置。
- [ ] 有权限比赛教练可读取、拖拽、保存、重进恢复和重置；API 重启后数据仍存在。
- [ ] 25 人 roster 中 11 人可按阵型上场，其余在替补池；重复/越界/非名单学生写入被拒绝。
- [ ] 家长、无权限教练、非比赛活动不能编辑；完赛/取消比赛只读。
- [ ] 拖拽不误滚页面，小屏/常规屏/大屏还原位置一致。
- [ ] 页面不包含画线、录像、分享、多协同或家长入口。
- [ ] Figma C7 与最终 MVP 结构同步，DevTools 截图通过。
- [ ] domain/API/小程序类型检查、repository/contract/纯函数测试和 smoke 通过。
