# PRD：cq-talent Figma 视觉基础落地

## 当前设计来源约定（2026-08-04）

本任务后续的唯一当前设计权威是在线 Figma `https://www.figma.com/design/zZ6wKyOHKcO4UYXDd9jGwv/`（file key `zZ6wKyOHKcO4UYXDd9jGwv`）。当前引用必须使用三元组：`zZ6wKyOHKcO4UYXDd9jGwv / 93:29 / G2 Login Verification`、`zZ6wKyOHKcO4UYXDd9jGwv / 269:250 / P1 Schedule Home`、`zZ6wKyOHKcO4UYXDd9jGwv / 269:479 / P1 Schedule Home — Empty`、`zZ6wKyOHKcO4UYXDd9jGwv / 4:6 / 05 Parent Generated`、`zZ6wKyOHKcO4UYXDd9jGwv / 4:7 / 06 Coach Generated`。旧文件 `ATlfBRO0ruOCDDY5ICagFD` 仅用于历史审计，禁止新的读取、编辑、实现或视觉验收；节点 ID 不得跨文件继承。

下文保留的 P1/G2 几何若来自切源前记录，均须视为历史规格，不得作为新实现依据。G2 当前现行 `form-card` 为 `331×144`；旧 `verification-card` `331×128` 仅作历史值。

## 2026-08-05 当前范围覆盖

“核心演示闭环”覆盖本任务的全量视觉愿景：P1–P10 与 C1–C16 降级为长期愿景，不作为本轮实现或验收范围。当前只按以下冻结顺序推进：P1 视觉验收、签到持久化、测试指标+P5、训练计划、比赛记录、战术板重启读回+MVP 视觉。历史调查、旧几何和既有时间线均保留，不得据此推导新实现参数。

## 目标

按 2026-07-30《Figma 原始设计全量补齐》决策（docs/figma-full-implementation-decision.md），
落地第一阶段：设计变量、基础组件、导航框架，使后续 P/C 页面重做有统一的 token 与组件基座。

## 现状核查（2026-07-30，实测）

- 当前 `app.wxss` 已有一层 CSS 变量（brand/page/card/line/text/success/warning/error/info/pending）。
- 与 Figma 导出 PNG 像素级取色对比（01-设计语言 / 02-设计变量）：
  - 品牌红 Figma ≈ `#a80818`，代码 `#a80f1b` —— 一致
  - 深红 `#780810` ≈ `brand-pressed #7f0b14` —— 一致
  - 成功绿 Figma `#188050` vs 代码 `#237804` —— **有偏差**（Figma 偏青绿，代码偏黄绿）
  - 错误红 `#b02018` ≈ `#b42318` —— 基本一致
  - 信息蓝 `#2068d8` ≈ `#175cd3` —— 基本一致
  - 警告橙 `#b06800` ≈ `#ad6800` —— 一致
- 结论：色板层面代码与 Figma 同源，无需返工；差异集中在组件精细度、版式与动效。

## 阻塞与对策

- 交接 PNG 为 1280px 缩略总览，文字不可读，无法作为像素级重做依据。
- 本机未配置 vision 模型，.fig 二进制（fig-kiwi）无可用解析器。
- **权威数据获取待用户三选一**：Figma API token（走 /v1/files/:key/variables/local + nodes 接口）/
  Figma MCP / 人工导出 P/C 画板高清图（每画板 2x PNG 或 PDF）。
- 待办：拿到权威数据后回填 68 个变量的精确名称与值，替换本任务中的近似值。

## 本阶段交付物

1. `styles/tokens.wxss`：独立 token 层（颜色/字号/间距/圆角/阴影），app.wxss 改为 @import 消费。
2. 成功绿等偏差色值按 Figma 取色修正。
3. 基础组件对齐清单（23 组 Figma 组件 ↔ 现有 8 个组件的差距表）。
4. 每步小提交，每组件附 375×812 截图对比（拿到高清画板后）。

## 不做

- 不重排任何现有页面的业务逻辑与数据流。
- 不新增 P/C 扩展页面路由（属第二、三阶段，且部分依赖后端闭环）。
