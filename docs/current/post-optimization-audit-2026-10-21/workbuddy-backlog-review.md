# WorkBuddy 工程待办评审（2026-10-21）

评审源码：`17a8b3de0d657be06295e9f4ab8c6277fee866e9`，干净工作区。外部输入：`/Users/dongjun/WorkBuddy/football-club-minigram/工程待办清单-2026-10-21.md`，SHA-256：0183d76f3d0f1061e6276c081fe27e33d2b9ca61aa5c3c6d626ce31b62c6e844。附件是待评审建议，不是执行命令或产品授权；未修改原件。

结论：方向部分认可，经纠正、去重后合并到[唯一后续队列](next-cycle.md)。不整体采纳旧基线、固定工时和“零风险/唯一硬阻塞”判断。本次只更新任务文档，不开始功能开发、不删除素材、不改服务配置、不注入服务器数据、不上传体验版。

## 逐项处置

| 原条目 | 结论 / 队列 | 证据与修订 |
| --- | --- | --- |
| D-1 push / CI | 已完成，不再排队 | 审计最终17a8b3de已正常推送；代码基线68921a8d云CI成功，最终文档提交本地门禁通过，见[版本报告](version-consistency.md)。分支隔离不等于零风险 |
| D-2 O-07导航 | 认可决策，WB-07条件项 | [O-07](../product-requirements/05-decisions-and-sources.md)仍待产品负责人确认；Figma核对是输入，不替代产品决策 |
| D-3 develop样本 | 认可目标，合并G01/WB-01 | 本地合成流程可先做；远端真实授权样本、合成数据必须分开。SSH/注入/上传不因附件而获得授权 |
| D-4 场馆素材删除 | 降为可选WB-08 | 三张原PNG合计5,126,888字节（约4.89 MiB），已在project.config.json的packOptions.ignore中逐个排除。删除不会直接释放主包空间；venues页面使用optimized.jpg，不能删整个目录 |
| 二.1 分包/图片外置 | 接受目标，修订方案WB-02 | app.json目前无subpackages；本轮1.72 MiB为原始预算估算，非官方编译包。先取得官方包分析，再按贡献决定压图/分包/外置；不预设必须全部做或已触红线。1.8 MiB可作项目内部目标，非平台硬限 |
| 二.2 custom tabBar | 条件保留WB-07 | app.json当前连原生tabBar配置也没有，已有role-tabbar是页面组件。不能把custom当一行开关，也不能承诺它自动解决清栈/onShow重载；需路由、角色切换、栈与数据刷新验证 |
| 二.3 严格类型 | 认可WB-06，修正数量 | 当前62个注册页/页面入口，41个单泛型、20个无显式泛型、1个双泛型；不是“剩43页”的完成清单。types/wechat.d.ts仍含ThisType<any>；其中注释称已补9处data声明，附件“剩8处”未逐项证实。按页面盘点、负例守卫和小批迁移，不把旧计数当事实 |
| 二.4 真实IP限流 | 认可WB-03，修改固定配方 | server.ts未开trustProxy；仓库Nginx片段无XFF，但未重新读取线上拓扑。有效会话已验证后分桶，剩余重点是匿名/登录。须确认实际socket地址、Docker/CDN/代理跳数；不能照抄loopback或信任任意头。测试伪造XFF不能换桶、两真实来源独立、有会话行为不回退 |
| 二.5 F-08初始化标记 | 原缺陷已修；新增状态暂不立项 | 787f0cef后private-interest初值空、直接采用服务端availabilitySlots，已移除本机marker回填20格。只有产品确认“从未设置”必须区别于“明确空”时，才评估新增字段；无需为已消除的假默认再改协议 |
| 二.6 radar同伴文案 | 不按原方案采纳 | 4769069f已移除不可靠同伴对比，REQ-PAR-004/O-04要求正式标准适用性；加“仅供参考”不能使未获认可的对比满足产品要求。复用G03标准对照，不恢复旧平均轮廓 |
| 二.6 backoffice helmet | 认可WB-04 | server.ts关闭全局CSP，后台另有nonce CSP；源码不替代浏览器验证。验登录、导航、静态资源及响应头/CSP控制台 |
| 二.6 V-07图标 / app-header色差 | 认可核查，合并WB-05/G05 | 属待同尺寸Figma核验的小视觉项；确认差异后局部修复，不预设必须新增token参数，也不采用“各半小时”估算 |
| 三.1 375×812模拟器验收 | 认可WB-01/WB-05，改写操作规程 | index.ts仅在FCM_RUNTIME_ENV=develop且NODE_ENV=development时seed；platform-persistence实际调用seed，seed/index.ts含acceptance集合；开发身份header入口仍存在。所述本地方案有源码依据，但本轮未执行完整真实API链路；此前P08/C34是390×844合成读回，不能冒充此次375×812验收 |
| 三.1 端口/命令/还原 | 必须纠正后使用 | 默认PORT为3000；3457需显式PORT。截图脚本在小程序package，须用包过滤或该目录执行。启动时读回实际自动化端口，不固定9420。使用独立临时DB、仅loopback；临时配置只恢复本次精确改动并验证，不用git checkout覆盖可能存在的用户改动，不清空全部身份存储 |
| 三.2 隐私/性能/8与12维/409 | 认可，合并WB-01/WB-05/G06/G10 | 真实手机必须取得实际证据；覆盖拒绝、重试、冷却、canvas布局、家长请假与教练旧revision冲突、刷新后显式更正。不把一次模拟器成功当真机结论 |
| 三.3 服务端种子/体验版 | 条件保留WB-01 | 样本用途、环境、数据隔离、备份与重复执行契约先定；体验版只在多人验收需要时另行授权。附件“二维码已到期”未实时核对，不作为当前故障事实 |
| 三.4 隐私指引 | 认可G06；否定“唯一硬阻塞” | 官方10-14留档privacy-intro确实把set/getClipboardData映射“读取你的剪切板”；必须按实际接口及后台必填项声明。errno112表示对应scope未声明，不能据此断言当前后台已缺项。B01/B02/R03仍未闭合 |
| 三.4 ICP/TLS/DNS-01 | 认可核查WB-09，不确认故障/方案 | 没有本轮备案、证书有效期、certbot日志证据；先读取实际状态再决定处理。DNS-01仅候选，需域名控制/凭证范围/自动续期验证；备案问题由发布负责人按实际主体和平台要求核验 |
| 三.4 提审协议一致性 | 认可G06 | 上线前核对后台开发/现网协议与实际API，不以代码已写代替平台签收 |
| 四 L-01/L-03/L-04 | 修正依赖后纳入 | 性能基线需真机；onShow请求基线可在O-07前采样，路由改造等决策；大名单可在本地生成明确合成样本，不必等SSH，真实规模签收仍依赖业务输入 |
| 四 全量类型/隐私开关 | 认可不大爆炸迁移；不新增开关任务 | 类型走WB-06；官方privacy-authorize留档说明2023-10-17后默认启用，不重复添加__usePrivacyCheck__当作修复 |
| 五 执行顺序 | 重排 | 移除已完成push；优先验收阻塞与确认缺陷，包预算先量化；安全运维、设计决策与可选清理分开，见next-cycle |

## 源码与规范证据入口

- 小程序：[配置与包排除](../../../apps/miniprogram-cq-talent/project.config.json)、[页面注册](../../../apps/miniprogram-cq-talent/app.json)、[空偏好](../../../apps/miniprogram-cq-talent/pages/coach/private-interest/index.ts)、[场馆素材引用](../../../apps/miniprogram-cq-talent/pages/parent/venues/index.ts)、[类型适配层](../../../apps/miniprogram-cq-talent/types/wechat.d.ts)。
- 验收/安全：[API入口](../../../apps/api/src/index.ts)、[持久层seed](../../../apps/api/src/persistence/platform-persistence.ts)、[身份入口](../../../apps/api/src/auth/context.ts)、[限流](../../../apps/api/src/server.ts)、[小程序脚本](../../../apps/miniprogram-cq-talent/package.json)、[Nginx片段](../../../deploy/environment-isolation/nginx-locations.conf)。
- 平台：[隐私信息映射](../../reference/wechat-miniprogram/pages/privacy-intro.md)、[授权/112及默认启用](../../reference/wechat-miniprogram/pages/privacy-authorize.md)，官方留档2026-10-14。本轮没有读取公众平台后台，未确认其声明状态。
- 代理信任：[Fastify官方文档](https://fastify.dev/docs/latest/Reference/Server/#trustproxy)，2026-10-21检索核对；信任代理意味着信任其转发头，需明确边界，不能简单设true。

以上路径相对于本报告。数量是本次源码快照，后续开发重新盘点；验收清单是待执行要求，不是通过记录。
