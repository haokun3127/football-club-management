# 发布与审核规则

### MP-REL-001 [硬门禁]

- **规则正文**：超过官方留档抓取日约 1 个月或每次发版前，必须刷新 46 篇官方正文并比较 `manifest.json` 的 URL、HTTP、字节数与 SHA-256，随后复核受影响规则。
- **依据**：`docs/reference/wechat-miniprogram/pages/release-latest-v3.md:5-24`、`docs/reference/wechat-miniprogram/pages/quickstart-release.md:5-22`。本地留档抓取于 2026-09-18，对应基础库 3.17.3。
- **判定方式**：人工运行抓取脚本、审阅 manifest 差异，并记录复核日期；网络或页面结构异常不得被当成“无变化”。
- **违反时处理**：阻止提审；刷新、核对差异并同步 spec/检查器后继续。
- **Owner**：TBD
- **最后复核日期**：2026-09-18
- **自动化检查 ID**：manual

### MP-REL-002 [硬门禁]

- **规则正文**：提审前必须确认备案、服务类目、服务器/业务域名与 TLS、隐私保护指引、后台最低基础库、手机号额度以及可体验全部功能的审核测试号。
- **依据**：`docs/reference/wechat-miniprogram/pages/product-record-guidelines.md:7-28`、`docs/reference/wechat-miniprogram/pages/product-reject.md:68-78`、`docs/reference/wechat-miniprogram/pages/product-reject.md:132-145`。本地留档抓取于 2026-09-18，对应基础库 3.17.3。
- **判定方式**：发布人逐项回读微信公众平台与备案系统，保存日期、账号角色和必要截图；本地代码不能替代后台状态。
- **违反时处理**：阻止提审；补齐后台配置、备案或审核材料。
- **Owner**：TBD
- **最后复核日期**：2026-09-18
- **自动化检查 ID**：manual

### MP-REL-003 [硬门禁]

- **规则正文**：所有提交服务类目页面必须从首页直达或两次点击内到达；账户退出易发现，浮层/弹窗可关闭，多媒体不自动播放。
- **依据**：`docs/reference/wechat-miniprogram/pages/product-reject.md:68-78`、`docs/reference/wechat-miniprogram/pages/product-reject.md:158-176`。本地留档抓取于 2026-09-18，对应基础库 3.17.3。
- **判定方式**：用审核角色账号在真机逐项走查家长端/教练端入口、退出、弹窗和媒体行为。
- **违反时处理**：阻止提审；修正入口或交互并重新录制完整路径证据。
- **Owner**：TBD
- **最后复核日期**：2026-09-18
- **自动化检查 ID**：manual

### MP-REL-004 [硬门禁]

- **规则正文**：上传前必须用微信开发者工具或官方上传构建确认主包、每个分包与总包大小；不得用 MP-PKG-002 的原始文件预算预警宣称通过 2M/30M 硬限制。
- **依据**：`docs/reference/wechat-miniprogram/pages/subpackages-overview.md:15-20`、`docs/reference/wechat-miniprogram/pages/ref-project-config.md:276-297`。本地留档抓取于 2026-09-18，对应基础库 3.17.3。
- **判定方式**：保存开发者工具代码依赖分析或上传构建输出，并与上个版本对比。
- **违反时处理**：阻止上传/提审；清理或分包后重建并重新取证。
- **Owner**：TBD
- **最后复核日期**：2026-09-18
- **自动化检查 ID**：manual

### MP-REL-005 [硬门禁]

- **规则正文**：发布候选必须通过策略检查、相关单测/类型检查、开发者工具编译，以及全新用户隐私拒绝/同意和家长/教练关键路径真机回归；不得把静态检查表述为真机通过。
- **依据**：`docs/reference/wechat-miniprogram/pages/product-reject.md:132-145`、`docs/reference/wechat-miniprogram/pages/quickstart-release.md:14-24`。本地留档抓取于 2026-09-18，对应基础库 3.17.3。
- **判定方式**：发布清单逐项记录命令、退出码、开发者工具编译和真机设备/微信版本。
- **违反时处理**：阻止提审；完成缺失验证或明确回滚发布候选。
- **Owner**：TBD
- **最后复核日期**：2026-09-18
- **自动化检查 ID**：manual

### MP-REL-006 [建议]

- **规则正文**：全量发布后至少观察 24 小时的登录、请求错误、付费能力与关键路径指标；“已发布”不得直接等同于所有用户已更新。
- **依据**：`docs/reference/wechat-miniprogram/pages/update-mechanism.md:61-74`。本地留档抓取于 2026-09-18，对应基础库 3.17.3。
- **判定方式**：人工记录版本覆盖窗口、错误与业务指标，并准备回退/最低可用版本决策。
- **违反时处理**：补观察与告警；异常时按发布预案暂停扩量或回退。
- **Owner**：TBD
- **最后复核日期**：2026-09-18
- **自动化检查 ID**：manual
