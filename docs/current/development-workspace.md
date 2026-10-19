# 重庆天才小程序：唯一主开发入口

> 2026-10-18统一。本文维护稳定路径和操作边界；版本、验证结果和待办统一放在[开发交付现状](development-delivery-channel.md)，不在此重复维护。

## 日常只打开这一套

| 用途 | 入口 |
| --- | --- |
| Codex、WorkBuddy、编辑器的仓库根目录 | `/Users/dongjun/projects/football-club-management` |
| 微信开发者工具导入/打开目录 | `/Users/dongjun/projects/football-club-management/apps/miniprogram-cq-talent` |
| 微信工具项目显示名 | **重庆天才-主开发** |
| 本机日常IDE安装/CLI | `/Applications/wechatwebdevtools.app` / `Contents/MacOS/cli` |
| AppID | `wx4c588cd106e520e0` |

WorkBuddy应直接使用同一个仓库根目录；`/Users/dongjun/WorkBuddy/football-club-minigram`是外部盘点文档目录，不是本项目源码入口。不同工具不要另复制一套源码并继续开发，也不要因名称相同便认为代码一致。

```sh
cd /Users/dongjun/projects/football-club-management
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
git status --short --branch
/Applications/wechatwebdevtools.app/Contents/MacOS/cli open \
  --project /Users/dongjun/projects/football-club-management/apps/miniprogram-cq-talent
```

先确认Git分支和未提交改动，再编辑。项目显示名只便于识别，不是版本或环境证明。本轮运行的是 `wechatwebdevtools.app`，不要为同一个项目再启动另一套 `wechatwebdevtools-stable.app`。现有脚本若优先选到旧安装，可显式设置 `WECHAT_DEVTOOLS_CLI=/Applications/wechatwebdevtools.app/Contents/MacOS/cli`。IDE HTTP端口和Automator端口应实时解析，不能照抄旧记录的端口。

2026-10-18：用户开启当前IDE的服务端口后，上述官方CLI打开成功。工具项目元数据读回 `projectpath` 为主目录、`projectname` 为“重庆天才-主开发”、AppID一致。本轮没有修改IDE缓存；2026-10-19经官方project_remove任务结果和project_list读回确认：Documents重复记录已移除，当前列表只有一条重庆天才主路径；失效/tmp目录不在当前列表。其他三个应用项目保留。列表仍缓存旧名miniprogram-cq-talent，配置/窗口名为“重庆天才-主开发”，辨认时以真实路径为准；这不是可见窗口截图。

## 为什么开发者工具里有多套

| 路径/类别 | 2026-10-18盘点 | 处理原则 |
| --- | --- | --- |
| `projects/football-club-management/apps/miniprogram-cq-talent` | 当前真实主目录 | 唯一日常入口 |
| `Documents/football-club-management/apps/miniprogram-cq-talent` | 符号链接，realpath与上行相同；工具按两条路径分别登记 | 不再导入；重复记录可在项目列表“移除”，不要删除源文件或清缓存 |
| `/tmp/fcm-devtools-foundation` | 工具留有记录，目录已不存在 | 历史验收入口，不是最新代码；可移除失效记录 |
| `/tmp/fcm-assessment-runtime/mini` | 工具留有记录，目录已不存在 | 同上 |
| `/tmp`或`/private/tmp`中的发布快照 | 特定提交的构建/上传证据，不保证长期存在 | 发布时按SHA创建、标明用途；不能长期作为日常编辑项目 |
| `~/.codex/worktrees/`中的六个旧工作树 | 未发现上述小程序project.config.json；至少一套有未提交跟踪文件改动 | 全部保留，不能误当作六套最新小程序或批量删除 |

这是项目元数据及文件盘点，不代表枚举了当前所有可见窗口。当前任务不直接改写运行中IDE缓存，不删除任何worktree、源码、业务数据或登录态；其他AppID的项目也不属于本次整理范围。

## 三个环境不需要三套源码目录

同一套源码通过微信 `envVersion` 自动选择：开发者工具/开发版 → develop；体验版 → trial；正式版 → release。URL和缓存边界由 `utils/config.ts` 管理，禁止为体验包手工改成生产地址。

- **当前源码**：工作树与Git分支，可能有尚未上传的改动。
- **已上传体验版**：平台上的特定版本及来源SHA，用手机验收。
- **服务器服务**：API/网页后台镜像及独立数据库，发布状态另外确认。

打开主项目不等于更新体验版；上传小程序不等于部署API。各工具交接记录必须包含真实路径、分支/HEAD、改动是否提交、验收环境和证据日期。

## 重复入口的整理顺序

1. 先确认主项目路径和显示名，保留所有未提交内容。
2. 在可靠的开发者工具项目列表中仅移除上述重复/失效**记录**；不要选择删除项目文件，不清除业务缓存。
3. 只保留主项目作为日常打开入口；历史worktree与发布证据仍保留在原处。
4. 若无法可靠操作或读回项目列表，停止记录清理并在当前任务中说明缺口，不能声称所有旧记录已清除。
