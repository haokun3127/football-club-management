# 部署需求与运维关注点

本文档用于第一个小程序前端进场前的后端部署准入。目标是确保 API 可启动、可迁移、可健康检查，并能支撑约 500 日常用户的早期内测。

## 当前域名与认证安全基线（2026-08-12）

- 小程序 API 基址为 `https://cqtc.pomi.tech`，不再使用裸 IP；`develop`、`trial`、`release` 三个运行环境均使用该 HTTPS 域名。
- 域名配置写入客户端不等于部署验收完成。发布前仍须分别确认 DNS 解析、TLS 证书及续期、反向代理到 API、健康检查、微信公众平台 request 合法域名和真机实际请求。
- 若启用正式微信手机号解析，服务器必须配置 `WECHAT_MINIPROGRAM_APP_ID` 与 `WECHAT_MINIPROGRAM_APP_SECRET`；不得把任何密码、token、私钥或服务器登录信息写入本文件或提交到仓库。
- 生产/release app-client API 只能使用经校验的 Bearer session；不得把 `X-User-Id` 当认证，也不得由反向代理注入、保留或转发该头来建立用户身份。`x-user-id` 仅是显式本地开发入口的 smoke 工具。
- 2026-08-12 起，不能用启动时 acceptance seed 向生产或共享数据库“补测试数据”。如确实需要三套隔离的双角色测试账号，必须使用 `secure-test-accounts` 受控 CLI：先建立受限 SQLite 备份（含 WAL/SHM）并取得单次授权，再以私有运行时变量提供号码、设置备份证明、先 dry-run、后 confirmed import。详情见 `agent-handover-2026-08-12-secure-test-accounts.md`；变量值不得写入仓库、文档、日志或 shell 历史。
- API 路由、环境变量或部署构建变更后，必须重新 build 并重启 API 进程，再用 `/health` 和小程序实际请求确认没有继续访问旧 `dist`。

## 重庆天才服务器与域名记录（历史证据，非当前部署断言）

- 项目名称：重庆天才俱乐部（`football-club-management`）。
- API 域名：`cqtc.pomi.tech`；公网基址：`https://cqtc.pomi.tech`。
- 用户提供的服务器公网 IP：`43.136.114.225`；操作系统：Ubuntu Server 24.04 LTS。
- DNS 目标：`cqtc.pomi.tech → 43.136.114.225`（用户提供，待 DNS/服务器核验）。
- HTTPS 使用 `443`；`GET /health` 与小程序 `develop`、`trial`、`release` 均应使用同一 HTTPS 基址。
- 当前本地 Git 分支：`codex/chongqing-talent-business`。最新本地安全提交为 `ddfbc29`，本次文档更新不表示其已部署。
- 历史核验曾记录容器 `cq-talent-api`、发布目录 `/opt/cq-talent-releases/…`、非 Git 工作树 `/opt/cq-talent-api`、SQLite named volume `cq-talent-api-data`、`127.0.0.1:3000` API 与 Nginx TLS 反代。历史记录不能证明当前服务器仍使用同一版本、目录或运行时配置。
- 移交后若要部署，先只读核对实际容器、镜像/发布版本、SQLite volume、备份落点、Nginx upstream、HTTPS health 和微信 request 合法域名；完成这些核对前，不得把任何历史部署条目当作当前事实。

### 敏感信息不入库

- 禁止在仓库、文档、命令记录或日志中写入密码、私钥、`token`、`secret`、带凭据的 `DATABASE_URL`、认证头、`cookie`/session、手机号或完整 env 文件。
- 环境变量只记录名称，不记录值。

## 运行时版本

- Node.js：推荐 `24.x`；可接受已验证的 `22.12+`。不要使用未验证的奇数主版本作为部署基线。
- pnpm：使用根目录 `package.json` 的 `packageManager`，当前为 `pnpm@10.33.0`。
- 安装依赖必须使用锁文件：

```bash
pnpm install --frozen-lockfile
```

重点关注：

- 项目使用 ESM 和 `moduleResolution: NodeNext`，部署前必须验证 CommonJS/ESM 依赖加载，尤其是日历重复规则依赖 `rrule`。
- 项目使用 `node:sqlite`，部署 Node 版本必须支持该模块。

## 环境变量

| 变量 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `DATABASE_URL` | 是 | `apps/api/data/dev.sqlite` | SQLite 数据库文件路径。生产/内测应使用明确的持久化路径。 |
| `PORT` | 否 | `3000` | API 监听端口。 |
| `HOST` | 否 | `127.0.0.1` | API 监听地址；容器或反向代理环境按部署拓扑设置。 |
| `WECHAT_MINIPROGRAM_APP_ID` / `WECHAT_MINIPROGRAM_APP_SECRET` | 正式微信登录需要 | — | 仅保存在服务器私有运行时环境。 |
| `SECURE_CQ_TALENT_TEST_PHONE_1` / `_2` / `_3` | 受控测试账号导入需要 | — | 仅运行时读取，绝不记录值。 |
| `SECURE_CQ_TALENT_TEST_ACCOUNTS_BACKUP_ATTESTED` | confirmed import 需要 | — | 仅在完成受限备份后短时设置为规定证明值。 |

SQLite 文件所在目录必须满足：

- API 进程用户有读写权限。
- 磁盘空间有监控和告警。
- 数据库文件和 WAL/临时文件目录在持久化卷上。
- 有定期备份和恢复演练流程。

## 部署前检查

每次部署前必须执行：

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm build
DATABASE_URL=/path/to/app.sqlite pnpm --filter @football-club/api db:migrate
DATABASE_URL=/path/to/app.sqlite PORT=3000 HOST=127.0.0.1 pnpm --filter @football-club/api start
curl -fsS http://127.0.0.1:3000/health
```

健康检查期望：

```json
{
  "status": "ok",
  "service": "@football-club/api"
}
```

如果 `pnpm check`、`pnpm build`、迁移或 `/health` 任一失败，不允许交给小程序前端联调。

## 小程序准入 smoke

使用临时 SQLite 数据库和显式本地开发入口启动 API 后，至少抽查：

- `GET /health`
- `GET /openapi.json`
- parent/coach BFF 的本地 header smoke（仅 `apps/api/src/dev.ts` 所启的 localhost API）。

生产 smoke 另行使用真实微信授权得到的 Bearer session；不得向 `https://cqtc.pomi.tech` 或其他公网入口发送 `x-user-id` 来进行身份验证。

权限抽查：

- 家长读取未绑定学生应返回 `403`。
- 家长写训练、比赛、课时应返回 `403`。
- 教练写 admin-only 球队管理应返回 `403`。
- 跨 club 请求应返回 `403`。

## 500 日常用户容量准入

当前 SQLite 架构适合 500 日常用户的早期内测，但不等同于长期生产高并发架构。准入压测建议：

- 对 parent home、parent schedule、event detail、coach home 做 50 并发、持续 5 分钟的 GET 压测。
- 目标：业务错误数为 0，HTTP 5xx 为 0，p95 小于 300ms，本机内存无持续上涨。
- 压测期间不要同时运行 WPS/Excel 大批量导入；批量导入应安排在低峰期。

## 运维风险

- SQLite 是单实例写入模型；多实例部署前必须迁移幂等记录和数据库写入策略，不能多个 API 实例直接写同一 SQLite 文件。
- WPS/Excel 导入会占用 CPU、内存和数据库写入，应限制文件大小、导入频率和操作权限。
- 反向代理不得把 `x-user-id` 当作认证头，也不得基于它注入或切换用户身份；只按已校验的 Bearer/真实认证链路处理用户请求，不要缓存带用户权限的响应。
- `/openapi.json` 可以短期公共缓存；其他业务 GET 响应按私有缓存处理。
- 数据库备份必须覆盖数据库文件及相关 WAL 文件，并定期验证可恢复。
