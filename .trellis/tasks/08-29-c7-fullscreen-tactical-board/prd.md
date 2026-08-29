# C7 全屏战术板甲方改版

## Goal

按甲方已确认要求，先在唯一在线 Figma 文件建立新的 C7 全屏战术板，再将小程序改为：上半区足球场、下半区完整真实球员名单，教练可把球员拖拽上场或下场；场上和名单中的球员均以圆形头像为主视觉。

## Requirements

- 在线 Figma `zZ6wKyOHKcO4UYXDd9jGwv` 是唯一设计事实；旧 `233:2` MVP 保留为历史画板，不覆盖。
- 新页面不使用全局 TabBar 或弹窗，必须有全屏返回控制。
- 场上球员、替补和位置只读取真实战术板 API；不得将 Figma 示例球员写入前端或接口。
- 拖入球场、拖回下方名单、阵型切换、重置和保存必须保留现有 API 的保存/重启/读取闭环。

## Acceptance Criteria

- [ ] 在线 Figma 新增 C7 客户改版画板，明确“上球场、下全员名单、拖拽上/下场”。
- [ ] 小程序为全屏战术板，场地和名单均不被固定操作区遮挡。
- [ ] 只使用真实 roster/board 数据，保存后重启 API 仍可读取。
- [ ] 通过定向测试、TypeScript、WXML/WXSS、全仓门禁、`git diff --check` 和真实教练 `375×812` 截图。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
