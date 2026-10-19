# 外部规范与线上服务核验

核验日期：2026-09-18。此前审批服务连接失败和工作区路径问题已解除，本轮获准的只读 HTTP/TLS 请求取得新证据。以下结论只覆盖实际读取内容，不把历史部署记录当成当前服务器状态。

## 微信官方规范

已取得以下 9 份官方正文，均返回 HTTP 200；URL、响应字节数和 SHA-256 见 [external-verification.json](external-verification.json)。日期是本次读取日期，不代表官方发布日期。

| 来源 | 对本项目的影响 |
| --- | --- |
| [小程序设计指南](https://developers.weixin.qq.com/miniprogram/design/) | 保持页面重点、明确导航、及时反馈和可恢复错误；375 设计基准仍可用。 |
| [WXSS](https://developers.weixin.qq.com/miniprogram/dev/framework/view/wxss.html) | 当前正文优先推荐 vw，同时提醒避免滥用 vw/rpx 按屏宽缩放。新增布局以弹性和断点为主，按需使用 vw；不据此批量替换现有 rpx。 |
| [wx.getWindowInfo](https://developers.weixin.qq.com/miniprogram/dev/api/base/system/wx.getWindowInfo.html) | 窗口与安全区以 px 返回；safeArea 可能缺失，必须有回退。基础库起点 2.20.1。 |
| [胶囊位置](https://developers.weixin.qq.com/miniprogram/dev/api/ui/menu/wx.getMenuButtonBoundingClientRect.html) | 坐标原点是屏幕左上角，单位 px；自定义导航须转换到正确坐标系。基础库起点 2.1.0。 |
| [wx.getAppBaseInfo](https://developers.weixin.qq.com/miniprogram/dev/api/base/system/wx.getAppBaseInfo.html) | 字体信息从应用基础信息读取，区分 fontSizeScaleFactor 与 fontSizeSetting；接口起点 2.20.1，后者字段起点 2.23.4。 |
| [隐私协议开发指南](https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/PrivacyAuthorize.html) | 先配置实际使用的信息声明，再取得并同步显式同意，才能调用对应隐私接口。登录不替代隐私授权；相关授权接口从 2.32.3 支持。 |
| [适老化设计](https://developers.weixin.qq.com/miniprogram/design/elderly.html) | X15 改为 1.4 倍适老化示例，间距保持稳定并重排内容；实际验收仍覆盖 iOS/Android 微信不同字体档位。 |
| [大屏适配](https://developers.weixin.qq.com/miniprogram/design/adapt.html) | 大屏按内容宽度重排并考虑鼠标键盘，不把整页等比放大。 |
| [无障碍设计](https://developers.weixin.qq.com/miniprogram/design/accessibility.html) | 优先利用原生组件能力；自定义内容补充可访问语义和标签。 |

这些接口版本是兼容性输入，不是本项目最低基础库的最终决定；仍需盘点用户设备和现有构建配置。隐私指引是平台接入要求的核查，不代表已检查管理后台配置或完成法律审查。

## 已同步的 Figma 修订

- 使用说明改为运行时安全区、弹性布局与按需 vw，并注明官方正文已核验。
- X01 删除把继续或登录视为隐私同意的表达。
- X12 增加隐私指引入口、明确同意操作和拒绝返回路径。原型中的指引入口是设计占位；真实页面由 wx.openPrivacyContract 打开，不能把占位当成已接通。
- X15 更新为 140% 适老化示例；已查看 X12、X15 修订后的截图，复查全部 16 个状态画板。当前总计 130 画板、3289 文字节点、568 原型动作，所执行结构规则未发现问题。

## 线上公开服务

> 2026-09-19 更新：已使用项目既有专用 SSH 身份连接生产服务器，核验当前镜像与源码。下文“没有现成 SSH 连接”为当时不完整判断，已更正，见 [服务器代码评估](13-production-code-gap-review.md)。微信后台、备份和运行态业务验收仍未因此完成。


只读请求 [生产健康接口](https://cqtc.pomi.tech/health) 返回 HTTP 200，正文为 `{"status":"ok","service":"@football-club/api"}`；curl 的 TLS 校验码为 0。

使用默认受信任证书与主机名校验的 TLS 连接成功，协商 TLS 1.3；证书覆盖 cqtc.pomi.tech，签发者为 Let's Encrypt YE2，有效期为 2026-08-02 08:33:49 至 2026-10-31 08:33:48 UTC。此结果证明当前公开服务和证书可用，不证明自动续期配置或所有业务接口可用。

## 仍需访问条件的项目

本机 SSH 配置未发现与已记录生产主机匹配的连接。没有猜测登录身份、读取私钥或输出敏感配置。因此以下项目保持未验证：

- 当前 release commit、镜像 digest、容器状态、SQLite 卷与实际 schema、磁盘容量。
- Nginx 配置、证书自动续期、备份存在性与隔离恢复演练。
- 微信管理后台合法域名、隐私声明、实际体验/正式版本及平台审核状态。

后续从已有运维连接或由运维提供不含凭据的核验结果继续；历史 b050391 / 9.7.4 记录不能替代这一步。真机、认证、迁移恢复及 62 条 ACC 属于实现后的验收。本轮未变更产品源码、生产配置或数据。

可访问的公开核验已完成；暂停重复轮询，保留当前任务和检查点，待连接条件或实施阶段变化后继续。
