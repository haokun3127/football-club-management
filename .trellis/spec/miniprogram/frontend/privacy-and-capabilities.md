# 隐私与开放能力规则

### MP-PRIV-001 [硬门禁]

- **规则正文**：客户端出现的隐私接口/组件必须已登记在 `rules.json` 的批准隐私能力清单；新增能力必须先完成清单、后台指引与授权方案评审。
- **依据**：`docs/reference/wechat-miniprogram/pages/privacy-authorize.md:31-41`、`docs/reference/wechat-miniprogram/pages/privacy-intro.md:28-56`。本地留档抓取于 2026-09-18，对应基础库 3.17.3。
- **判定方式**：检查器以 `rules.json` 中的完整已知模式与批准模式比对源文件，未批准用法报告 `file:line`。
- **违反时处理**：检查器报告后，由人/Codex 按规则和评审上下文决定修与不修；需要修复时先更新后台声明、同步同意/拒绝链路、规则清单和回归证据。
- **Owner**：TBD
- **最后复核日期**：2026-09-18
- **自动化检查 ID**：MP-PRIV-001

### MP-PRIV-002 [硬门禁]

- **规则正文**：后台《小程序用户隐私保护指引》必须声明实际处理的信息；隐私调用按平台要求取得用户明确同意后才可继续，拒绝须有可用降级或退出路径。官方默认弹窗可完成同意流程；不得仅凭未自写同步 API 或缺少 `__usePrivacyCheck__` 判定违规或登录不可用。
- **依据**：`docs/reference/wechat-miniprogram/pages/privacy-authorize.md:17-27`、`docs/reference/wechat-miniprogram/pages/privacy-authorize.md:237-251`、`docs/reference/wechat-miniprogram/pages/product-reject.md:142-156`。本地留档抓取于 2026-09-18，对应基础库 3.17.3。这是初始快照；正文于2026-10-14刷新，本规则于2026-10-18复核，纳入默认官方弹窗机制。
- **判定方式**：人工核对后台指引；全新用户真机验证官方默认或自定义授权、查看协议、同意、拒绝后退出/显式重试与新增能力。记录平台错误码；源码 API 检索不替代运行验证。
- **违反时处理**：阻止提审；补后台声明、官方协议入口、同步同意状态、拒绝路径及真机证据。
- **Owner**：TBD
- **最后复核日期**：2026-10-18
- **自动化检查 ID**：manual

### MP-PRIV-003 [硬门禁]

- **规则正文**：有账号体系时必须提供可发现的账号注销/数据删除路径，并在注销后按授权范围删除相关用户数据；“退出登录”不得冒充注销。
- **依据**：`docs/reference/wechat-miniprogram/pages/product-reject.md:142-168`。本地留档抓取于 2026-09-18，对应基础库 3.17.3。
- **判定方式**：产品、后端与真机联调人工验证申请、确认、处理结果和数据删除审计。
- **违反时处理**：阻止提审；明确数据范围、保留义务与删除流程并补端到端证据。
- **Owner**：TBD
- **最后复核日期**：2026-09-18
- **自动化检查 ID**：manual

### MP-CAP-001 [硬门禁]

- **规则正文**：AppSecret、`session_key`、`code2Session`/`jscode2session` 和微信后台 API 只能在服务端使用；不得写入小程序源码或下发给客户端。
- **依据**：`docs/reference/wechat-miniprogram/pages/ability-network.md:23-31`、`docs/reference/wechat-miniprogram/pages/open-login.md:13-23`、`docs/reference/wechat-miniprogram/pages/security-basic.md:7-13`。本地留档抓取于 2026-09-18，对应基础库 3.17.3。
- **判定方式**：检查器扫描客户端运行时源文件中的敏感端点和密钥标识；真正的凭据泄漏还需密钥扫描与服务端审计。
- **违反时处理**：检查器报告后，由人/Codex 按规则和评审上下文决定修与不修；确认凭据暴露时立即移除并轮换密钥，把调用迁移到鉴权后的服务端接口。
- **Owner**：TBD
- **最后复核日期**：2026-09-18
- **自动化检查 ID**：MP-CAP-001

### MP-CAP-002 [硬门禁]

- **规则正文**：新增或扩大手机号等付费开放能力前必须取得产品/成本批准，并定义欠费、取消和失败降级；手机号成功回调会产生扣费。
- **依据**：`docs/reference/wechat-miniprogram/pages/open-getphonenumber.md:21-35`、`docs/reference/wechat-miniprogram/pages/open-getphonenumber.md:54-65`。本地留档抓取于 2026-09-18，对应基础库 3.17.3。
- **判定方式**：人工检查批准记录、预估调用量、错误码处理及拒绝/欠费交互。
- **违反时处理**：阻止合并和提审；补批准、预算与失败降级后再实现。
- **Owner**：TBD
- **最后复核日期**：2026-09-18
- **自动化检查 ID**：manual

### MP-CAP-003 [建议]

- **规则正文**：每次发版前核对手机号能力的体验额度、资源包余额、调用量和告警，避免开发版/体验版共同消耗额度造成登录中断。
- **依据**：`docs/reference/wechat-miniprogram/pages/open-getphonenumber.md:29-35`、`docs/reference/wechat-miniprogram/pages/open-getphonenumber.md:54-63`。本地留档抓取于 2026-09-18，对应基础库 3.17.3。
- **判定方式**：人工回读微信公众平台付费管理数据并记录日期与余量。
- **违反时处理**：风险未确认时暂停发布；补充额度或启用已验证的降级方案。
- **Owner**：TBD
- **最后复核日期**：2026-09-18
- **自动化检查 ID**：manual
