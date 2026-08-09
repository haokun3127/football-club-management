# 重庆天才足球俱乐部项目交接文档（2026-08-09）

> 交接日期：2026-08-09（Asia/Shanghai）
>
> 用途：把主工作区当前状态、今日完成的全部工作、验证基础设施和未完成事项交给下一位 agent（Codex）。
> 本文只记录可复核事实；密码、token、session、手机号和微信 AppSecret 不写入仓库。
> 上一份交接：`docs/current/agent-handover-2026-08-07.md`（其中 worktree/分支关系仍然有效，本文不重复）。

## 0. 下一位 agent 先读什么

1. `AGENTS.md`（Trellis 工作流强制）
2. 本文档
3. `docs/current/progress.md`（逐日工作日志，最新在最下）
4. `docs/current/figma-source-of-truth.md`
5. `.trellis/tasks/07-30-figma-design-foundation/`

只读体检命令（bash）：

```bash
git status --short
git log --oneline -12
```

## 1. 当前 HEAD 与今日提交链

分支 `codex/chongqing-talent-business`，今日（08-09）自 `9d4b4bd` 起新增 7 个提交（旧→新）：

| 提交 | 内容 |
| --- | --- |
| `a360cf5` | 清除 radar/growth/metric 三页顶栏 `border-box; height:176rpx` 残留覆盖块（真机 15px 漂移根因） |
| `c05e82f` | 全页巡检修复：比赛英雄卡比分溢出/时间地点粘连 + 训练英雄卡时间格式对齐设计 + 提醒中心双重空态 |
| `bda7b3b` | 雷达页按核心能力雷达视图过滤维度（剔除遗留 metric-finishing 第9行，综合评分 68→76 回归8维口径） |
| `b20cdc2` | docs：巡检+4项修复收口记录 |
| `1fe9d8b` | feat：成长页雷达预览渲染真实数据（clip-path 动态 N 边形替代静态装饰图形，副标题真实维数） |
| `e4294d0` | fix：雷达预览补回网格环/基准多边形/8维度标签（clip-path 下 border 不绘制，改双层多边形叠加） |
| 见 `git log` | 本交接文档及相关收口提交 |

## 2. 今日完成的工作

### 2.1 全页级 Figma↔实页巡检（17 页）

- 采集：`miniProgram.screenshot` 直出 375×812（免疫窗口遮挡/GPU 白屏），17 页首屏 + 关键页滚动下半部，证据在 `C:\Users\ASUS\cq-talent-visual-evidence\audit-*.png`
- 发现并修复 4 项（见上表 c05e82f / bda7b3b）
- 确认为**非缺陷**（勿再返工）：content 文章卡左侧色条=设计原样；滚动内容经过固定 tab 栏下方=正常；长文本省略号=设计防溢出；mp.screenshot 拍不到 canvas=采集限制非页面 bug

### 2.2 成长页雷达预览真实数据化（用户驱动）

- 原为纯 CSS 静态装饰（假六边形网格+固定红色块+硬编码「6维度」）
- 现为真实数据：8 轴网格环 + 8 条轴线 + 真实得分多边形（红描边+半透明填充）+ 同伴基准多边形（有数据时）+ 8 个维度标签 + 副标题真实维数
- 技术路线：纯 view + 内联 `clip-path: polygon(...)`，TS 预计算顶点（`buildRadarPreview`，growth/index.ts）。**不用 canvas**：规避原生 canvas 滚动越过固定层的合成风险，且 mp.screenshot 可正常采集
- 关键渲染教训：**WeChat WXSS 下 clip-path 元素的 border 不绘制**（纯描边环整体消失），轮廓线必须用「外多边形实心底 + 内缩盖面」双层叠加模拟

## 3. 验证基础设施（tmp/prod-verify/，未入库）

| 脚本 | 用途 |
| --- | --- |
| `mp-shot.cjs` | `miniProgram.screenshot` 直出 375×812 页面 PNG（当前自动化端口 **9425**） |
| `nav-to.cjs <route>` / `current-route.cjs` / `scroll-to.cjs <px>` | 路由跳转/查询/滚动（同端口） |
| `sweep*.sh` | 批量页面采集 |

运维要点（细节见技能 `figma-miniprogram-visual-verification`）：

- automator 会话失效 → 换端口冷启动（9421→…→9425），`cli.bat auto --project <path> --auto-port <port>` 后 sed 改四脚本
- 渲染进程死亡（dxcam 抓出黑/白未渲染区但路由仍应答）→ **Ctrl+Win+Shift+B 显卡重启可恢复**（已验证两次）
- mp.screenshot 拍不到 canvas 2d（radar 详情页雷达图须用 dxcam 窗口裁剪兜底）
- 无登录态时不要强杀 DevTools（会丢 session）；验证可用临时 `DEV_AUTO_SESSION=true`，验后必回滚

## 4. 未提交改动白名单（保持不动）

以下是他人在途/用户文件，**不要连带提交**：

- `apps/api/src/store.ts`、`apps/api/src/persistence/*`、`apps/api/test/*`、`apps/api/src/persistence/assessment-repositories.ts`（untracked）——assessment 持久化在途改动
- `apps/miniprogram-cq-talent/project.config.json`——仅 EOL churn
- `docs/superpowers/`、根目录 xlsx（WPS 联调确认表）——用户文件
- `apps/miniprogram-cq-talent/assets/icons/settings.svg`、`login-wechat.svg`（untracked）——全仓零引用，未入库属正常

api 贴边慢测试提示：`preserves app-client assessment records...` 单跑 ~4.5s（5s 限时），并行负载下偶发 flake，复跑即绿；若提交该批在途改动建议把 timeout 提到 10s。

## 5. 已知遗留（低优先）

- P1 日程 Hero 与 Figma 的周序差异（MON→SUN vs SUN→SAT）等历史项见 `miniprogram-release-readiness-cq-talent.md` 08-05 判定表
- 齿轮根因（growth 页设置入口跳转目标）未排期
- 两个 hotfix worktree 关系见 08-07 交接文档，勿强并

## 6. 质量门禁现状

- 根 `pnpm run check`（本机用 `npx --yes pnpm@9.15.0 run check`）：typecheck + 137 tests 全绿（domain 18 / miniprogram 51 / api 68）
- 提交纪律：路径限定 `git add`，禁 `git add -A`；每批独立验证独立提交
