# 后台框架接入与真实登录执行清单

## 激活门禁
- [x] 用户于 2026-10-10 确认“开始开发”，批准规划实施。
- [x] 前置依赖达到验收；运行 task.py start 激活本子任务。
- [x] 加载 trellis-before-dev 及相关层 spec，核对当前代码与未提交工作。

## 实施
- [x] 固定模板来源与兼容依赖；移除 mock 和示例身份；接入 cookie 会话和统一请求；配置路由/主题/菜单；接入目录；限定构建资源与 HTML 回退；配置 nonce/样式策略；验证真实浏览器和交付包。
- [x] 将实际端点、schema、对象动作、迁移与受影响测试写回设计及验收矩阵。

## 验证
- [x] 真实登录、刷新恢复、五类列表搜索分页、退出后刷新拒绝访问；API/source guard 原有测试通过；各环境 base、公有资源和深链回读；生产构建浏览器 CSP 无错误。
- [x] 运行父任务 implement.md 所列与本变化相关的 API/domain/backoffice 检查；跨边界跑 check:delivery。
- [x] 在隔离浏览器和可销毁真实数据库验证关键交互，检查截图及输入/权限/冲突状态。
- [x] 检查完整子任务差异；trellis-check 和 update-spec；更新最后验证命令、源码状态及缺口。

## 恢复记录
以下为过程恢复记录；当前最终状态以父任务 implement.md 和 docs/current/backoffice-delivery-2026-10-10.md 为准。

## 2026-10-10 框架接入检查
已固定官方模板提交与稳定兼容组合 React 18.3.1、Ant Design 5.29.3、ProComponents 2.8.10、Umi Max 4.7.3。管理端 build/typecheck、请求边界 2 个测试通过；API 后台认证/环境隔离 17 个测试通过。隔离 Chromium 使用临时真实 SQLite 完成登录、刷新恢复、目录导航、搜索空态、退出和退出后刷新。截图 /private/tmp/fcm-backoffice-shell.png 已查看。rc-util 滚动条测量 nonce 补丁后真实表格无 CSP 错误；初次无会话 session 返回 401 为预期。最终根门禁及新增静态资源回归在集成阶段补齐，不宣称全后台完成。

## 2026-10-10 最终本地集成状态
本子任务业务代码与本地检查已完成，详见父任务 BO 验收矩阵和交付报告。全仓 check:delivery 退出0；API228/domain35/小程序563+1skip/管理端2，以及构建与环境启动通过。backoffice实际ESLint通过；规格已同步 backoffice-management.md / backoffice-integration.md。工作树原有282项改动保持；未提交、未归档、未生产部署。最后新增快捷入口的浏览器回读与临时服务清理在父任务收口，不将历史阶段的“待完成”当作当前结论。
