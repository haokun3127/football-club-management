# Windows Codex 交付包

此目录是重庆天才足球俱乐部管理系统的日常开发工作副本，面向 Windows 和 Codex CLI。

## 开始开发

```bash
npx --yes pnpm@10.33.0 install --frozen-lockfile
npx --yes pnpm@10.33.0 --filter @football-club/miniprogram-cq-talent typecheck
npx --yes pnpm@10.33.0 --filter @football-club/miniprogram-cq-talent test
```

完整命令、当前项目状态、在线 Figma 和验收流程见 [docs/README.md](docs/README.md)。

## Codex 配置

项目已保留 `.codex/`、`.trellis/` 和 `AGENTS.md`：它们为 Codex 提供项目规范、历史任务和可选 hooks，不依赖 Hermes。

如需启用项目 hooks，在用户级 `~/.codex/config.toml` 中将本项目目录设为 trusted，并在 Codex 中按提示审核 hooks。即使不启用 hooks，代码和文档也可正常使用。

## 设计来源

唯一权威在线 Figma：

`https://www.figma.com/design/zZ6wKyOHKcO4UYXDd9jGwv/`

自 2026-08-04 起，唯一当前设计权威为 `zZ6wKyOHKcO4UYXDd9jGwv`。当前设计引用必须使用完整三元组：

- `zZ6wKyOHKcO4UYXDd9jGwv / 93:29 / G2 Login Verification`
- `zZ6wKyOHKcO4UYXDd9jGwv / 269:250 / P1 Schedule Home`
- `zZ6wKyOHKcO4UYXDd9jGwv / 269:479 / P1 Schedule Home — Empty`
- `zZ6wKyOHKcO4UYXDd9jGwv / 4:6 / 05 Parent Generated`
- `zZ6wKyOHKcO4UYXDd9jGwv / 4:7 / 06 Coach Generated`

旧文件 `ATlfBRO0ruOCDDY5ICagFD` 仅用于历史审计；禁止将其用于新的读取、编辑、实现或视觉验收。节点 ID 不得跨 Figma 文件继承。

本交付包不携带 `.fig` 二进制副本。离线设计快照与 PNG 导出保留在旧交接包的 `02-Figma最新设计导出/`。如需离线解析，显式传入文件路径：

```bash
C:\Users\ASUS\AppData\Local\Programs\Python\Python313\python.exe scripts/fig2json.py "C:\path\to\重庆天才小程序 UIUX Design System.fig" C:\temp\decoded-fig.json
C:\Users\ASUS\AppData\Local\Programs\Python\Python313\python.exe scripts/fig_extract_tokens.py "C:\path\to\重庆天才小程序 UIUX Design System.fig" C:\temp\decoded-fig.json C:\temp\fig-report.md
```

`fig2json.py` 依赖 Python 3.13 环境中的 `zstandard`；默认 Hermes Python 环境可能不含该包。

## 本地运行数据

`local-backups/api-data/` 是从旧工作副本带来的 SQLite 数据备份，不纳入 Git。它可能包含测试或本地运行数据，不能视为生产数据。需要恢复时，先复制指定数据库到 `apps/api/data/dev.sqlite`，再从仓库根目录启动 API，避免生成错误的 `apps/api/apps/api/data/` 嵌套路径。

`node_modules/`、`dist/`、`outputs/`、`.hermes/` 都未随交付包复制，按需重新生成。
