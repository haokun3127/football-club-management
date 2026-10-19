<!-- TRELLIS:START -->
# Trellis Instructions

These instructions are for AI assistants working in this project.

This project is managed by Trellis. The working knowledge you need lives under `.trellis/`:

- `.trellis/workflow.md` — development phases, when to create tasks, skill routing
- `.trellis/spec/` — package- and layer-scoped coding guidelines (read before writing code in a given layer)
- `.trellis/workspace/` — per-developer journals and session traces
- `.trellis/tasks/` — active and archived tasks (PRDs, research, jsonl context)

If a Trellis command is available on your platform (e.g. `/trellis:finish-work`, `/trellis:continue`), prefer it over manual steps. Not every platform exposes every command.

If you're using Codex or another agent-capable tool, additional project-scoped helpers may live in:
- `.agents/skills/` — reusable Trellis skills
- `.codex/agents/` — optional custom subagents

Managed by Trellis. Edits outside this block are preserved; edits inside may be overwritten by a future `trellis update`.

<!-- TRELLIS:END -->

## Project Workflow Overlay

For non-trivial engineering work in this repository, use the Trellis project layer before editing code:

1. Read `.trellis/workflow.md` and the current task context with `python3 ./.trellis/scripts/get_context.py`.
2. If there is no active task and the work is more than a tiny fix, create or ask to create a Trellis task before implementation.
3. Read the relevant `.trellis/spec/<package>/<layer>/index.md` and the files it links before editing.
4. After code changes, run the relevant package checks and use Trellis finish/update-spec flow to record durable lessons.

Keep this overlay additive. Do not remove existing Codex, Hermes, Impeccable, Seedance, or other local skills.

## 主开发工作区与当前状态

- 日常开发统一使用 `/Users/dongjun/projects/football-club-management`；微信开发者工具只导入该目录下 `apps/miniprogram-cq-talent`，显示名为“重庆天才-主开发”。
- `Documents`下同名符号链接不再作为第二个导入入口；不要在WorkBuddy报告目录、临时验收副本或旧worktree中另起日常开发。
- 路径/副本用途见 [唯一主开发入口](docs/current/development-workspace.md)；版本、待办及验证边界见 [当前交付状态](docs/current/development-delivery-channel.md)。开工时读回Git分支、HEAD和脏工作区，不根据旧交接快照切分支或覆盖改动。
- 保留旧worktree和发布证据；项目列表“移除记录”与删除源码是不同操作，不清理其他工具的未提交工作或登录缓存。

## 微信小程序平台规范（动小程序代码前必读）

`apps/miniprogram-cq-talent` 是原生微信小程序，受腾讯平台规范约束。动手前读 `docs/reference/wechat-miniprogram/`：

可执行开发规则与质量门禁从 `.trellis/spec/miniprogram/frontend/index.md` 进入；官方事实仍回到下述本地留档核对。

1. 先读该目录 `notes/` 里对应主题（配置/分包/隐私/开放能力/性能/审核），细则回 `pages/` 官方正文；不要凭记忆或旧交接文档下结论。
2. 留档时间以 `manifest.json` 和 `pages/` 文件头为准。超过约 1 个月、或发版前，重跑 `python3 scripts/wechat-docs/fetch-official-docs.py` 并用 `manifest.json` 的 SHA-256 比对变化。
3. 已核对的差距清单与推进顺序见 `docs/reference/wechat-miniprogram/notes/08-本项目平台合规差距-2026-09-18.md`；新增隐私接口、新增页面、包体积变化都要回到该清单更新。
