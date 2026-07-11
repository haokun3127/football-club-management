# 技术设计

## 页面策略

所有页面以当前 BFF/业务状态机为结构源，以 Figma 为视觉源。C1/C2/C6/C10/C12/C16 分别映射 schedule/event/match/training/test-entry/me；销课映射 C5。点名由 UI-1 交付。

## 动作与权限

UI 不重建权限逻辑；Task/workbench 返回的 nextAction/workflow/capabilities 是唯一动作来源。战术板入口由比赛类型、教练访问权和 board capability 决定。

## 长页面

训练内容和评测使用固定 SubmitBar＋底部占位；25 人/62 项在列表层做清晰状态，不一次渲染标签墙。失败保留本地状态并给单项重试。

## Figma 同步

更新旧 C1/C2/C6/C10/C12/C16 frames 的真实信息结构；C15 标注为 superseded，避免未来模型恢复旧评测方式。

## 风险

页面动作多且写入风险高。每页视觉改动后复跑对应 smoke/contract，不把视觉调整与业务重写混在同一次修改中。
