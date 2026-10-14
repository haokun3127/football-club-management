# Codex 开发到正式发布前的交付通道

更新：2026-09-28。配置检查通过不代表已完成真实身份登录、手机验收、微信上传或正式发布。

## 固定边界

| 环节 | 入口与工具 | 必须通过 | 当前状态 |
| --- | --- | --- | --- |
| Codex / 本地 | Node 24、pnpm 10.33.0、锁文件 | `pnpm check:delivery` | Node 24.21.0 实测通过 |
| 微信开发者工具 | 优先稳定版 CLI；IDE HTTP 56031，Automator 9420（本次） | 有效登录、正确项目、基础库 3.17.3、域名/TLS 校验开启 | 已实测进入身份验证页 |
| develop | `https://cqtc.pomi.tech/__env/develop` | 路由、登记、独立库、凭据、测试身份、业务联调 | 路由/登记/凭据/单账号三角色已配置；登录码兑换通过 |
| trial | `https://cqtc.pomi.tech/__env/trial` | 同一已验证代码制品、独立库、真机三角色验收 | 配置及登录码兑换通过；手机授权登录/体验验收待完成 |
| 正式发布前 | release 根入口、原生产卷 | 审阅变更/迁移、兼容旧客户端、回滚方案、明确发布操作 | 本轮只读检查，未执行生产升级 |

源码、镜像可以按步骤晋级；数据库、缓存、会话、测试身份和私有 env 不跨环境晋级。不同环境配置始终显式提供，失败禁止回退生产。

## 1. 本地与 CI 使用同一检查入口

仓库 `.nvmrc` 声明 Node 24，`package.json.engines` 限定 24，CI/Docker 同为 24 主版本。本机已通过 Homebrew 安装 `node@24`，保留原 Node 22；不要把其他项目的全局环境改掉。本项目执行：

```sh
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
node --version
pnpm install --frozen-lockfile
pnpm check:delivery
```

使用 nvm 的机器可先 `nvm use`。`check:delivery` 会拒绝其他 Node 主版本和私有配置关闭域名/TLS校验、覆盖基础库/AppID，随后运行类型检查、全量测试、构建、客户端登记回归和三个环境的隔离启动测试。

GitHub Actions 已改为同一入口，但本轮尚未提交/推送并运行远端 CI，不能把本地成功称为远端 CI 成功。当前工作区还有此前任务的未提交改动，提交时必须审阅完整依赖，不可只提交一个引用了未跟踪文件的工作流。

## 2. 微信工具统一入口

```sh
MP_IDE_HTTP_PORT=56031 pnpm --filter @football-club/miniprogram-cq-talent devtools:automator:open
```

共享解析器优先 `/Applications/wechatwebdevtools-stable.app/Contents/MacOS/cli`，不存在才回退旧安装；`WECHAT_DEVTOOLS_CLI` 可显式覆盖。macOS/Windows 均能从最近的 `.ide` 标记读取端口；并行安装或端口变化时，以正在运行 IDE 的服务端口显式指定。输出的 Automator 端口才用于 WebSocket。不要把 IDE HTTP 端口当作 Automator 端口。

本次恢复了本机 `project.private.config.json` 的 `libVersion=3.17.3` 和 `setting.urlCheck=true`；修改前副本保留在 `/tmp/cq-project-private-before-channel-20260928.json`。私有配置不提交。模拟器截图仅是运行诊断，不是完整 Figma 或真机验收。

## 3. 非生产首次初始化只登记必要配置

正常服务启动只迁移自己的库，不自动播种。空库需要独立登记 club/app-client，否则 `/app-clients/resolve` 返回 404。先验证非生产卷和数据库归属、完成其自身 SQLite 一致性备份，然后在仓库或容器根目录执行：

```sh
node deploy/environment-isolation/bootstrap-client.mjs --apply
```

环境由已有运行配置提供：`FCM_RUNTIME_ENV=develop|trial`、`NODE_ENV=production`、专用 `DATABASE_URL`、公开 `WECHAT_MINIPROGRAM_APP_ID`。数据库必须已经存在、完成迁移且归属一致。脚本复用本次代码的公开俱乐部/客户端模板，以运行时 AppID 覆盖演示 AppID，只写 club/app-client；不创建任何用户、手机号、会话、训练、财务或外部连接。重复运行返回 `already_present` 并保留已有配置；身份冲突、归属冲突或 release 直接拒绝。

现有服务器可执行同一脚本，不需要临时改容器代码：

```sh
ssh -i ~/.ssh/football_club_codex -o IdentitiesOnly=yes ubuntu@43.136.114.225 \
  'sudo docker exec -i -w /app cq-talent-nonproduction-develop-1 node --input-type=module - --apply' \
  < deploy/environment-isolation/bootstrap-client.mjs
```

trial 显式替换为 `cq-talent-nonproduction-trial-1`，禁止指定生产容器。本次两个环境已登记，登记前备份分别在 `/opt/cq-talent-nonproduction/backups/20260928-client-bootstrap/{develop,trial}.sqlite`，权限 0600。

## 4. 凭据与测试身份是独立门禁

```sh
pnpm check:environments
ssh -i ~/.ssh/football_club_codex -o IdentitiesOnly=yes ubuntu@43.136.114.225 \
  'sudo docker exec -i -w /app cq-talent-nonproduction-develop-1 node --input-type=module -' \
  < deploy/environment-isolation/check-runtime.mjs
```

第一条仅做固定 HTTPS 目标的路由、客户端登记和拒绝检查；不携带真实令牌，不跟随重定向，不写业务数据。第二条仅检查非生产自己的库和凭据是否存在，输出布尔值/缺口；trial 同样检查。缺 AppSecret 或三角色身份时第二条必须退出 1，不能忽略后继续声称“体验就绪”。配置完整仍必须做真实微信登录与跨角色业务验收。

非生产私有配置使用 `/opt/cq-talent-nonproduction/private/develop.env`、`trial.env`，权限 0600、不进 Git。用户已确认现有 AppID `wx4c588cd106e520e0`，并单独明确授权复用服务器现有的对应微信登录凭据；已在服务器内选择性读取这两项并配置到非生产，没有复制整份生产 env、人员或会话数据。两个服务已用原镜像重建，配置检查全部通过。测试身份为用户本人一个账号兼任家长、教练、管理员。

真实 `wx.login` 登录码兑换在两个环境均通过；未获取手机号，尚未建立真实用户会话。接下来需用包含环境隔离配置的新体验包完成手机授权登录与业务验收。不能将配置就绪或模拟器登录码兑换等同于完整体验验收。

## 5. 同一制品逐环境推进

1. 审阅并提交完整变更及所依赖文件，记录 Git SHA；`check:delivery` 和远端 CI 通过。不得从当前混杂工作区直接宣称可发布。
2. 从该提交的干净检出构建 Linux amd64 镜像，使用 Git SHA 的唯一标签，记录源 SHA、镜像 ID/digest、构建日志；已有标签不覆盖。不打包私有 env、数据库或本地截图。
3. 使用 `deploy/environment-isolation/compose.nonproduction.yml`，显式传 `FCM_NONPROD_IMAGE`、两份私有 env 路径；先 `docker compose ... config` 审阅实际合成配置，不与根生产 Compose/override 合并。首次部署先运行 `data-init`，之后只更新 develop 服务。
4. develop 完成配置、登录、读写持久化、权限与环境隔离验收；将同一个镜像 ID/digest用于 trial，不能悄悄重新构建相同标签。
5. 小程序从同一提交用官方工具编译/上传，记录版本号、源码 SHA、官方包体结果；上传、选体验版、提审、正式发布是不同动作，逐项留证。API_BASE_URL 由微信 envVersion 自动选择，禁止手动把体验包改到生产地址。
6. trial 真机与三角色业务闭环验收后形成候选发布清单。生产数据库迁移、生产服务切换、微信提审/正式发布在正式授权与专用发布计划前停止，本轮不执行。

本轮没有构建新的服务器候选镜像，也没有上传/切换小程序版本。当前非生产镜像仍是 `cq-talent-api:trial-1224e07bf5f4`；已完成客户端/测试身份登记和经明确授权的私有微信凭据配置。

## 6. 故障和回退

- 任一门禁失败即停止该环节，保留证据；不得切回生产地址“临时跑通”。
- 部署前记录当前非生产镜像 ID 与专用 SQLite 一致性备份。失败时仅回退对应服务；如果新代码执行了不兼容迁移，不能盲目回退旧镜像。
- 不把生产备份恢复进测试。恢复非生产登记前备份只能在确认登记后无新增业务数据且停止对应服务后执行；有新业务数据时先审阅差异，不能覆盖丢失。
- 本轮观察到 SSH 偶发握手中断和 Homebrew 下载 TLS 中断；后续重试成功。对写操作必须先检查前一次结果，再决定重试，不能自动重复执行发布命令。

### 单账号测试身份配置记录

已在 develop/trial 各配置用户本人一个账号，membership 含 parent/coach/admin；仅创建用户、成员关系与家长/教练档案，未导入生产人员、学生或财务数据。运行时手机号不入 Git 或证据日志。操作入口 `deploy/environment-isolation/bootstrap-identity.mjs --apply`，需要 `FCM_TEST_PHONE` 和备份后设置的 `FCM_IDENTITY_BACKUP_ATTESTED=1`；重复配置保留现有资料，冲突或 release 拒绝。两服务已重启并核验权限配置。

小程序现有角色切换只有家长/教练，管理员属于后台；账号权限配置完成不代表后台页面或真实微信登录验收通过。AppSecret 配置缺口已按用户明确授权补齐；手机授权登录与完整业务验收仍待完成。


## 2026-10-09 后台浏览器接入增量（代码已验证，远端未配置）

新镜像包含后台静态文件和0030认证迁移。非生产每份私有env分别增加`BACKOFFICE_PUBLIC_URL=https://cqtc.pomi.tech/__env/develop/backoffice`或对应trial值，未配置则浏览器边界关闭。原有固定前缀Nginx转发保持，不伪造微信Referer，也不添加X-User-Id。后台API使用X-FCM-Environment、页面Referer路径和变更请求Origin校验；Cookie独立于小程序Bearer。

只有新版镜像已迁移自身非生产卷、备份完成后，才能用`node apps/api/dist/ops/provision-backoffice-command.js --apply`配置既有授权管理成员。通过stdin私密JSON传clubId/userId/username/password，设置FCM_IDENTITY_BACKUP_ATTESTED=1；不要在命令行、日志或Git中放密码。原账号重配必须明确--rotate；命令拒绝release，不创建身份或提升权限。实际配置后还要验证HTTPS登录、刷新、退出、权限撤销及跨环境拒绝。开发/体验密码与身份加密密钥分别配置，不能使用本地合成测试密码。

本地新后台仅有登录和五类只读业务列表，不是完整四模块后台。2026-10-09只读回查仍为旧trial-1224e07bf5f4镜像；不能根据本段描述认定已部署。
