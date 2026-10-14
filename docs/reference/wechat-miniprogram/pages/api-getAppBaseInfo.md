<!-- 来源: https://developers.weixin.qq.com/miniprogram/dev/api/base/system/wx.getAppBaseInfo.html
     抓取: 2026-10-14T14:09:05+0800  字节: 452035  sha256(html): ff15756531e296e377d330679301e7d7465accae21891a47feff0e3d9a4e9381
     正文由微信开放文档页面 #docContent 提取，pandoc 转 GFM；改动请重跑 scripts/wechat-docs/fetch-official-docs.py -->

# Object wx.getAppBaseInfo()

> 基础库 2.20.1 开始支持，低版本需做[兼容处理](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html)。

> **小程序插件**：支持，需要小程序基础库版本不低于 [2.21.3](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html)
>
> **微信 Windows 版**：支持
>
> **微信 Mac 版**：支持
>
> **微信 鸿蒙 OS 版**：支持

## 功能描述

获取微信APP基础信息

## 返回值

### Object


<table>
<colgroup>
<col style="width: 20%" />
<col style="width: 20%" />
<col style="width: 20%" />
<col style="width: 20%" />
<col style="width: 20%" />
</colgroup>
<thead>
<tr>
<th></th>
<th>属性</th>
<th>类型</th>
<th>说明</th>
<th>最低版本</th>
</tr>
</thead>
<tbody>
<tr>
<td><em></em></td>
<td>SDKVersion</td>
<td>string</td>
<td>客户端基础库版本</td>
<td></td>
</tr>
<tr>
<td><em></em></td>
<td>enableDebug</td>
<td>boolean</td>
<td>是否已打开调试。可通过右上角菜单或 <a href="https://developers.weixin.qq.com/miniprogram/dev/api/base/debug/wx.setEnableDebug.html">wx.setEnableDebug</a> 打开调试。</td>
<td></td>
</tr>
<tr>
<td><em></em></td>
<td>host</td>
<td>Object</td>
<td>当前小程序运行的宿主环境</td>
<td></td>
</tr>
<tr>
<td><em></em></td>
<td><div class="table-wrp">
<table>
<thead>
<tr>
<th></th>
<th>结构属性</th>
<th>类型</th>
<th>说明</th>
</tr>
</thead>
<tbody>
<tr>
<td><em></em></td>
<td>appId</td>
<td>string</td>
<td>宿主 app（第三方App） 对应的 appId （当小程序运行在第三方App环境时才返回）</td>
</tr>
</tbody>
</table>
</td>
<td></td>
<td></td>
<td></td>
</tr>
<tr>
<td><em></em></td>
<td>language</td>
<td>string</td>
<td>微信设置的语言</td>
<td></td>
</tr>
<tr>
<td><em></em></td>
<td>version</td>
<td>string</td>
<td>微信版本号</td>
<td></td>
</tr>
<tr>
<td><em></em></td>
<td>PCKernelVersion</td>
<td>string</td>
<td>PC 内核版本号，仅在 PC 端存在该值</td>
<td></td>
</tr>
<tr>
<td><em></em></td>
<td>theme</td>
<td>string</td>
<td>系统当前主题，取值为`light`或`dark`，全局配置`"darkmode":true`时才能获取，否则为 undefined （不支持小游戏）</td>
<td></td>
</tr>
<tr>
<td><em></em></td>
<td><table>
<thead>
<tr>
<th>合法值</th>
<th>说明</th>
</tr>
</thead>
<tbody>
<tr>
<td>dark</td>
<td>深色主题</td>
</tr>
<tr>
<td>light</td>
<td>浅色主题</td>
</tr>
</tbody>
</table></td>
<td></td>
<td></td>
<td></td>
</tr>
<tr>
<td><em></em></td>
<td>fontSizeScaleFactor</td>
<td>number</td>
<td>微信字体大小缩放比例</td>
<td></td>
</tr>
<tr>
<td><em></em></td>
<td>fontSizeSetting</td>
<td>number</td>
<td>微信字体大小，单位px</td>
<td>[2.23.4](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html)</td>
</tr>
</tbody>
</table>


## 示例代码


``` js
const appBaseInfo = wx.getAppBaseInfo()

console.log(appBaseInfo.SDKVersion)
console.log(appBaseInfo.enableDebug)
console.log(appBaseInfo.host)
console.log(appBaseInfo.language)
console.log(appBaseInfo.version)
console.log(appBaseInfo.theme)
```
