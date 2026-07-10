# 重庆天才小程序可试用版

微信原生小程序 + TypeScript。当前覆盖家长与教练主流程、评测草稿、雷达下钻和微信登录绑定结构。

## 导入微信开发者工具

1. 打开微信开发者工具。
2. 选择“导入项目”。
3. 项目目录选择：

   ```text
   /Users/dongjun/Documents/football-club-management/apps/miniprogram-cq-talent
   ```

4. `project.config.json` 当前使用本地测试 AppID。真实联调时替换为重庆天才小程序正式 appId。

## 命令行调试

本机 DevTools CLI 位于：

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli
```

打开项目：

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli open --project /Users/dongjun/Documents/football-club-management/apps/miniprogram-cq-talent
```

复跑登录、打开和预览检查：

```bash
pnpm --filter @football-club/miniprogram-cq-talent devtools:preview
```

如果提示服务端口关闭，在 DevTools GUI 中打开：

```text
设置 -> 安全设置 -> 服务端口
```

然后重新执行 CLI 命令。

## 本地检查

```bash
pnpm --filter @football-club/miniprogram-cq-talent typecheck
pnpm --filter @football-club/miniprogram-cq-talent devtools:preview
```

本地 API 启动后，可复跑 app-client BFF smoke：

```bash
pnpm --filter @football-club/miniprogram-cq-talent smoke:app-client
```

## 当前联调策略

- 启动页先调用 `/app-clients/resolve?clientKey=cq-talent-wechat-main`。
- 运行环境读取 `envVersion`：develop 使用本地 API 和开发身份；trial/release 必须在 `utils/config.ts` 配置 HTTPS 服务地址，且不会发送开发身份头。
- 家长/教练身份不在 UI 中手动选择。dev 模式默认读取 `utils/config.ts` 的 `DEV_IDENTITY_ROLE`，也可在启动页长按品牌区隐藏切换。
- dev 家长请求带 `X-User-Id: user-parent-cq-talent-acceptance`，绑定 200 名重庆天才导入测试学员；dev 教练请求带 `X-User-Id: user-coach-1`。
- 页面业务请求统一经过 `utils/request.ts`，自动携带 session、`clubId`、`clientId`、`X-Request-Id`。
- 写操作请求封装使用幂等键；401 或 session 过期会清理本地会话并返回登录。

## 微信登录配置

服务端只有同时配置以下环境变量时才启用真实微信 connector：

```text
WECHAT_MINIPROGRAM_APP_ID
WECHAT_MINIPROGRAM_APP_SECRET
```

未配置时 `wechat-login` 返回需要绑定状态，不会使用前端角色提示伪造身份。当前仓库只有测试 AppID，因此正式凭证下的生产登录仍需部署环境验收。

## 真实数据体验流程

1. 启动本地 API：

   ```bash
   find /tmp -maxdepth 1 -name 'fcm-cq-talent-smoke.sqlite*' -delete
   DATABASE_URL=/tmp/fcm-cq-talent-smoke.sqlite PORT=3000 HOST=127.0.0.1 pnpm --filter @football-club/api dev
   ```

2. 确认 API：

   ```bash
   curl -fsS http://127.0.0.1:3000/health
   curl -fsS 'http://127.0.0.1:3000/app-clients/resolve?clientKey=cq-talent-wechat-main'
   pnpm --filter @football-club/miniprogram-cq-talent smoke:app-client
   ```

3. 打开微信开发者工具，进入启动页；启动页会自动 resolve 并按 dev 身份进入对应端。
4. 家长端：`DEV_IDENTITY_ROLE = "parent"`，体验导入数据中的孩子绑定、日程、活动详情、成长雷达、课时/保险。
5. 教练端：`DEV_IDENTITY_ROLE = "coach"` 或在启动页长按品牌区切换，体验 `2026-06-28` 的教练课表、活动 workbench、点名、销课、比赛、评测入口。
6. 当前本地 seed 已把会话 `019efcb5-8fe3-7951-a534-502d0abff8ce` 对应的 200 人重庆天才测试数据落到本地 API 验收链路。
7. 详细点击清单见 `docs/miniprogram-manual-acceptance-cq-talent.md`。
