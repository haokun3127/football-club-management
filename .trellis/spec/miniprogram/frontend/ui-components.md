# 原生通用组件合同

## 1. Scope
2026-10-21，用户批准v1.1双端统一UI后适用。TDesign原生包锁定1.17.0；不引入UniApp或Web框架。主题运行源是styles/tokens.wxss。

## 2. Signatures
Button bindtap保留业务dataset；Input/Textarea的原bindinput迁为bindchange，读取event.detail.value；Switch以value替代checked，change仍读boolean。role-tabbar的官方change读取detail.value，再查本地注册清单导航；不接收任意URL。

## 3. Contracts
官方npm构建：wechatide -c Codex build_npm --project <小程序绝对目录>。miniprogram_npm为忽略的生成物，清洁检出需安装锁定依赖并官方构建。微信开放能力button允许保留原生事件链；不得为统一外观删除授权回调。CheckTag使用显式content属性，不同时提供重复slot文本。

## 4. Validation / errors
TDesign1.17的CheckTag默认content=null在本机基础库3.17.3会在slot文字后显示null；传明确字符串。新增npm组件后，热重载/旧编译缓存可能留空页面；冻结源码、必要时仅清编译缓存、官方整包auto后重建页面。清Storage/Auth不是修复模板的步骤。

## 5. Cases
Good：data-id与change一起传递到原处理器，受控value更新；Base：缺平台能力时保留薄原生封装；Bad：把官方Input仍绑定input事件，或把新增组件安装成功视为原生验收。

## 6. Tests
保留既有控制器业务测试；底栏验证合法key导航、当前key/未知key不导航。原生代表页确认输入事件更新真实字段、底栏安全区及标签文字；选择组件须读实际画面，不只读data。字体断言检查批准的语义token，不恢复旧画板的小字号。

## 7. Wrong / correct
Wrong：在每页散写按钮尺寸、缺测用0、未知球队回默认队。Correct：使用统一token及官方组件状态，数据语义继续由业务适配/服务端合同负责。完整产品范围与验收限制见本轮任务implement.md；源码实现、模拟器证据和真机/发布验收必须分开记录。

## 2026-10-21 日程、雷达和原生一致性

- 导航内容固定44逻辑px，加实际statusBarHeight预留；不能用88rpx随宽度缩放导航高度。图标动作的触控边界至少44px。正文16px、辅助14px；被动状态使用普通文字，彩色胶囊留给确有选择行为的控件。TDesign已有适配优先复用；原生手机号/隐私button保留开放能力事件。
- 日程两端仅使用schedule-calendar。日期格只显示日期与最多三类去重标记：训练/比赛/其他；标记8px高、单类最大22px宽，多类自适应，不放名称或+N。完整信息在选中日列表和可访问标签。点选不收起；周/月有显式展开/收起/回今天，展开的网格限高并内部滚动。
- calendarDataRanges覆盖可见周或完整月网格（可跨月42天），分拆每段≤31天。家长API传+08业务日边界；教练日期型UTC范围前补一天，再由统一calendarDateKey按俱乐部日期归格。每周摘要按选中周计算，不用月初/UTC截断代替。保留全部孩子/授权队伍筛选，旧请求不得覆盖新选中日。
- 雷达只使用ECharts按需包与固定官方ec-canvas桥接，生成命令`pnpm --filter @football-club/miniprogram-cq-talent build:radar`（见package.json）；原生runtime不依赖完整ECharts npm目录。页面不另写clip-path/canvas雷达。图形绘制3–8轴，0–2轴保留数值；缺测/未映射/版本不兼容不补0、不连不完整多边形。真实0保留。轴与对比系列须逐轴核对metricVersion及mappingVersion。
- radar-comparison包含指标组/最多8项选择、历史/批准标准来源、稳定系列颜色、半透明面积、显隐和全部隐藏恢复。打开TDesign弹层时用条件渲染移除Canvas，关闭后由ready重新初始化，避免原生Canvas穿透；离页dispose，不占用滚动手势。初始化失败显示明细降级。身份变化/来源请求开始清旧DTO，generation守卫拒绝迟到响应。
- 单队偏好按环境/club/user/coach隔离，丢弃无主旧键；显式无权teamId报错，不按队名或首队回退。异步读取只允许当前账号的最后发起请求更新偏好。多队日程筛选与单队工作区偏好分开。

对比来源撤下或失效导致404时，错误态须提供“清除对比并重试”，清掉history/standard选择后读取当前来源；仅重复同一失效ID不是可恢复操作。主按钮禁用态统一使用TDesign的primary-disabled-bg/border/color变量，不能漏掉后保留默认蓝色。
