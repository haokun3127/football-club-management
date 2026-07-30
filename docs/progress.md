# 小程序全量补齐 · 进度跟踪

> 依据《Figma 全量补齐决策》（docs/figma-full-implementation-decision.md）执行。
> 本文档随每批工作实时更新：完成一项勾一项，新增发现随时补充。
> 最后更新：2026-07-30（批次 8 后）

## 总体进度

| 维度 | 总数 | 已完成 | 说明 |
|---|---|---|---|
| Figma 家长端画板 | 28 | 9 原始设计 + 5 契约版 | 契约版待按原始设计重做 |
| Figma 教练端画板 | 43 | 4 原始设计 + 9 契约版 | 契约版待按原始设计重做 |
| 小程序路由 | 30 | — | 家长 14 + 教练 13 + 启动/登录 2 + 其他 1 |
| 后端 BFF 切片 | — | 3（提醒中心 + 私教申请 + 教练球队/能力） | 契约先入 spec 再实现 |

## 已完成

### 批次 1-2：交接收尾（2026-07-29/30）
- [x] 交接包审查、验证链（install/typecheck/83 测试/构建/启动）
- [x] 干净构建修复 `8d6caea`+`f4075b8`；GitHub origin 配置推送 11 分支
- [x] Figma 全量补齐决策入库 `e3bd176`

### 批次 3：视觉基础（A 线）
- [x] token 层 `styles/tokens.wxss` + app.wxss `@import`，硬编码色值清零 `d85ead6`
- [x] fig-kiwi 自研解码器全量走通（`scripts/fig2json.py`），token 按 "CQ Talent Contract Tokens" 变量集精确校准 `33d8044`
- [x] 画板规格导出器 `scripts/fig_export_frame.py`（任意画板 → 实现级规格 md）

### 批次 4：家长提醒中心（首个 BFF 切片 + 页面）
- [x] BFF：`GET .../parent/reminders`（guardian 作用域）`7a1da3d`
- [x] 契约回写 spec "Scenario: Parent Reminders Feed" `187638c`
- [x] P3 提醒中心页面端到端 `c4b0d4f`

### 批次 5：铃铛入口修复 + P7.1 / P8
- [x] 日程页提醒入口按 Figma P1 改为铃铛图标 + 未读红点（app-header 扩展 actionIcon/actionDot/actionPill）`2ca11d4`
- [x] P7.1 课时与保障（真实数据：日历推导 + home BFF）`2ca11d4`
- [x] P8 内容中心（静态设计内容）`2ca11d4`

### 批次 6：P8 快速入口三页
- [x] P8.2 帮助中心（可展开 FAQ，答案基于真实功能）`4633fd7`
- [x] Coach Team 教练团队 `4633fd7`
- [x] Venues 场地信息（筛选 chips 真实过滤）`4633fd7`

### 批次 7：私教约课 + 日期活动列表
- [x] 契约 "Scenario: Parent Private Lesson Request" 入 spec `dec757c`
- [x] 私教申请 BFF（POST 201 + GET 列表，guardian 作用域，契约测试 5 断言组）`dec757c`
- [x] P9 私教预约表单（教练/日期/时段/目标/备注 → 真实 POST）`dec757c`
- [x] P9.1 预约成功页（摘要卡 + 返回动作）`dec757c`
- [x] P1.1 日期活动列表（日程页"列表 ›"入口）`dec757c`
- 注意：私教申请存储为进程内集合，**SQLite 持久化是已声明的后续项**

### 批次 8：教练端球队/雷达/能力/活动变更
- [x] 契约 "Scenario: Coach Team & Ability BFF" 入 spec（4 端点）`bd0c9f6`
- [x] C9 队伍详情 BFF `GET /coach/team`（近 30 天作用域聚合：成员/训练场次/出勤率）`bd0c9f6`
- [x] C13 学员雷达 BFF `GET /coach/students/:id/radar`（教练作用域校验）`bd0c9f6`
- [x] C14 团队能力 BFF `GET /coach/team/ability-overview`（维度 队均/TOP/底 + 综合 + 趋势）`bd0c9f6`
- [x] C3 活动变更 BFF `POST /coach/events/:id/change-requests`（201，教练作用域）`bd0c9f6`
- [x] C9 队伍详情页（深色 Hero + 三统计 + 学员网格，点学员进雷达）`bd0c9f6`
- [x] C13 学员雷达页（学员 chips + 深色雷达 Hero + 综合分）`bd0c9f6`
- [x] C14 团队能力页（队均雷达 + 趋势 chip + 维度统计表）`bd0c9f6`
- [x] C3 变更活动页（信息卡 + 原因 chips + 新时间/场地/备注 → 真实 POST）`bd0c9f6`
- 入口：coach/me 三条快捷链接；coach/event 操作格新增"变更活动"
- 验证：api 61 测试全过；dev API 实测两 GET 端点返回真实数据（28 名学员/综合 80）
- 注意：变更申请为进程内集合（同私教申请，持久化是已声明后续项）；作用域窗口为近 30 天

## 未完成

### 家长端 · 完全没做（1 页）
- [ ] **P10 Account Binding** 账号绑定 —— 需账号绑定流程后端

### 家长端 · 契约版待按原始设计重做（6 页）
- [ ] **P1 Schedule Home**（原版顶部导航：22px 标题 + 铃铛）
- [ ] **P2 / P2.1 / P2.2** 训练/比赛/其他活动详情
- [ ] **P4 Growth Home** 成长首页
- [ ] **P6 Metric Detail** 指标详情
- [ ] **P7 Parent Profile Hub**（深色球员卡 + 统计行 + 快捷操作）
- [ ] **P5 Ability Radar** 独立能力雷达页（目前内嵌成长页）

### 家长端 · 数据待后端切片（静态内容替换）
- [ ] 内容中心文章列表 → 内容服务 BFF
- [ ] 帮助中心 FAQ → 内容服务 BFF
- [ ] 场地列表（含导航坐标）→ 场地服务 BFF
- [ ] 教练档案 → 教练服务 BFF
- [ ] 3 处搜索（内容/帮助/场地）toast 占位 → 真实搜索
- [ ] 场地导航按钮 → wx.openLocation（需坐标数据）

### 教练端 · 完全没做（约 6 页）
- [ ] **C10 + C10.1** 训练内容选择 + 覆盖面预览
- [ ] **C11 Test Task List** 测评任务列表
- [ ] **C15 + C15.1** 测评录入 + 提交态
- [ ] **C16.1~C16.4** 权限范围/私教意向/教练账号/教练帮助

### 教练端 · 子状态页未做（6 个）
- [ ] C4.1 点名成功 / C4.2 点名失败纠错
- [ ] C5.1 课时纠错
- [ ] C6.1 添加比赛事件 / C6.2 保存态
- [ ] C12.1 自动保存态

### 教练端 · 契约版待按原始设计重做（9 页）
- [ ] C1 / C2 / C4 / C5 / C6 / C7 / C8 / C12 / C16 全部现为契约版

### 其他
- [ ] **私教申请 SQLite 持久化**（现为进程内集合，重启丢失；契约已声明）
- [ ] 交接包 WPS 草稿（642 行，1 个 201 vs 400 失败测试）未合入
- [ ] Trellis 任务 `07-30-figma-design-foundation` 未收官

## 建议推进顺序（2026-07-30 定）
1. ~~P1.1 + P9/P9.1 + 私教 BFF~~ ✅ 批次 7 完成
2. ~~教练端 C3/C9/C13/C14~~ ✅ 批次 8 完成
3. 教练端 C10/C11/C15（训练内容 + 测评任务/录入）
4. P10 账号绑定 —— 涉登录闭环，单独一轮
5. P1/P7 等原始设计重做 —— 视觉升级，放最后

## 工作方法（每批固定流程）
1. `fig_export_frame.py` 导出目标画板规格 → 归档 `docs/design-spec-*.md`
2. 需要新数据 → 契约先入 `.trellis/spec/api/backend/app-client-bff-contracts.md` 再实现 BFF
3. 页面复用 app-header / role-tabbar / status-view + token 变量
4. `pnpm check` + `pnpm build` 全绿后小步提交推送
5. 更新本文档

## 环境备忘
- 改完 `apps/api` 必须 `pnpm build` + 重启 localhost:3000 的 `node apps/api/dist/index.js`，否则小程序打到旧 dist 报 404
- curl 访问 localhost 需 `--noproxy '*'`（本机 Clash 代理）
- fig 工具链：`Python313/python.exe tools/fig_export_frame.py tools/fig-out.json "<画板名>" <输出.md>`
