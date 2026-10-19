# 工具与环境就绪检查 — 2026-09-25

> **2026-09-28 更正与复测：** 微信服务端口 56031 已开启。旧结论来自调用错误的安装：实际运行的是 `/Applications/wechatwebdevtools-stable.app`，原脚本默认 `/Applications/wechatwebdevtools.app`。稳定版 CLI 登录返回 true，官方 auto 成功，Automator 9420 可读取页面并截图。无需用户再次开启端口。当前应用启动显示 `App client not found`，属于业务配置待查，不是工具连接故障。当前会话权限也已变为无文件沙箱、网络可用、approval_policy=never；下文保留历史诊断，不代表当前权限。详见同目录 `toolchain-readiness-2026-09-28.md`。

## 当时结论
用户要求先检查工具/环境与拒绝原因，再启动后续工作。本轮仅诊断；产品开发与部署保持暂停。不能宣称全部就绪：微信开发者工具 CLI 服务端口关闭，实际登录/自动化/上传链路未通过；非生产微信认证凭据另有未决配置。原 Trellis 任务仍 in_progress，本记录不是产品交付验收。

## 本轮实测
| 能力 | 结果与证据 |
| --- | --- |
| Trellis / 仓库 | 当前任务上下文与阶段读取正常；原 112 项工作区变更保留。 |
| Figma 云端 MCP | whoami 成功；P01（213:348）截图成功；临时节点 357:2 创建、修改、读回、移除成功，existingChildrenUnchanged=true。未修改原有产品画板。 |
| Figma 桌面 MCP | 同一 P01 截图成功。 |
| Web 检索 | 官方文档检索与读取成功。 |
| 内置浏览器 / CUA | Train Effective 官网导航、AX 文本、截图成功；127.0.0.1 临时诊断页打开与按钮点击成功，读回“浏览器交互验证通过”。旧超时本轮未复现；微信原生 App 的启动/绑定仍失败。 |
| 本地编译工具 | Node 22.22.2、pnpm 10.33.0、Python 3.14.3；TypeScript 6.0.3、Vitest 4.1.9 可运行；node:sqlite 内存数据库查询成功。 |
| 项目验证 | pnpm typecheck、pnpm build 通过；pnpm test 在授权本地端口监听后通过：domain 23、mini 506、API 163，另 1 skipped。首次测试因 listen EPERM 失败，不计为通过。 |
| Docker Desktop | 沙箱内 socket 被拒；单次授权后引擎响应正常，Docker Desktop 4.69.0 / Engine 29.4.0。未启动/修改产品容器。 |
| GitHub | gh api user 成功；当前仓库 haokun3127/football-club-management 读取正常，账户具备 WRITE 权限；未测试 push/提交/PR 写入。 |
| SSH / 服务器 | 指定 football_club_codex 密钥，单次网络授权后连接正常；三套 API 容器运行，Nginx -t 成功；未重启/部署。 |
| HTTPS / 环境保护 | 正式 /health 200；正式入口带 trial 请求头 403；develop/trial 健康检查各 200 且返回对应环境；未知环境 404。五项只读探测通过。 |
| 微信官方 CLI | islogin 在普通沙箱和单次授权后均退出 246，正文明确“IDE service port disabled / 工具的服务端口已关闭”。不是本次网络沙箱造成；未自动开启安全设置。 |

## 待解决与范围边界
1. 用户手动打开微信开发者工具，设置 → 安全设置 → 开启服务端口，并扫码登录；之后复测官方 CLI、项目打开、自动化连接、截图。此前 islogin=true 但 auto 返回 code 10，不能仅凭缓存登录标志验收。
2. 非生产微信真实登录：上一轮确认独立 develop/trial 未配置 AppSecret，且测试身份接入方案未确定。本轮未读取生产密钥、未变更认证配置。工具通畅不等于业务登录配置已完成；密钥不应通过聊天传递。
3. 本机 Node 22 与 CI/Docker Node 24 不一致；本轮全部现有检查通过，尚未在本机验证 Node 24。没有为诊断擅自替换全局运行时。
4. Figma 原生 AI 面板、图片生成、微信上传/选体验版、Git push 等有副作用或成本的能力，本轮未靠实际发布/生成/上传进行探针。MCP 编辑已实测；上轮图片生成成功不能冒充本轮全能力测试。无关连接器不纳入本项目就绪门禁。
5. 本轮未读写生产业务数据，也未变更服务器部署、正式发布或体验版选择。

## 为什么出现拒绝
- **沙箱边界**：当前会话 workspace-write、网络受限。SSH 的 Operation not permitted、Docker socket permission denied、测试 listen EPERM 经具体单次授权后均成功。这类拒绝不代表工具坏了。
- **自动审批明确否决**：上一轮脚本拟读取生产容器 AppSecret 并复制到 develop/trial，自动审核指出跨环境凭据复用风险且缺少具体授权，原脚本未执行。已采用不复制密钥的部署路径，真实登录配置仍待解决。不得换脚本绕过拒绝。
- **外传审核**：上一轮私有球场图片上传 Figma 被拒，缺少该素材/目的地的明确授权；不是 Figma MCP 连接故障。原创生成素材是后续独立执行的替代方案。
- **应用与工程错误**：微信服务端口关闭、此前登录失效、旧容器文件权限错误分别属于应用设置、认证状态、镜像权限；应分别处理，不应统称权限不足。
- **技能流程条件**：此前 Playwright 替代方案等待确认来自 Product Design 技能要求，不是 Playwright 已被测试证明故障。本轮内置浏览器已工作，无需启用该替代路径。

## 配置与实际会话的差异
只读取本地 ~/.codex/config.toml 的非秘密配置键：approval_policy=on-request、approvals_reviewer=user、sandbox_mode=workspace-write。但本任务实际下发的权限是 approvals_reviewer=auto_review。可以确认二者不同；尚未证明是已有任务设置、桌面覆盖还是托管策略造成，不能承诺重启必然修复，也没有修改配置或关闭审批。

官方文档说明自动审批只改变审批者，不扩大网络/文件权限；明确否决与普通沙箱错误不同，须使用实质更安全路径或等待具体授权。
来源：https://learn.chatgpt.com/docs/sandboxing/auto-review

## 可追溯本地证据
- /tmp/cq-diagnostics-context-20260925.txt
- /tmp/cq-diagnostics-typecheck-20260925.log
- /tmp/cq-diagnostics-tests-20260925.log（首次沙箱失败）
- /tmp/cq-diagnostics-tests-network-20260925.log（授权后通过）
- /tmp/cq-diagnostics-build-20260925.log
- /tmp/cq-diagnostics-http-20260925.py（仅五项 GET 健康探测）
- Figma 与 CUA 证据保存在本任务工具回执中。
