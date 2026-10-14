# 微信小程序前端开发规范

> 适用于 `apps/miniprogram-cq-talent`。本层把腾讯官方留档转成可执行的项目规则；平台事实仍以当前官方正文和后台实际状态为准。

---

## 规则优先级

发生冲突时按以下顺序处理：当前腾讯官方正文/微信公众平台实际状态 > `docs/reference/wechat-miniprogram/pages/` 快照 > 本规范 > `notes/` 与任务文档。

本规范依据的本地官方正文抓取于 **2026-09-18**，对应抓取时最新基础库 **3.17.3**。超过约 1 个月或发版前必须刷新留档并复核规则。所有 `Owner: TBD` 表示 **Owner 待项目维护者指定**，不得把 `TBD` 当成已经完成责任分配。

---

## 编辑前检查

- [ ] 先读 `docs/reference/wechat-miniprogram/notes/` 中与改动相关的主题，再回到 `pages/` 核对官方正文。
- [ ] 阅读下表中与改动相关的规范文件；涉及新页面、隐私能力、网络能力或包体变化时不得只读本索引。
- [ ] 核对留档日期；超过约 1 个月或准备发版时先运行 `python3 scripts/wechat-docs/fetch-official-docs.py` 并比较 `manifest.json`。
- [ ] 新增隐私能力前，先确认 `rules.json` 的批准清单、后台隐私保护指引、用户同步同意链路与拒绝降级方案。
- [ ] 不把 `project.private.config.json`、本地调试开关或原始文件求和当成团队发布配置和官方包体结论。

---

## 规范文件索引

| 文件 | 职责 | 状态 |
| --- | --- | --- |
| [配置与分包](./configuration-and-packaging.md) | 项目配置、基础库、路由、HTTPS、上传文件与包体 | Active |
| [隐私与开放能力](./privacy-and-capabilities.md) | 隐私清单、同步同意、注销、登录密钥与付费能力 | Active |
| [性能与兼容性](./performance-and-compatibility.md) | 废弃 API、异常、`setData`、定时器、能力检测与 Audits | Active |
| [发布与审核](./release-and-review.md) | 留档刷新、后台门禁、审核体验、官方包体证据与发布观察 | Active |

---

## 编辑前/提交前建议运行（报告式）

- [ ] 按需运行 `node scripts/miniprogram-policy/check.mjs` 或 `pnpm -w run check:miniprogram-policy`；检查器列出发现和按规则汇总，恒定以 exit 0 结束，不阻断后续命令。
- [ ] 运行 `node --test scripts/miniprogram-policy/check.test.mjs`，确认当前工作区、合成违规和规则编号防漂移测试均通过。
- [ ] 检查结果是报告；是否修理由人/Codex 结合规则与评审上下文决定。完整交付前另行运行 `pnpm -w run check` 或任务要求的等价检查。
- [ ] 包体输出只视为“原始文件预算预警”；主包/单分包 2M、总包 30M 必须以微信开发者工具或官方上传构建为准。
- [ ] 人工规则逐项留证：后台状态、首次授权拒绝/同意、家长/教练主路径、真机兼容、Audits、审核测试号与发布后观察。
- [ ] 规则变化时同步更新规范、`scripts/miniprogram-policy/rules.json` 与测试。

---

**语言**：本规范使用中文，与本项目微信官方留档及发布材料保持一致。

## 2026-10-14 发布候选复核

46篇官方正文全部刷新，manifest零失败；精确旧HTML哈希对照仅基础库日志增加3.17.4（swiper clip及本项目未用能力）和配置示例修复等号。团队已验证最低3.17.3保留；不能把当前最新版本3.17.4与已验证团队基线混为一谈。新增公共配置/四入口及家长确认成绩遵循[跨端合同](../../api/backend/public-presentation-results.md)。
