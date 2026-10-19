# 视觉依据与适用边界

2026-09-23：本阶段先对齐昨日三端定稿原型，再统一全部前端视觉。保留现有 TC 品牌、字体、组件和信息架构，不因参考俱乐部官网而把业务管理产品改成营销官网。

## 可追溯参考
- Bayern 网站实施方公开案例：https://satellytes.com/blog/post/fc-bayern-website-frontend-relaunched-by-satellytes/ 。参考统一组件、移动使用、可访问性和设计实现的一致性；它是公开案例，不是拜仁完整内部设计规范。
- Manchester City 官方历史网站改版说明：https://www.mancity.com/news/club-news/club-news/2016/june/new-man-city-website 。参考内容层次与跨设备体验，不把历史发布稿解释为今天的完整标准。
- Barça Innovation Hub：https://barcainnovationhub.fcbarcelona.com/blog/21890/ 。作为俱乐部数字体验背景资料，不能直接决定训练管理业务规则。
- Arsenal 品牌门户：https://brandguidelines.arsenal.co.uk 。本轮未读取到完整内部指南，不能声称已获得其规范。
- Figma 原生 Agent 能力：https://help.figma.com/hc/en-us/articles/37998629035799-Work-with-the-Figma-agent-in-design-files 。本轮实际通过桌面 Agents 发起设计并用 MCP 读回。

## 本项目设计约束
- TC 红 #A80F1B 为主操作色，训练蓝/比赛红/其他绿只表达活动类型；状态单独展示且不能被误认成用户有权执行的操作。
- 继承 Noto Sans SC 和现有 TC text styles/variables，复用 Button、Field、TabBar、Business Card；优先修正层级与布局，避免另起视觉系统。
- 主路径操作清楚，页面有实际数据形态、空态、失败保留与重试；不能用规则说明代替交互界面。
- 图表必须表达真实结构：三维以上雷达、单指标日期趋势、未测空缺、不可比版本断开；演示数据不代表生产事实。
- 不以模型自报完成作验收。读回节点、核对定稿、截图、原型连线、代码契约分别留证。

## 2026-09-24 青训 App 参考
- Train Effective：https://www.traineffective.com/en/varsity-sports-india 、https://www.traineffective.com/en/about 。检索训练照片、球员训练进度与鲜明主操作的展示。
- Tonsser：https://tonsser.com/ 、https://tonsser.com/faq 。检索球员身份、成长与比赛数据的表达。
- Techne Futbol：https://www.technefutbol.com/techne-pro 。作为训练型产品的功能与内容参照。
- 限制：图片检索结果已获得，但内置浏览器重复超时，外部参考图片尚未完整视觉走查。不能声称已获得这些产品的内部设计规范。
- 本项目首批视觉已实际截图检查 P01、C01、D01，保留 #A80F1B；采用更清晰的指标字阶、紧凑布局、真实 SVG 与原创足球横幅。C01 日期换行已修复。资产来源见 visual-asset-provenance.md。
