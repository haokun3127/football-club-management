# B. 版本一致性报告

代码验证基线：`68921a8d759501a0a26456f25373c543b5d74b2e`。本报告之后仅文档/治理提交不改变已测代码；最终仓库SHA由提交后的独立回执记录，避免把文档自身SHA写入自身造成循环提交。最终回执位置：`/private/tmp/fcm-post-optimization-audit-20261021/final-receipt.json`，最终答复也列出相同完整SHA。

| 环境 | 已取得证据 | 边界 |
| --- | --- | --- |
| 本地Git | `/Users/dongjun/projects/football-club-management`，`feature/ui-batch-1-p01`，代码基线 `68921a8d759501a0a26456f25373c543b5d74b2e`，修复提交后工作区干净 | Documents为符号链接，不作为第二开发目录；其他worktree保留 |
| GitHub | `origin`=`https://github.com/haokun3127/football-club-management.git`；同名分支首次正常push后ls-remote回读 `68921a8d759501a0a26456f25373c543b5d74b2e` | fetch时origin/dev=`3fcaa7743162b2cfe8de3410251ced4011eddc6e`，无远端独有提交；代码基线比dev多55提交。dev/master没有改动；最终文档提交再push/回读 |
| 微信开发者工具 | stable安装；项目绝对路径 `/Users/dongjun/projects/football-club-management/apps/miniprogram-cq-talent`；已project_import登记并open；AppID `wx4c588cd106e520e0`，miniprogramRoot `./`、基础库3.17.3 | project_list仍有旧Documents记录/临时项目，本轮未擅自移除。操作全部指定规范主目录 |
| 原生重建 | cleanCompileCache→官方 `cli auto --project ... --trust-project` exit0/✔auto；P08 WXML编译成功；运行P08和C34读回新行为；最后恢复登录页，error过滤为空 | refresh成功本身不作为编译成功。合成渲染不证明真实API或真机验收 |

小程序Git子树：`ed5614228f5e1f70d7ca050d9e0b1f37197d2753`。最终回执应再次确认这个子树与源码工作区未变，记录最终HEAD、ls-remote、编译exit、项目路径和运行路由；三者均核对后才宣告源码版本对齐。微信IDE没有独立Git提交标识，证明链为**指定主目录→工作区与Git相等→清编译缓存→官方编译成功→运行新行为**，不虚构IDE返回了SHA。

本轮不更新体验版或服务器部署；它们不属于这次“本地/GitHub/IDE”三端源码一致性的含义。历史9.7.5/939676f部署事实不能写成这次新代码已上线。GitHub当前工作流只自动监听dev/master及PR；本轮本地门禁通过不能伪称同SHA云CI通过，云CI实际结果以最终回执为准。

复现步骤：Node24/pnpm10.33.0安装冻结锁→`pnpm check:delivery`→`pnpm check:miniprogram-policy`逐条解释→`git diff --check`→核对当前分支/远端→正常push→`git ls-remote`→指定主项目清编译缓存和官方CLI auto→检查控制台/目标页面。不得清登录存储或用旧临时副本代替主项目。
