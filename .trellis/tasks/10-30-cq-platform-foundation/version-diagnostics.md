# 版本诊断接入与验收

## 小程序公共组件

组件路径：`apps/miniprogram-cq-talent/components/version-info/index`。教练/家长owner只在既有account页注册并放入，不新增路由：

```json
{ "usingComponents": { "version-info": "/components/version-info/index" } }
```

```xml
<version-info />
```

默认折叠，挂载时不读取服务；用户展开/刷新才调用getServiceVersion，展开时同步显示getClientVersion。再次折叠/卸载后丢弃迟到响应；错误只显示安全重试说明。没有业务写入、强制升级或周期轮询。读取失败仍保留本机版本；旧服务/未盖章版本显示“版本待确认”，不伪造0、SHA或把API当小程序版本。

沿用TDesign Button/Loading及既有16px正文、14px辅助、44px触控token；完整SHA可换行。未在此worktree导入微信工具；主目录原生组件画布、375/430宽度和真机读屏由总控验收，控制器/模板测试不代替原生渲染。

## 后台

现有账号区增加“版本信息”按钮，打开AntD Modal，不新增路由或业务导航。打开/刷新才请求本环境health（credentials omit/no-store/redirect error），不影响登录或普通业务读取。失败可重试，关闭/卸载中止读取，忽略迟到响应。

“当前已加载的后台包”从本次HTML加载时的白名单bootstrap build读取；“服务端”由显式GET /health读取，二者不互相补值。缺元数据为未知。本地fixture没有正式构建盖章，因此显示未知是预期；实际制品identity由Docker构建生成。对外仅buildId/sourceRevision/builtAt，不输出私有配置、路径或凭据。

## 验证边界

组件/工具单测及完整交付门禁见implement.md。后台通过仓库disposable local-fixture、随机一次性账号与真实cookie认证验证；无业务客户库。浏览器截图/诊断证据保存在本任务research，原始自动化输出位于ignored output/playwright与.playwright-cli；结束时关闭本会话浏览器并删除fixture临时库/凭据。

CQ-00的b51bfbb3本地候选仅证明此前平台打包链路，不包含后续a5bfc404/2eb8518c及版本UI，不能作为全部修复的最终部署镜像。总控必须在集成最终SHA重新构建并回读。
