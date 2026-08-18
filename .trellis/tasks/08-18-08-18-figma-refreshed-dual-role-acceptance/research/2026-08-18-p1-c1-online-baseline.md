# P1 / C1 在线基线与首批 C1 审计

## 在线来源

- 家长 P1：`zZ6wKyOHKcO4UYXDd9jGwv / 269:250 / P1 Schedule Home`。
- 教练 C1：`zZ6wKyOHKcO4UYXDd9jGwv / 93:578 / C1 Coach Schedule Home`。
- 两个节点均已在本任务启动时先调用 Figma `get_design_context`，后调用 `get_screenshot` 与 `get_metadata`。

## 本轮识别出的在线稿事实

- P1 在线 TabIconsOverlay 是四栏：日程、成长、我的孩子、发现；现有 `role-tabbar` 已具备该数据模型，不能使用旧离线图中的三栏画面反向删减。
- C1 在线 Date Strip 为 375×64，七天区域从 x=22 到 x=353，没有可见左右箭头。在线 Hero 为 x=16、343×180；统计胶囊和活动卡保持 x=22 的内容轨道。
- 真机/模拟器截图在物理状态栏以下有 44px 系统偏移；对照 Figma 无状态栏的设计坐标时，必须只将这部分视为系统壳层偏移，不能重复增加页面内安全区。

## C1 首批实现

- 可见的左右翻周字符移除，保留左右 22px 空白边缘的 `bindtap` 命中区，因此前/后周逻辑与现有测试不变。
- 顶栏左侧轨道从 22px 调整到 Figma 的 16px。
- 统计行补足上下留白；Hero 独立扩展至 x=16，活动卡仍在 x=22；Hero 与活动列表之间保持 12px 间距。
- 测试先红后绿：新增了 C1 日期条与轨道几何断言。定向 Vitest 为 11/11，TypeScript 通过，限定路径 `git diff --check` 通过。

## 运行态取证状态

- WeChatIDE MCP 状态正常、iPhone X 的 `windowWidth=375`、`windowHeight=812`，当前教练会话路由可读。
- 默认截图工具的 `waitForSelector="view"` 在当前 IDE 上超时；根因定位为 selector 等待未从 Automator 返回，而不是路由或连接错误。无 selector 的截图能生成 375×812 PNG，但只能在路由稳定并确认为非白屏后作为临时诊断证据。
- 调整前的有数据 C1 诊断截图：`tmp/figma-refresh-audit/runtime/C1-after-date-strip-20260818.raw.png`。
- 调整后 C1 截图在系统日切换到无日程的真实 empty state：`tmp/figma-refresh-audit/runtime/C1-after-geometry-20260818.raw.png`；它验证顶栏和日期条，不验证 Hero/活动列表的有数据内容态。
- 本轮不能声明 C1 全页视觉验收完成；待可读的有活动日期后，用稳定截图通道补取 Hero/统计/卡片状态。
