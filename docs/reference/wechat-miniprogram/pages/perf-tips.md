<!-- 来源: https://developers.weixin.qq.com/miniprogram/dev/framework/performance/tips.html
     抓取: 2026-10-14T14:09:05+0800  字节: 136314  sha256(html): ed9b89a333a79f3cd1b9b75da1366a4a0177eae9fc1c965ae76ad82b44e48673
     正文由微信开放文档页面 #docContent 提取，pandoc 转 GFM；改动请重跑 scripts/wechat-docs/fetch-official-docs.py -->

# 运行时性能

小程序的运行时性能直接决定了用户在使用小程序功能时的体验。如果运行时性能出现问题，很容易出现页面滚动卡顿、响应延迟等问题，影响用户使用。如果内存占用过高，还会出现黑屏、闪退等问题。

在优化运行时性能前，建议开发者先了解下小程序的[运行环境](https://developers.weixin.qq.com/miniprogram/dev/framework/runtime/env)和[运行机制](https://developers.weixin.qq.com/miniprogram/dev/framework/runtime/operating-mechanism)。

开发者可以从以下方面着手进行启动性能的优化：

- [合理使用 setData](https://developers.weixin.qq.com/miniprogram/dev/framework/performance/tips/runtime_setData)
- [渲染性能优化](https://developers.weixin.qq.com/miniprogram/dev/framework/performance/tips/runtime_render)
- [页面切换优化](https://developers.weixin.qq.com/miniprogram/dev/framework/performance/tips/runtime_nav)
- [资源加载优化](https://developers.weixin.qq.com/miniprogram/dev/framework/performance/tips/runtime_resource)
- [内存优化](https://developers.weixin.qq.com/miniprogram/dev/framework/performance/tips/runtime_memory)
