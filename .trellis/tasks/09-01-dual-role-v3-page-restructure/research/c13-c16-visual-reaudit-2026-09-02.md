# C13–C16.4 在线 Figma 与运行态复核（2026-09-02）

## 环境证据

- 微信开发者工具 MCP 状态：已登录，`tokenRequired=false`，skill `0.3.9`。
- 模拟器：iPhone X，`375×812`，基础库 `3.17.0`。
- 四页首屏均通过 `automation_navigate(reLaunch)` 成功打开，并用 `simulator_screenshot` 取得原始 PNG；截图均写入 `C:\Users\ASUS\AppData\Local\Temp`。
- C16.4 额外执行 `pageScrollTo(360)` 取得底部证据；已知错误过滤（`error|exception|fail|undefined|wx:else|route is not defined|appid missing|not-found`）无命中。

## C13–C15.1

| 页面 | 在线 Figma 节点 | 运行路由 | Figma 证据 | 运行证据 | 结论 |
| --- | --- | --- | --- | --- | --- |
| C13 学员雷达 | `1909:2` | `/pages/coach/student-radar/index?source=goal` | `C:\Users\ASUS\AppData\Local\Temp\figma-live-C13-20260902.png` | `C:\Users\ASUS\AppData\Local\Temp\wechatide-simulator-screenshot-1788292814494-x0vf53.png` | 顶栏、学员选择、深色雷达卡、维度评分、能力评语和教练 TabBar 结构一致；学员、维度数量和分数来自真实 API。 |
| C14 能力评估 | `1619:2` | `/pages/coach/team-ability/index` | `C:\Users\ASUS\AppData\Local\Temp\figma-live-C14-20260902.png` | `C:\Users\ASUS\AppData\Local\Temp\wechatide-simulator-screenshot-1788292822261-gy0lsq.png` | 训练球队上下文、雷达卡、全员四列选择和 TabBar 位置一致；当前球员、姓名和真实雷达分数不同属于 API 数据。 |
| C15 能力评估录入 | `1623:2` | `/pages/coach/assessment-entry/index?templateId=assessment-template-technical&title=体能综合评估` | `C:\Users\ASUS\AppData\Local\Temp\figma-live-C15-20260902.png` | `C:\Users\ASUS\AppData\Local\Temp\wechatide-simulator-screenshot-1788292830287-utsxqr.png` | 固定高度指标面板、训练球队上下文、当前球员指标和全员选择结构一致；Figma 示例有 3 项指标，真实模板当前只有 1 项，未伪造补齐。 |
| C15.1 评估提交 | `1913:2` | `/pages/coach/assessment-submit/index?title=体能综合评估&count=2` | `C:\Users\ASUS\AppData\Local\Temp\figma-live-C15-1-20260902.png` | `C:\Users\ASUS\AppData\Local\Temp\wechatide-simulator-screenshot-1788292837998-suycgg.png` | 成功图标、标题区、结果卡、主次按钮和 TabBar 结构一致；标题、状态、人数和副文案由真实提交上下文决定。 |

## C16.1–C16.4

| 页面 | 在线 Figma 节点 | 运行路由 | Figma 证据 | 运行证据 | 结论 |
| --- | --- | --- | --- | --- | --- |
| C16.1 权限范围 | `1917:7` | `/pages/coach/permissions/index?source=goal` | `C:\Users\ASUS\AppData\Local\Temp\figma-live-C16-1-20260902.png` | `C:\Users\ASUS\AppData\Local\Temp\wechatide-simulator-screenshot-1788293000800-q0zpnq.png` | 说明卡、五行开关、保存按钮和 TabBar 对齐；开关开闭状态取自真实会话。 |
| C16.2 私教兴趣 | `1919:7` | `/pages/coach/private-interest/index?source=goal` | `C:\Users\ASUS\AppData\Local\Temp\figma-live-C16-2-20260902.png` | `C:\Users\ASUS\AppData\Local\Temp\wechatide-simulator-screenshot-1788293008604-k3suvm.png` | 说明卡、预约开关、7 列×4 行时段格、周末灰态、费用说明和 TabBar 对齐；当前能力状态遵循真实 API。 |
| C16.3 账号设置 | `1921:7` | `/pages/coach/account/index?source=goal` | `C:\Users\ASUS\AppData\Local\Temp\figma-live-C16-3-20260902.png` | `C:\Users\ASUS\AppData\Local\Temp\wechatide-simulator-screenshot-1788293016035-75kp0y.png` | 资料卡、手机号/微信绑定、密码、设备和清除缓存入口结构一致；姓名、球队和脱敏手机号为真实账号数据。 |
| C16.4 帮助中心 | `1923:7` | `/pages/coach/help/index?source=goal` | `C:\Users\ASUS\AppData\Local\Temp\figma-live-C16-4-20260902.png` | 首屏 `C:\Users\ASUS\AppData\Local\Temp\wechatide-simulator-screenshot-1788293023827-5cfe52.png`；滚动底部 `C:\Users\ASUS\AppData\Local\Temp\wechatide-simulator-screenshot-1788300102183-u1mjbq.png` | 搜索、六张快速入口、FAQ、联系支持和 TabBar 结构一致；Figma 原图高于 812px，联系支持区通过滚动截图复核。FAQ 文案来自真实服务数据。 |

## 处理结论

- 本批没有确定性视觉/交互缺陷，不修改业务代码、API、角色会话、生产数据库或在线 Figma。
- 不把 Figma 示例中的姓名、评分、开关状态、指标数量、提交人数和 FAQ 文案写入代码。
- 下一批继续复核尚未重新取得当前证据的家长端/教练端页面；若发现结构性差异，再按“在线稿 → 最小代码修复 → 定向验证 → 新截图”闭环处理。

## 2026-09-02 Coach V6 当前目录截图补齐

本次通过在线 Figma 当前文件重新读取 Coach V6 目录中的剩余页面；以下证据对应 V6 新节点，不再把旧 `93:*` 节点当作当前目录入口：

| 页面 | Coach V6 节点 | Figma 证据 | 原生尺寸 |
| --- | --- | --- | --- |
| C13 学员雷达 | `1909:2` | `C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\figma-c13-v6-1909-2-20260902.png` | `375×908` |
| C15.1 评估提交 | `1913:2` | `C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\figma-c15-1-v6-1913-2-20260902.png` | `375×812` |
| C16 我的 | `1915:2` | `C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\figma-c16-v6-1915-2-20260902.png` | `375×812` |
| C16.1 权限范围 | `1917:7` | `C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\figma-c16-1-v6-1917-7-20260902.png` | `375×812` |
| C16.2 私教兴趣 | `1919:7` | `C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\figma-c16-2-v6-1919-7-20260902.png` | `375×812` |
| C16.3 账号设置 | `1921:7` | `C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\figma-c16-3-v6-1921-7-20260902.png` | `375×812` |
| C16.4 帮助中心 | `1923:7` | `C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\figma-c16-4-v6-1923-7-20260902.png` | `375×924` |

- 这些截图只证明在线 V6 设计基准已成功回读并保留原生画板尺寸；C13/C16.4 的长页面仍需用首屏与滚动段运行截图完成视觉验收，不能用一张 `375×812` 截图替代整页。
- 本轮没有修改小程序代码，也没有覆盖旧 Figma 页面；页面权限通过浏览器文件级编辑控件核实，MCP `whoami` 的团队席位仍单独记录为 `View`。

## 2026-09-02 V6 运行态复拍

- C13 真实路由 `/pages/coach/student-radar/index?source=goal` 通过 WeChatIDE MCP 重新打开，截图 `C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\runtime-c13-v6-20260902.png`，严格 `375×812`。顶栏、学员切换、深色雷达卡、维度评分和教练 TabBar 均正常；当前账号返回 8 个维度，在线 V6 示例为 6 个维度，属于真实数据密度差异，未硬编码示例值。
- C16.4 真实路由 `/pages/coach/help/index?source=goal` 通过 WeChatIDE MCP 重新打开，首屏截图 `C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\runtime-c16-4-v6-20260902-top.png`，滚动截图 `C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\runtime-c16-4-v6-20260902-bottom.png`，均严格 `375×812`。搜索、六个快速入口、FAQ、联系支持和固定教练 TabBar 均可见；真实 FAQ 返回 5 条而在线示例为 3 条，属于服务数据差异。
- 当前模拟器日志过滤 `error|exception|fail|undefined|wx:else|route is not defined|appid missing|not-found` 无命中。本轮未发现确定性的顶栏、TabBar、布局或滚动遮挡问题，也没有修改业务代码、API 或生产数据。
