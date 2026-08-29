# C7 Tactical Board 在线稿与运行态对照（2026-08-29）

## 权威来源

- Figma 文件：`zZ6wKyOHKcO4UYXDd9jGwv`
- 节点：`233:2 / CODE / C7 Tactical Board MVP`
- 在线截图：`c7-online.png`，严格 `375×812`
- 运行截图：`c7-runtime-final.png`，由 WeChatIDE MCP 取得，严格 `375×812`
- 真实路由：`pages/coach/tactical-board/index?eventId=event-cq-talent-secure-test-1-scheduled-match`

## 对照结论

在线稿结构为白色圆角顶栏、`MATCH TACTICS`、比赛标题/保存状态、48px 阵型卡、351×430px 绿色球场、单一边界线与中线、40px 红色球员圆点、86px 替补卡和底部两个 48px 操作按钮。

本轮修复了四处可验证差异：

1. 顶栏从 `content-box` 改为 `border-box`，使安全区 `padding-top` 不再把白色顶栏和后续内容额外撑高。
2. 标题改为在线稿文案“比赛战术板”，页面配置标题同步更新。
3. 删除在线稿不存在的三组球场圆形装饰；保留边界线和中线。
4. 按在线稿调整球员字号、阵型卡垂直间距、替补标题间距和替补圆点间距。

真实运行态当前返回 8 名真实球员，未复制在线稿示例姓名或强行补造 11 人；这是数据范围差异，不作为结构缺陷。C7 继续使用既有真实 API、角色守卫、拖拽、阵型、换位、重置、保存和只读语义。

## 验证证据

- C7 定向 Vitest：`6/6`
- WXML 编译：成功
- WXSS 编译：成功
- 模拟器错误过滤（`error|exception|wx:else|route is not defined|appid missing`）：无命中

## 结论

结构与样式修复已完成并取得可信 `375×812` 运行截图；真实球员数量按 API 返回保持，不以 Figma 示例数据替代。
