# CQ 集成审计与 develop 交付执行

更新时间：2026-10-30；主目录 /Users/dongjun/projects/football-club-management，feature/ui-batch-1-p01；共同开发基线41f615d7，当前产品集成02baed1f。

## 已完成

- 批准方案和评审归档，四个用户要求的 GPT-6.1-sol 线程及独立 worktree 已启动，真实ID/所有权见threads.json。主目录未切分支或覆盖原有资料。
- CQ00独立环境不可变镜像、制品清单、安全health身份与公共版本读取；教练CQ10/11、家长CQ12/20及球队/友谊赛首批已按序集成。
- 46份迁移在隔离SQLite执行后，105表唯一归属、2运行时元数据；所有路径和迁移哈希核验通过，见docs/current/product-domain-map.json。
- 原生主项目Automator9420保留真实登录；日程实际点击进入课堂、教练切换到家长、首页显示下一活动已通过。不是物理设备或正式微信版本证据。
- 独立审计两轮固定SHA报告与错误复现探针保留在research。A01空值、A02同课更正排序、C01周期任务归属、R2-01同generation迟到请求已修；A03/A04服务端版本CAS和整批事务已集成，教练页面接入待完成。

## 契约决定

- 数据表按事实所有权归属，不批量搬表；日程时间地点唯一，计次/参与/实际到场分开；保留后台四模块、教练三栏、家长四栏。
- 课堂GET新增revision；PUT须携带已读expectedRevision。为避免旧客户端静默覆盖，缺版本428零写入，陈旧409保留本地输入并人工核对；不自动取新revision重发旧内容。URL、读取和其他业务规则保留。仅本轮develop交付该安全兼容例外。
- 本地Docker image ID是内容寻址标识，不冒称registry digest；构建与启动分离，两个正式发布单元独立记录。未上传微信就不宣称客户端平台版本已更新。
- 线程只提交所有权内改动，不自行push/deploy。总控沿用户已授权范围完成GitHub/dev；trial/release、微信正式上传不在本轮发布范围。

## 当前运行事实

现场只读回读：develop a5c074ce、trial939676f、releaseb050391。尚未部署本轮源码。主目录原生新页面调用旧develop API，不能将该组合视为新服务端验收。

## 剩余与下一步

- 平台完成版本组件/后台实际交互、CQ23；教练完成课堂CAS和现有统计含义修正；两端account注册版本组件。
- 原生检查成长页/课堂/任务/录入/友谊赛/返回上下文，按同口径测量实际可测性能；物理设备键盘、大字、Android/iOS及官方包体仍保留B6待验。
- 固定最终集成SHA后独立审计及总控pnpm check:delivery，审查差异，更新共享规范和交付记录。
- GitHub dev正常快进提交、同版amd64镜像与清单、develop一致备份及迁移兼容检查、仅develop启动；健康/后台/真实双角色回读，并比较trial/release容器及镜像未变化。

续接使用wait_threads和threads.json，不重复创建线程；集成前先查各分支父提交，公共依赖仅集成一次。审计错误行为探针通过仅表示复现，不是修复验收。
