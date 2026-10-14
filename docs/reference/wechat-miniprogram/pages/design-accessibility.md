<!-- 来源: https://developers.weixin.qq.com/miniprogram/design/accessibility.html
     抓取: 2026-10-14T14:09:05+0800  字节: 27739  sha256(html): eda7196ed712049d0ddb5f1ac6ad9917dc84d34a2f02f07ba571e37d84611877
     正文由微信开放文档页面 #docContent 提取，pandoc 转 GFM；改动请重跑 scripts/wechat-docs/fetch-official-docs.py -->

# 小程序无障碍设计指南


## 一、为什么要做无障碍

为了帮助残障人士更加平等便捷地获取、使用互联网应用信息，我们建议开发者结合自身用户群体与使用场景，对小程序进行无障碍适配。


## 二、如何开发无障碍功能

对于界面由微信绘制的接口组件（如[wx.showModal](https://developers.weixin.qq.com/miniprogram/dev/api/ui/interaction/wx.showModal.html)、[navigation-bar](https://developers.weixin.qq.com/miniprogram/dev/component/navigation-bar.html)，微信已经内置了一些无障碍的特性。

对于非原生界面内容，开发者可以添加无障碍标签进行开发，详细信息可参考[aria-component](https://developers.weixin.qq.com/miniprogram/dev/component/aria-component.html)。
