# 追加正确性修复（2026-10-30总控明确授权）

CQ-00保持独立提交0d4fa222及之前批次；CQ-23暂缓。此追加只改平台/API/公共utils与测试，不改coach/parent pages或共享specs。

## A02：同课程更正发布回读

审计探针 `/tmp/cq-audit-41f615d7/apps/api/test/independent-audit.test.ts` 已实际证明旧9901=100排在新10000=60前。先移植为期望新事实的回归并观察失败，再修持久层同发生时间排序。使用事实createdAt作为记录时间，极端同毫秒再按SQLite追加顺序；不赋予字符串ID时间语义。内存store按同样的发生时间/记录时间/追加顺序输出，父母latest/overall/peer与教练投影复用该顺序。覆盖100→60、同毫秒、重开，不改变发生时间优先和修订草稿可见性规则。

## A03/A04：课堂表现整批原子保存和并发

总控明确同意事件级integer revision，GET快照返回revision；PUT显式expectedRevision、全部行先校验，事务内CAS和整批写入。新的event revision表与既有training_content_assessments事实自然键并用；不创建另一套课堂工作流。缺版本428、过期409、任一非法行400均零业务写入；持久层失败回滚全部行和revision。现有授权/内容/已到范围门禁保留。

这是防止覆盖所必需的旧写兼容例外：旧URL和GET可用；无版本旧PUT明确要求更新客户端，不自动读取新revision重试。公共函数第三参数expectedRevision?:number保留旧调用的编译兼容，但缺值本地拒绝；服务端独立拒绝。GET客户端revision可选兼容旧服务，页面由教练线程接入。复用HTTP幂等缓存和SQLite事务队列，响应丢失后同key重试返回原结果而不重新覆盖；即使缓存不可用，旧revision仍拒绝。

验证：先复现A02和后行非法部分写入；新增双快照冲突、并发、重开、旧PUT428、触发器故障回滚、幂等重试/他人后续更新保留、OpenAPI和公共utils参数测试。按修改范围运行API/domain/小程序类型及全套相关测试，最后diff审查。集成/页面/真机/部署由总控，不归档任务。
