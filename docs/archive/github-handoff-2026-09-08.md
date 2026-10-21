# 2026-09-08 GitHub交接原文（历史快照）

本文中的“当前”、旧API基址、“点名即扣课”均是原时点记录，已被后续产品需求和交付状态替代。当前入口见[文档导航](../README.md)。保留原文用于追溯，不作为实施授权或当前业务规则。

# GitHub 接手交接 — 2026-09-08

本文件是仓库的当前接手入口，面向从 GitHub 克隆项目的开发者。

- Repository: `https://github.com/haokun3127/football-club-management.git`
- Daily branch: `dev`
- Current remote commit: `b6a3de3d5bd8415874613176a51a72e681637194`
- Scope: 重庆天才足球俱乐部管理系统（Fastify API、SQLite、微信小程序）

早期 `HANDOFF*.md`、历史任务和 `docs/archive/` 均保留用于追溯；与本文件、
`docs/current/` 或 `docs/current/progress.md` 末尾记录发生冲突时，以较新的当前事实为准。

## 1. 克隆与首次检查

```powershell
git clone https://github.com/haokun3127/football-club-management.git
Set-Location football-club-management
git switch dev
git pull --ff-only origin dev
git status --short
git log --oneline -12
```

本仓库固定使用 `pnpm@10.33.0`。首次安装：

```powershell
npx --yes --cache .tmp-npm-cache-handoff pnpm@10.33.0 install --frozen-lockfile
```

完整质量门禁：

```powershell
npx --yes --cache .tmp-npm-cache-handoff pnpm@10.33.0 run check
```

2026-09-08 的新鲜结果：领域包 `21/21`、小程序 `494/494`、API `138/138` 测试通过，三个工作区的 TypeScript 检查通过。Windows 全局 npm 缓存偶有 `EEXIST` / `EBADF` 文件占用；使用上面的项目内临时缓存即可，不要删除共享 npm 缓存或全局依赖。

## 2. 必读顺序

1. `AGENTS.md`
2. 本文件
3. `docs/README.md`
4. `docs/current/progress.md`（最新记录在末尾）
5. `docs/current/figma-source-of-truth.md`
6. `docs/current/deployment-requirements.md`
7. `docs/current/customer-test-data-repair-2026-09-07.md`
8. `docs/design/reference/figma/README.md`
9. `python .trellis/scripts/get_context.py`

开始任何非微小改动前，按 `AGENTS.md` 使用 Trellis 工作流并读取目标 package/layer 的规范。不要把 `.trellis/tasks/` 中标为 `in_progress` 的历史任务自动等同为当前需要重做的工作；先读其 PRD、进度记录和实际代码。

## 3. 设计与客户端边界

在线 Figma 是唯一设计权威：

- File key: `zZ6wKyOHKcO4UYXDd9jGwv`
- 家长端根页面：`4:6` (`05 Parent Generated`)
- 教练端根页面：`4:7` (`06 Coach Generated`)

页面节点和路由对照在 `docs/design/reference/figma/README.md`。旧 Figma 文件
`ATlfBRO0ruOCDDY5ICagFD` 仅供历史审计，不可作为新设计依据。

视觉修改必须先读取在线节点和截图；类型检查、单测、构建不等于视觉验收。可信视觉验收需真实微信开发者工具或真机 `375×812` 截图与在线稿对照。提交小程序代码后，微信开发者工具可能继续使用旧 bundle，先在 IDE 点击“编译”。

当前客户端 API 基址在所有环境均为 `https://cqtc.pomi.tech`。真实登录只可使用微信授权返回的会话；不得伪造手机号、角色、session 或 API 响应。WXML 不可在模板表达式中调用 `.map()`、`.filter()`、`.slice()`、`.indexOf()` 等 JavaScript 方法。

## 4. 当前实现与测试数据

- 家长、教练端核心路由、小程序双角色会话、训练、比赛、战术板、能力评估、成长足迹均已有实现与回归测试；页面级状态和验收历史在 `docs/current/progress.md`。
- 当前业务规则为“点名即扣课”，已退役的课时更正流程没有前台入口；历史 API/文档保留仅为审计，不应重新接回界面。
- 测评项目库包含可选项目；每次测评只录入教练选择的项目，不是要求完成全部目录。
- 2026-09-07 已在获得授权后修复七个隔离的双角色测试账号：133 名学员、每队 19 人、家长各见 2 名绑定学员、当前三周日程、训练/比赛/能力记录、战术板和余额数据已一致化。详细数据边界、证据和恢复约束见 `docs/current/customer-test-data-repair-2026-09-07.md`。
- 这批数据是合成演示数据，不能被描述成真实运动成绩；真实设备登录和逐页视觉验收也不能由服务端读回替代。

最近两处小程序修复：

- 未结束比赛不显示教练点评；出勤状态不再被误当点评（`3141965`）。
- 家长成长页 P4 课时统计行已移除顶部和内部白色/浅色描边（`b6a3de3`）。

## 5. 生产环境与发布边界

- Public health: `https://cqtc.pomi.tech/health`，2026-09-08 返回 `{"status":"ok","service":"@football-club/api"}`。
- Server identity and runtime procedures are documented in `docs/current/deployment-requirements.md`; passwords、私钥、微信 secret、手机号、Bearer token、`.env` 内容不得写入仓库、文档、日志或命令历史。
- Latest confirmed API/data release is `c893adb` (2026-09-07). Later commits `2bffcd3`、`3141965`、`b6a3de3` are documentation or mini-program changes and do not by themselves change the running API.
- API deploy is never implied by a Git push. Before an authorized production deployment: read-only inspect → verified SQLite backup including WAL/SHM handling → build exact committed tree → recreate/restart only API → internal/public health → bounded readback. Do not re-run the demo-data repair after anyone starts entering customer data without fresh authorization and a new backup.

## 6. Git 与工作区纪律

`dev` is the handoff branch. Work from a fresh branch when making a feature or bugfix; do not force-push, reset, or delete branches as part of ordinary work.

At the time this document was written, the author workspace deliberately retains two user-owned files outside the handoff commit:

- `apps/miniprogram-cq-talent/project.config.json` — local WeChat DevTools settings.
- A root-level WPS `.xlsx` workbook — user material, not source code.

Neither belongs in the handoff commit. In all future work, inspect `git status --short`, stage explicit paths only, and never use `git add -A` in a dirty workspace.

## 7. First practical next step

After a clean clone and green gate, choose one small, independently verifiable task from the current product request. For a visual task follow: online Figma → code/API contract → DevTools `375×812` screenshot → comparison → minimal change → focused test → explicit-path commit. For an API or data task, separately prove code checks, deployed service health, and production readback; they are different claims.

## 8. Documentation map

- Current handoff: this file.
- Current activity record: `docs/current/progress.md`.
- Design authority: `docs/current/figma-source-of-truth.md`.
- Production/data safeguards: `docs/current/deployment-requirements.md` and `docs/current/customer-test-data-repair-2026-09-07.md`.
- Architecture/API contract: `docs/current/architecture.md`, `docs/current/api-contract.md`.
- Historical handoffs: [`docs/archive/2026-08-handoffs/`](../../docs/archive/2026-08-handoffs/), including the former root `HANDOFF.md`, `HANDOFF-2026-08-14.md`, `HANDOFF-KIMI-2026-08-19.md`, and `HANDOFF-NEXT.md`.
