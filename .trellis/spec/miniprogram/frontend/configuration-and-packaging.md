# 配置与分包规则

### MP-CONF-001 [硬门禁]

- **规则正文**：团队配置必须存在且可解析；`project.config.json` 必须声明 `appid`、`projectname`、`compileType: miniprogram`、`libVersion`、`miniprogramRoot`、`setting`、`packOptions`，`app.json` 必须声明非空 `pages`、`window` 与 `sitemapLocation`。
- **依据**：`docs/reference/wechat-miniprogram/pages/ref-project-config.md:15-37`、`docs/reference/wechat-miniprogram/pages/ref-app-config.md:7-36`。本地留档抓取于 2026-09-18，对应基础库 3.17.3。
- **判定方式**：检查器解析两个 JSON 并校验字段和值；解析失败或缺字段时报告具体文件与行号。
- **违反时处理**：检查器报告后，由人/Codex 按规则和评审上下文决定修与不修；需要修复时补齐或修正团队配置，不以私有配置代替。
- **Owner**：TBD
- **最后复核日期**：2026-09-18
- **自动化检查 ID**：MP-CONF-001

### MP-CONF-002 [硬门禁]

- **规则正文**：已提交的团队配置必须启用 `setting.urlCheck: true`；不得依赖开发者工具“跳过域名、TLS 与 HTTPS 证书校验”完成验收。
- **依据**：`docs/reference/wechat-miniprogram/pages/ref-project-config.md:59-77`、`docs/reference/wechat-miniprogram/pages/ability-network.md:94-100`。本地留档抓取于 2026-09-18，对应基础库 3.17.3。
- **判定方式**：检查器读取 `project.config.json` 并定位 `urlCheck`；后台域名和证书另按发布规则人工确认。
- **违反时处理**：检查器报告后，由人/Codex 按规则和评审上下文决定修与不修；需要修复时启用校验并真机复测。
- **Owner**：TBD
- **最后复核日期**：2026-09-18
- **自动化检查 ID**：MP-CONF-002

### MP-CONF-003 [硬门禁]

- **规则正文**：团队批准的开发者工具基础库不得低于 3.17.3；项目使用的组件/API 还不得高于后台最低基础库，后者必须在后台确认。
- **依据**：`docs/reference/wechat-miniprogram/pages/release-latest-v3.md:11-24`、`docs/reference/wechat-miniprogram/pages/audits-best-practice.md:37-43`。本地留档抓取于 2026-09-18，对应基础库 3.17.3。
- **判定方式**：检查器比较 `project.config.json.libVersion` 与 `rules.json` 的批准最低值；后台最低基础库与用户分布人工确认。
- **违反时处理**：检查器报告后，由人/Codex 按规则和评审上下文决定修与不修；需要升级时用开发者工具与真机回归登录、日程和测评主路径。
- **Owner**：TBD
- **最后复核日期**：2026-09-18
- **自动化检查 ID**：MP-CONF-003

### MP-CONF-004 [硬门禁]

- **规则正文**：`app.json` 注册的主包/分包页面必须唯一且存在 `.ts` 或 `.js`、`.wxml`、`.wxss`、`.json` 文件；静态可解析的页面跳转必须指向已注册路由，`sitemapLocation` 文件必须存在。
- **依据**：`docs/reference/wechat-miniprogram/pages/config-app-json.md:8-47`、`docs/reference/wechat-miniprogram/pages/ref-app-config.md:54-68`、`docs/reference/wechat-miniprogram/pages/subpackages-overview.md:9-20`。本地留档抓取于 2026-09-18，对应基础库 3.17.3。
- **判定方式**：检查器展开 `pages` 与 `subPackages/subpackages`，核对页面四件套、站点地图和源文件中的静态绝对页面路径。
- **违反时处理**：检查器报告后，由人/Codex 按规则和评审上下文决定修与不修；需要修复时同步修正注册、文件、跳转、分享与 deep link，并补相应路由回归。
- **Owner**：TBD
- **最后复核日期**：2026-09-18
- **自动化检查 ID**：MP-CONF-004

### MP-PKG-001 [硬门禁]

- **规则正文**：测试、开发脚本、Python/CJS 工具和 Markdown 说明不得进入上传包；`packOptions.ignore` 必须覆盖 `miniprogramRoot` 内这些非产品文件，`include` 不得把它们重新带入。
- **依据**：`docs/reference/wechat-miniprogram/pages/ref-project-config.md:276-297`、`docs/reference/wechat-miniprogram/pages/audits-best-practice.md:45-51`。本地留档抓取于 2026-09-18，对应基础库 3.17.3。
- **判定方式**：检查器按 `rules.json` 的非产品文件模式遍历源码根，并按 `packOptions.ignore/include` 规则判断每个具体文件；报告 `file:line`。
- **违反时处理**：检查器报告后，由人/Codex 按规则和评审上下文决定修与不修；需要修复时调整 `packOptions.ignore/include`。
- **Owner**：TBD
- **最后复核日期**：2026-09-18
- **自动化检查 ID**：MP-PKG-001

### MP-PKG-002 [建议]

- **规则正文**：CI 以 1.5 MiB 作为未压缩、按忽略规则过滤后的原始文件预算预警线；该数值仅用于趋势预警，绝不等同于主包/单分包 2M 的官方硬结论。
- **依据**：`docs/reference/wechat-miniprogram/pages/subpackages-overview.md:15-20`、`docs/reference/wechat-miniprogram/pages/ref-project-config.md:276-297`。本地留档抓取于 2026-09-18，对应基础库 3.17.3。
- **判定方式**：检查器逐文件求和并输出 MiB 与明确免责声明；超过预算只产生警告。
- **违反时处理**：检查器报告后，由人/Codex 按规则和评审上下文决定修与不修；需要时清理或分包，提审前仍必须使用开发者工具/官方上传构建确认真实包体。
- **Owner**：TBD
- **最后复核日期**：2026-09-18
- **自动化检查 ID**：MP-PKG-002

### MP-PKG-003 [硬门禁]

- **规则正文**：小程序运行时代码和配置中的网络 URL 必须使用 HTTPS/WSS，不得使用 HTTP、localhost 或本机 IP。
- **依据**：`docs/reference/wechat-miniprogram/pages/ability-network.md:21-31`、`docs/reference/wechat-miniprogram/pages/ability-network.md:73-90`。本地留档抓取于 2026-09-18，对应基础库 3.17.3。
- **判定方式**：检查器扫描会进入运行时的文本源文件，定位 `http://`；开发工具脚本由 MP-PKG-001 负责排除。
- **违反时处理**：检查器报告后，由人/Codex 按规则和评审上下文决定修与不修；需要修复时改为已在后台配置且证书有效的 HTTPS/WSS 域名，并真机验证。
- **Owner**：TBD
- **最后复核日期**：2026-09-18
- **自动化检查 ID**：MP-PKG-003

### MP-PKG-004 [硬门禁]

- **规则正文**：主包和每个分包不得超过 2M，全部分包总和不得超过 30M；结论必须来自微信开发者工具或官方上传构建。
- **依据**：`docs/reference/wechat-miniprogram/pages/subpackages-overview.md:9-20`。本地留档抓取于 2026-09-18，对应基础库 3.17.3。
- **判定方式**：发版人在开发者工具代码依赖分析/上传构建中记录主包、各分包和总包结果；静态原始文件求和不能代替。
- **违反时处理**：阻止提审；清理上传文件或实施分包后重新生成官方构建证据。
- **Owner**：TBD
- **最后复核日期**：2026-09-18
- **自动化检查 ID**：manual

### MP-PKG-005 [建议]

- **规则正文**：业务页按家长端/教练端访问路径规划分包，主包仅保留启动、登录和真正共享资源；预下载必须同时核对每组 2M 额度与真实访问路径。
- **依据**：`docs/reference/wechat-miniprogram/pages/subpackages-overview.md:9-20`、`docs/reference/wechat-miniprogram/pages/subpackages-preload.md:5-35`。本地留档抓取于 2026-09-18，对应基础库 3.17.3。
- **判定方式**：设计评审与开发者工具包体/预下载日志人工核对。
- **违反时处理**：记录不分包理由与后续阈值；若触及官方包体上限，按 MP-PKG-004 阻断。
- **Owner**：TBD
- **最后复核日期**：2026-09-18
- **自动化检查 ID**：manual

## develop / trial / release 数据隔离（2026-09-22）

- `utils/config.ts` 是运行时环境/URL/缓存命名空间的唯一入口。未知、缺失或读取失败的 `envVersion` 不得默认为 release 或 develop；`assertRuntimeApiConfigured()` 必须在网络调用前拒绝。
- develop/trial 分别使用 `https://cqtc.pomi.tech/__env/develop` 和 `/__env/trial`；release 保留根基址。上游不可用时禁止回退根路径。
- `utils/request.ts` 写入 `X-MiniProgram-Env`，清除调用方所有大小写变体，不能由业务页伪造环境。不要尝试设置微信 Referer。
- 所有本地可变状态使用 `environmentStorageKey()`；不得读取旧的无环境 session/context/draft，也不得清除其他环境的草稿。变更后需要重新登录。
- 服务端在业务和幂等操作前验证环境，继续验证 Bearer/角色；具体请求、启动和数据库契约见 [API 环境隔离](../../api/backend/environment-isolation.md)。
- 回归：`utils/environment-isolation.test.mjs` 验证三环境映射、未知环境零网络调用、标记不可覆盖、旧/跨环境缓存不复用及写入 smoke 拒绝生产。新增测试文件必须被上传忽略规则排除。
- 以上是仓库实现；不能据此声称真实上游、Nginx、微信后台或真机验证已经完成。部署候选与边界见 `docs/current/miniprogram-environment-isolation.md`。
