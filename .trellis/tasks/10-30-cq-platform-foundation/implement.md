# CQ-00 平台边界与部署制品执行

2026-10-30：已批准，待冻结基线后实施。Node24、仓库锁定pnpm、GPT-6.1-sol。

- [x] 读回worktree/HEAD/脏状态，激活本任务；使用trellis-before-dev读取相关规范。
- [ ] 先核对运行环境、认证、制品及现有发布脚本。完成镜像和初始化隔离、制品记录、健康/客户端版本回读；同步 schema/OpenAPI。公共 UI/API 无必要不制造新抽象。提交 CQ-00 后报告接口、SHA 和证据；后续后台优化由总控安排。
- [ ] 只更新 develop 不影响 trial/release；镜像配置、构建标识、旧响应兼容、缺失元数据行为；API/后台类型与相关 API/脚本/构建启动测试。
- [ ] 审查diff、记录实际证据与缺口，独立提交并报告SHA。
- [ ] 总控固定版本审计、集成及跨端/环境验证。

不得自行push/deploy/微信上传。只更新本任务记录；父任务、B6、共享specs由总控负责。规范建议返回总控，不覆盖他人修改。

## 证据与续接

2026-10-30 / `/Users/dongjun/.codex/worktrees/0e3e/football-club-management`：干净 detached HEAD 6a71669f，按授权切至 `codex/cq-platform-foundation`，冻结起点 41f615d7；已 task.py start。直接实施/检查，不派子代理。

实施顺序：
1. 拆分 develop/trial 镜像与初始化服务；release 去除运行时构建/latest；提供显式单环境启动命令及 Compose 回归。
2. 在服务镜像内固化白名单构建元数据；health 保留 status/service，新增 build（缺失为 null）和可选 environment；schema/OpenAPI 同源；客户端公共版本读取支持旧服务。
3. 提供从固定 Git 提交构建/打包的入口、后台及迁移哈希、关联两个发布单元的制品清单；上传回执未知时保持空值，不制造官方构建证据。
4. 相关测试、全量 API/类型及构建/隔离启动、diff 审查；按可验收小批提交。Docker daemon 与官方上传如不可用如实标待验。

已读 trellis-before-dev/check/update-spec（主目录 ignored .agents/skills，只读复用）、API environment-isolation/quality/directory/database/error/logging、miniprogram 配置规范与2026-10-14官方版本留档。无页面或视觉改动；共享 specs 的7节合同建议留本任务交总控。

### 批次1：环境启动边界
- release Compose 只引用 FCM_RELEASE_IMAGE；nonproduction 分为 FCM_DEVELOP_IMAGE/FCM_TRIAL_IMAGE，各自 init 只挂自己的卷。
- start-environment.mjs 默认仅输出安全计划；--apply 才执行，先定向 run init，再 up --no-build --no-deps --pull never 单服务。启动不构建、不自动拉取、不读写别环境数据。
- 2026-10-30 `PATH=/opt/homebrew/opt/node@24/bin:$PATH node --test scripts/delivery/start-environment.test.mjs`：2/2 通过；使用真实 Docker Compose v5.5.1 渲染但不启动容器，验证 develop 变更后 trial 配置完全一致、独立卷、digest 拒绝及定向命令。
- Docker daemon 访问尚未验证；未部署。

### 批次2：安全版本回读
- GET /health 保留 status/service，增加 build: {sourceRevision,buildId,builtAt} | null；配置运行时另有 environment；no-store。只读镜像内 apps/api/build-metadata.json 的白名单，不输出凭证/路径/任意env。缺失或损坏元数据为null。OpenAPI复用同一响应schema，新增字段保持可选以描述旧合同。
- 小程序 utils/version.ts 的 getClientVersion() 同步读取平台 version 与本包 stamped build；getServiceVersion() 显式读取health，旧服务字段缺失为null，显式环境不一致抛错。没有页面改动或额外初载请求。
- 2026-10-30 Node24：API build-info/server/environment-isolation 3文件74项通过；小程序版本4项通过；已有 localhost smoke 在沙箱内EPERM，正以授权监听重跑。
