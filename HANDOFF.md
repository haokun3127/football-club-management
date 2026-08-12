# 交接文档 — 重庆天才足球俱乐部管理系统（→ Claude）

交接时间：2026-08-12（晚）
交接人：Hermes Agent
仓库路径：`C:\Users\ASUS\Desktop\football-club-management-codex-windows-2026-08-02`
当前分支：**dev（HEAD = 4e0bd64）**；分支模型 = **master（稳定）+ dev（日常）**，本地远端各两个，无其他分支。

## 〇、接手后最先要做的三件事

1. `git checkout dev && git pull origin dev`，然后跑门禁 `npx --yes pnpm@10.33.0 run check`（本机 pnpm 不在 PATH，必须用 npx 钉版；429 tests 全绿才算环境正常）。
2. **让用户在微信开发者工具模拟器里点一次「微信手机号授权并继续」**——当前模拟器会话已被清空（原因见"已知坑 #4"），没有真实会话就无法做页面截图验收。
3. 读 `docs/design/specifications/figma-online-frame-map-2026-08-12.md`——Figma 在线画板 id 映射表，Figma 复原任务的施工图纸。

## 一、当前进行中的主任务：家长端+教练端按 Figma 全量复原

用户要求：家长端 + 教练端**完全按 Figma** 复原，验收标准 = **真实 375×812 截图逐页对照设计稿**，静态检查/测试通过不算数。

- 权威设计：Figma 文件 `zZ6wKyOHKcO4UYXDd9jGwv`，家长端在页面 `4:6`（21 画板），教练端在 `4:7`（28 画板）。**CODE / 前缀的画板不是权威**（用户 2026-08-07 裁定）。
- **已完成**：P1 Schedule Home（对齐 2026 年新设计 `269:250`：周历去箭头、今日红圈/选中深色圈双高亮，提交 `4e0bd64`，截图验收通过）。
- **未完成**：家长端其余 20 板、教练端 28 板。逐页施工循环见下。

### 逐页施工循环（每页重复）

1. Figma 取设计稿截图：`mcp__figma__get_screenshot(fileKey, nodeId)` → 返回短效 URL → `curl -sL -o design.png <url>`。
2. 小程序截当前页：`node tmp/prod-verify/mp-route-shot.cjs "<route>?<query>" "<绝对路径>.png" force`（`force` 强制重导航，避免同路由不同 query 拍到旧页）。
3. 合成对比图：`python tmp/figma-restore/sidebyside.py design.png current.png cmp.png`，用视觉模型逐项比对。
4. 有差异 → 改 wxml/wxss/ts → `typecheck` + `vitest run` → 重截图复验 → 路径限定 `git add` 提交。
5. 每页（或每小批）独立提交，禁 `git add -A`。

### 截图工具链状态

- 微信开发者工具 Stable v2.01.2510290，CLI 在 `D:\微信web开发者工具\cli.bat`。
- 自动化端口当前 **9428**（会话失效就换端口重注册：`cli.bat auto --project <项目路径> --auto-port <新端口>`，并同步改 `tmp/prod-verify/mp-route-shot.cjs` 里的端口号）。
- **automator 的 `reLaunch/navigateTo` promise 会挂起/报错**，必须用 `mp.callWxMethod("reLaunch", {url})` 通道（脚本已封装好）。
- `mp.screenshot` 偶发超时 = 渲染面卡死，换端口不管用就 `cli.bat quit` 后重开。

## 二、生产环境

- 生产 API：`https://cqtc.pomi.tech`（容器 `cq-talent-api`，文件型 SQLite `/var/lib/cq-talent/api.sqlite`）。
- 服务器 `43.136.114.225`，Ubuntu 24.04，用户 `ubuntu`，密码用户已提供（问用户要；**不要写进任何仓库文件**）。接入方式：
  ```
  uv run --with paramiko python <script.py>   # 参考 tmp/prod-verify/query-participants.py 的写法
  ```
  复杂 SQL/JS 用 base64 编码后在容器内 `node -e` 执行（`node:sqlite` 的 DatabaseSync）。
- **铁律：任何直接写库操作后必须 `docker restart cq-talent-api`**——运行进程的内存快照（`mergePersistedPlatformData`）不会自动重载，不重启前端看不到新数据。
- 生产 API **不接受 `x-user-id` 头鉴权**（`createProductionMembershipResolver` 硬关），只能真实微信登录会话。
- 写库前必先备份：`VACUUM INTO '/var/lib/cq-talent/api-backup-<标签>.sqlite'`。现有备份：`pre-51028d0-20260812T100034Z`、`api-backup-pre-enrich-20260812`。
- 本机 shell 有 HTTP_PROXY=127.0.0.1:7890，curl 打 localhost/生产都要 `--noproxy '*'`。

## 三、数据现状（2026-08-12 补数后）

三个测试账号（家长+教练双角色）：`19922961921` 等三个手机号（其余两个问用户）。每账号：2 孩子、17 个事件（07-14→08-17，每周 2 训练+双周赛，未来 4 场）、32 条 metric 记录（8 雷达维度×4 采样点）、课时台账、保险至 2027-01-15、运营档案。**最近一个月（07-12→08-12）每天有数据的要求已满足**。
- 未来赛事参与状态已修为 `enrolled`（显示"状态待确认"），已完成赛事保持 `confirmed`（显示"已到场"）。
- 所有补数行 ID 带 `secure-test` 命名空间，可按模式清理；注意它们不在 secure-test-accounts 命令的 canonical manifest 里，rollback 命令不会清。

## 四、验证命令

```bash
npx --yes pnpm@10.33.0 run check        # 根门禁：typecheck + 全部测试（429）
cd apps/miniprogram-cq-talent && npx --yes pnpm@10.33.0 run typecheck
cd apps/miniprogram-cq-talent && npx --yes pnpm@10.33.0 exec vitest run   # 306
curl -s --noproxy '*' https://cqtc.pomi.tech/health
```

## 五、已知坑（都是踩过的）

1. **终端 `cd` 会改会话工作目录**，之后 read_file/patch 相对路径全部失效——cd 过就用绝对路径。
2. 路径含中文时 search_files(ripgrep) 会炸（os error 3），用 terminal grep/find 兜底。
3. 小程序 WXML 禁 `.map()/.filter()`，WXSS 禁长 base64；图标用 `/assets/icons/*.svg` + `<image mode="aspectFit">`。
4. **DEV_AUTO_SESSION 对生产无效且有毒**：它把伪造会话写进 wx storage，回滚配置后 storage 里的假会话还在，会持续 403。补救 = `mp.callWxMethod("clearStorage")` + 干净重启。生产只认真实微信会话，别再用它验生产页面。
5. 强杀 DevTools 进程会导致 GUI 白屏（`Ctrl+Win+Shift+B` 重置显卡恢复）且丢登录态——用 `cli.bat quit`。
6. 生产重跑全量 seed 会覆盖用户绑定手机号（fb1e268 已修的缺陷）——补数只能受控 INSERT。

## 六、提交纪律

- 路径限定 `git add <具体路径>`，禁 `git add -A`。
- 这些文件**不要带进提交**（他人在途/用户文件）：`apps/api/src/store.ts` 的部分 hunks、`tmp-phone-repro.mjs`、`project.config.json`（仅 EOL 差异）、`docs/superpowers/`、根目录 xlsx、`settings.svg`、`login-wechat.svg`。
- master 当前落后 dev 两个提交（613b653、4e0bd64），是否同步 master 由用户决定。

## 七、文档地图

- 本文档：总交接
- `docs/current/progress.md`：逐日进度流水
- `docs/design/specifications/figma-online-frame-map-2026-08-12.md`：Figma 画板↔路由映射（施工图纸）
- `docs/design/specifications/{parent,coach,shared}/`：逐画板规格导出
- `.trellis/`：Trellis 任务/规范层（工作流见 `.trellis/workflow.md`）
