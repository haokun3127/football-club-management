# 重庆天才足球俱乐部管理系统：Claude 总交接（2026-08-12）

> 交接目的：让下一位 Claude 在不覆盖在途文件、不误把本地证据写成生产结论、也不泄露运行时秘密的前提下接管项目。
>
> 本文记录截至 **2026-08-12（Asia/Shanghai）** 的可复核事实。它不包含服务器密码、手机号、Bearer、token、AppSecret、数据库真实路径或完整环境变量值。

## 1. 从这里开始

主工作区：

```text
C:\Users\ASUS\Desktop\football-club-management-codex-windows-2026-08-02
```

当前分支：`codex/chongqing-talent-business`。

按此顺序阅读：

1. `AGENTS.md`（Trellis 工作流是强制规则）
2. 本文
3. `docs/current/progress.md`（逐日记录；最新结论在开头与末尾）
4. `docs/current/figma-source-of-truth.md`
5. `docs/current/agent-handover-2026-08-12-secure-test-accounts.md`（安全账号专项）
6. 若处理部署：`docs/current/deployment-requirements.md`
7. 只读体检：`git status --short`、`git log --oneline -12`、`python ./.trellis/scripts/get_context.py`

## 2. 设计、代码和验收的硬边界

- **唯一 Figma 权威**：`zZ6wKyOHKcO4UYXDd9jGwv`，入口节点 `4:6`（Parent Generated）与 `4:7`（Coach Generated）。旧 file key `ATlfBRO0ruOCDDY5ICagFD` 和本地 `.fig` 都只是历史资料，不能用于新的设计判断或回写。
- 视觉改动先读取当前在线 Figma 对应页面、画板、节点 ID 和截图；小程序 WXML 不使用 `.map()`、`.filter()`、`.slice()`、`.indexOf()` 等 JS 方法，展示值在 TypeScript view model 预计算。
- 可信视觉验收仍以真实 `375×812` 模拟器/真机截图对照为准；typecheck、Vitest、API smoke 只能说明静态或接口层，不等于 Figma 一致。截图工具、端口和 canvas 限制见 `docs/current/miniprogram-manual-acceptance-cq-talent.md`。
- API 改动后必须重新 build 并重启对应 API；未重启时 DevTools/服务器可能仍在请求旧 `dist`。

## 3. 当前代码基线与已验证证据

当前 HEAD：`ddfbc29 feat(api): harden secure test account operation`。

该提交完成的本地安全边界：

- 生产入口拒绝只靠 `X-User-Id` 的身份；仅显式本地开发入口 `apps/api/src/dev.ts` 可以做 header smoke。
- 手机号只在“唯一 active 用户 + active club membership”时匹配；空、失效或歧义匹配不选中任意身份。
- 新增 `student_guardian_bindings` 迁移/持久化读取，以及三套固定 ID、彼此隔离的 parent+coach 测试账号导入与回滚。
- 受控 CLI 只允许 dry-run、精确确认后的 import 和 rollback；dry-run 不迁移也不写库，confirmed import 需要已完成受限备份的私有证明，rollback 只使用内部 canonical manifest。
- Bearer session 的 parent/coach 权限隔离与电话字段脱敏已覆盖回归。

最新本地证据：domain `8 files / 19 tests`、mini-program `54 files / 306 tests`、API `11 files / 103 tests`、root typecheck、Trellis task validation、`git diff --check` 都通过。曾有一次根 `pnpm run check` 在全部断言后遇到 mini-program Vitest worker 瞬时退出；随后隔离小程序重跑干净通过。因此不要将那一次根脚本表述为完整无异常成功。

**未执行且不能默认已完成**：SSH/服务器访问、生产数据库读取或备份、受控账号导入/回滚、生产部署、API 重启、真机微信授权登录、真机视觉验收。

## 4. 工作树白名单：不要连带提交或覆盖

截至交接，以下路径不属于本次安全账号任务，是用户文件或其他在途工作；保留原样，禁止 `git add -A`、`git reset`、`git checkout --`、批量格式化或“清理”它们：

- `apps/miniprogram-cq-talent/project.config.json`
- `apps/miniprogram-cq-talent/assets/icons/login-wechat.svg`
- `apps/miniprogram-cq-talent/assets/icons/settings.svg`
- `docs/superpowers/`
- 根目录的 WPS `.xlsx` 文件

提交一律路径限定 `git add <明确文件>`，每个逻辑批次独立验证、独立提交。不要删除分支、archive 文件、数据库或 hotfix worktree，除非用户明确授权。

## 5. Trellis 任务地图与建议起点

当前仍保留多项历史/在途 Trellis 任务。开始新工作前先读对应 `prd.md`、`design.md`、`implement.md`，不要只看任务名。

优先继续的产品线：

1. 教练端 Figma 逐页恢复与证据补齐：`08-11-08-11-coach-figma-full-restoration`、`08-12-08-12-coach-page-evidence-audit`，以及 C1/C3、C4、C5、C2 等子任务。许多页面已做静态/接口验证，但缺可信运行时 375×812 视觉证据。
2. 角色/登录体验：`08-06-parent-phone-login-guard`、`08-10-active-role-switch`、`08-10-parent-schedule-live-date`、`08-10-schedule-date-and-dual-role`。先读现有实现与测试，再决定是否应收口、拆分或归档重复任务。
3. 家长提醒中心 BFF：`07-30-parent-reminders-bff` 仍在 planning。
4. 如用户明确要求“生产三套双角色测试账号”：不要接着做 UI；新建一个**独立、已授权的部署任务**，按第 6 节运行。

已经标记为 completed 的 C7/C8 与教练演示数据任务可以在确认其任务资料、提交和验收边界后决定是否归档；不要因为状态是 completed 就自动归档其他人的任务。

## 6. 生产部署或安全测试账号导入：强制顺序

这不是当前任务已经执行的操作。只有得到用户对具体生产操作的明确授权后，才另建部署任务并按以下顺序做：

1. **只读确认目标**：实际主机、容器、发布版本、运行时 `NODE_ENV`、API 进程、SQLite volume/文件、Nginx upstream、域名 health；历史目录/commit 不是当前事实。
2. **受限备份**：备份目标 SQLite 主文件以及 WAL/SHM；记录时间、受限位置和可恢复性，不记录文件绝对路径、凭据、电话号码或数据库内容。
3. **dry-run**：在同一受控运行时运行 `secure-test-accounts import --dry-run`；它必须不迁移、不写库。
4. **单次确认**：向用户展示非秘密的目标与 dry-run 结果，获得明确继续授权。
5. **confirmed import**：只在私有运行时提供 `DATABASE_URL`、三项测试手机号变量和备份证明变量；不要在终端回显、文档、日志、截图、commit 或 shell history 写入值。
6. **有界只读回查**：只核验账号数量、角色可用性、家长孩子隔离、教练团队隔离、响应不含电话字段等非秘密聚合事实。
7. **仅重启 API**：完成构建/部署后重启单一 API 服务；随后 health 与同样的有界只读回查。不得顺带清库、重新 seed 或重启无关服务。
8. **真机后验**：用户使用真实微信授权完成 parent/coach 分流；只有此后才可以声明登录链路经过设备验证。视觉验收仍需独立截图对照。

生产/release API 的认证必须是服务端校验后的 `Authorization: Bearer <app-client-session>`。`X-User-Id` 只可用于显式本地开发入口的 localhost smoke，不能通过 Nginx 注入、转发或请求公网 API。

## 7. 基础设施已知事实与不确定性

- 小程序三种配置基址均指向 `https://cqtc.pomi.tech`；DNS、TLS、微信 request 合法域名和真机实际请求仍应在实际发布时再核验。
- 用户曾提供 Ubuntu 主机与公网 IP，历史部署文档也记录过容器、Nginx、SQLite volume 与早期发布版本。这些是历史证据，**不代表此刻服务器真实状态**。
- 所有密码、私钥、手机号、token、Bearer、AppSecret、完整 `.env` 与带凭据连接串均不应进入仓库、交接、日志或截图。若本地历史文件含有这类内容，应优先移出版本控制并轮换，而不是复制到新文档。

## 8. 交接前的提交与任务状态

本总交接文档、部署安全修订和安全账号专项文件会独立提交；其后安全账号任务可按 Trellis 流程归档并记录本次 session journal。该归档仅覆盖 `08-12-secure-production-test-accounts`，不涉及其他活跃任务或上述白名单文件。

接手后，先运行：

```powershell
git status --short
git log --oneline -12
python .\.trellis\scripts\get_context.py
```

再选择一个小任务。不要把“接口存在”“历史 seed 有数据”“HTTP health 返回 200”误报为“可稳定演示”或“生产已部署”。
