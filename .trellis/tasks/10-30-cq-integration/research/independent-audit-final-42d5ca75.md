# 独立审计：42d5ca75（待创建任务回放修复）

审计固定提交：42d5ca75d096e19e82e28e45f371fc517acc9ade。审计工作区读回 clean、detached HEAD。只读检查仓库；独立探针、导出源码和报告均位于 /tmp。未改主开发源码、Trellis 记录、业务数据库或发布状态。

## 当前结论

尚不能无条件通过：确认 1 个 P2 成功重放回归，已交回平台最小修复。既定的 48 个重放检查点静态核对完成；本轮未证实其他新增问题。静态覆盖计数不等于对所有权限组合的形式证明。

## P2：创建成功后实时名单变动挡住原成功结果回放

位置：apps/api/src/routes/app-client.routes.ts:2810–2812（固定提交42d5ca75）。

操作：教练以 Idempotency-Key 创建 studentIds=[student-1] 的周期任务，得到201与固定任务名单；随后该学员退出实时球队名单，但教练仍具备该球队权限。原任务 /workflow 仍正常200并包含该固定学员。相同 key、相同 payload 重试创建应回放原201，不应重跑新任务资格或新建任务；实际在 invalid_task_students 返回400，未到2812回放检查点。

影响：网络响应丢失后的合法成功重试不能确认已完成操作，客户端会看到失败；若改 key 重试则可能另起任务。当前探针没有进行新 key 重建，也未观察重复写入。

修复边界：当前身份、球队权限继续在回放前确认；实时名单、来源课程资格等“创建新任务”校验应在缓存未命中时执行。不能直接把所有校验移到授权之前。

复现文件：/tmp/cq-audit-42d5ca75/apps/api/test/independent-replay-scopes.test.ts，测试名 audit replays an authorized successful task creation after live roster changes without creating another task。断言期望201、实际400。

## 已通过的最终版检查

- API 六文件：22项，21通过、上述1项失败。原撤销 bearer 401、移除课堂授权403、合法同key不重复课时账本均通过；实际时间排序（含不同时区偏移格式）、同毫秒与ID边界探针通过；课堂批量保存与模板相关用例通过。
- 独立模板预览：缓存曾含目标课程，移除目标编排权限后新预览200且排除目标，旧key回放403，通过。
- 独立模板应用：同key回放原成功、不重写课程修订；移除目标编排权限后403，通过。
- 独立发布：旧成功key不会重复发布或替换后续80分修订；动态任务名单失去学员后403，通过。
- 额外任务创建授权探针：首次201，球队授权撤销后相同key403；恢复授权后原key201/replayed；bearer撤销后401，通过。修复成功重放回归时须保持该拒绝行为。
- 小程序课堂相关三文件44项全通过，包含原语义合并、暂时离开名单的草稿恢复和旧请求跨课程响应独立探针。

API日志：/tmp/cq-final42-api.log；额外创建授权日志：/tmp/cq-final42-task-auth.log；页面日志：/tmp/cq-final42-page-probes.log。

## 检查点核对

用已提供的AST清单脚本对固定导出源码重新运行：53个非backoffice变更路由，48个显式回放检查点，4个有意关闭通用幂等缓存（微信登录一次性凭据、WPS签名nonce、球探自然身份、临时名单特殊协议），1个退役确认接口经授权后410。清单：/tmp/cq-final42-route-inventory.txt。核对其身份/角色、球队/课程/学员守卫与回放/写入次序，重点动态验证发布及模板跨目标权限。没有把AST存在性当作语义授权的充分证据。

通用缓存不再于preHandler直接发送旧结果；到路由授权检查点才查询并回放。onSend只保存已授权且非回放结果；payload冲突或拒绝不会覆盖旧成功记录。backoffice按原单独协议处理，本轮不扩展旧接口的既有角色模型。

## 可复运行命令

工作目录 /tmp/cq-audit-42d5ca75/apps/api：

    /opt/homebrew/opt/node@24/bin/node /Users/dongjun/projects/football-club-management/node_modules/vitest/vitest.mjs run --configLoader native --config /tmp/cq-audit-42d5ca75/api-audit.config.mjs test/independent-final-permissions.test.ts test/independent-final-order.test.ts test/idempotency-authorization.test.ts test/training-content-assessment-batch.test.ts test/independent-replay-scopes.test.ts test/training-templates.test.ts

注意最后添加的“创建任务授权撤销”用例晚于该22项日志，单独运行通过。完整重跑当前此六文件将有23项。

## 边界

以上为固定SHA源码、隔离内存/临时库与页面单测证据。全仓交付门禁、镜像构建、微信开发者工具渲染与真机验证由协调线程负责，本审计未声称覆盖。既往修复不再列为未解决项。等待最小修复SHA后只复验该失败及当前授权拒绝，并更新结论。
