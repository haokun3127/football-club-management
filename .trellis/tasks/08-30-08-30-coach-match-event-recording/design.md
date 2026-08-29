# 设计方案：教练端比赛记录与事件录入

## 页面与导航

- `pages/coach/match/index` 对应 Figma C6 `93:796`：保留浅粉顶栏、深色比赛摘要、比分胶囊、比赛事件时间线和红色描边“+ 添加事件”卡片；增加清晰的编辑比赛入口，写权限不足时不显示写操作。
- `pages/coach/match-event-add/index` 对应 Figma C6.1 `93:827`：全屏页面，顶栏返回、事件类型 chips、分钟、球员、备注和红色提交按钮。
- `pages/coach/match-edit/index` 负责比赛摘要和比分编辑，保存后回到 C6，并由 C6 重新 GET。

## 数据契约

事件保存继续使用现有 `POST /coach/matches/:matchId/events` 契约及幂等键；新增 `foul` 为正式的 `MatchEventType`，同步：

- `packages/domain/src/match.ts` 与 match services 的类型/校验
- `apps/api/src/http/schemas.ts`、`apps/api/src/routes/app-client.routes.ts` 的枚举和路由校验
- capability policy / seed 的可用类型声明
- 小程序 `utils/types.ts`、事件标签、颜色及草稿校验

犯规只记录事件，不生成球员能力指标；进球、助攻、黄牌、红牌、乌龙沿用现有领域映射。

## 持久化与兼容

- 不修改持久化层结构；事件类型为字符串枚举，旧记录必须继续可读。
- 不把 `foul` 自动写入生产数据；生产策略是否启用由受控部署/迁移另行决定。
- 通过现有 API build 和实际教练会话验证，禁止使用模拟 response 代替。

## 风险与回滚

- 风险：domain、API、前端枚举不一致导致 400 或页面无法提交。通过定向测试和全仓门禁拦截。
- 风险：模拟器缓存旧 bundle。提交后先让用户点击“编译”，再用 WeChatIDE MCP 截图。
- 回滚点：C6/C6.1 代码批次单独提交；不触碰现有 C7 和用户未提交改动。
