# 验证脚本基线（Node 24）— 2026-10-18

执行环境：`/opt/homebrew/opt/node@24/bin/node` = v24.21.0（verify-delivery-config.mjs 硬性要求 Node 24；受管 Node 22 会断言失败退出）。

## 基线输出（实施前，全绿）

### 1. node scripts/verify-delivery-config.mjs

```json
{"gate":"local-delivery-config","passed":true,"node":"v24.21.0","appid":"wx4c588cd106e520e0","libVersion":"3.17.3","urlCheck":true}
```

### 2. node scripts/miniprogram-policy/check.mjs（报告模式）

```
微信小程序规则检查（报告模式）
规则：10 条自动检查 / 27 条总规则
[发现] MP-PKG-002 apps/miniprogram-cq-talent:1 原始文件预算 1.67 MiB 超过预警线 1.50 MiB
汇总：发现 1 项；按规则：MP-PKG-002=1
```

- MP-PKG-002 为已知包体预算预警（盘点报告已记录，余量约 0.5 MiB），**基线即存在，非本任务引入**。报告式 exit 0，不阻断。

### 3. node --test scripts/miniprogram-policy/check.test.mjs

```
pass 3 / fail 0 / skipped 0
```

## 实施后对照要求

1. verify-delivery-config 输出与基线逐字段一致（passed/appid/libVersion/urlCheck）
2. policy check 不新增发现项（MP-PKG-002 可存续）
3. check.test.mjs 保持 3 pass 0 fail
4. `git diff --check` 无空白错误（限本任务文件）
5. project.config.json 与基线快照 diff：仅 projectname 一处变化
