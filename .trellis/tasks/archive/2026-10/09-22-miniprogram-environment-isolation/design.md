# 最小技术方案

## 请求流
微信 envVersion → 固定 HTTPS 基址/环境缓存 → X-MiniProgram-Env → Nginx 固定上游 → Fastify onRequest 环境门禁 → 原有 Bearer/角色校验 → 当前实例独占 SQLite。

| 环境 | 客户端入口 | 上游 | 数据 |
|---|---|---|---|
| develop | https://cqtc.pomi.tech/__env/develop | localhost:3101 | 专用 develop volume /var/lib/cq-talent-develop/api.sqlite |
| trial | https://cqtc.pomi.tech/__env/trial | localhost:3102 | 专用 trial volume /var/lib/cq-talent-trial/api.sqlite |
| release | https://cqtc.pomi.tech | 现有 localhost:3000 | 保留现有生产卷及路径 |

沿用域名/TLS/微信合法域名，避免新增 DNS 前置工作。独立非生产 Compose 文件不能隐式加载生产 env/volume，Nginx 片段只给出精确固定上游且禁止未知 __env 路径落入生产；本轮不部署。当前未接入的路径失败，不可回退根路径。

## 请求防护契约
所有业务路径都先检查环境；health/openapi 的 GET/HEAD 可公开读。非生产强制正确 X-MiniProgram-Env。release 兼容旧正式客户端的正确微信 Referer（可没有新标记）；显式 develop/trial 或 0/devtools 一律拒绝。小程序 app-client 路径在 release 必须有效正式 Referer；其他业务工具也必须提供正确环境标记或正式 Referer。任何给出的 Referer 都验证 AppID、固定 HTTPS 主机、严格版本格式和环境类别。头/Referer 能被非微信客户端伪造，因此只防误路由，不授予身份权限；仍依赖 Bearer 和独立数据库。

## 数据库边界
FCM_RUNTIME_ENV 必须显式合法；DATABASE_URL 必须绝对文件路径。非生产固定目录后缀 cq-talent-{env}/api.sqlite；拒绝符号链接/硬链接。打开已有文件前只读检查 runtime_environment 归属；非生产拒绝未标记旧库和其他环境库，避免旧生产库被启动迁移/seed。release 可接纳历史无标记库，只在未来明确部署时写入归属。新库记录归属后沿用迁移；release 启动不 seed，非生产使用合成种子。迁移 CLI 复用同一边界。

## 兼容及回退
所有新缓存加环境后缀，现有用户需重新登录；不迁移历史缓存。保持当前 release URL 和生产卷名。改动只在仓库中；远程现有旧客户端/服务端仍未被保护。后续按先服务端保护、再非生产上游验证、最后客户端顺序上线，旧审核/体验版本会被生产拒绝。回退不能恢复开发环境指向生产，非生产上游失败应保持关闭。
