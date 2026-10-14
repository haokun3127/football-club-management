# 重庆天才小程序环境隔离（2026-09-22）

## 当前交付边界

2026-09-24 已获服务器体验部署授权；独立 develop/trial API、专用卷和 Nginx 固定路径已部署。2026-09-28 已备份各自数据库并仅登记 club/app-client，修复客户端解析 404。当前镜像仍为 `cq-talent-api:trial-1224e07bf5f4`，部署目录 `/opt/cq-talent-nonproduction/releases/1224e07bf5f4`。

本轮 10 项线上只读 HTTPS 检查通过；本地 Node 24 的交付门禁通过。微信工具使用正在运行的稳定版安装与 HTTP 端口 56031，登录状态有效，基础库 3.17.3，已进入身份验证页。此前 code 10 / 端口未开启记录不再代表当前状态。

完整体验尚未就绪：两个非生产环境已配置 AppSecret 和单账号三角色，配置检查、真实微信登录码兑换通过；手机手机号授权登录、后台管理前端及完整业务验收待完成。此前自动审批拒绝过凭据复制；用户随后明确授权复用现有小程序凭据，本次仅在服务器内提取匹配的 AppID/AppSecret 到非生产私有配置，不复制生产 env 或业务数据。未访问生产业务数据、未升级生产容器、未上传或改变微信发布状态。

当前步骤与门禁见 [开发交付通道](development-delivery-channel.md)，本轮证据见 [通道检查记录](../../.trellis/tasks/09-23-three-role-prototype-ui-review/channel-checkpoint-20260928.md)。历史部署证据保留：[部署验证](../../.trellis/tasks/09-23-three-role-prototype-ui-review/deployment-verification.json)、[实现检查点](../../.trellis/tasks/09-23-three-role-prototype-ui-review/implementation-checkpoint.md)。

## 三环境映射

| 环境 | 小程序 HTTPS 基址 | 固定上游 | 数据卷 | SQLite 路径 |
| --- | --- | --- | --- | --- |
| develop | `https://cqtc.pomi.tech/__env/develop` | localhost:3101 | `cq-talent-develop-data` | `/var/lib/cq-talent-develop/api.sqlite` |
| trial | `https://cqtc.pomi.tech/__env/trial` | localhost:3102 | `cq-talent-trial-data` | `/var/lib/cq-talent-trial/api.sqlite` |
| release | `https://cqtc.pomi.tech` | 原 localhost:3000 | 保留 `cq-talent-api-data` | 原 `/var/lib/cq-talent/api.sqlite` |

继续使用同一备案域名、证书和微信 request 合法域名。路径必须固定映射到独立进程；不能仅靠 URL 前缀、Header 或数据库表中的 clubId 区分环境。没有可用非生产上游时，请求失败，不回退生产。

## 已实现的防护

1. 客户端只接受微信返回的 develop/trial/release；缺失、未知或读取失败时，请求在网络调用前失败。请求统一携带不可由业务调用覆盖的 `X-MiniProgram-Env`。
2. 会话、上下文、家长已读状态、学生/球队选择和测评/比赛草稿使用 `cqTalent:<env>:` 缓存命名空间。旧的无环境缓存不会被导入；新客户端需重新登录。清理草稿只作用于当前环境。
3. Fastify `onRequest` 在解析、认证、幂等 prune/replay、业务 handler 前拒绝错误环境，返回 `403 environment_mismatch`。GET/HEAD `/health`、`/openapi.json` 公开，其余所有业务路由受检；所有响应带 `X-FCM-Environment`。
4. 非生产必须明确声明对应环境。release 的小程序路径必须带正确 AppID 的正式微信 Referer；旧正式客户端可暂不带新 Header。release 的其他管理/集成路径必须带正确环境声明或正式 Referer。旧管理工具/回调如果两者都没有将返回 403，后续上线前必须盘点并适配调用方，不能全局放宽门禁。
5. 给出的 Referer 必须完整匹配 `https://servicewechat.com/<AppID>/<version>/page-frame.html`。0 包含开发/体验/审核，devtools 是开发者工具；二者不能进入 release。正式版本号不能进入非生产。Referer 不能区分 develop/trial，二者靠声明、固定上游和独立库隔离。普通 HTTP 工具能伪造 Header/Referer，故该门禁**不替代 Bearer、角色和俱乐部权限校验**。
6. 启动/迁移必须显式指定 `FCM_RUNTIME_ENV`、绝对 `DATABASE_URL` 和 `WECHAT_MINIPROGRAM_APP_ID`；trial/release 必须 `NODE_ENV=production`。非生产 Compose 同样使用 production 模式，禁止调试身份；仅 localhost 的 `dev.ts` 允许本地 header smoke。
7. 非生产只能使用专用 `cq-talent-<env>/api.sqlite` 路径。写连接、迁移、seed 前先只读核验已有库的 `runtime_environment` 归属，拒绝缺失归属的历史库及其他环境库。新库生成归属标记。目录、数据库及 SQLite WAL/SHM/journal 不能含符号链接或硬链接。该检查以受控本地文件系统和单实例启动为前提，不能替代主机权限及卷挂载审查。
8. release 允许未来显式升级历史无标记库；任何服务端运行环境均不自动 seed（本地开发入口除外）。非生产仅用显式合成种子，禁止复制生产库、生产备份、会话或私有 env 文件。现有直接操作 SQLite 的受控 ops CLI 仍是特权运维工具，不用于开发/体验流程。
9. `smoke:app-client` 是写入测试，仅允许 localhost HTTP、禁止重定向，先要求 health 返回 develop。端口误接正式 API 时只发健康读取就停止。

## 独立部署配置与剩余验收

- `deploy/environment-isolation/compose.nonproduction.yml` 是独立 Compose 项目，只有 develop/trial 和专用卷初始化服务。显式传 `-f`，不要与根生产 Compose 或服务器的 override 合并。
- `FCM_NONPROD_IMAGE` 必须指向本次审阅代码构建的不可变镜像标签；`FCM_DEVELOP_ENV_FILE`、`FCM_TRIAL_ENV_FILE` 必须各自指向私有非生产文件。不能复用 `.env.runtime` 或包含生产 WPS/外部集成凭据的文件。配置示例仅列变量名，不记录任何密钥。
- 微信真实登录需要私有 AppID/AppSecret 配置及明确授权的测试账号绑定；合成 seed 不代表已具备真机登录账号。同一微信 AppID 的手机号费用/额度和开放能力仍共享，不因数据库隔离而独立。本次没有调用微信收费接口。
- `nginx-locations.conf` 是加入现有 TLS server 的候选片段。保留原始 Referer/环境声明、清除调试身份头、固定端口；禁止未知 `__env` 路径落回生产。不能由代理替客户端注入 `release`。
- 生产根 Compose 新增 `FCM_RUNTIME_ENV=release` 并关闭 acceptance seed；实际服务器的版本 override 可能不同，需单独审阅，不能直接运行仓库根 Compose 覆盖线上。

后续获部署授权后，先只读核对实际镜像、卷、upstream、备份及所有 API 调用方。按服务端正式入口保护 → 独立非生产上游 → 路径规则 → 客户端/真机验证顺序推进。生产升级会写入归属标记并执行现有迁移，所以不属于本次“不触碰生产数据”范围。上线门禁需覆盖旧体验版和审核版被拒绝、正式登录可用、真实 Referer 格式、关闭调试后的 HTTPS 请求、跨环境 token 拒绝和三个环境实际数据落点。小程序上传/体验/审核/正式发布独立授权。

回退时可以关闭非生产入口或恢复其自身镜像，但不能把 develop/trial 改回生产基址，也不能恢复全局放行。不能删除生产卷或把生产备份恢复到非生产。

## 可重复验证（不访问生产）

```bash
pnpm --filter @football-club/api exec vitest run test/environment-isolation.test.ts
pnpm --filter @football-club/miniprogram-cq-talent exec vitest run utils/environment-isolation.test.mjs
pnpm check
pnpm build
node scripts/verify-environment-startup.mjs
node scripts/miniprogram-policy/check.mjs
node --test scripts/miniprogram-policy/check.test.mjs
git diff --check
```

测试仅创建 OS 临时目录中的合成 SQLite 和 localhost 测试服务，结束后清理。覆盖有效会话误连、旧客户端 Referer、三环境矩阵、缺失/矛盾标记、文件归属/链接、缓存隔离、错误 smoke 目标及拒绝前后 SQLite 写入计数。平台检查是报告式，退出 0 不代表没有发现。

Compose 可以用空文件安全解析，**该命令不启动容器**：

```bash
FCM_NONPROD_IMAGE=cq-talent-api:isolation-validation \
FCM_DEVELOP_ENV_FILE=/dev/null FCM_TRIAL_ENV_FILE=/dev/null \
docker compose -f deploy/environment-isolation/compose.nonproduction.yml config --format json
```

检查两个服务只绑定 127.0.0.1、环境和专用路径匹配、卷为 develop-data/trial-data，且没有生产卷或生产 env。2026-09-24 已在服务器真实配置上下文通过 `nginx -t`，并完成临时上游故障测试及线上 HTTPS 只读验证。真实微信登录和三角色业务验收仍未完成。
