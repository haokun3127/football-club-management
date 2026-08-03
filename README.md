# 足球俱乐部管理系统

足球俱乐部多端管理系统，包含 API、领域包与重庆天才足球俱乐部微信小程序。

## 快速入口

- [项目文档导航](docs/README.md)
- [当前项目进度](docs/current/progress.md)
- [当前架构](docs/current/architecture.md)
- [Figma 权威来源](docs/current/figma-source-of-truth.md)
- [小程序手工验收](docs/current/miniprogram-manual-acceptance-cq-talent.md)

## 项目结构

```text
apps/
  api/                         Fastify API 与 SQLite 持久化
  miniprogram-cq-talent/       重庆天才微信小程序
packages/
  domain/                      领域模型与共享逻辑
scripts/                       工具与 Figma 离线解析脚本
docs/                          当前事实、设计规格、计划与历史档案
.trellis/                      任务、规范与历史实施证据
```

## 常用命令

```bash
npx --yes pnpm@10.33.0 install
npx --yes pnpm@10.33.0 run check
npx --yes pnpm@10.33.0 run test
npx --yes pnpm@10.33.0 --filter @football-club/miniprogram-cq-talent typecheck
```

Windows 环境中，项目应使用 pinned `pnpm` 版本执行；详情见 [项目文档导航](docs/README.md)。

## 文档规则

- 当前可执行事实在 `docs/current/`。
- 在线 Figma 是设计唯一基准，本地 `.fig` 仅是离线历史备份。
- 页面规格在 `docs/design/specifications/`。
- 早期评估和过期计划保留在 `docs/archive/`，不作为当前实现依据。
