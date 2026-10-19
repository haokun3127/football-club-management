# 2026-09-28 开发交付通道检查点

范围：Codex/本地 → develop → trial → 正式发布前检查。父任务保持 in_progress；本轮没有完成整体产品/UI 或体验发布。

## 已修复并验证

- 统一 Node 24：本机安装 24.21.0（未切换全局 Node），仓库增加 `.nvmrc`、engines 和 `check:delivery`，CI 使用同一入口。
- 微信工具选择稳定版 CLI；IDE HTTP 56031 与 Automator 9420 分开。修复本机私有配置的基础库覆盖和关闭域名校验问题，运行时确认 SDK 3.17.3，正常进入 `pages/login/index`。未点击手机号授权。
- develop/trial 原先各自空库未登记 app-client，解析 404。核验专用卷及数据库归属，分别完成一致性备份后执行最小登记；仅新增 club/app-client，不播种用户或业务数据。
- 登记脚本拒绝 release、配置冲突与错误数据库归属；重复执行保留现有配置。只读运行检查明确报告凭据/身份缺口，不能误报完整体验就绪。

## 证据与限制

- `channel-evidence-20260928/delivery-check.log`：Node 24 下完整类型检查、692 项项目测试、8 项交付回归、构建与三个环境隔离启动检查通过；另有 1 项项目测试跳过。
- `channel-evidence-20260928/https-before.json` 与 `https-after.json`：两处客户端解析从 404 修复为 200；最终 10 项检查通过，错误环境 403、无效身份 401。根生产入口仅健康读取及拒绝探测。
- `channel-evidence-20260928/runtime-audit.jsonl`：两个非生产环境的数据库归属、禁用调试身份和客户端登记通过；AppSecret、家长/教练/管理员身份均未配置，`configurationReady=false`、`realWechatLoginVerified=false`。
- 本机微信诊断截图 `/tmp/cq-channel-login-20260928.png`；截图不等于真机或完整 UI 验收。
- 生产选定元数据不变：容器 `e9fde0292b285db1221e86027ea855fd1927f64276f7741ba6c723eeac1c579d`、镜像 `cq-talent-api:b050391`、启动时间 `2026-09-16T01:48:24.50258575Z`。本轮未读取生产业务数据/密钥，未变更发布状态。
- 非生产镜像仍为 `cq-talent-api:trial-1224e07bf5f4`，没有部署本机未提交业务改动。登记前备份位于服务器 `/opt/cq-talent-nonproduction/backups/20260928-client-bootstrap/`，各自 SQLite 权限 0600。
- `git diff --check` 通过；工作区保留其他任务既有改动，尚未形成审阅提交、推送或远端 CI 成功证据。

## 后续顺序

1. 用户已确认继续使用现有 AppID `wx4c588cd106e520e0`。两份非生产私有 env 已存在、权限 0600、AppID 匹配；再次只读检查仍缺 AppSecret。由用户在这两份文件中设置现有密钥，不重置密钥，不在聊天传密钥，不复制生产 env。
2. 用户已确认本人一个账号兼任家长、教练、管理员，仅在 develop/trial 分别配置；已收到运行时手机号并完成两环境身份配置，手机号不入仓库。现有七账号导入工具固定双角色并生成大量演示数据，不直接用于本次单账号配置。配置完成后验证真实登录、角色权限与业务持久化。
3. 审阅完整源码依赖并提交，远端 CI 通过；同一不可变制品先 develop 后 trial。
4. 补齐父任务业务/UI/后台与真机验收后执行已授权的体验版上传。正式发布停在独立发布授权之前。

可重复命令、制品晋级与回滚见 `docs/current/development-delivery-channel.md`。

## 单账号身份配置后续证据

`channel-evidence-20260928/identity-runtime.jsonl` 显示两环境三角色均已配置，AppSecret 仍缺；生产容器元数据不变。登记前备份 `/opt/cq-talent-nonproduction/backups/identity-20260928T012412120471Z/`；仅重启两个非生产容器加载档案。`identity-delivery-check.log` 为全量门禁通过（692 项项目测试、9 项交付测试，另 1 项跳过）；`identity-https.json` 为 10 项线上只读检查通过。未向微信发起真实手机号兑换，未配置后台前端入口或上传新体验包。

## 用户授权后的微信凭据配置

用户明确授权仅将服务器现有的该小程序凭据用于 develop/trial。服务器内选择性读取匹配 AppID/AppSecret，值不返回本机、聊天或仓库；未读取其他生产环境变量或业务数据。分别写入非生产私有 env，文件权限 0600；使用现有独立 Compose 和原镜像依次重建两个服务。配置及各自 SQLite 备份：`/opt/cq-talent-nonproduction/backups/credentials-20260928T014544478981Z`。

最终证据：`credentials-runtime.jsonl` 两环境配置全通过；`credentials-https.json` 10 项路由/拦截检查通过。`wechat-code-exchange.json` 使用 IDE `wx.login` 返回的新登录码，分别通过真实微信 code 兑换路径，返回 200 / binding_required；没有发送 phoneCode，这个状态表示尚未授权手机号，不是账号未配置。未获取手机号或生成微信 access_token，未完成用户登录会话。生产容器 ID/镜像/启动时间保持不变。

首次尝试遇到 Docker 模板额外空行，解析器在任何写操作前拒绝；过滤空行后执行成功。没有重复执行已完成的写操作。

真实手机授权登录、三角色业务验收、新体验包上传和远端 CI 仍待完成；本次没有改变微信体验版选择或正式发布状态。
