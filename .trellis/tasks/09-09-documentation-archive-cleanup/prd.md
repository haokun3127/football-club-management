# 整理项目文档导航与历史归档

## Goal

让从 GitHub 克隆仓库的接手者只看到一条明确的当前文档路径，同时完整保留项目早期计划、交接快照和验收证据，避免误把过期决策当成现行规则。

## 已确认事实

- 当前唯一接手入口是仓库根 `HANDOFF-GITHUB-2026-09-08.md`，并已由根 `README.md`、`README-WINDOWS-CODEX.md` 与 `docs/README.md` 指向。
- 根目录四份旧交接（`HANDOFF.md`、`HANDOFF-2026-08-14.md`、`HANDOFF-KIMI-2026-08-19.md`、`HANDOFF-NEXT.md`）均已明确标注为历史，但仍占用根目录并互相引用。
- `docs/plans/active/` 的三份计划分别形成于 2026-06 或 2026-08，含已被当前实现推翻的单角色、旧 Tab 和未开发小程序等决策。
- `docs/superpowers/plans/` 的八份文档是 2026-08 至 2026-09 已执行工作的计划；当前导航未将其作为活跃计划。
- `docs/current/` 中的旧 agent 交接、当期生产演示、登录绑定与 C1 收口记录属于历史证据，而非持续维护的当前事实。

## Requirements

1. 只移动和重建导航；不得删除历史文档、改写历史结论，或触碰业务代码、微信配置和用户的 Excel 文件。
2. 将过期根交接、已完成执行计划及旧运行快照按日期移动到 `docs/archive/` 下清晰命名的目录。
3. 保留 `docs/current/` 给仍需维护的架构、API、Figma、部署、验收、生产数据修复与项目进度文档。
4. 新增每个归档目录的说明文件，说明资料性质、当前替代入口和阅读限制。
5. 更新所有受影响的 Markdown 链接和 `DELIVERY-MANIFEST.txt`，保证仓库内不留指向旧路径的活链接。
6. 更新 `docs/README.md`、当前 GitHub 交接和 `docs/current/progress.md`，使未来接手者能从当前入口直接找到历史档案。

## Acceptance Criteria

- [x] 仓库根只保留 `HANDOFF-GITHUB-2026-09-08.md` 作为交接文档；四份旧交接位于带说明的历史归档目录。
- [x] `docs/plans/active/` 不再存放已过期计划；八份 `docs/superpowers/plans/` 历史执行计划进入归档。
- [x] `docs/current/` 不再混放已替代的交接/演示快照，并能从 `docs/README.md` 找到归档入口。
- [x] 所有内部 Markdown 链接和交付清单指向实际存在的路径。
- [x] `git diff --check` 通过，且只包含本任务的文档移动、导航和任务记录；用户已有的 `project.config.json` 与 WPS Excel 不纳入提交。

## Out of Scope

- 删除任何文档或清理 Git 历史。
- 更新仍有独立价值但内容较旧的技术/产品参考文档。
- 修改小程序、API、生产环境、Figma 或测试数据。
