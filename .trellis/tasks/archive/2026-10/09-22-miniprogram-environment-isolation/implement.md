# 执行与证据

已获用户授权：创建并推进；先设计再实现，不操作生产或发布状态。已审阅 PRD 收敛版与设计，使用 Codex inline。

- [x] 读取现有配置、部署记录、平台快照和受影响规范，保留原有 31 项改动。
- [x] 形成 PRD / design / implement 并审阅。
- [x] 激活任务；实现客户端固定映射、严格 env 识别、缓存命名空间与标记。
- [x] 实现服务端请求门禁、启动/迁移库归属防护。
- [x] 新增隔离 Compose、Nginx 模板和安全运维说明。
- [x] 编写环境/请求/临时文件数据库测试，证明拒绝不写入。
- [x] 执行 pnpm check、pnpm build、node scripts/miniprogram-policy/check.mjs、node --test scripts/miniprogram-policy/check.test.mjs、git diff --check。
- [x] trellis-check 全范围审查；trellis-update-spec 固化契约；记录验证结果及未部署边界。

## 风险与恢复点
不使用真实凭据/数据库。测试文件放 OS 临时目录，构建在项目真实路径 /Users/dongjun/projects/football-club-management。既有未提交文件不整文件回滚、不混入本任务提交。任何部署/小程序发布需另行明确授权，本轮到可审查、可验证的仓库结果为止。

## 最终状态 / 后续

- 2026-09-22：代码、规范、部署候选、自动化验证完成；不代表线上隔离已经启用。
- `pnpm check`：通过（domain 23、API 156、小程序 515；小程序另 1 跳过）。
- `pnpm build`：通过；真实构建入口验证见 `node scripts/verify-environment-startup.mjs`。
- 平台规则自测 3/3 通过；报告仍有 84 项已有问题（urlCheck 1、基础库 1、废弃 API 2、打包排除 79、原始体积预警 1）。新增测试文件已排除，没有新增报告项。
- 非生产 Compose 已用 /dev/null env 文件解析并断言隔离卷、loopback 端口与环境匹配；没有启动 Docker 容器。本机无 Nginx，nginx -t 未执行。
- 最后审阅确认请求门禁先于幂等处理；数据库检查先于迁移/seed；正式默认不 seed；本地 smoke 在 health 环境不符时停止。
- 未做线上/微信真机验证，未部署、未触碰生产数据或发布状态。没有改动 Git 发布分支、没有 push。
- Trellis 状态保留 in_progress，待 Phase 3.4 用户确认提交范围后再 finish-work 归档/写入 journal（其脚本会自动提交，不在本轮擅自执行）。
- 下一步：审阅 commit-plan.md；若获提交授权，重新核对混合文件，不能包含用户既有改动。服务器部署与小程序发布需要另外明确授权。
