# 足球俱乐部管理系统

Fastify API + SQLite 持久化、共享领域包、重庆天才微信原生小程序。

## 入口

- [项目规范中心（唯一入口）](docs/spec/README.md)
- [当前仓库交接与未核验事项](docs/status/current.md)
- [当前 Figma 设计与视觉保真标准](docs/spec/visual-fidelity.md)
- [API / 安全契约](docs/spec/api/README.md)
- [项目开发与验收流程](docs/spec/workflow.md)
- [历史归档及设计参考](docs/README.md)

## 目录

`apps/api/` API；`apps/miniprogram-cq-talent/` 微信小程序；`packages/domain/` 领域模型；`docs/spec/` 唯一现行项目规范；`docs/decisions/` ADR；`docs/status/` 带日期交接快照；`docs/archive/` 历史文档；`.trellis/` 托管工作流与任务历史。

## 本地验证

```bash
npx --yes pnpm@10.33.0 install
npx --yes pnpm@10.33.0 run check
npx --yes pnpm@10.33.0 --filter @football-club/miniprogram-cq-talent typecheck
```

测试结果、LocalHarness 同步、微信 DevTools 实际截图、生产部署是互相独立的证据，参见 [验收门禁](docs/spec/quality-gates.md)。
