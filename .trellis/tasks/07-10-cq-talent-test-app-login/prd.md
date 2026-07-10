# 重庆天才测试 AppID 登录与真机验收

## Goal

建立生产形态的微信登录 UI、connector 边界和会话生命周期，并用现有测试 AppID 完成可重复的 DevTools/真机验收准备；没有正式凭证时不得宣称生产登录闭环。

## Requirements

- 启动顺序为 resolve、恢复有效 session、wx.login、登录绑定页。
- 独立登录页使用手机号授权并调用既有 wechat-login。
- 处理 binding_required、拒绝授权、未登记、多身份、无孩子、停用和网络错误。
- API 提供微信 connector 接口及环境配置校验；无凭证返回 binding_required，不信任 roleHint。
- 仅 develop 环境启用本地测试身份；trial/release 不显示身份切换。
- API 地址按 envVersion 选择，trial/release 不使用 localhost。
- session 保存 expiresAt；401 清理 session 并回登录页。
- 测试 AppID 执行 CLI open/preview 和手工验收清单；未登录时明确记录阻塞。

## Acceptance Criteria

- [x] 开发环境可保持测试身份快速联调，体验/正式环境不能进入开发身份路径。
- [x] 登录页能获取 wx code、手机号 code 并处理登录结果。
- [x] 无微信凭证时不会伪造 session 或角色。
- [x] 过期 session 和 401 会清理业务数据并返回登录。
- [x] 环境 API 地址不把 localhost 带入 trial/release。
- [x] 登录契约、类型检查、测试和 smoke 通过。
- [x] DevTools 当前 `login=false`，已记录为 open/preview 与真机验收的唯一外部阻塞。

## Out of Scope

- 正式小程序 AppSecret 下的生产登录闭环。
- 公众号身份、订阅消息和正式发布。
