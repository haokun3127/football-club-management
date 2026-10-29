# CQ 页面固定版本窄审计

日期：2026-10-30（香港时间）。目标 SHA：`96e1740889f41a9d50935f2da7deb39d9342a018`。

只读范围：coach/training-assessment 的 CAS、草稿、未知响应、显式合并和上下文；CQ20 成长单位/来源折叠与 scope；账号版本组件懒加载。不重复运行平台正在修复的 R3-01/02。没有改产品代码、共享记录或部署；审计工作区开始/结束干净。所有新增正确断言和输出在该 SHA 的 git archive 副本 `/tmp/cq-audit-96e17408` 及 `/tmp`，Node24、已有安装依赖。

## 确定问题 P4-01 / P2：格式等价输入在显式合并时被当作实质修改，覆盖服务器新值

位置：`apps/miniprogram-cq-talent/pages/coach/training-assessment/index.ts:374-383`，重点 `:381-382`。

触发：
1. 服务器原值是 84 和“传球节奏稳定”；本机将分数输入成 `084`，备注只加前后空格，并真正修改另一学员为 75。
2. 首次 save 正确按数值和 trim 后备注比较，只提交真正修改的另一学员。
3. 服务器已经被其他教练更新到 95 和新备注，因此首次保存 409。
4. 显式重新读取并核对，用户选择“只保留本机改动”。

实际：`mergeReviewed` 用原始字符串 `!==`，与 `save()` 的数值/trim 比较、`hasLocalChanges` 的语义不同。它将 `084` 和带空格旧备注视为本机修改，覆盖已经读到的新值 95/新备注。下一次 payload 真的包含了该学员的旧 84/旧备注，而不只是另一名学员的 75。

期望：格式等价的数值和只改变前后空格的备注，沿用服务器已核对的新字段；仅合并实质改变的字段。正确断言期望 95/新备注，当前失败。

独立探针在 `/tmp/cq-audit-96e17408/apps/miniprogram-cq-talent/pages/coach/training-assessment/index.test.mjs`，测试名 `preserves newer server fields when local score/note changes are only formatting-equivalent`。实际两次 payload 和合并结果：`/tmp/cq-page96-merge-result.json`。

## 确定问题 P4-02 / P2：名单暂时变化后，离页会静默删除不可见的未保存草稿

位置：同文件 `:123-124` 恢复时只留下当前项目/已到名单内的数据，随后 `:214-217` 只按已过滤的可见数据判定无改动并删除整份草稿。

触发：某学员有未保存的 77 分，已按本机草稿保存；之后暂时不在 GET 的 presentStudentIds 中（如请假/到场状态更正），另有学员仍可编辑。重新打开本课时，该学员的输入被过滤出页面；离页时其余可见值没有改动，remember() 删除了整份存储。再恢复该学员的可评测状态并进入，原 77 已丢失。

期望：未提交输入应保留在原账户/环境/课程隔离的草稿中，或明确让用户处理，不能只因当前可见名单无改动就自动删除隐藏草稿。本报告不要求把当前不可评测学员重新展示或允许越范围写入。

正确断言恢复范围后仍应取到 77，当前实际 undefined。探针与 P4-01 同文件，测试名 `retains an unsaved learner draft while that learner temporarily leaves the present-student scope`。

## 通过的重点合同与正向证据

- **409/428：** 输入和原 revision 保留，不自动 GET 新 revision 重发；后续保存被 needsReload 阻止；只有显式核对/采用服务器或保留改动才更新本机基线，且不自动提交。
- **提交与成功：** 正常保存只发送数值/trim 后备注实际变化的 student/project 对；成功只按本次 pending.assessments 更新 saved 基线，不把其他旧字段假定为服务器新事实。P4-01 是合并时比较方式不一致的独立缺口。
- **未知结果：** 保存期间和未知结果期间阻止输入/切项目；重试原 payload 和原 revision。公共 request 的未决幂等 key 在模块重启后仍可复用；确定响应会消费操作 key。缓存有既有时限与容量，不能解读为无限离线 exactly-once。
- **草稿隔离：** key 由 environmentStorageKey 加 club/user/event 组成，恢复入口有 requireRole('coach')；当前代码没有给家长恢复课堂草稿的入口。同课另一 user 的草稿不恢复；相同账号未知 pending 可恢复。环境前缀取当前小程序 runtime 环境。名单收缩后的草稿保全存在 P4-02，不应将“隔离通过”写为“所有恢复都不丢值”。
- **迟到响应：** load/save/review 使用 generation；卸载期间的保存响应不更新页面。独立正向探针在同一个 controller 上保存旧课、再 load 新课，旧保存完成后新课数据、revision 和存储 key 均未变化，通过。
- **CQ20 成长：** 已确认原始零/小数保留；单位按明确单位或值类型语义显示，不从项目名称猜单位。未知单位明确待确认且不画比较刻度；已确认详情保留原 version/unit 分组与原始数据，只改展示标签。技术 ID/规则版本进入默认折叠来源区；来源活动链接携带当前 studentId。成长模块的成功/失败、同账号重试、换孩子/账号和卸载迟到响应回归通过。
- **版本组件：** 账号页各挂载一个公共组件，不在账号 load/onShow 自己发版本请求。组件初始折叠不读取服务端版本；展开时读取，显式重试；关闭/重开和 detached 忽略旧响应；保留客户端本包事实、错误文案不回显原始异常。未发现该次挂载的新确定问题。

## 执行记录

1. 目标 SHA 原有定向：coach/training-assessment、parent/growth、parent/confirmed-results、parent/result-presentation、components/version-info、utils/version，6 文件 70 项通过。日志 `/tmp/cq-page96-baseline.log`。
2. 账号挂载/版本/公共传输：coach/account、parent/account、components/version-info、utils/idempotency、utils/training-content-assessments，5 文件 22 项通过。日志 `/tmp/cq-page96-version-transport.log`。版本组件在两组中有重复，不合计成独立总数。
3. 在课堂既有测试副本追加 3 个正确断言探针后，24 项中 22 通过、2 失败：原有 21 通过 + 跨课旧响应隔离 1 通过；P4-01/P4-02 各 1 失败。日志 `/tmp/cq-page96-classroom-probes.log`。没有把错误行为写成通过断言。

复核探针，在 `/tmp/cq-audit-96e17408/apps/miniprogram-cq-talent` 执行：

```sh
/opt/homebrew/opt/node@24/bin/node /Users/dongjun/projects/football-club-management/node_modules/vitest/vitest.mjs run pages/coach/training-assessment/index.test.mjs
```

只跑新增范围可加 `-t 'independent page audit'`。探针文件绝对路径：`/tmp/cq-audit-96e17408/apps/miniprogram-cq-talent/pages/coach/training-assessment/index.test.mjs`。

## 未验证/边界

未运行全仓 check:delivery，未操作原生微信画布或真机，未验证键盘/大字/19与40人现场性能、真实账户、数据库或部署。公开版本组件仅核对当前原生实现与挂载，未重新审计后台版本 UI。R3-01/02 公共服务端权限和排序修复未纳入此 SHA 的新验证；等待后续最终固定 SHA。没有将尚在完善的成长工作当成新增未交付缺陷。
