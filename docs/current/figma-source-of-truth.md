# Figma 权威来源

> 最后更新：2026-08-04

## 唯一设计基准

后续查看、审计、修改和验收重庆天才小程序设计时，唯一权威来源是以下在线 Figma 文件：

https://www.figma.com/design/zZ6wKyOHKcO4UYXDd9jGwv/

文件 Key：`zZ6wKyOHKcO4UYXDd9jGwv`

任何页面实现、设计规格、视觉回归和 Figma MCP 操作，均应以此在线文件当前内容为准。旧文件 `ATlfBRO0ruOCDDY5ICagFD` 仅用于历史审计，禁止新的读取、编辑、实现或视觉验收；本地 `.fig` 二进制副本也不是当前设计事实。来自不同设计文件的节点 ID 不得互相继承。

## 当前设计引用三元组

- `zZ6wKyOHKcO4UYXDd9jGwv / 93:29 / G2 Login Verification`
- `zZ6wKyOHKcO4UYXDd9jGwv / 269:250 / P1 Schedule Home`
- `zZ6wKyOHKcO4UYXDd9jGwv / 269:479 / P1 Schedule Home — Empty`
- `zZ6wKyOHKcO4UYXDd9jGwv / 4:6 / 05 Parent Generated`
- `zZ6wKyOHKcO4UYXDd9jGwv / 4:7 / 06 Coach Generated`

## 本地 .fig 的定位

本地交接包中的以下文件仅作为历史离线备份和解析素材：

`02-Figma最新设计导出/重庆天才小程序 UIUX Design System.fig`

它不是可安全自动回写的工作副本。Figma MCP 修改的是在线文件；需要更新本地备份时，应从上述在线文件人工导出 `.fig` 后再替换本地文件，并记录新的导出时间和校验值。

## 当前 G2 设计引用

- 页面：`05 Parent Generated`
- 画板：`G2 Login Verification`
- 节点 ID：`93:29`
- 画板尺寸：`375x812`
- 当前来源三元组：`zZ6wKyOHKcO4UYXDd9jGwv / 93:29 / G2 Login Verification`

已完成的在线改动：

- 将 `绑定孩子` 改为 `身份验证`。
- 删除验证码、获取验证码和重复的微信一键登录组。
- 验证卡保留两行：`微信手机号 / 授权后自动读取`、`身份匹配 / 自动匹配俱乐部档案`。
- 保留唯一 CTA：`微信手机号授权并继续`。
- 两行标签和值均使用 `Noto Sans SC Regular`、`14px`；值列起点统一为 `x=111`。

## P1 运行态证据边界

- 当前成功态画板来源三元组：`zZ6wKyOHKcO4UYXDd9jGwv / 269:250 / P1 Schedule Home`，尺寸 `375×812`。
- 旧文件 `ATlfBRO0ruOCDDY5ICagFD` 的 `93:83` 节点和相关历史截图仅保留为切源前审计事实，不构成新的视觉验收依据；不代表 P1 Empty、其他家长页、教练页或真机矩阵已经验收。
- 每次视觉改动仍必须先读取当前在线目标三元组和截图；不能用本地 `.fig`、旧导出或切源前历史规格反推当前设计。

## 维护规则

1. 修改在线 Figma 前，先读取目标页面与画板节点，确认文件 Key、页面名、画板名和节点 ID。
2. 修改后必须重新读取关键节点，并生成 Figma 截图检查文字、布局和可见性。
3. 未获得可信 DevTools 或真机 `375x812` 截图前，不得宣称小程序实现与 Figma 完全一致。
4. 需要将在线设计同步回交接包时，先导出本地 `.fig`，再更新此文档中的导出时间、文件大小与 SHA-256。
