# projectname 更名影响面（预检）— 2026-10-18

目标值（Codex 方案）：显示名改为「重庆天才-主开发」；保持 AppID / 基础库 / urlCheck / envVersion 映射不变。

## 影响面检索结果（窄范围实测，2026-10-18）

| 位置 | 内容 | 更名影响 |
| --- | --- | --- |
| apps/miniprogram-cq-talent/project.config.json:3 | `"projectname": "miniprogram-cq-talent"` | **计划内修改点** |
| apps/miniprogram-cq-talent/project.private.config.json:4 | 同上（本地覆盖，不提交） | **计划内修改点** |
| scripts/miniprogram-policy/rules.json:20 | 校验规则：`projectname` 须为 string 类型 | **不锁具体值**，更名后校验仍通过（已核对规则定义） |
| scripts/miniprogram-policy/check.test.mjs:25 | 测试 fixture：`projectname: "fixture"` | 不受影响 |
| docs/current/*.md、notes/*.md | 无对 projectname 值的引用 | 无影响 |

## 结论

代码与脚本层面更名影响面为**仅两处配置文件**，无脚本、CI、文档硬编码引用。剩余影响仅两处，均需人工操作：

1. **微信开发者工具项目列表显示名**：更名后 DevTools 中的显示名在重新打开项目时刷新；若项目列表仍显示旧名，属缓存，重新导入或重开项目即可，不改登记记录文件。
2. **CI / 交付脚本**：`verify-delivery-config.mjs` 的 gate 字段不含 projectname，已确认不受影响（Node 24 实跑 passed，见 verify-baseline）。

## 更名后必须复验的不变项

- `appid = wx4c588cd106e520e0`
- `libVersion = 3.17.3`
- `setting.urlCheck = true`
- envVersion 映射不变
- JSON 除 projectname 外逐字段不变（diff 比对，对照 prechange-baseline 快照）
