# V3 双端页面重组与改版 — 设计方案

## Information architecture

Figma 保持历史页 `05 Parent Generated` / `06 Coach Generated` 原样；新增两个 page 作为当前产品唯一入口：

| Current page | Purpose | Current screens |
| --- | --- | --- |
| `10 Current Product · Parent V3` | 家长端当前可交付流程 | P1 周／月历／空态、P4 成长、P5 雷达、P8 发现、P7 我的孩子 |
| `11 Current Product · Coach V3` | 教练端当前可交付流程 | C1 全部球队日程、C2 工作台、C4 点名、C6 比赛、C7 战术、C8/C8.1 训练管理选队、C14 能力、C16 我的 |

每页使用左到右的流程网格：顶部总览、第二行主入口、第三行详情/操作状态。画板名称采用 `P1 · Schedule · Week` 这种可读前缀，并在描述中存放小程序路由、Figma 来源节点和验收状态。

## Reuse and boundaries

- 优先克隆已经在线回读的 V3 节点，而不是从历史 CODE 画板拷贝视觉；P1 来源 `1442:185`／`1444:185`／`1442:351`，C1/C8/C8.1 来源 `1364:8`／`1364:151`／`1364:253`。
- 对尚无当前 V3 稿的画板，先读取当前在线稿和对应小程序实现；新增改版稿标为 `Pending implementation`，直到真实 `375×812` 小程序截图完成对照。
- 总览中只放导航和治理信息，不作为小程序前端画面，也不创建新的全局组件或变量库；已有组件/图标继续复用。

## Interaction decisions

- Parent: 日程默认周条，展开才显示月历；底栏顺序 `schedule → growth → discover → child`。
- Coach: C1 为所有受权限约束的课程时间线；C8 才持有训练队伍选择，其 id 影响训练、点名、测评和统计，不改变 C1。
- 数据示例只表达布局密度，任何代码实现仍要读取真实 API，不把名称、队伍或数量硬编码为设计稿。

## Rollback

本轮只追加两个 Figma page 和新画板。若任一新稿方向被否决，删除这两个新增 page 即可恢复，旧画板与小程序不受影响。
