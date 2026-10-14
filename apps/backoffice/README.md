# 俱乐部管理后台

基于 Ant Design Pro 官方项目裁剪，来源提交 `4ee65150b7318af933e56267d257bd9fe644fbd4`：https://github.com/ant-design/ant-design-pro 。保留其 MIT 许可于 LICENSE.ant-design-pro。

客户端使用 Umi Max、React 和 Ant Design ProComponents，复用 Fastify 的 `/backoffice/api` 和 HttpOnly 会话。无模板 mock、示例账号、第三方分析或浏览器 token 存储。

`pnpm --filter @football-club/backoffice build` 生成 dist，由 Fastify 同源提供并注入环境路径、nonce 和公开俱乐部选项。先构建再运行本地隔离后台夹具；不要用跨域开发服务器伪造生产登录。Node 24、pnpm 10.33.0 与根项目一致。
