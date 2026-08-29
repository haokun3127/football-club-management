# 实施计划

1. 读取 domain、API route/schema、前端页面和现有测试，确认比赛事件真实契约。
2. 先补 domain/API/前端对 `foul` 的一致性测试，确认当前失败点。
3. 以最小改动同步 `foul` 类型和标签/草稿校验；不改无关 store/persistence/test 文件。
4. 检查 C6 当前导航，必要时补显式“编辑比赛”入口，并保留真实权限门禁。
5. 运行 C6/C6.1 定向测试、domain/API/miniprogram 类型与全仓门禁。
6. 通过 WeChatIDE MCP 打开真实比赛页和事件页，取得严格 375x812 PNG，检查控制台和网络日志。
7. 做真实保存→重新读取→API 重启后再读取验证；记录证据文件。
8. 若生产能力策略未包含新增事件，使用 `CQ_TALENT_MATCH_EVENT_TYPES` 私有运行时配置追加，不修改测试契约；重启 API 后用真实能力接口回读。
9. 更新 `docs/current/progress.md`，路径限定提交本批文件，之后再单独处理 C7 和双端其他视觉项。
