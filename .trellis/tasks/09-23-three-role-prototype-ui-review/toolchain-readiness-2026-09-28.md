# 2026-09-28 微信工具链复测

## 结果
微信工具连接阻塞已解决。用户提供 IDE HTTP 端口 56031；lsof 确认监听进程实际来自 `/Applications/wechatwebdevtools-stable.app/Contents/MacOS/Electron`。此前默认调用 `/Applications/wechatwebdevtools.app`，其 CLI 返回服务端口关闭，不能据此推断用户正在使用的稳定版设置。

实测：
- 稳定版 CLI `islogin --port 56031` 返回 `login:true`。
- 稳定版官方 `auto --project /Users/dongjun/projects/football-club-management/apps/miniprogram-cq-talent --auto-port 9420 --port 56031` 返回成功；AppID 权限检查成功。
- 首次自动化连接时页面元信息未就绪，currentPage 出现 rawPath/null；待官方 auto 成功后重新读取通过。
- 当前页面 `/pages/launch/index`，systemInfo 返回 390 × 844。
- 官方 miniprogram-automator 截图成功并已视觉检查：`/tmp/cq-wechat-tool-readiness-20260928.png`。
- CUA 原生 App 绑定稳定版成功，可读取项目窗口。此前原生 App 失败亦不能泛化为 CUA 不可用。
- 本轮较早已确认：本地监听、Docker、SSH 无需提权即可运行；当前实际会话权限已改变。

## 后续连接方式
```sh
WECHAT_DEVTOOLS_CLI=/Applications/wechatwebdevtools-stable.app/Contents/MacOS/cli MP_IDE_HTTP_PORT=56031 MP_AUTOMATION_STATE_FILE=/tmp/cq-devtools-session-20260928.json node apps/miniprogram-cq-talent/scripts/devtools-automator-open.mjs
```

IDE HTTP 服务端口与 Automator WebSocket 端口不同，56031 不可直接当作自动化端口。使用启动脚本输出的自动化端口；本次为 9420。IDE 重启后服务端口可能改变，须重新核实。

## 尚未完成的业务验证
截图显示启动错误 `App client not found`。这证明页面已运行，但不代表业务登录完成；需后续核对非生产 app-client 注册、环境映射及凭据配置。没有据此修改生产数据、复制生产密钥或自动导入测试身份。工具诊断通过与完整体验版就绪分别判断。

未执行上传、选体验版、提审、正式发布或服务器部署。未改产品代码；仅使用现有环境变量显式指定正确 CLI，并记录连接信息。
