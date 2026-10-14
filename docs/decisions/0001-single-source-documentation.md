# ADR-0001：文档单一权威与兼容入口

- Status: Accepted（文档治理提案；以本 PR 合入后生效）
- Date: 2026-10-14
- Owners: Engineering / Product

## Context

项目历史上将现行规范散布于 `PRODUCT.md`、`docs/current/`、`docs/design/`、`.trellis/spec/`、`HANDOFF*.md` 和 483 份任务 Markdown 中。引发旧品牌色、过期任务计划与 Figma 版本混用，以及“测试通过 = 视觉通过”的误判。

## Options

1. 维持原散点、只增加 README 索引：改动少，但仍产生多源维护。
2. 一次性迁移所有任务和托管 Trellis 目录：视觉上集中，但破坏工作流、相对引用和追溯。
3. 把规范正文集中在 `docs/spec/`，把 ADR 放 `docs/decisions/`、带日期当前快照放 `docs/status/`，Trellis 保留任务引擎并以薄入口指向规范，历史不动。

## Decision

采用方案 3，逐步迁移。稳定规范正文单一写入；托管机器入口和历史原路径保留兼容跳转。视觉权威保留在在线 Figma，API 真实部署事实以相应 OpenAPI/运行实例校验。规范冲突必须显式解决，不能按修改日期盲目覆盖安全边界。

## Consequences

收益：减少重复制定和 agent 误读；代价：需逐项校验链接及旧任务引用，无法在一轮中安全迁移全部历史文件。启用文档链接/状态 CI 后再宣布“完全收敛”。不自动触发生产、测试数据或新 UI 开发。
