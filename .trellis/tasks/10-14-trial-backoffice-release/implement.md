# 执行与恢复记录

## 清单
- [x] 获用户创建任务同意；读取Trellis和当前上下文、验收及发布记录。
- [x] 记录混合工作树基线、线上镜像；10项只读环境检查通过；GitHub push=true。
- [x] 用户明确确认按方案实施与发布；task.py start已激活，已读相关spec正文。
- [ ] 核清需求覆盖，补公共内容/四快捷入口等已确认缺口并验证。
- [ ] 刷新46篇官方正文/manifest，审阅变化；策略报告及官方包体/编译。
- [ ] check:delivery、后台lint、定向测试、Native/浏览器实际交互，diff审阅。
- [ ] 形成完整依赖与提交清单，一次确认后提交/push并验证CI。
- [ ] 干净SHA镜像实际构建及权限/模块启动、独立备份和副本迁移/恢复。
- [ ] develop配置与真实登录/写入回读/权限，晋级同镜像trial。
- [ ] 官方上传并设体验版、回读版本/二维码及三角色验收；部署报告。
- [ ] spec durable lessons及finish流程；只归档实际完成且已提交任务。

## 命令与证据
本地PATH=/opt/homebrew/opt/node@24/bin:$PATH。pnpm check:delivery日志/tmp/fcm-delivery-20261014.log，当前运行中；各检查只记录实际退出码。线上只读check:environments通过，未证明真实手机登录。原始baseline有360项，不整树暂存；任务规划文件为本轮新增。

## 下一步
规划审阅后激活；完成需求覆盖矩阵。当前未写业务代码、未部署、未上传、未提交。秘密与高频临时文件放OS临时目录或服务器0700私有目录。

## 2026-10-14 实施检查点
已接入Native公共品牌/Banner/可选目录，四入口用户选择/排序及环境/club/client/user存储隔离；后台评价用语接入当前教练选项，历史词句保持，停用后仅原当前评价可保留，不许新增选用；家长监护授权确认成绩新路径投影原始值、mapping.integerScore/grade/两段版本，复用成绩控制器并新增parent/confirmed-results路由及成长入口。API真实HTTP回归2项通过；受影响21项中最初1夹具用错无权学员，改同一已授权学员移除后重选复验2/2。
完整check:delivery /tmp/fcm-delivery-final-20261014.log退出0：API230/domain35/mini566+1skip/backoffice2，9工具回归与3本地运行入口均通过；后台lint退出0；policy只有原始文件预算1.67MiB预警。
46官方文档刷新零失败；精确旧raw哈希对照仅正文ref-app-config修复示例缺等号、release-latest-v3增加3.17.4说明（swiper clip及本项目未用API），当前3.17.3团队基线不受影响。原HTML缓存不进Git。
Native官方真实渲染尚未通过：首页page data只有__webviewId__，console确认@babel/runtime/helpers/arrayWithHoles缺失；一次官方refresh未解决，当前去掉首页Promise数组解构以消除该生成依赖，重编译及原始复验进行中。每次测试恢复请求/会话并回登录。
内置CUA因项目符号链接无法启动；改隔离Playwright浏览器已打开mp.weixin.qq.com，目前扫码登录，已异步请用户登录。GitHub push=true、本机Docker29.8.1可用。未提交、构建发布镜像、远端改动、上传或选体验版。
下一步：原生异常修复/正常截图→范围矩阵及spec更新→具体完整依赖提交清单一次确认→干净同SHA CI/镜像/迁移恢复演练→先develop后trial/官方上传与体验版切换。旧正式镜像b050391保持。

原生补验：官方刷新本身未解决helper缺失；去掉首页解构后单一会话通过，/tmp/fcm-native-release-actions-20261014.log退出0。两截图已查看，成绩三层/版本/历史正常；截图还发现首页四按钮默认宽度导致横向溢出，已最小改flex等分并进行复拍。用户已扫码平台登录，账号名重庆天才足球俱乐部/AppID匹配。平台当前显示未备案，不扩展为正式上架操作。

最终截图复核：四入口改flex后全在视口，编辑面板/取消/保存无溢出；/tmp/fcm-native-layout-final-20261014.log退出0，夹具和会话已恢复。最终门禁发现退休用语筛选参数隐式any，已仅补类型注解，mini typecheck退出0；最终完整门禁/tmp/fcm-delivery-release-ready-20261014.log运行中。具体提交清单commit-plan.md约384源码配置+102文档规格，排除534项无关/原有本地工作；未包含.env、数据库、credentials、private config、node_modules/dist。

## CI根因修复
批准两批已提交并推送：806c40770526源码、e4e04373ff66文档；GitHub同SHA CI38528557783暴露rrule TZID按主机时区转换，UTC返回01Z而本地香港返回09Z。不是权限或CI配置问题。已用既有Temporal显式业务墙钟→UTC浮动规则→业务时区真实瞬时修复，并增加UTC/香港/洛杉矶主机、纽约夏令时、绝对UNTIL及90分钟时长回归，定向7/7通过；TZ=UTC全交付运行中。新镜像必须随修复后SHA重新构建，旧e4e镜像未部署。原e4e Linux构建/非联网只读node用户模块加载成功；生产仍未操作。

TZ=UTC pnpm check:delivery /tmp/fcm-delivery-utc-20261014.log退出0：domain38/API230/mini566+1skip/backoffice2；类型/构建/9工具及3运行入口通过。原香港定向calendar7/7与UTC三主机/DST/UNTIL回归通过。例外修复按已批准收尾发布范围提交，不修改CI期望或全局TZ以掩盖原因。
