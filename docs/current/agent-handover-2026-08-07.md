# 重庆天才足球俱乐部项目交接文档

> 交接日期：2026-08-07（Asia/Shanghai）
>
> 用途：把当前工作区、两个 hotfix worktree、生产部署状态、已完成证据和未完成工作交给下一位 agent。
> 本文只记录可复核事实；密码、token、session、手机号和微信 AppSecret 不写入仓库。

## 0. 下一位 agent 先读什么

按以下顺序读取：

1. `README-WINDOWS-CODEX.md`
2. `AGENTS.md`
3. `docs/README.md`
4. 本文档
5. `docs/current/progress.md`
6. `docs/current/figma-source-of-truth.md`
7. `.trellis/tasks/07-30-figma-design-foundation/`

然后只读执行：

```powershell
git worktree list --porcelain
git status --short
git branch -vv
git log --oneline --decorate -8
```

主工作区当前有大量未提交改动。未完成状态必须以当前文件、任务记录和验证证据为准，不能只看提交历史。

## 1. 三个工作区分别是什么

这两个 `football-club-management-*hotfix` 目录不是重复项目，而是 Git linked worktree：为并行 agent 隔离分支和改动而创建。它们共享同一个 Git 对象库，但有独立工作目录和分支。

| 目录 | 分支 | 当前 HEAD | 2026-08-07 只读状态 | 用途 |
| --- | --- | --- | --- | --- |
| `C:\\Users\\ASUS\\Desktop\\football-club-management-codex-windows-2026-08-02` | `codex/chongqing-talent-business` | `3d4837b` | 脏：存在用户/历史未提交改动 | 主交付工作区 |
| `C:\\Users\\ASUS\\Desktop\\football-club-management-phone-binding-hotfix` | `codex/phone-binding-seed-safe` | `e83c4ae` | 干净 | 后端 seed-safe 手机绑定修复及生产验证记录 |
| `C:\\Users\\ASUS\\Desktop\\football-club-management-phone-login-hotfix` | `codex/phone-login-guard` | `b903456` | 干净 | 小程序手机号授权防重复调用修复 |

另外存在一个 Codex 内部 detached worktree：
`C:\\Users\\ASUS\\.codex\\worktrees\\ec6b\\football-club-management-codex-windows-2026-08-02`。
不要把它当作交付主工作区，也不要删除或清理它。

### 提交关系

- `b903456` 是手机号授权防重复修复的独立 worktree 提交。
- 主工作区已用等价内容形成 `3d4837b`，因此主分支已经包含登录 guard 的代码。
- 主分支历史当前不包含 `9720b40` 或 `e83c4ae`。这不等于主工作区没有相关未提交文件；主工作区有大量未提交 API、测试和文档改动，必须先看 `git status` 和具体 diff。
- `9720b40` 是 API seed-safe 手机绑定修复；`e83c4ae` 主要记录该修复的生产验证文档。
- 不要直接在 hotfix 目录继续开发，也不要把两个分支强行合并；下一批工作先由总控确认目标工作区和文件白名单。

## 2. 当前设计与生产基线

### Figma

当前唯一在线设计权威：

`zZ6wKyOHKcO4UYXDd9jGwv`

当前关键节点：

- G2 Login Verification：`93:29`
- P1 Schedule Home：`269:250`
- P1 Schedule Home — Empty：`269:479`
- Parent Generated：`4:6`
- Coach Generated：`4:7`

旧文件 `ATlfBRO0ruOCDDY5ICagFD` 只能作为历史审计资料，不能用于新实现或视觉验收。本地 `.fig` 也只是历史离线备份。

### 服务器与 API

- API：`https://cqtc.pomi.tech`
- 服务器公网 IP：`43.136.114.225`
- 操作系统：Ubuntu Server 24.04 LTS 64bit
- 默认登录用户名：`ubuntu`
- 生产 API 仅监听：`127.0.0.1:3000`
- Nginx TLS：`cqtc.pomi.tech:443` → `127.0.0.1:3000`
- 当前生产容器版本：`9720b40`
- 运行时环境文件：`/opt/cq-talent-api/.env.runtime`
- 2026-08-06 已验证：容器内两项微信配置存在，`https://cqtc.pomi.tech/health` 返回 `200`。

这只证明容器配置、服务健康和 HTTPS 路由可达，不证明真实手机号登录、角色分流、生产数据库绑定或小程序视觉验收通过。密码和 secret 不记录在本文档中。

## 3. 登录状态与真实验收标准

此前真实微信响应为：

```json
{
  "phoneBinding": "received",
  "status": "binding_required",
  "profile": null,
  "role": null,
  "session": null,
  "children": []
}
```

含义：微信手机号 code 已收到，但后端没有解析出 active user / active club membership；这不是登录成功，也不能由前端伪造角色、session 或手机号绕过。

登录 guard `3d4837b` 已解决同一次物理授权中的重复 `getPhoneNumber`、重复 callback、重复 API 请求和重复导航问题；它没有改变真实后端登录契约。

真实重新授权仍需用户在可信 DevTools 或真机上验证。成功标准：

- `status=authenticated`
- `role=parent`
- `session` 存在
- `children.length=2`
- 能正常进入家长端日程

只有 `phoneBinding=received`、`binding_required`、health、OpenAPI、静态测试或页面能打开，都不能写成真实登录通过。

## 4. 已完成证据与当前边界

### P1 日程

P1 按用户要求作为产品接受，但仍保留已知 Figma 差异：Hero 左侧酒红面积/边界和周序差异。没有可信 DevTools/真机 `375×812` 视觉证据时，不得写成像素级视觉完成。

### 教练签到

- 已接入 SQLite。
- 本地文件型数据库已完成 PUT → 关闭 → 同一路径 `seed:true` 重启 → GET 读回。
- `status`、`note` 和 participant 唯一性已验证。
- 生产目前只有 health/OpenAPI 可达证据；生产真实 coach PUT、生产同库重启读回和 C4 可信 `375×812` 视觉验收仍未完成。

### 测试指标与 P5 雷达

- Batch A 的测试指标 SQLite 持久化及本地同库重启读回已验证。
- `growth-summary`、`ability-metrics` 可读回新 assessment 数据。
- P5/radar 的 Batch B 视觉工作尚未开始/未验收：当前在线 Figma 尚未取得可验证的 P5、雷达和指标录入节点及截图。

### 训练计划、比赛记录、战术板

早期批次已经有相应页面、BFF 或本地 smoke 能力，但本轮冻结顺序要求分别完成稳定的持久化或重启读回验证。不能把旧本地 smoke、静态页面或接口存在误报为当前交付完成。

下一步应按冻结顺序继续：

1. 教练签到生产实测边界收束
2. 测试指标读回与 P5/radar 视觉验收
3. 训练计划持久化验证
4. 比赛记录持久化验证
5. 战术板“保存 → 重启 API → 重新读取”验证，再做 MVP 视觉验收

其他功能暂时冻结，不做无关重构。

## 5. 当前未完成任务

主工作区只读任务列表显示：

- `.trellis/tasks/07-30-figma-design-foundation/`：`in_progress`
- `.trellis/tasks/08-05-coach-attendance-persistence/`：`in_progress`
- `.trellis/tasks/08-05-08-05-test-metrics-p5-radar/`：`in_progress`
- `.trellis/tasks/07-30-parent-reminders-bff/`：`planning`

登录 guard 和手机号绑定任务分布在两个独立 hotfix worktree 的任务记录中，不能只读取主工作区目录来判断其状态。登录任务的 `task.json` 仍有 `commit: null` 等过时元数据，下一次文档批次应补记 `3d4837b`，但任务仍要保持“真实授权待验”边界。

现有文档还需要同步的重点文件：

- `docs/current/deployment-requirements.md`
- `docs/current/progress.md`
- `docs/current/miniprogram-manual-acceptance-cq-talent.md`
- `docs/current/miniprogram-release-readiness-cq-talent.md`
- `.trellis/tasks/08-05-coach-attendance-persistence/implement.md`
- `.trellis/tasks/08-06-parent-phone-login-guard/task.json` 与 `implement.md`

这批同步应单独作为文档提交，不能顺手纳入 API、截图工具、图标、WPS 或其他未提交路径。

## 6. 下一位 agent 的第一轮工作方式

1. 先读取本文档和第 0 节列出的文件。
2. 在主工作区重新运行 `git status --short`、`git branch -vv`、`git worktree list --porcelain`。
3. 对照当前在线 Figma，而不是旧 `ATlf...` 或本地 `.fig`，选择一个最小目标。
4. 先由 Sol xHigh 输出计划，再由 Terra xHigh 审核；批准后才执行。
5. 每一批只改明确白名单，做最小验证，保留精确证据。
6. 通过后单独更新对应文档，再单独提交；提交前运行 `git diff --check` 和相关 package checks。

## 7. 禁止事项

- 不执行 `git reset --hard`、`git checkout --`、`git clean`，不删除 worktree、分支、数据库或历史档案。
- 不覆盖主工作区现有未提交改动，不把所有脏文件一并提交。
- 不把 `binding_required` 改成成功，不新增伪手机号、伪验证码、伪 session、伪角色或伪 API 响应。
- 不记录密码、微信 AppSecret、token、session、完整手机号或完整环境文件。
- API 变更后必须重新 build 并重启对应 API；只改本地代码不代表生产已更新。
- 不把 typecheck、单测、health、OpenAPI、页面可打开或普通窗口截图当作真实登录或 Figma 视觉验收。
- WXML 不使用 `.map()`、`.filter()`、`.slice()`、`.indexOf()` 等 JS 方法；展示字段在 TS view model 中预计算。

## 8. 已知全仓检查差异

全仓检查不得笼统写成“既有失败”。目前必须准确记录：

- `apps/api/test/server.test.ts:688`：期望 `not_started`，实际 `in_progress`。
- `apps/api/test/server.test.ts:1344`：数据能力预览记录断言与实际记录集合不一致。

它们与登录 guard 的局部测试不是同一层级；局部通过不能替代全仓通过。
