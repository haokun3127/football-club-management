# CQ-00 平台边界与部署制品

2026-10-30用户明确批准[产品优化方案](../10-22-club-experience-redesign/optimization-plan-2026-10-30.md)，包含本子任务、GPT-6.1-sol线程与独立worktree。无需重复请求创建或实施批准。

## 目标与范围

三环境分别固定不可变镜像和初始化目标，构建与启动分离，制品清单与安全版本回读，保持两个发布单元。

## 所有权

API/domain、Dockerfile/Compose、部署与交付脚本、CI、后台；小程序公共 utils、组件、令牌。禁止编辑 coach/parent pages。 不撤销其他工作区/线程的改动。

## 验收

只更新 develop 不影响 trial/release；镜像配置、构建标识、旧响应兼容、缺失元数据行为；API/后台类型与相关 API/脚本/构建启动测试。

继承批准方案的所有业务不变量。功能完成不等于真机或官方上传验证完成。
