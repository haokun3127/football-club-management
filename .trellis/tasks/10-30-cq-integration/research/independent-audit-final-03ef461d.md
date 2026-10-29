# 03ef461d 发布前 CI 窄修独立审查

固定提交：03ef461d3c190c273acbbbbd61bdac921f4ea37c。

结论：窄修通过；未发现本次改动的新缺陷。74f3a0e5业务审计结论仍有效。实际GitHub CI重跑结果由协调线程确认，本次不声称已验证该run成功。

## 范围与源码核对

相对74f3a0e5仅 scripts/delivery/start-environment.test.mjs 与平台implement记录变化；应用源码、启动程序、Compose拓扑、CI工作流不变。平台提交7c7f5026与集成03ef461d的受审测试/启动程序/Compose文件完全相同。最终冻结副本上述四文件均与git show 03ef461d逐字节一致；git diff --check通过。

测试不再依赖 --no-env-resolution 跨版本跳过必需env_file存在性校验的假设。原root Compose由copyFileSync复制到owned临时目录，无文本替换；在那里创建合成.env.runtime，再运行普通config --format json。已有startPlan的release镜像、卷、数据库、端口与依赖隔离断言继续执行。新增确认合成环境字段确实加载、启动计划不包含合成秘密值、删除必需env文件后同一配置非零失败。finally清理临时目录。主仓库真实.env.runtime不参与该release渲染。

## 独立执行证据

在最终03ef461d冻结副本 /private/tmp/cq-audit-03ef461d，使用Node24执行原始 scripts/delivery/start-environment.test.mjs：

- 本机Docker Compose v5.5.1：2/2通过，退出0。日志 /private/tmp/cq-audit-03ef-compose-native.log。
- 固定已缓存官方 docker/compose-bin@sha256:e39da8206cc48c6e2c99ce371935eef9d7eff7db600a993fd357de8b75621edf，实际版本回读v2.40.3，指定linux/amd64：2/2通过，退出0。日志 /private/tmp/cq-audit-03ef-compose-v2.log。
- 同一2.40.3执行修复前74f3a0e5原测试副本：1通过、1失败，退出1；失败精确落在Release topology must render without a private env file（预期0实际1），与CI已保存日志一致。日志 /private/tmp/cq-audit-03ef-compose-v2-original.log。该反向探针证实修复确实处理原失败条件。

2.40.3通过一个临时docker命令适配器执行同一Node测试；每次只调用 /docker-compose config，无网络、只读文件系统、cap-drop ALL、no-new-privileges，只读挂载冻结源码与owned合成env临时目录，不挂载Docker socket，不暴露端口，不启动业务服务、不下载镜像。测试容器--rm自动退出；适配器与合成输入目录已删除。只保留冻结源码、原测试反向副本、日志和本报告。

原始测试命令：

    /opt/homebrew/opt/node@24/bin/node --test scripts/delivery/start-environment.test.mjs

## 验证边界

独立执行的是受影响的2项测试在两个Compose版本下的行为，并核对最终补丁；未重跑无变动的业务全套、微信UI或发布操作。Compose2.40.3是已确认可复现旧行为的Linux版本，不将其声称为GitHub runner当次精确安装版本。

74业务审计报告：/tmp/cq-independent-audit-final-74f3a0e5.md（13项定向通过、沿用未变前端44项证据）。本次未新增产品缺陷，不重新打开已修复问题。

未修改主开发源码、任务或规格；未push、部署、上传或操作业务数据。独立审计worktree已对齐03ef461d，干净状态读回。
