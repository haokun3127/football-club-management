# 评审执行与检查记录

- [x] 建立基线、阅读Trellis及小程序规范，写入PRD。
- [x] 核查原生架构、组件引用、日历、雷达、战术板、状态和请求层、类型和API合同。
- [x] 核对TDesign/Vant/ECharts/微信官方类型与测试工具的一手资料。
- [x] 小程序typecheck退出0；80个测试文件通过，569项通过、1项跳过。
- [x] 平台检查器退出0并报告原始文件预算1.67MiB预警；不等于官方构建超限。
- [x] 最小模拟复现旧401清新会话与并发登录跳转；负例验证Page/Component类型检查缺口。
- [x] 保存report.md与可复现诊断脚本，核对引用、文档和差异。

## 状态
评审已交付，无业务代码实施。未来优先处理请求身份竞态与官方类型迁移，然后验证底栏状态、抽取日历和单一浮层试点。任何候选库须先取得实际npm构建、官方包体及目标设备证据，再决定推广。

## 检查命令
使用Node24目录置前：PATH=/opt/homebrew/opt/node@24/bin:$PATH。
- pnpm --filter @football-club/miniprogram-cq-talent typecheck
- pnpm --filter @football-club/miniprogram-cq-talent test -- --cacheDir=/tmp/cq-talent-tech-review-vitest（实际输出执行vitest run，共80个文件）
- pnpm check:miniprogram-policy
- node .trellis/tasks/10-20-miniprogram-technology-review/research/review-probes.cjs（归档后相应路径随任务移动）
- git diff --check；检查最终git status与业务目录diff。

未运行全仓库check:delivery、微信官方构建、Audits、真机或线上业务验证。没有改业务源码，因此不触发全仓库交付和部署门禁。
