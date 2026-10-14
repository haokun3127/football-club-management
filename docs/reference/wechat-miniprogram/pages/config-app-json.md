<!-- 来源: https://developers.weixin.qq.com/miniprogram/dev/framework/config.html
     抓取: 2026-10-14T14:09:05+0800  字节: 140528  sha256(html): 6e02e8a6b0a94a7bbc91967fff8003a4d44a37520a5ab87f9577812ecfc1da2d
     正文由微信开放文档页面 #docContent 提取，pandoc 转 GFM；改动请重跑 scripts/wechat-docs/fetch-official-docs.py -->

# 小程序配置


## 全局配置

小程序根目录下的 `app.json` 文件用来对微信小程序进行全局配置，决定页面文件的路径、窗口表现、设置网络超时时间、设置多 tab 等。

以下是一个包含了部分常用配置选项的 `app.json` ：


``` json
{
  "pages": [
    "pages/index/index",
    "pages/logs/logs"
  ],
  "window": {
    "navigationBarTitleText": "Demo"
  },
  "tabBar": {
    "list": [{
      "pagePath": "pages/index/index",
      "text": "首页"
    }, {
      "pagePath": "pages/logs/logs",
      "text": "日志"
    }]
  },
  "networkTimeout": {
    "request": 10000,
    "downloadFile": 10000
  },
  "debug": true
}
```


完整配置项说明请参考 [小程序全局配置](https://developers.weixin.qq.com/miniprogram/dev/reference/configuration/app) 。


## 页面配置

每一个小程序页面也可以使用同名 `.json` 文件来对本页面的窗口表现进行配置，页面中配置项会覆盖 `app.json` 的 `window` 中相同的配置项。

例如：


``` json
{
  "navigationBarBackgroundColor": "#ffffff",
  "navigationBarTextStyle": "black",
  "navigationBarTitleText": "微信接口功能演示",
  "backgroundColor": "#eeeeee",
  "backgroundTextStyle": "light"
}
```


完整配置项说明请参考 [小程序页面配置](https://developers.weixin.qq.com/miniprogram/dev/reference/configuration/page) 。
