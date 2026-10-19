# 以新远端统一仓库与开发分支

## Goal

将本地项目完整切换到 `https://github.com/haokun3127/football-club-management`，以该仓库的 `dev` 分支作为唯一活跃开发基线，并使本地代码、远端配置和分支跟踪关系保持一致。

## Background

- 当前本地仓库没有配置任何 remote，工作区在规划前是干净的。
- 当前本地分支为 `codex/chongqing-talent-business`，HEAD 为 `8cbb29587db30a459172ae275b96f71fbdd540b9`。
- 新 GitHub 仓库公开可访问，默认分支目前是 `master`，同时存在 `dev` 以及两个历史 `codex/*` 分支。
- 新远端 `dev` 为 `1453e54af475f8ffb5ca55ccc441cc20ed02ce77`，包含本地当前 HEAD，并领先 850 个提交，可直接快进迁移。
- 新远端 `master` 为 `858a150f8a5ea9edd66c2eaa6a88d4ce3b35a1ae`，比 `dev` 落后 572 个提交，不适合作为本次“最新内容”的开发基线。

## Requirements

1. 配置唯一远端 `origin` 指向用户指定的新 GitHub 仓库。
2. 获取新远端的所有分支和标签，清理失效的远端跟踪引用。
3. 创建或更新本地 `dev`，使其精确跟踪 `origin/dev`，并将当前工作分支切换为 `dev`。
4. 工作树内容必须以 `origin/dev` 为当前标准，不保留本地旧代码的兼容层或手工合并补丁。
5. 保留现有本地历史分支作为可恢复引用；本次不删除 GitHub 上的 `master` 或历史 `codex/*` 分支。
6. 后续常规开发统一从 `dev` 创建短期 `codex/*` 工作分支，合并目标统一为 `dev`。
7. 同步后更新 Trellis 当前任务的分支与基线元数据，并运行仓库规定的安装、检查和测试命令。
8. 同步后按 `origin/dev` 的项目说明构建最新版微信小程序，并在本机微信开发者工具中打开项目。

## Acceptance Criteria

- [ ] `origin` 的 fetch/push URL 均为用户指定的新仓库地址。
- [ ] 本地当前分支为 `dev`，且上游为 `origin/dev`。
- [ ] 本地 `dev` 与 `origin/dev` 的提交 SHA 完全一致，ahead/behind 均为 0。
- [ ] 工作区除本次 Trellis 任务记录外没有意外改动。
- [ ] 远端 `master` 和历史分支未被删除或强制改写。
- [ ] 项目依赖可按新 `dev` 锁文件安装，仓库质量检查与测试通过；若上游本身失败，记录可复现的命令和失败证据。
- [ ] Trellis 任务元数据记录 `dev` 为工作分支和合并基线。
- [ ] 最新微信小程序构建成功，微信开发者工具 CLI 成功打开项目。

## Out of Scope

- 修改 GitHub 仓库的默认分支设置。
- 删除本地或远端历史分支。
- 将 `dev` 强推覆盖 `master`，或为旧本地代码保留兼容实现。
