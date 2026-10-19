# 验证结果（2026-09-22）

所有数据为 OS 临时目录内合成数据；没有生产连接、微信开放能力调用、容器启动、上传或发布。

| 检查 | 结果 | 证明范围 |
|---|---|---|
| pnpm check | exit 0；694 通过，1 跳过 | 三包类型检查、domain 23 / API 156 / 小程序 515 |
| pnpm build | exit 0 | domain/API 编译；小程序由自身类型检查覆盖，不等于微信编译 |
| API 环境隔离 focused suite | 9/9 | DB 归属/链接/三环境重启，默认 no-seed，HTTP 矩阵，真实训练写入及有效 session 的旧体验误连拒绝 |
| 小程序环境隔离 focused suite | 10/10 | 固定映射、零网络失败、缓存隔离、Header 防覆盖、localhost smoke 拒绝生产 |
| scripts/verify-environment-startup.mjs | exit 0 | 三个真实 built entrypoint 的 localhost health/拒绝；缺配置不创建 DB；真实 startup/migrate 拒绝旧库且字节不变；release 无 seed |
| Docker Compose config | exit 0 + assertions | 独立 develop/trial 卷、各自正确路径/环境、loopback 3101/3102，无生产卷/env |
| 平台检查器自测 | 3/3 | 检查器规则与 spec 编号一致 |
| 平台报告 | 84 项已有发现 | urlCheck、基础库、废弃 API、非产品打包排除、原始 1.96 MiB 预算；不等同官方包体 |
| git diff --check | exit 0 | 已跟踪文件差异空白规范 |

## 已明确的限制

- 本机未安装 Nginx，未在真实配置上下文 nginx -t；没有远程容器、卷、upstream、TLS/微信域名的现场核验。
- 未运行开发者工具编译、真机或官方上传包体检查；此次无视觉样式修改，未声称 UI 验收完成。
- Guard 是误路由防护。客户端 Header/普通 HTTP Referer 能伪造，权限仍依赖 Bearer/角色。独立卷与受控文件系统是数据隔离基础。
- release 无 Header 的老正式微信请求可以兼容；旧管理工具/回调必须先盘点适配。旧体验/审核请求会被新正式 API 拒绝。
- 当前代码未提交、未上线；线上旧版本尚未受本任务改动保护。

## 可复跑

运行命令与部署候选路径见 docs/current/miniprogram-environment-isolation.md。完整流程无需生产凭据。
