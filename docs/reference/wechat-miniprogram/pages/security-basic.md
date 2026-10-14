<!-- 来源: https://developers.weixin.qq.com/miniprogram/security/basic/
     抓取: 2026-10-14T14:09:05+0800  字节: 14167  sha256(html): 09a8a1b6c0569488561e84a74a2c8e83abc191f4c6bd3e9f704a4d4195bddbcc
     正文由微信开放文档页面 #docContent 提取，pandoc 转 GFM；改动请重跑 scripts/wechat-docs/fetch-official-docs.py -->

# 开发安全指引

本文档整理了部分小程序开发中常见的安全风险和漏洞，用于帮助开发者在开发环节中发现和修复相关漏洞，避免在上线后对业务和数据造成损失。开发者在开发环节中必须基于以下原则：

1.  互不信任原则，不要信任用户提交的数据，包括第三方系统提供的数据，必要的数据校验必须放在后台校验。
2.  最小权限原则，代码、模块等只拥有可以完成任务的最小权限，不赋予不必要的权限。
3.  禁止明文保存用户敏感数据。
4.  小程序代码（不包括云函数代码）跟传统 Web 应用的前端代码类似，可被外部获取及进行反混淆，重要业务逻辑应放在后台代码或云函数中进行。
5.  后台接口调用以及云函数调用，必须进行有效的身份鉴权。

文档将分 2 个部分：

- [常见风险及开发建议](https://developers.weixin.qq.com/miniprogram/security/basic/risk)：盘点开发者常见的小程序风险，并给出对应的建议；
- [平台通知消息](https://developers.weixin.qq.com/miniprogram/security/basic/listen)：盘点微信平台推送的各种通知消息，包括消息内容介绍和触发场景。
