# 重庆天才小程序本地手工验收

> 2026-08-12 身份安全覆盖：本文件出现的 `X-User-Id` 命令均只适用于显式本地开发 API 的隔离 smoke，绝不能请求公网域名或充当生产登录方式。公网/真机验收必须完成真实微信授权并使用服务端返回的 Bearer session。三套隔离双角色测试账号的生产导入尚未执行，见 `agent-handover-2026-08-12-secure-test-accounts.md`。

## 2026-08-09 Windows 当前截图标准（覆盖 08-05 PrintWindow 标准）

- 当前首选取证通道是 `miniProgram.screenshot`（`tmp/prod-verify/mp-shot.cjs`，automator 端口 **9425**）：直出逻辑视口 `375×812` 页面 PNG，免疫窗口遮挡、最大化、GPU 白屏与前台竞争。
- 两条已知限制：① 拍不到原生 canvas 2d 内容（radar 详情页雷达图须用 dxcam 窗口裁剪兜底）；② `screenshot` 超时但 `currentPage()` 仍应答 = 渲染进程死亡，先发 **Ctrl+Win+Shift+B** 显卡重启（已验证可恢复），不行再换端口冷启动。
- 路由/滚动配套：`nav-to.cjs`（navigateTo promise 挂起属正常，以 currentPage 轮询为准）、`current-route.cjs`、`scroll-to.cjs`（`callWxMethod("pageScrollTo")`）。
- 下文 2026-08-05 的 PrintWindow 标准保留为历史事实与兜底通道；取证优先级以本节为准。

## 2026-08-05 Windows 当前截图标准（覆盖运行态取证）

- 当前 Windows 标准是 `apps/miniprogram-cq-talent/scripts/devtools-screenshot.mjs` 的 Automator 路由/路由栈复核，加上唯一可见“××的模拟器”窗口的 `PrintWindow(PW_RENDERFULLCONTENT)` 精确捕获。
- 合格证据必须确认路由为 `pages/parent/schedule/index`（或本次目标页面的严格路由）、逻辑视口 `375×812`，并保存未裁剪小程序画布 PNG；既有家长日程样本的原始 PNG 为 `563×1218`，capture method 为 Windows PrintWindow DevTools simulator capture，并应有可解析 sidecar 与二次路由复核。
- 截图只证明捕获到了指定 DevTools 模拟器窗口和路由/视口；不证明真实 parent/coach 角色、session、API 200、在线 Figma 几何或视觉验收通过。视觉结论必须另行对照当前在线 Figma 三元组。
- Superseding 说明：下文 `2026-08-04` “窗口捕获不可用”条目继续保留为历史事实；2026-08-05 的 PrintWindow 标准和已取得的有效样本覆盖该条目的当前运行结论，但不删除或改写历史排障过程。
- 2026-08-05 生产部署边界：`6526fe4` 已部署，HTTPS `GET /health` 返回 `200`，OpenAPI 可见 coach attendance 路由；这些证据只证明服务与路由可达，不证明真实 coach PUT、生产同库重启读回、角色/session 或 C4 视觉验收。

## 0. 当前运行基线（2026-08-03，优先于后文历史记录）

- `utils/config.ts` 的 `develop`、`trial`、`release` 均请求 `https://cqtc.pomi.tech`。本地 `127.0.0.1` API 与 `X-User-Id` 仅用于独立的 API smoke，不代表当前 DevTools 小程序会访问本地 API。
- `DEV_AUTO_SESSION = false`。正常小程序流程不创建开发 session，不允许长按或修改 `DEV_IDENTITY_ROLE` 进入家长/教练端；用户角色只能由微信手机号授权后，后端 `wechat-login` 的真实返回决定。
- 真实人工验收顺序：启动后完成微信登录和手机号授权 → 后端返回 `authenticated` 及真实 `role` → 分流到家长或教练端。返回 `binding_required` 时不得用前端角色提示、伪手机号或伪 session 绕过。
- 本文其余部分中有关 localhost、开发身份、长按切换和 WebSocket 自动截图的描述均为历史记录；与本节冲突时，以本节为准。

## 1. 验收目标

用本地 API 和重庆天才 200 人导入测试数据，在微信开发者工具里完成家长端、教练端主流程点击验收。

固定俱乐部：

- `clubId`: `club-chongqing-talent`
- `clientKey`: `cq-talent-wechat-main`
- `clientId`: `app-client-cq-talent-wechat-main`

## 2. 启动本地 API

使用临时 sqlite，避免污染长期 dev 数据，也避免反复 seed 触发唯一约束冲突。

```bash
find /tmp -maxdepth 1 -name 'fcm-cq-talent-smoke.sqlite*' -delete
DATABASE_URL=/tmp/fcm-cq-talent-smoke.sqlite PORT=3000 HOST=127.0.0.1 pnpm --filter @football-club/api dev
```

另开终端确认：

```bash
curl -fsS http://127.0.0.1:3000/health
curl -fsS 'http://127.0.0.1:3000/app-clients/resolve?clientKey=cq-talent-wechat-main'
curl -fsS -H 'X-User-Id: user-parent-cq-talent-acceptance' \
  'http://127.0.0.1:3000/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/parent/children'
curl -fsS -H 'X-User-Id: user-coach-1' \
  'http://127.0.0.1:3000/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/coach/home?date=2026-06-28'
pnpm --filter @football-club/miniprogram-cq-talent smoke:app-client
```

通过标准：

- resolve 返回 `club-chongqing-talent`。
- 家长 children 只返回验收家庭的 2 名孩子；俱乐部 seed 整体仍为 200 名导入学员。
- 教练 home 返回 `2026-06-28` 的训练活动。
- `smoke:app-client` 完成 parent/coach app-client 读写链路，输出 `CQ Talent app-client smoke passed`。

## 3. 打开 DevTools

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli open \
  --project /Users/dongjun/Documents/football-club-management/apps/miniprogram-cq-talent \
  --port 9420
pnpm --filter @football-club/miniprogram-cq-talent devtools:preview
```

如 CLI 提示端口不可用，在微信开发者工具打开：

```text
设置 -> 安全设置 -> 服务端口
```

## 4. 家长端验收

真实人工验收通过微信手机号授权后由后端返回 `parent` 角色进入家长端；下方 `X-User-Id` 仅用于独立 API smoke：

```text
X-User-Id: user-parent-cq-talent-acceptance
```

验收清单：

- 启动页不出现“选择家长/教练”按钮。
- 日程页显示孩子切换，至少能看到导入学员。
- 日程页走 `parent/calendar` 家庭聚合 BFF，支持孩子、日期、训练/比赛/其他筛选。
- 活动详情页能打开训练/比赛详情，缺字段显示待同步。
- 成长页显示雷达或“有效能力指标不足”的空状态，不展示其他孩子数据。
- 指标下钻页显示 BFF 待接入和权限边界，不展示内部公式。
- 我的孩子页显示档案、队伍/教练、课时、保险，只读且没有充值/投保/修改入口。
- 私教意向显示 BFF 待接入，不伪造成提交成功。

## 5. 教练端验收

真实人工验收通过微信手机号授权后由后端返回 `coach` 角色进入教练端；下方 `X-User-Id` 仅用于独立 API smoke：

```text
X-User-Id: user-coach-1
```

验收清单：

- 启动页不出现“选择家长/教练”按钮。
- 教练日程显示 `2026-06-28` 的活动。
- 活动工作台显示名单、点名、销课、比赛录入、评测录入入口。
- 点名页支持批量到课、单人到课/迟到/缺席/请假/免扣、备注，保存走 app-client attendance BFF，失败保留当前草稿。
- 销课页默认全员销课，可取消个别学员并填写原因，确认走 POST lesson-confirmation。
- 销课页“返还/补扣”走 PATCH lesson-confirmation。
- 比赛页能保存比赛摘要和球员事件，字段包含类型、状态、对手、比分、进球、助攻和关键事件。
- 评测页能选择学员、按后端模板字段录入，完整填写后提交成功。
- 训练管理页读取 `training-project-tree`，可选择训练项目并保存到当前训练活动。
- 我的页不展示后台运营菜单，只展示教练身份、负责球队和权限说明。

## 6. 已知阻塞

- 微信登录页、手机号授权、connector 和 session 已实现；当前缺正式 AppID/AppSecret，且没有真实手机号授权、session 与角色分流的生产证据，因此不能宣称生产登录闭环。HTTPS API 的 `/health` 已可访问，但不等于登录闭环。
- 评测已支持按项目录整队、本机草稿和缺测；正式 assessment-task 服务端任务模型仍未实现。
- DevTools GUI 截图在当前 Codex 环境曾返回黑屏，最终视觉验收需要人工点击确认。

## 7. 2026-06-28 Codex GUI 验收尝试

已完成：

- 本地 API 使用 `/tmp/fcm-cq-talent-smoke.sqlite` 启动成功。
- DevTools CLI `islogin/open/preview` 成功，测试 AppID 为 `wx3df49f3b936ab2ed`。
- CLI preview 包体为 `94.8 KB / 97054 Byte`。
- 通过 Computer Use 列表确认 `Wechat Devtools` 进程正在运行。
- 已新增固定脚本 `pnpm --filter @football-club/miniprogram-cq-talent devtools:preview`，可复跑 DevTools `islogin/open/preview`。
- 本地 API 日志显示 DevTools 模拟器从 `localhost:3000` 发起过 `resolve`、`parent/children`、`parent/students/:studentId/schedule` 请求，说明模拟器已连到本地后端。

未完成：

- Computer Use 读取 `Wechat Devtools` 窗口失败，返回 `cgWindowNotFound`。
- macOS `osascript` 读取窗口需要辅助功能权限，当前返回 `not allowed assistive access`。
- `screencapture` 可生成 PNG 文件，但内容为黑屏，不能作为视觉验收证据。
- 因此本轮无法由 Codex 直接点击模拟器并提供视觉证据。

替代证据：

- API smoke 已覆盖 parent/coach 真实 BFF 读写链路。
- DevTools CLI 已覆盖项目可打开、可预览、可编译打包。
- DevTools 模拟器已实际访问本地 API 的家长端读取链路。
- 最终家长端/教练端视觉与点击验收仍需人工按第 4、5 节清单在 DevTools 或真机完成。

## 8. 可复跑 Smoke 脚本

小程序目录已提供固定 smoke 脚本：

```bash
pnpm --filter @football-club/miniprogram-cq-talent smoke:app-client
```

默认配置：

- `API_BASE_URL=http://127.0.0.1:3000`
- `CLIENT_KEY=cq-talent-wechat-main`
- `PARENT_USER_ID=user-parent-cq-talent-acceptance`
- `COACH_USER_ID=user-coach-1`
- `TEST_DATE=2026-06-28`

覆盖范围：

- resolve、capabilities。
- 真实双孩家庭的 children、单孩子 home/schedule/growth、家庭聚合 calendar；200 人整体覆盖由 seed 契约验证。
- 教练 home/workbench、点名、销课确认、销课纠正、训练项目保存、比赛摘要和进球/助攻指标记录。
- 精英评测模板完整提交。

## 9. 2026-06-30 P0 业务闭环 Smoke 结果

使用临时数据库 `/tmp/fcm-cq-talent-p0-smoke.sqlite` 和本地 API `http://127.0.0.1:3100` 验证通过：

- parent children 仅返回同一真实家庭的 2 名重庆天才测试学员，不泄露其他家庭数据。
- parent calendar 仅聚合验收双孩家庭的 4 个活动，并覆盖 2 名孩子。
- coach workbench 返回 `event-cq-talent-u10-dev-training` 的 25 人名单。
- attendance PUT 更新 3 名学员。
- lesson-confirmation POST/PATCH 均成功。
- training-projects PUT 保存 2 个训练项目。
- matches POST 写入 2 个球员事件，并生成 2 条进球/助攻指标记录。
- 精英评测模板提交 62 个 rawResults，生成 62 条 scores 和 99 条 metricRecords。

## 10. 2026-07-10 可试用版验收状态

- `smoke:app-client` 覆盖真实双孩家庭、指标详情、周工作台、训练项目回填、点名/销课/比赛和 62 项评测；fixture 契约另行验证俱乐部 200 人全量数据。
- 登录契约测试确认：手机号决定角色，`roleHint` 不能越权；签发 token 后可使用 Bearer session 访问数据。
- develop 环境保留开发身份；trial/release 禁用开发身份并要求 HTTPS 地址。
- DevTools 当前 `login=false`，脚本已改为复用当前 IDE 端口并明确提示登录阻塞。
- 登录 DevTools 后复跑 `pnpm --filter @football-club/miniprogram-cq-talent devtools:preview`，再按家长/教练清单完成真机点击。

## 11. 2026-08-04 官方 Automator 截图取证

截图命令使用 `miniprogram-automator@0.12.1` 的官方 `connect`、`currentPage`、`pageStack`、`screenshot`、`systemInfo` 与 `disconnect` API；项目代码不直接发送 DevTools RPC。`devtools:automator:open` 通过 Windows `.bat` 兼容方式执行 `cli auto --auto-port 9421`，连接可用前会轮询，且不会自动关闭 DevTools 窗口。

```bash
pnpm --filter @football-club/miniprogram-cq-talent devtools:automator:open
pnpm --filter @football-club/miniprogram-cq-talent devtools:screenshot -- \
  --output C:\Users\ASUS\AppData\Local\Temp\cq-talent-parent.png \
  --expect-route-prefix /pages/parent/ \
  --port 9421
```

### 证据契约

- 工具不导航、不登录、不授权、不切换角色，也不构造 session、手机号、角色或 API 响应；截图前必须已由真实微信手机号授权进入目标页面。
- 工具先通过一个只读 Automator 连接读取路由和截取原始 PNG；断开后以第二个只读连接复核路由未变，再读取 `systemInfo`。此顺序避免当前 Windows DevTools 会话中先读 `systemInfo` 后截图可能一直等待的已知时序问题。
- 逻辑视口必须为 `375×812`；原始 PNG 不裁剪、不缩放，且必须是该逻辑画布的等比完整导出。sidecar 记录路由、路由栈、原始像素、SHA-256、`devicePixelRatio` 和实际导出倍率。
- `devicePixelRatio` 不能用来反推 PNG 像素。2026-08-04 在 iPhone X DevTools 会话中实测：`windowWidth=375`、`windowHeight=812`、`pixelRatio=3`，而旧严格校验得到的原始截图为 `563×1218`。它是约 `1.5×` 的导出位图，因此“PNG 必须等于 375×812”或“PNG 必须等于逻辑尺寸 × pixelRatio”都不可信。
- 路由不匹配、逻辑尺寸不是 `375×812`、或 PNG 不是等比完整导出时，工具不发布 PNG 或 sidecar。

### 当前实测边界

- 2026-08-04 10:35（DevTools 完全重启、真实授权并回到家长日程后）复现：安装的 DevTools `2.01.2510290` / 基础库 `3.17.0` 会回复 SDK 的 `Tool.getInfo`、`App.getCurrentPage` 与 `App.getPageStack`，但对 SDK 内部发起的 `MiniProgram.screenshot()` 永不回复，30 秒后由取证脚本超时退出。未写出 PNG 或 sidecar；这不是页面、路由、登录、角色或 iPhone X `375×812` 设置的问题。
- Windows 窗口捕获也不能作为替代：本机只能枚举到 `wechatdevtools.exe` 进程，未取得可控的 DevTools 窗口句柄。不得用普通桌面截屏、黑屏或路由文本冒充视觉验收。不要将该现象归因于“版本过旧”：本机已确认 DevTools 是其更新通道显示的最新 `2.01.2510290`。先完整退出整个 IDE 进程并重新由 `cli auto --auto-port` 启动，确认新端口实际监听后再跑同一条官方 SDK 命令；只有全新自动化端口仍复现时，才进一步判断兼容性边界。
- 2026-08-04 已实测官方 SDK 可连接自动化端口并读取当前 `pages/parent/schedule/index` 路由及 iPhone X `systemInfo`。这证明自动化连接和逻辑设备信息可读取，但不等于新的命令已取得运行态视觉验收。
- 本轮调试中，旧的同连接 `systemInfo` → `screenshot` 顺序曾造成截图调用超时；随后该桌面 DevTools 自动化窗口未能重新开放端口。新工具已以双连接顺序修复并有回归测试，但在 DevTools 完全重启、重新真实授权并生成新的 PNG 前，P1 或任何页面都不能宣称完成 DevTools/真机视觉验收。
- 已有的前台 DevTools P1 成功态截图 `C:\Users\ASUS\AppData\Local\Temp\cq-talent-p1-375x812-current-20260803.png` 仍是历史人工证据；Empty 状态、其他页面及 Parent/Coach TabBar 真机矩阵仍待逐项验收。

### 2026-08-05 Windows 模拟器窗口精确捕获（已验证）

- 2026-08-05 已验证 `scripts/devtools-simulator-capture.py` 能枚举可见且标题以“的模拟器”结尾的微信开发者工具模拟器窗口，以 Windows `PrintWindow(PW_RENDERFULLCONTENT)` 离屏读取该窗口，而不是从桌面坐标截屏。它按窗口 DPI 与 iPhone X 黑色刘海定位完整画布，再裁成逻辑 `375×812` 的等比原始 PNG；本机 150% 缩放的家长日程样本为 `563×1218`，裁剪参数为 `x=11, y=93, width=563, height=1218`。
- `devtools:screenshot` 仍先后用官方 Automator 读取当前路由、路由栈和 `systemInfo`，并强制逻辑视口为 `375×812`；Windows 上仅将不响应的 SDK `MiniProgram.screenshot()` 替换为上述受控模拟器窗口捕获。最终 PNG 和 sidecar 仍在路由二次复核、视口校验和 PNG 尺寸校验全部通过后原子发布，因此它是可用于 Figma 对照的 DevTools 模拟器证据，不是普通桌面截图。
- 使用前必须只保留一个可见模拟器窗口。若同时打开多个，命令会拒绝执行；可用环境变量 `WECHAT_DEVTOOLS_SIMULATOR_TITLE` 指定精确窗口标题。`WECHAT_DEVTOOLS_PYTHON` 可指定 Python 解释器路径。捕获失败时不得发布最终 PNG 或 sidecar。
- 2026-08-04 的 SDK 超时记录仍然有效：它描述的是 `MiniProgram.screenshot()` 的兼容性边界；从 2026-08-05 起，该边界不再阻塞 Windows DevTools 的可信视觉取证。每张截图仍须对照当前在线 Figma 节点后，才可声明对应页面视觉验收通过。
