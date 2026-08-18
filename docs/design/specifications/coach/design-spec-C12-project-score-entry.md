# Figma 画板规格：C12 Project Score Entry

## 在线设计基准

- Figma file：`zZ6wKyOHKcO4UYXDd9jGwv`
- 节点：`93:1030`（`C12 Project Score Entry`）
- 真实验收路由：`pages/coach/test-entry/index?eventId=event-cq-talent-demo-training-upcoming`

## 375×812 几何契约

- 顶栏：软粉 `#fceeef`，总包络 88px；左侧返回/`项目评分录入`，右侧提交并避开微信胶囊。
- 任务摘要卡：`331×96px`，`x=22px`、顶栏后 `16px`，深色 `#07111f`、圆角 16px。
- 学员区：任务卡后保留 20px 间距，列表自身有 8px 内上边距与 16px 左右 gutter；首屏先显示待录入学员，项目分组和上一项/下一项导航不应挤占首屏。
- 学员卡：白色圆角 12px 的紧凑行；真实字段可超过画板示例长度，但标签必须由 TypeScript view model 预计算并单行截断，不能把卡片撑高。
- 保存区：固定在教练 TabBar 之上；按钮为深红 `#a80f1b`，TabBar 高 70px。

## 实现与真实数据边界（2026-08-17）

- 真实教练活动返回 16 名学员、62 个评分项和当前评测模板；任务名、活动名、学员姓名、字段名称、0/992 进度及空分数均保留真实响应，不以 Figma 示例数据替换。
- `MetricCell.displayLabel` 在 TypeScript 中从真实字段预计算；WXML 不调用数组方法。字段导航保留原有 handler 和真实草稿/提交链路，但被放到学员列表之后。
- 修复了自定义顶栏将 `176rpx` 内容高度与动态 `navInset` 叠加、把正文下推一个状态栏高度的问题；C12 采用现有 `content-box` 安全区模式，内容区高度为 `88rpx`，不重新引入 `176rpx` 残留值。
- 任务卡固定为 96px 并截断过长标题；学员列表补回 Figma 的 8px 内上边距。评分 API、草稿键、角色守卫、缺测语义和提交行为均未改动。

## 运行态视觉复验

- 在线稿：`tmp/coach-runtime-acceptance/C12-figma-online-20260817.png`
- 真实 375×812 模拟器图：`tmp/coach-runtime-acceptance/C12-acceptance-phone-final.png`
- 并排对照：`tmp/coach-runtime-acceptance/C12-acceptance-compare-final.png`
- 判定：顶栏、任务卡、学员标题、首张学员卡、固定保存区与教练 TabBar 的层级和几何已复验。iPhone 状态栏/微信胶囊，以及真实任务、学员、指标和分数数据属于系统层或真实数据差异，不作为页面视觉缺陷。

## 回归验证

`npx --yes pnpm@10.33.0 --filter @football-club/miniprogram-cq-talent test -- pages/coach/test-entry/index.test.mjs`

`npx --yes pnpm@10.33.0 --filter @football-club/miniprogram-cq-talent typecheck`

`git diff --check`

`npx --yes pnpm@10.33.0 run check`

> 2026-08-17 串行复跑全仓门禁通过：domain `19/19`、mini-program `332/332`、API `105/105`，退出码 `0`。C12 定向 Vitest 最新为 `18/18`；此前 API SQLite 重开超时属于旧并发检查记录，已不再代表当前门禁状态。

## 更新后在线稿复核与真实数据收口（2026-08-18）

- 本轮再次读取在线唯一基准 `zZ6wKyOHKcO4UYXDd9jGwv / 93:1030 / C12 Project Score Entry`，并取得原尺寸 `375×894` 在线截图。顶栏、96px 摘要卡、待录入学员区、固定保存区及三栏 TabBar 的首屏结构仍以在线稿为准。
- 初次按旧记录打开 `event-cq-talent-demo-training-upcoming` 时，真实后端返回 `403 Event is not accessible for this coach membership`；这是该活动属于另一教练会籍的访问控制，不是页面渲染故障。改用当前认证教练可访问的 `event-cq-talent-secure-test-1` 后，工作台和评分表单均能真实加载。
- 真实八维表单中的 `Secure player 1-3` 等长姓名曾被固定 `112rpx` 头像/姓名区域和 `word-break: break-all` 挤成竖排。现将区域锁定为 `140rpx` 并对姓名使用单行省略，保留四列评分格和 Figma 首屏密度；不截断 API 数据、不改变草稿或提交契约。
- 可信运行态图为 `tmp/coach-runtime-acceptance/C12-20260818-after-long-name-fix.png`，同目录 sidecar 证实路由 `/pages/coach/test-entry/index` 与严格 `375×812`；在线稿和复验对照分别为 `C12-20260818-figma-online.png`、`C12-20260818-after-long-name-fix-compare.png`。真实模板标题、评分项、`0 / 496` 进度、姓名与分数均属于数据差异。
- 验证按红→绿完成：新增回归测试先失败，再修复后 C12 定向 Vitest `19/19`、小程序 TypeScript `tsc --noEmit` 与 `git diff --check` 通过。
