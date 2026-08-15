# 交付 — 2026-08-14 重庆天才足球俱乐部小程序（家长端收官 + 教练端 C1-C3 验收）

## 环境
- 仓库：football-club-management-codex-windows-2026-08-02，分支 dev（HEAD `2ffc739`，已推 origin/dev）
- 生产：https://cqtc.pomi.tech（43.136.114.225，compose 服务名 api，端口 3000），当前部署 = dev 最新后端 `da22dc5`，health=200
- 门禁：`npx --yes pnpm@10.33.0 run check` → exit=0（domain 19 / miniprogram 318 / api 104 全绿）
- 交接文档：仓库根 `HANDOFF.md`（2026-08-13 全量）+ `HANDOFF-2026-08-14.md`（本次增量，SOP 以这份为准）

## 已完成验收（真实 375×812 截图对照设计稿）
- 家长端 21 板：全部 ✅
- 教练端 C1 排期主页 ✅、C2 活动工作台（进行中态：倒计时=已进行时长+结束训练+出勤卡）✅、C3 活动变更（新时间/新场地常显+场地选择器+通知家长开关）✅
- 剩余：C4 点名起 25 板未做，画板↔路由对照看 docs/design/reference/figma/README.md

## 服务端本次新增（已上生产）
- POST /coach/events/:eventId/finish（结束训练，scheduled→completed）
- coach/home 增 coachName / summary.attendance / weekStats
- change-requests 增 notifyParents（迁移 0011，列 notify_parents）

## 接手必看 SOP（血泪教训）
1. 教练会话：先 `tmp/prod-verify/prod-plant-session-coach.py` 服务端种 coach 会话，再 `PLANT_ROLE=coach PLANT_TOKEN=*** MP_AUTO_PORT=9432 node scripts/devtools/mp-plant-session.cjs`
2. 截图别用 automator screenshot（持续超时）：`scripts/devtools/screen-shot.py`（整窗，先最小化 Edge）→ `crop-phone.py` → `sidebyside.py`；超首屏用 pageScrollTo 截第二段
3. 代码提交后模拟器常跑旧 bundle → 让用户点一次「编译」再截图
4. DevTools 白屏死态：唯一恢复 = 用户手动完全退出 IDE 重开；**绝不要 kill DevTools 进程**
5. 「进行中」是推导态（scheduled 且 now∈[start,end]），不是存储状态；C2 验收用的进行中窗口数据会过期，过期重跑 tmp/prod-verify/c2-extend-run.py
