# 实施前基线（pre-change baseline）— 2026-10-18

目的：implement.md 第 4 步要求的「实施前限定文件 diff / 私有配置备份」前置产物。
规则：本目录文件均为新增；实施时以本基线对照，实施后不应出现基线外字段变更。

## 预计变更文件的当前状态（HEAD = feature/ui-batch-1-p01 @ 2e8a6d96，hash 于 2026-10-18 实测）

| 文件 | HEAD blob | 工作区状态 | 备注 |
| --- | --- | --- | --- |
| docs/reference/wechat-miniprogram/notes/04-隐私与个人信息合规.md | 4285fd1d0f29 | 干净 | 计划修订 |
| docs/reference/wechat-miniprogram/notes/05-登录-手机号-订阅消息.md | 92eb0bbdb376 | 干净 | 计划修订 |
| docs/reference/wechat-miniprogram/notes/08-本项目平台合规差距-2026-09-18.md | a50122804e5f | 干净 | 计划修订 |
| .trellis/spec/miniprogram/frontend/privacy-and-capabilities.md | 040c63bd5c0b | 干净 | 计划修订（MP-PRIV-002） |
| docs/current/development-delivery-channel.md | 39a9f888c1b3 | 干净 | 更新总览与待办 |
| docs/current/development-workspace.md | 不存在（新增） | — | — |
| README.md | 74ab021c62b0 | 干净 | 仅追加主入口导航 |
| docs/README.md | f563e4fc0c83 | **⚠ 已有遗留未提交改动（M）** | 编辑前先确认遗留 diff 归属 |
| AGENTS.md | daf403d6daae | **⚠ 已有遗留未提交改动（M）** | 同上 |
| apps/miniprogram-cq-talent/project.config.json | — | 干净 | 仅改 projectname |
| apps/miniprogram-cq-talent/project.private.config.json | — | 未跟踪（本地文件） | 仅改 projectname，**不提交**；已备份至本目录副本 |

## 关键当前值快照（更名对照用）

- project.config.json：`projectname = "miniprogram-cq-talent"`，`appid = "wx4c588cd106e520e0"`
- project.private.config.json：`projectname = "miniprogram-cq-talent"`，`libVersion = "3.17.3"`，`setting.urlCheck = true`
- **更名后必须保持不变**：appid、libVersion、urlCheck、envVersion 映射（与 verify-delivery-config.mjs 的 gate 输出字段一致）

## 注意

- 工作区存在约 80 项 Codex 遗留未提交改动，实施时只 add 本任务文件，禁用 `git add -A / .`。
- 上表「待查 hash」项在实施启动时用 `git rev-parse HEAD:<path>` 补齐即可，不影响本基线有效性。
