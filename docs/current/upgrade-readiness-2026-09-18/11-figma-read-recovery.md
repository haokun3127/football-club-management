# Figma 读取故障与恢复记录

日期：2026-09-18。用户要求解决读取失败；未修改设计内容或业务代码。

## 已验证的结果

通过 Figma 桌面应用的原生 UI 通道，已恢复文件、页面、图层、交互属性和画布截图读取：

- 旧文件 `zZ6wKyOHKcO4UYXDd9jGwv` 加载成功；读取 Parent V6 页面 `1609:2`，包含 V6 日程/成长及 V7 能力模型历史、比赛详情图层。
- 新文件 `EyQtDtILGDZDf6neLBL6vs` 加载成功；读取家长端页面 `6:9`，选中成长画板 `15:30`，成功截图并读到 P09、P14、首页、日程、我的等原型目的地。
- 实际截图已在本次工具结果中检查；没有将旧离线图片或空白加载页当成恢复证据。

**恢复范围是桌面读取通道。云端 Figma MCP 与内置浏览器内容读取仍未恢复，不宣称所有工具修复成功。** 逐页视觉评审可使用桌面通道继续；完整新旧视觉比较尚未在本轮完成。

## 故障证据与处理

1. Figma `whoami` 多次返回 ChatGPT `/backend-api/ps/mcp` HTTP transport error，尚未返回 Figma 文件权限结果，因此不能解释为文件权限不足。
2. 在沙盒外只读检查确认系统代理为本机 `127.0.0.1:7897`。Clash 日志显示 Codex 和 Figma 请求经过原 Seattle 01 节点，存在 session timeout / closed connection。不是没有配置代理。
3. 原节点下，代理访问 Figma 和 ChatGPT 均 TLS 超时；先测试现有 Seattle 02，Figma 可用、ChatGPT 仍失败；再切换到现有 **USA San Jose 01 [Premium]**，Figma HTTP 200，ChatGPT 中转地址可以返回 HTTP 响应。
4. 中转地址的无认证 GET 返回 451，正文 `no_biscuit_no_service`。该探测未带凭据，只证明网络可达；不能据此认定账号、地区或 Figma 权限受限，也不能当作认证后的 MCP 成功。
5. 重置 CUA 会话、重新导航当前任务后，内置浏览器可以列出标签；`getTab`/页面结构读取仍超时。应用日志曾记录该任务 `No ChatGPT browser route is available`，不能仅凭标签列表把浏览器内容读取标为恢复。
6. 切换节点并重新加载 Figma 桌面文件后，旧、新文件都能实际加载。通过桌面文件浏览器打开已有新版，再选中成长画板进行截图和图层/交互回读。

## 变更与后续

- 唯一持久网络设置变更：Clash `Proxies` 选择从 **USA Seattle 01** 改为 **USA San Jose 01 [Premium]**；AI/Final 原有分组引用该选择，未更改分流规则、订阅、TUN 或系统代理开关。此选择可能影响其他使用该分组的应用；如需恢复，可在 Proxies 重新选择原节点。
- 未读取或输出登录凭据，未重新授权连接器，未修改 Codex 配置、文件共享权限或 Figma 内容。
- 原配置中的 `figma_desktop` 地址 `127.0.0.1:3845/mcp` 无服务监听，未启用额外本地服务。
- 云端连接器继续报 transport error，需后续单独重建连接并用真实 Figma 节点验证；不能仅凭网络探测宣称修复。当前无需等待它才能使用桌面通道评审。
- 后续 CUA 首选 `cua.getApp("Figma")`，从现有两个文件标签进入对应页面、选画板并缩放；不要重复对失效的内置浏览器读取通道进行无变化重试。

诊断参考：[OpenAI 插件故障排查](https://developers.openai.com/zh-Hans/plugins/deploy/troubleshooting)。具体根因与恢复范围以上述本机实测为准。
