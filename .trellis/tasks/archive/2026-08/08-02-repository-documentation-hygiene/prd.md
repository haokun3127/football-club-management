# 整理项目文档与 Git 分支

## Goal

将当前项目从平铺文档和历史 agent 分支中整理为可导航、可追溯、不会影响现有未提交业务改动的工作副本。

## Requirements

- 不删除未提交的业务代码、图标、Figma 离线副本、输出目录或远端分支。
- 将文档按当前事实、设计规格、计划和历史档案分层，并提供一个稳定入口。
- 修复因移动产生的项目内 Markdown 链接。
- 只删除已经完整包含在 `codex/chongqing-talent-business` 中的本地旧分支。
- 保留 `master`、当前工作分支、仍含独有提交的分支和远端分支。
- 记录遗留的 dangling commit 与 Codex 失效 worktree 元数据，不在本任务中做破坏性对象清理。

## Acceptance Criteria

- [x] `docs/README.md` 可定位当前进度、架构、在线 Figma、验收和历史档案。
- [x] 当前事实、设计规格、计划和历史档案不再平铺在 `docs/` 根目录。
- [x] 已移动文档的项目内链接通过静态检查（61 个链接，0 个失效）。
- [x] 已包含的本地旧 Git 分支被删除；当前和有独有提交的分支保留。
- [x] 工作区中原有未提交业务改动仍存在。

## Notes

- 在线 Figma `ATlfBRO0ruOCDDY5ICagFD` 是设计唯一基准；本地 `.fig` 仅为离线历史备份。
- 当前全仓检查仍有两个 API fixture 失败，和本整理任务无关，不在此任务中修复。
