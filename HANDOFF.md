# 交接文档 — 重庆天才足球俱乐部管理系统

交接时间:2026-08-12
交接原因:前一会话的工具执行后端故障,无法自行运行命令/读写文件,只能靠人工转贴输出,效率不可接受。
仓库路径:C:\Users\ASUS\Desktop\football-club-management-codex-windows-2026-08-02
当前分支:codex/chongqing-talent-business(HEAD = fb1e268)

## 一、总体进度

六项任务,#1–#4 已完成,#5 进行中,#6 未开始。

| # | 任务 | 状态 |
|---|------|------|
| 1 | 生产库备份与校验 | 已完成 |
| 2 | 部署 18e1692 | 已完成 |
| 3 | 重启后验证(migration 0010、seed 守卫、health check、凭据注入) | 已完成 |
| 4 | 测试账号 dry-run 后受控导入 | 已完成 |
| 5 | 救回手机号相关修复并收敛为单 master | **进行中** |
| 6 | 收口 3000 端口公网暴露与 compose 漂移 | 未开始 |

**重要:全程只读。仓库没有任何写操作,生产环境自 #4 之后未再变更,没有留下任何中断的中间状态。**

## 二、任务 #5 现状(接手重点)

### 已经查清的事实

1. **手机号修复没有丢。** `fb1e268 fix(api): preserve bound phones across seed restart` 就是当前分支 `codex/chongqing-talent-business` 的顶端提交,不是游离 HEAD,也不在 reflog 里。任务标题里"救回"这半件事实际已经不成立,**只剩收敛**。
2. **没有残留的 git 中间态。** `git status` 没有 cherry-pick / merge 提示,不需要任何 `--abort`。
3. **部署提交都在。** `51028d0` 和 `18e1692` 均在分支历史中(`git log --oneline -15` 里可见)。
4. **master 落后很多。** master = `6a71669`,当前分支相对 origin 领先 205 个提交。

### 分支全貌(git branch -vv 实测输出)
archive/recovered-activity-training-services 459970a feat: add activity and training services
archive/recovered-clean-build 0e27c45 build: guarantee clean build...
archive/recovered-codegraph-ignore bd0f696 chore: ignore codegraph index
archive/recovered-match-assessment-metrics 8fd6bc8 feat: add match assessment and metric services

codex/chongqing-talent-business fb1e268 [origin/...: ahead 205] fix(api): preserve bound phones across seed restart
codex/data-capability-persistence 3bda482
codex/e-wps-connector-runtime a9c024a
codex/harden-contracts-metric-graph e4af640
codex/phone-binding-seed-safe e83c4ae docs: record production phone binding verification ← worktree,无 upstream
codex/phone-login-guard b903456 [origin/codex/phone-login-guard] fix(miniprogram): guard repeated phone authorization ← worktree
master 6a71669 feat: harden contracts schedules and metric graph engine

### 三个未决问题(收敛方案的前置条件)
1. **两个并行 worktree。** `codex/phone-binding-seed-safe` 和 `codex/phone-login-guard` 各自检出在桌面的独立工作目录:
   - `C:/Users/ASUS/Desktop/football-club-management-phone-binding-hotfix`
   - `C:/Users/ASUS/Desktop/football-club-management-phone-login-hotfix`
   收敛时必须一并处理,否则会留下三份不一致的工作副本。这很可能就是当初分裂的根源。
2. **`codex/phone-binding-seed-safe` 定位不明。** 名字与手机号相关,但没有远端跟踪,顶端是一个 docs 提交。**必须先确认它相对 master 带了哪些提交、是否已被 `fb1e268` 覆盖**,再决定是丢弃、合并还是取其中一部分。
3. **快进还是真合并未定。** 需要量化当前分支相对 master 的改动规模。

### 接手后第一步:跑这四条只读命令
```bash
git log --oneline --graph --all --decorate -20 | cat
git log --oneline master..codex/phone-binding-seed-safe | cat
git diff --stat master...HEAD | cat
git worktree list
```
(| cat 是为了绕过 pager;之前人工转贴时输出卡在 : 提示符上过。)

拿到这四条输出即可产出完整收敛方案。在这四条结果出来之前不要做任何写操作。

## 三、任务 #5 的技术背景

这不只是 git 整理,底下是一个真实的行为缺陷:API 重启后重跑 seed 会覆盖用户手动绑定的真实微信手机号。

### 相关文件

apps/api/src/seed/index.ts — seed 入口,含生产守卫:
```ts
function shouldIncludeCqTalentAcceptanceSeed() {
  return process.env.NODE_ENV !== "production"
    && process.env.FCM_CQ_TALENT_ACCEPTANCE_SEED === "1";
}
```
`createSeedData()` 在守卫不通过时直接返回 base,通过时 `mergeSeedData(base, createCqTalentAcceptanceSeed())`。守卫本身已在任务 #3 验证通过。

apps/api/src/persistence/platform-persistence.js — 尚未阅读。暴露 `createPlatformPersistence({ databasePath, seed, seedData })`,以及 `repositories.users` / `repositories.parents` 的 save / getById / getByClubAndId。「重开库时带 seed 会覆盖」的逻辑几乎肯定在这里,接手后建议优先读。

apps/api/test/persistence.test.ts — 文件较大,可能已有手机号/seed 行为的回归覆盖,改动前先看。

.trellis/spec/api/backend/phone-binding-seed.md — 权威契约文档,标题 "Restart-Safe Phone Binding Seed",状态 Active。改 seed 行为前必读。同目录 Active 的还有 secure-test-account-operations.md(管任务 #4 的导入与回滚)、app-client-bff-contracts.md、active-role-sessions.md。注意该 index 明确要求:所有文档用英文写。

apps/api/tmp-phone-repro.mjs — 前会话建的临时复现脚本,当前是 untracked,收敛时千万不要提交进去。它的作用是:开库 → 手动改写 phone 为 13700000001(合成字面量,非真实 PII)→ 关库 → 带 seed 重开 → 读回验证 phone 是否被覆盖,同时打印两次 seed 耗时。

### 工作区状态
已改未暂存:apps/miniprogram-cq-talent/project.config.json
untracked:apps/api/tmp-phone-repro.mjs、apps/miniprogram-cq-talent/assets/icons/login-wechat.svg、apps/miniprogram-cq-talent/assets/icons/settings.svg、docs/superpowers/、重庆天才足球俱乐部-WPS联调客户确认表(1).xlsx

### 关联任务
`.trellis/tasks/08-12-08-12-coach-page-evidence-audit/task.json` 是另一个 in_progress 任务,其 base_branch 正是 codex/chongqing-talent-business。收敛动分支时会影响它,需一并考虑。

## 四、任务 #6 待办

3000 端口存在公网暴露,需收口;同时服务器上的 docker compose 配置与仓库已经漂移,需对齐。尚未开始调查。

## 五、运维事实与约束

- 生产回滚点:备份文件 `pre-51028d0-20260812T100034Z.sqlite`
- 已应用迁移:0010
- 任务 #4 已导入三个测试账号(手机号 1991921、1872807、182****2170,完整值见此前部署记录)。按测试账号 PII 处理。
- 持久化为文件型 SQLite,生命周期是「打开 → 变更 → 关闭 → 带 seed 重开」,这正是缺陷发生的路径。
- 用户从未提出过安全约束或禁改文件清单。以下是前会话自行采取的操作纪律,建议延续:
  - 任何变更前先只读诊断
  - 不盲目重跑失败的操作
  - 部署前必备份
  - 对生产导入数据前必先 dry-run

## 六、环境故障说明(与代码无关)

前一会话的工具执行通道完全失效:shell、文件读、列目录、搜索全部无返回,没有 stdout/stderr/退出码,写文件返回 No exec result。排查结论:

- 换会话无效 → 不是会话级断连
- 重启整机无效 → 不是残留进程
- 外部 cmd 里 git status 秒回且完整 → 文件系统与仓库健康,OneDrive 占位文件假设也被排除

故障范围锁定在 IDE 客户端侧的工具执行后端。代码、仓库、机器本身都没有问题。接手方如果工具通道正常,直接照常干活即可,不必理会这段。

---

要点就三条:手机号修复没丢,`fb1e268` 就是当前 HEAD;只剩收敛,卡在桌面那两个 worktree 和 `phone-binding-seed-safe` 的定位没查清;接手第一件事是跑那四条只读命令,拿到结果再动手。仓库和生产至今干净。

---

## 附:任务 #5 收口记录(2026-08-12,接手方执行)

**结论:手机号修复没丢,收敛已完成,当前为单一主线。**

执行结果:
1. 四条只读诊断+补充分析(cherry/patch-id/hunk 比对)证实:
   - `9720b40` 的修复代码已等价存在于 `fb1e268`(手机号保留逻辑 hunk 逐行一致);
   - `b903456`(登录 guard)已 patch-等价包含在主分支;
   - 两条 hotfix 线唯一真实独有内容 = `e83c4ae`(生产验证文档),已 cherry-pick 为 `63961cf`。
2. `master` 已快进到 `63961cf`,与 `codex/chongqing-talent-business` 同指一头(收敛完成,领先 origin 206)。
3. 桌面两个 hotfix worktree 已注销并删除残留目录;`codex/phone-binding-seed-safe`、`codex/phone-login-guard` 分支已删(内容全包含,删除安全)。`.codex/worktrees/ec6b` detached worktree 按约定未动。
4. `tmp-phone-repro.mjs` 保持 untracked 未提交 ✓。

遗留观察(非收敛引入):`persistence.test.ts` 的手机号回归测试单跑 28.6s,并行负载下超 5s 限时导致根 check 偶红,单跑全绿(10/10)。属测试性能问题,建议该测试提 timeout 或精简 seed 次数。

## 附2:任务 #6 收口记录(2026-08-12,接手方执行)

1. 3000 端口公网暴露:三重验证已关闭——外部直连 43.136.114.225:3000 不可达(curl 000);服务器 docker ps 显示 127.0.0.1:3000->3000;ss -tln 仅 127.0.0.1:3000 LISTEN。
2. compose 漂移:服务器运行配置 /opt/cq-talent-releases/18e1692/docker-compose.yml 与仓库 docker-compose.yml 逐字节一致(diff 为空)。漂移源头=18e1692 提交说明所述"服务器手改未回仓",该提交已完成回仓,当前零漂移。
3. 分支模型最终态:本地/远端均只剩 master(稳定)+ dev(测试);GitHub 默认分支已改 master,origin/main 已删;12 个远端 codex/* 旧分支已删(内容全包含验证后)。
4. 慢测试修复:persistence.test.ts 三个文件库用例显式超时(90s/30s/30s),根 check 并行下 429 tests 全绿。
5. 六项任务全部完成。
