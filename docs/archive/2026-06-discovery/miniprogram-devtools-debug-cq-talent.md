# 重庆天才小程序 DevTools 调试记录

## 本机工具

- DevTools: `/Applications/wechatwebdevtools.app`
- CLI: `/Applications/wechatwebdevtools.app/Contents/MacOS/cli`
- 小程序项目：`/Users/dongjun/Documents/football-club-management/apps/miniprogram-cq-talent`

## 已执行

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli --help
pnpm --filter @football-club/miniprogram-cq-talent typecheck
```

`typecheck` 已通过。

2026-06-28 复测后，CLI 已可打开项目：

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli open --project /Users/dongjun/Documents/football-club-management/apps/miniprogram-cq-talent --port 9420
```

输出：

```text
IDE server started successfully, listening on http://127.0.0.1:9420
open
```

CLI preview 结果：

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli preview --project /Users/dongjun/Documents/football-club-management/apps/miniprogram-cq-talent --port 9420
```

当前能连接 IDE，但上传预览阶段提示“需要重新登录”。处理方式：在微信开发者工具 GUI 中重新登录账号后，再运行 preview。模拟器本地调试不受这个上传预览错误影响。

## CLI 历史卡点

执行：

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli open --project /Users/dongjun/Documents/football-club-management/apps/miniprogram-cq-talent
```

DevTools 提示：

```text
IDE service port disabled
工具的服务端口已关闭
```

曾在 CLI prompt 中确认开启，但等待 IDE port file 超时。已通过 GUI 设置解决。若复现，需要在 GUI 中确认：

```text
微信开发者工具 -> 设置 -> 安全设置 -> 服务端口 -> 开启
```

开启后再执行：

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli open --project /Users/dongjun/Documents/football-club-management/apps/miniprogram-cq-talent --port 9420
```

## 手动调试验收路径

1. 导入 `apps/miniprogram-cq-talent`。
2. 编译后进入启动页。
3. 启动页自动进入 dev 配置身份；默认确认进入家长日程。
4. 进入“成长”，确认雷达图出现。
5. 进入“我的孩子”，确认课时/保险只读。
6. 在启动页长按品牌区隐藏切换 dev 身份，或修改 `DEV_IDENTITY_ROLE = "coach"` 后重新编译，确认进入教练日程。
7. 进入“训练管理”，确认雷达图出现。
8. 进入“我的”，确认权限说明和私教意向占位。

## 真实数据体验

先启动 API：

```bash
DATABASE_URL=apps/api/data/dev.sqlite pnpm --filter @football-club/api db:migrate
DATABASE_URL=apps/api/data/dev.sqlite PORT=3000 HOST=127.0.0.1 pnpm --filter @football-club/api dev
```

体验身份：

- 家长：`DEV_IDENTITY_ROLE = "parent"` 或启动页隐藏切换到家长，请求头使用 `X-User-Id: user-parent-1`。
- 教练：`DEV_IDENTITY_ROLE = "coach"` 或启动页隐藏切换到教练，请求头使用 `X-User-Id: user-coach-1`。

可见数据：

- 家长孩子：`student-1`，姓名“李明”。
- 家长日程：`event-training-1`、`event-match-1`。
- 教练日程：`2026-07-01` 的 `event-training-1`。

## P0/P1 调试重点

- P0：`resolve`、dev 身份、角色守卫、家长/教练页面入口、请求头。
- P0：点名、销课、比赛录入 BFF 补齐后替换占位提示。
- P1：家庭聚合日程、提醒中心、内容/Banner、训练内容树、测试任务自动保存。

## 导入数据模拟测试

开发完成后的主验收数据源使用会话 `019efcb5-8fe3-7951-a534-502d0abff8ce` 已完成导入的真实测试数据。

- 家长端验收：孩子绑定、家庭日程、训练/比赛详情、课时/保险、成长雷达、训练历程、指标下钻。
- 教练端验收：今日/周课表、活动 workbench、点名名单、销课名单、比赛录入入口、评测表单、学员雷达。
- 对比导入表格关键字段是否通过 BFF 投射到小程序，不在前端硬编码 WPS 字段。
