# 工作区盘点独立复验（2026-10-18）

由 WorkBuddy 会话独立执行，全部为只读检查，与 `research/workspace-inventory.json`（Codex 产出）交叉核对。

## 复验结论

| 主张 | 复验结果 | 证据 |
| --- | --- | --- |
| 主开发目录 `projects/.../apps/miniprogram-cq-talent` | ✅ 成立 | projectname=`miniprogram-cq-talent`，appid=`wx4c588cd106e520e0`（project.config.json 实读） |
| Documents 入口指向同一份代码（重复登记） | ✅ 成立 | `~/Documents/football-club-management` 为符号链接（2026-07-21 创建）→ `/Users/dongjun/projects/football-club-management`；realpath 实测一致 |
| `/tmp/fcm-devtools-foundation`、`/tmp/fcm-assessment-runtime` 已不存在 | ✅ 成立 | `ls -d` 均返回 No such file or directory |
| 本项目相关旧 worktree 共 6 个、均无小程序项目配置 | ✅ 成立（有明细补充） | 见下表 |
| 其中一套仍有未提交改动 | ⚠️ 实际为**两处**，建议都保留 | 见下表 |
| DevTools 登记记录可清理（待 UI 操作） | ✅ 与盘点一致 | 登记散布于 profile 目录 `ls_*.json` / `localstorage_*.json`（见 inventory），leveldb/本地存储不宜脚本直改，支持「待可靠 UI 中移除」的边界 |

## worktree 明细（7 个目录，其中 1 个与本项目无关）

| 目录 | projectname 配置 | 脏文件 | 分支 | 判定 |
| --- | --- | --- | --- | --- |
| 580c | 无 | **6 个**（apps/api 的 types/openapi/schemas/routes/store/server.test） | codex/f-sync-rules-webhook-contract | 有未提交改动，保留 |
| f1b1 | 无 | **1 个**（未跟踪 `docs/chongqing-talent-mini-program-design-spec.md`） | master（旧提交 6a71669f） | 有未提交改动，保留 |
| 7742 / a05a / b71d | 无 | 0 | （空） | 干净 |
| df69 | 无 | 0 | codex/integrate-backend-service-foundations | 干净 |
| 6f97 | — | — | — | **非本项目**（内容为"鬼屋视频"），不纳入本项目统计 |

## 对 Codex 盘点的修正项

1. 脏 worktree 是 2 处不是 1 处（580c + f1b1）。f1b1 的未跟踪设计文档是否需要抢救归档，建议实施时顺手确认。
2. 其余主张全部复验通过，inventory 的 profile/record 粒度比文件系统抽查更精确，可直接作为清理依据。
