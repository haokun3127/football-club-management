# 性能与兼容性规则

### MP-PERF-001 [硬门禁]

- **规则正文**：不得新增或保留腾讯文档已标记停止维护/废弃的客户端 API；当前禁止清单由 `rules.json` 唯一维护。
- **依据**：`docs/reference/wechat-miniprogram/pages/audits-best-practice.md:19-23`、`docs/reference/wechat-miniprogram/pages/api-getSystemInfoSync.md:5-7`。本地留档抓取于 2026-09-18，对应基础库 3.17.3。
- **判定方式**：检查器按 `rules.json` 的废弃 API 模式扫描客户端运行时源文件并报告 `file:line`。
- **违反时处理**：检查器报告后，由人/Codex 按规则和评审上下文决定修与不修；需要修复时改用官方替代 API 并回归相关页面。
- **Owner**：TBD
- **最后复核日期**：2026-09-18
- **自动化检查 ID**：MP-PERF-001

### MP-PERF-002 [硬门禁]

- **规则正文**：开发者工具 Audits 与主路径真机回归不得出现 JS 异常、未处理网络异常或 HTTP 请求；未授权请求应明确返回 401/403 并进入可理解错误态。
- **依据**：`docs/reference/wechat-miniprogram/pages/audits-best-practice.md:7-29`。本地留档抓取于 2026-09-18，对应基础库 3.17.3。
- **判定方式**：人工运行家长端与教练端主路径的 Audits、网络面板和真机错误路径；静态 HTTP 扫描由 MP-PKG-003 辅助。
- **违反时处理**：阻止提审；修复异常与错误处理并重跑相同路径。
- **Owner**：TBD
- **最后复核日期**：2026-09-18
- **自动化检查 ID**：manual

### MP-PERF-003 [建议]

- **规则正文**：`setData` 只更新模板实际依赖的最小字段，合并连续更新，避免滚动等高频回调直接更新大对象；非渲染数据不放入 `data`。
- **依据**：`docs/reference/wechat-miniprogram/pages/audits-best-practice.md:31-35`、`docs/reference/wechat-miniprogram/pages/perf-setdata.md:5-70`。本地留档抓取于 2026-09-18，对应基础库 3.17.3。
- **判定方式**：代码评审结合性能面板检查高频页面和大列表的数据更新。
- **违反时处理**：记录热点并拆分组件/更新粒度；造成明显卡顿或异常时升级为发布阻断。
- **Owner**：TBD
- **最后复核日期**：2026-09-18
- **自动化检查 ID**：manual

### MP-PERF-004 [建议]

- **规则正文**：页面创建的定时器、监听器和可取消任务必须在离页生命周期中回收，不得让后台页持续占用前台资源。
- **依据**：`docs/reference/wechat-miniprogram/pages/audits-best-practice.md:61-67`。本地留档抓取于 2026-09-18，对应基础库 3.17.3。
- **判定方式**：评审 `setTimeout`/`setInterval`/事件订阅的创建与清理配对，并用 Audits/真机跨页验证。
- **违反时处理**：补清理和回归；出现跨页回调、重复请求或状态污染时阻止发布。
- **Owner**：TBD
- **最后复核日期**：2026-09-18
- **自动化检查 ID**：manual

### MP-COMP-001 [硬门禁]

- **规则正文**：当客户端 API/组件最低支持版本可能高于后台最低基础库时，必须使用能力检测并提供明确降级，或经批准提高后台最低基础库。
- **依据**：`docs/reference/wechat-miniprogram/pages/audits-best-practice.md:37-43`、`docs/reference/wechat-miniprogram/pages/update-mechanism.md:61-74`。本地留档抓取于 2026-09-18，对应基础库 3.17.3。
- **判定方式**：人工核对 API 文档最低版本、后台最低基础库与代码能力检测；用最低支持客户端真机验证降级。
- **违反时处理**：阻止合并；增加能力检测/降级或完成后台版本调整与影响评估。
- **Owner**：TBD
- **最后复核日期**：2026-09-18
- **自动化检查 ID**：manual

### MP-PERF-005 [建议]

- **规则正文**：发版前记录家长端和教练端冷启动、主路径 Audits 分数与问题清单；启动指标必须以首页 `Page.onReady` 为终点并区分冷/热启动。
- **依据**：`docs/reference/wechat-miniprogram/pages/perf-start.md:5-51`、`docs/reference/wechat-miniprogram/pages/audits-overview.md:5-45`。本地留档抓取于 2026-09-18，对应基础库 3.17.3。
- **判定方式**：开发者工具性能面板与真机性能诊断人工留证。
- **违反时处理**：补测后发布；若出现明显回退，先定位包体、注入或首屏渲染阶段。
- **Owner**：TBD
- **最后复核日期**：2026-09-18
- **自动化检查 ID**：manual

## Native Automator evidence caveat

During 2026-09-28 checks, passing fixture objects directly to Automator `mockWxMethod('request', object)` produced an array-binding discrepancy: Page JS held arrays but WXML lengths/child Array properties were stale or empty. A mock function returning `JSON.parse(serializedFixture)` produced normal bindings without changing the radar component. Use that JSON boundary for synthetic rendering evidence, and do not infer a general WXML limitation from direct-object mocks. Restore the request method/session after verification. Synthetic screenshots do not establish real backend acceptance.


## Native template and async page verification (2026-10-05)

- Do not combine `wx:else` and `wx:for` on one node. Put the conditional on a wrapping block and the loop on its child; a template compile failure can leave `getApp` unavailable even when TypeScript and controller tests pass. Await the official CLI `auto` completion before connecting the runtime verifier.
- Native navigation may finish later than a short fixed wait. Assert the current page and its query-derived state after the transition. On SDK timeout, close the test's connection before retrying; do not run several fixture-owning verifiers in one IDE concurrently. Verify AppID/envVersion before changing mock/session state, restore both, and distinguish a locked Mac/transport timeout from an approval rejection.
- Increment page request identity on load/unload. A separate write need not invalidate an independent course-task read; capture the current load identity, serialize that write and ignore it after reload/unload. C04 must update hierarchical card checks and the flat selection together, not just the selected-ID array.
- C04 requires `canEditTraining === true`, keeps selection after uncertain save, blocks another write until explicit reread, and prevents filters from clearing that error gate. It retains the reviewed online catalog hierarchy; friendly-match content remains selectable in the course, while copy/templates exclude it. Figma C04's contrary exclusion sentence is a tracked design discrepancy, not a new business rule.

### 2026-10-14 增强编译与实际布局检查

本机稳定版2.02.2608080/基础库3.17.3的新增首页Promise.all解构触发生成模块arrayWithHoles缺失，原生Page只含__webviewId__，TS/控制器测试仍通过。此次以等价数组索引读取消除依赖并取得正常原生截图；这是本发布候选的已验证修补，不推断所有数组解构均不可用。先等官方整包编译完成再安装单一测试夹具，验证期间冻结源码；热重载会清空getApp临时备份。每次恢复request与会话并回登录，不让合成身份进入上传制品。检查实际四入口尺寸，按钮需flex:1/width:0/min-width:0，防平台默认宽度撑出视口。

## Request operation identity (2026-10-21)
1. **Scope:** all automatically derived idempotent write keys in `utils/request.ts`.
2. **Signatures:** `resolveIdempotencyKey(method,path,body,scope?)`; `markIdempotencyOutcome(key,terminal)`.
3. **Contract:** unresolved equivalent actions reuse a key for at most 30 minutes; definite HTTP outcomes consume it. New actions use a random nonce so restart/eviction cannot replay old successes. Scope includes environment/session identity in the digest; local storage contains hashes/keys, no bodies or bearer credentials; maximum 200 records.
4. **Errors:** transport/5xx leaves uncertain retryable; 4xx consumes (the server may cache rejection); null error body still rejects the promise. Late duplicate failure cannot downgrade consumed state. Storage failure falls back to memory; unresolved actions beyond TTL/eviction cannot guarantee deduplication.
5. **Cases:** lost response/restart reuses pending key; completed/restart generates new key; same payload after a 409 uses a fresh attempt after reread.
6. **Tests:** `utils/idempotency.test.mjs` restart, eviction and late outcome; `utils/request.test.mjs` 409/502; full native compile because Node tests do not exercise WeChat transforms.
7. **Wrong / correct:** deterministic digest+resettable counter can silently replay a prior success; a persisted unresolved operation key plus random new-operation identity avoids that collision.


## CQ input and request ownership (2026-10-30)

- Continuous assessment input updates the changed row through a setData path; controller-only value maps stay outside bridge payloads. Synchronous scoped draft persistence is retained. Keep student name, unit, course and focus context stable; never optimize by delaying durable drafts without an explicit recovery contract.
- Page generation protects identity/child/role changes; each independently retryable module also needs its own request sequence. A manual retry and automatic same-generation refresh can overlap. Both success and failure must check the module sequence before replacing state.
- Same-scope background refresh may preserve prior content with a stale/retry message. Different environment/club/user/role/child clears prior content immediately. Saving and publication invalidate the relevant read scope.
- Classroom performance keeps the original snapshot revision and pending payload across uncertain outcomes.409 preserves local values; only explicit reread and user reconciliation establish a new baseline.428 stays readable but disallows unversioned saving. Do not automatically reuse a server conflict-detail revision for old inputs.
- Validate on actual native canvas after type/tests. Automator route changes may finish after an initial ready state from the previous page; require expected route and query state. An invoked page handler is not evidence of a real native component tap. If custom component selectors or computer-use transport are unavailable, label that gap and retain physical-device keyboard/Android/iOS/dynamic-type acceptance.
- CQ30 deterministic19/40-student bridge byte measurements are in the integration task research. They establish payload reduction only, not device latency or P95. Official package reports, request timing and real input latency remain separate measurements.
