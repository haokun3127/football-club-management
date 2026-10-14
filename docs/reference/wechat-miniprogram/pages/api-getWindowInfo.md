<!-- 来源: https://developers.weixin.qq.com/miniprogram/dev/api/base/system/wx.getWindowInfo.html
     抓取: 2026-10-14T14:09:05+0800  字节: 452302  sha256(html): ab116ea780febad28b62e2b6a179338f0eae6a9af442a86195bc56b36a3c9a21
     正文由微信开放文档页面 #docContent 提取，pandoc 转 GFM；改动请重跑 scripts/wechat-docs/fetch-official-docs.py -->

# Object wx.getWindowInfo()

> 基础库 2.20.1 开始支持，低版本需做[兼容处理](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html)。

> **小程序插件**：支持，需要小程序基础库版本不低于 [2.21.3](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html)
>
> **微信 Windows 版**：支持
>
> **微信 Mac 版**：支持
>
> **微信 鸿蒙 OS 版**：支持

## 功能描述

获取窗口信息

## 返回值

### Object


<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<thead>
<tr>
<th></th>
<th>属性</th>
<th>类型</th>
<th>说明</th>
</tr>
</thead>
<tbody>
<tr>
<td><em></em></td>
<td>pixelRatio</td>
<td>number</td>
<td>设备像素比</td>
</tr>
<tr>
<td><em></em></td>
<td>screenWidth</td>
<td>number</td>
<td>屏幕宽度，单位px</td>
</tr>
<tr>
<td><em></em></td>
<td>screenHeight</td>
<td>number</td>
<td>屏幕高度，单位px</td>
</tr>
<tr>
<td><em></em></td>
<td>windowWidth</td>
<td>number</td>
<td>可使用窗口宽度，单位px</td>
</tr>
<tr>
<td><em></em></td>
<td>windowHeight</td>
<td>number</td>
<td>可使用窗口高度，单位px</td>
</tr>
<tr>
<td><em></em></td>
<td>statusBarHeight</td>
<td>number</td>
<td>状态栏的高度，单位px</td>
</tr>
<tr>
<td><em></em></td>
<td>safeArea</td>
<td>Object</td>
<td>在竖屏正方向下的安全区域。部分机型没有安全区域概念，也不会返回 safeArea 字段，开发者需自行兼容。</td>
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
<td>left</td>
<td>number</td>
<td>安全区域左上角横坐标</td>
</tr>
<tr>
<td><em></em></td>
<td>right</td>
<td>number</td>
<td>安全区域右下角横坐标</td>
</tr>
<tr>
<td><em></em></td>
<td>top</td>
<td>number</td>
<td>安全区域左上角纵坐标</td>
</tr>
<tr>
<td><em></em></td>
<td>bottom</td>
<td>number</td>
<td>安全区域右下角纵坐标</td>
</tr>
<tr>
<td><em></em></td>
<td>width</td>
<td>number</td>
<td>安全区域的宽度，单位逻辑像素</td>
</tr>
<tr>
<td><em></em></td>
<td>height</td>
<td>number</td>
<td>安全区域的高度，单位逻辑像素</td>
</tr>
</tbody>
</table>
</td>
<td></td>
<td></td>
</tr>
<tr>
<td><em></em></td>
<td>screenTop</td>
<td>number</td>
<td>窗口上边缘的y值</td>
</tr>
</tbody>
</table>


## 示例代码


``` js
const windowInfo = wx.getWindowInfo()

console.log(windowInfo.pixelRatio)
console.log(windowInfo.screenWidth)
console.log(windowInfo.screenHeight)
console.log(windowInfo.windowWidth)
console.log(windowInfo.windowHeight)
console.log(windowInfo.statusBarHeight)
console.log(windowInfo.safeArea)
console.log(windowInfo.screenTop)
```
