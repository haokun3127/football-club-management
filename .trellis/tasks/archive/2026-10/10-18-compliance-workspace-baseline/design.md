# 技术设计

## 文档与事实边界
- 官方原文pages和manifest保留；修订的是本项目解释notes/04、notes/05、notes/08及MP-PRIV-002。日期改为已生效的2023-10-17；补全默认官方弹窗，不强制新增自写弹窗或开关。
- notes/08在文首新增2026-10-18复核结论；旧六项状态作为明确标注的历史区保留，错误因果推断当场更正并说明修订。
- 修订内容不能把后台声明已配置、真机已通过、备案已完成写成事实；账号注销与退出登录分别表述。
- 当前状态更新复用docs/current/development-delivery-channel.md，文首增加截至2026-10-18的总览、P0/P1/P2和证据日期；旧阶段记录标为历史，不另建竞争状态文档。

## 统一工作区
- 唯一日常仓库：/Users/dongjun/projects/football-club-management。
- 唯一日常小程序导入目录：该仓库apps/miniprogram-cq-talent。
- Documents同名路径是符号链接；工具曾将它与真实路径分别登记，形成重复入口。
- 工具元数据另记录已不存在的/tmp/fcm-devtools-foundation和/tmp/fcm-assessment-runtime/mini。它们是历史验收入口，不能作为最新源码。
- 六个Codex worktree均未发现小程序project.config.json；它们主要属于旧开发工作，580c尚有六项跟踪文件变更；本次不删除或迁移。
- 当前branch feature/ui-batch-1-p01比dev多两次提交，保持不切分支、不重置、不顺手合并。
- 新增docs/current/development-workspace.md作为路径/副本用途入口；README、docs/README和AGENTS托管块之外增加链接及固定路径规则。
- 计划把主项目团队与私有projectname统一为“重庆天才-主开发”；不更改AppID、基础库、环境映射或编译设置。

## 工具操作边界
- 优先使用官方CLI打开主项目，读取结果；不清理业务缓存、不注销账户、不关闭其他业务项目、不退出整个IDE。
- 现有电脑控制工具因沙箱包含符号链接根目录而启动失败；常规exec同因需获准的命令通道。CLI和项目元数据读取可用。不得把元数据记录冒充当前窗口截图。
- 重复项目记录的移除仅在可靠UI可用并确认只移除记录时执行；本方案先以项目更名、固定打开路径和清单消除歧义，不直接修改运行中IDE缓存JSON。
- 发布快照仅作版本证据，不作为日常工作树；实际上传9.7.5来源939676f325b9，当前HEAD2e8a6d96尚不是新的已上传版本。

## 回退
文档和团队projectname以本次限定diff回退；私有配置先在/tmp保留0600备份。禁止git reset/clean、覆盖其他未提交文档、清理worktree或IDE存储。不触碰生产数据、备案、证书配置或发布状态。
