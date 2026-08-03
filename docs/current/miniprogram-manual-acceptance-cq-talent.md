# 重庆天才小程序本地手工验收

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

- 微信登录页、手机号授权、connector 和 session 已实现；当前缺正式 AppID/AppSecret 和可访问的 HTTPS API，因此不能宣称生产登录闭环。
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

## 11. 2026-08-03 自动截图取证（历史尝试，已废弃）

> **更正（2026-08-03）**：当前 Windows 微信开发者工具 Stable `v2.01.2510290` 的 `cli auto --auto-port 9420` 只提供 HTTP 端口，不能为 `ws://127.0.0.1:9420` 提供可用的截图 WebSocket；`App.captureScreenshot` 因而不是当前可信取证路径。以下历史脚本说明不应被当作可用的截图流程。

可信替代方式是捕获前台 DevTools 真实窗口，再按模拟器内容区域裁成原始 `375×812` PNG，并同时记录设备、当前路由、测试结果和截图文件。仅连接成功或显示正确路由不算截图证据。已按该方式取得 P1 家长日程成功态 iPhone X `375×812` 截图：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-p1-375x812-current-20260803.png`。Empty 状态、其他页面及 Parent/Coach TabBar 真机矩阵仍待逐项验收。

该自动化 WebSocket 截图原型不随当前交付包提交，也不能作为验收命令运行。不要把连通性、路由信息或单元测试当作截图证据；真实角色、API/session 与运行态视觉仍需按本清单的人工验收步骤分别确认。
