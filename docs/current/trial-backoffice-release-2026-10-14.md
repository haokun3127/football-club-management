# 2026-10-14 小程序体验版与后台交付记录

## 当前发布状态
网页后台/API：先 develop 验收后，同一不可变镜像已晋级独立 trial。
小程序：用户完成开发者工具确认后，原上传任务回读success；公众平台已显示9.7.5为体验版，提交时间2026-10-14 16:28:14（香港时间）。原9.7.4已由当前上传者的9.7.5替换。已下载并查看官方二维码，pages/launch/index入口，平台标注10月21日前有效。

## 已发布制品
- 源提交：`939676f325b9046383c907e0f3f3eac0a2e9628e`，从干净 `git archive` 构建。
- CI：[Project checks 38530211783](https://github.com/haokun3127/football-club-management/actions/runs/38530211783)，success。
- 镜像：`cq-talent-api:trial-939676f325b9`，Linux/amd64。
- 镜像 ID：`sha256:aed831fd6fa1b103ffb30534a5f72fe79f2569ed6ca405ba52b3dc248a56981a`。本机与服务器 RootFS/source revision 对照一致；develop/trial 当前运行此同一 ID。
- 体验后台：[trial](https://cqtc.pomi.tech/__env/trial/backoffice/)。开发后台：[develop](https://cqtc.pomi.tech/__env/develop/backoffice/)。
- 正式容器 ID 与镜像 ID 前后对照严格保持。未操作正式数据库、正式部署或微信审核/正式发布。

## 功能与质量证据
公共品牌/Banner 接入家长首页；四快捷入口选择、排序及账号/环境隔离；家长确认成绩返回原始值、整数分数、等级、两段版本及历史；后台评价用语进入教练选择，退休用语仅保留当前历史快照。
CI发现 rrule 主机时区依赖，已使用既有 Temporal 按业务墙钟展开；UTC/香港/洛杉矶及纽约 DST、UNTIL/时长回归通过。
`TZ=UTC pnpm check:delivery` 退出0：API230/domain38/mini566通过+1跳过/backoffice2；类型、构建、9项工具及3个运行入口检查通过。后台lint通过。小程序策略仅原始文件预算1.67MiB警告；官方上传成功回执总包1,531,864字节（约1.46MiB），packages仅TOTAL，与无分包app配置一致，低于2M。前版未保留官方字节回执，不能计算准确增量。
官方Native真实渲染/交互通过：公共内容、四入口编辑/保存重入、家长三层成绩及版本/历史。消除了 Babel 数组解构 helper 缺失，并从实际截图修复四按钮横向溢出。Native使用合成请求夹具并最终恢复；不能当作真实手机登录。
46篇微信官方文档发版前刷新全部成功。正文变化仅配置示例补等号与3.17.4版本说明；保留已验证3.17.3团队基线。

## 部署、数据与真实后台验收
- develop：旧镜像 `cq-talent-api:trial-1224e07bf5f4`；独立卷 `cq-talent-develop-data`；备份 `/opt/cq-talent-nonproduction/backups/trial-release-939676f325b9-20261014/develop.sqlite`，SHA-256 `7a7432e9d94fdce0e854a25385b30bf579e3604dde567b1b2328ffd2bec0d2dc`。
- trial：旧镜像 `cq-talent-api:trial-1224e07bf5f4`；独立卷 `cq-talent-trial-data`；备份 `/opt/cq-talent-nonproduction/backups/trial-release-939676f325b9-20261014/trial.sqlite`，SHA-256 `c409932c80a4905106fb5bcb8f97f8f5ce76d4298019705b431c1f19e9243770`。

在线一致性备份各自完成；备份副本在新镜像下迁移，完整性ok、外键无错误，所有旧表旧列旧行多重集合保留。未恢复覆盖活库。私有配置及备份均限制在服务器0700目录/0600文件。
设置各环境独立 BACKOFFICE_PUBLIC_URL、不同 SCOUT_IDENTITY_KEYRING、非生产成绩发布 allowlist；管理员使用既有活跃身份，仅设置首个后台密码，不创建用户/扩大角色/复制生产事实。
HTTPS分别通过安全且路径隔离的Cookie、未登录401、未授敏感能力403、已停用验收场地写入回读、容器重启后持久化与会话、注销撤销。trial真实浏览器进一步完成表单修改保存、刷新后回读、截图检查与退出。两环境各保留一条明确标记且inactive的验收场地，不用作真实训练。
重启窗口首次环境探测命中trial502，稳定后重跑10项全部通过；其范围仅路由/客户端注册/环境拒绝，报告明确 realWechatLoginVerified=false。
原生数据路径和业务目录可能仍显示系统内置参考场地；未播种真实学员、正式标准或生产事实。后台工作台空业务数据如实显示。

## 小程序官方发布与平台回读
上传目录 `/private/tmp/fcm-release-939676f325b9/apps/miniprogram-cq-talent`，版本9.7.5，来源同一已发布SHA。
原唯一任务 `confirmation_upload_30bd73b1-02e4-4083-8ef7-0bcb77e53b88` 由用户确认后查询为success/execution_success，官方包体总计1,531,864字节。未重复上传。成功回执和去令牌平台状态记录在本任务research下。
公众平台版本管理实际回读：9.7.5带“体验版”标记，来源备注939676f325b9一致；平台已完成体验版状态，未再重复设置。官方“下载二维码”按钮保存二维码，查看图像确认俱乐部名和10月21日前有效，入口pages/launch/index。浏览器元素及整页截图超时，使用平台下载取得官方QR；未声称截图成功。
开发设置只读回读AppID正确，request合法域名含https://cqtc.pomi.tech。付费管理“我的用量”显示手机号快速验证累计73/总量1000、可用92.7%；实时验证累计0/总量1000、可用100%，未购买或修改资源包。
尚未备案，无正式线上/审核版本。本次只完成体验交付，不提交审核/正式发布。真机隐私拒绝/同意、手机号授权及家长/教练/管理员关键业务路径仍待用户手机验证；开发者工具合成验收及后台实测不能替代，正式提审门禁继续保留。

## 凭据与恢复
后台初始凭据仅在服务器 `/opt/cq-talent-nonproduction/private/backoffice-access-939676f325b9.json` 及本地0600私有交付文件；密码、身份密钥、AppSecret均不入Git/日志/argv。
发布准备元数据：`/opt/cq-talent-nonproduction/releases/939676f325b9/preparation.json`；专用Compose同目录。禁止合并正式Compose或自动重跑data-init。
若后续异常，先停止写入并对当前非生产库另做备份，再核对迁移兼容性及故障范围。不得盲目旧镜像覆盖已迁移库，不得恢复旧备份抹除发布后新事实；恢复只在确认的独立环境/副本中演练后实施。
