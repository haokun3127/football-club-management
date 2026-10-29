# CQ 第二轮独立只读审计

日期：2026-10-30（香港时间）。明确目标 SHA：`7407bd09d674f5c946df9a68ef6177f644adca25`。

审计工作区 `/Users/dongjun/.codex/worktrees/050c/football-club-management` 从干净状态切到该提交，结束仍干净。产品代码、任务记录、共享 specs 均未修改；无 push、部署、上传或真实业务库写入。验证副本由该 SHA 的 `git archive` 导出到 `/tmp/cq-audit-7407bd09`；只复用现有安装依赖，Node24。API 配置将 domain 别名到此固定副本的源码。本报告不是对未来最终集成 SHA 的验收。

## 新确定问题 R2-01 / P2：同 generation 的成长重试迟到后覆盖较新结果

位置：
- `apps/miniprogram-cq-talent/pages/parent/home/index.ts:209-213`：`loadGrowth` 只比较页面 generation，无模块请求序号。
- 同文件 `:139`：档案刷新完成后自动启动成长刷新；`:298-300`：手动重试使用当前相同 generation。

真实可达触发：
1. 当前孩子档案已就绪，成长模块此前读取失败，页面保留“重试成长统计”。
2. 返回首页触发同身份保留内容刷新；新的 generation 已开始，孩子列表请求仍未返回，主体和重试按钮继续可用。
3. 用户点击“重试成长统计”，请求 A 使用这个新 generation。
4. 孩子列表返回，`load()` 自动再启动请求 B，也使用相同 generation。
5. B 先返回新确认结果，页面显示新里程碑；A 较晚返回旧快照，generation 校验仍通过，里程碑被覆盖回旧结果。

影响：同孩子、同上下文的首页成长摘要可从新结果退回旧快照，直到再次刷新；不涉及服务端成绩重写。训练累计和日历已有模块 request 序号，成长模块仍缺该保护。新闻/展示也采用 generation 校验，但本轮只将已复现的成长模块列为确定问题。

隔离验证：在当前 SHA 的既有 `parent/home/index.test.mjs` 副本末尾增加一个测试，按上述顺序延迟 children 和 A，再让 B 返回 `new confirmed result`；断言页面先显示新值，然后 A 返回时实际退回 `older result`。测试通过说明错误行为复现，不表示已修复。

探针绝对路径：`/tmp/cq-audit-7407bd09/apps/miniprogram-cq-talent/pages/parent/home/index.test.mjs`。测试名：`round2 audit: observes older same-generation growth retry replacing a newer automatic refresh`。

在 `/tmp/cq-audit-7407bd09/apps/miniprogram-cq-talent` 运行：

```sh
/opt/homebrew/opt/node@24/bin/node /Users/dongjun/projects/football-club-management/node_modules/vitest/vitest.mjs run pages/parent/home/index.test.mjs
```

结果：35/35 通过（34 个当前既有测试 + 1 个错误行为探针）。日志 `/tmp/cq-round2-home-probe.log`。

## 指定修复核对

### 空值修复

`pages/coach/training-assessment/index.ts:254-272` 现先检查去空格的字符串。仅备注无分数会阻止保存；清空已保存分数会阻止保存；真正输入 `0` 可正常保存。非法/小数值不再静默跳过后仍提示整次成功；保存中输入被保护。当前定向回归通过，未发现该修复的新确定缺陷。未把第一轮课堂并发/CAS/部分写入问题当成本轮已修复。

### 家长保留内容、身份和迟到响应

同身份/同孩子刷新保留当前卡片和已读取值，失败有上次内容提示，真实零累计保留；换孩子或 club/client/user 身份时同步清空旧内容，旧 generation 的成功/失败不覆盖新孩子，卸载后响应被忽略。当前对应回归通过。R2-01 是同 generation 的重叠请求缺口，与上述跨 generation 保护不同。

### 本地 image ID 与清单

- `scripts/delivery/start-environment.mjs` 同时接受完整本地 `sha256:<64hex>` 与 `repository@sha256:<64hex>`；init/runtime 必须同 image；目标卷、数据库目录、依赖、端口范围受检验。
- main 在打印安全计划/启动前回读 image inspect，本地 ID 必须与回读 ID 相同；不会把 local image ID 写成 registry digest。
- `scripts/delivery/create-manifest.mjs` 以 candidate image ID 和 inspected ID 一致为前提，分别记录 imageReference/imageId/repositoryDigest；本地 ID 的 repositoryDigest 为 null。缺失 build timestamp、损坏 inventory、空 receipt 等已有拒绝回归通过。
- 现有制品/启动测试 5/5 通过，包括真实 `docker compose config` 只读渲染、独立环境镜像/卷及本地 ID 配置。
- 另用 `/tmp` 的假 Docker 可执行程序补测 main 的三个子进程分支：dry-run 同 ID 成功；inspect 不匹配时在启动前退出 1；模拟 apply 只派发 develop-data-init 与 develop，带 no-deps/no-build/pull never。该探针没有访问真实 Docker daemon，更没有实际启动或改动服务。

CLI 探针：`/tmp/cq-round2-delivery-cli-probe.mjs`，命令 `/opt/homebrew/opt/node@24/bin/node /tmp/cq-round2-delivery-cli-probe.mjs`。结果 `/tmp/cq-round2-delivery-cli-result.json`。主脚本从副本的规范 `/private/tmp/...` 路径执行，避免 `/tmp` 符号链接造成 Node entrypoint URL 比较不匹配的夹具问题。

## 领域清单与实际迁移边界

审查 `docs/current/product-domain-map.json` 和 `.md`，未发现实质归属错误。

独立在 Node24 `DatabaseSync(':memory:')` 顺序执行目标提交的 45 个 SQL 迁移，再按 SQLite 实际最终 schema 比较，而非只数 CREATE TABLE 文本：

- 实际最终业务/机制表：104；声明：104。
- 遗漏、额外声明、重复归属：均为 0。
- 45 个迁移全部列出，逐文件 SHA-256 与清单一致。
- 所列写入口和验证路径均存在；Markdown 覆盖所有 JSON 表名。
- `schema_migrations` 由迁移器创建，`runtime_environment` 由 runtime-database 创建，单独列为 2 张运行时元数据，与“45 SQL 迁移生成 104 表”边界一致。

语义重点核对：课堂表现仍归训练运营；测评草稿/确认事实归测评；队伍评价独立；正式赛和训练内友谊赛在比赛域但聚合独立；scout 身份与服务工作记录分属基础资料/专业服务；账本不被训练计次驱动；BI 是投影；会话/密钥为机制。`player_metric_records` 目前也是比赛等来源的共享指标载体，存在跨域写入；清单明确“主要所有者”并说明通用 Store/仓储跨域，未将目录位置误当独占权限。不能由该归属清单推断代码已物理拆分或线上表已盘点。

脚本 `/tmp/cq-round2-domain-coverage.mjs`；命令 `/opt/homebrew/opt/node@24/bin/node /tmp/cq-round2-domain-coverage.mjs`；结果 `/tmp/cq-round2-domain-coverage.json`。

## 本轮验证台账

全部针对 `7407bd09` 的独立副本，不借用过去测试冒充本轮证据：

- 客户端：coach/training-assessment、assessment-bulk-entry；parent/home、event；utils/request、version，6 文件 136 项通过。日志 `/tmp/cq-round2-client.log`。
- R2-01 追加探针后：parent/home 35 项通过。日志 `/tmp/cq-round2-home-probe.log`。
- 平台交付工具：artifacts/start-environment 5 项通过。日志 `/tmp/cq-round2-delivery.log`。
- 假 Docker CLI 分支：3 项通过。结果 `/tmp/cq-round2-delivery-cli-result.json`。
- 当前版本 API：build-info 定向测试，见 `/tmp/cq-round2-build-info.log`。
- 领域覆盖：45 迁移 / 104 表唯一归属、路径/哈希/Markdown 核验通过。

客户端命令形式：Node24 加现有主目录 `node_modules/vitest/vitest.mjs run <files>`，cwd 是副本 apps/miniprogram-cq-talent。API 使用相同 runner，加 `--configLoader native --config /tmp/cq-audit-7407bd09/api-audit.config.mjs`，cwd 是副本 apps/api。交付工具：副本根目录运行 Node24 `--test scripts/delivery/artifacts.test.mjs scripts/delivery/start-environment.test.mjs`。

## 限制与后续固定 SHA

按总控要求，本轮不重复列尚在开发中的平台 CAS、排序、原子写修复和教练 C01；也未将其标记通过。没有运行全仓 check:delivery，没有实际镜像构建/迁移/启动/部署/微信编译/上传，没有真机或原生画布交互、键盘、大字、现场规模/性能和真实账户回读。后续真正完成的集成 SHA 需要重新固定并验证。
