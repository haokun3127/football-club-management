<!-- 来源: https://developers.weixin.qq.com/miniprogram/dev/api/base/system/wx.getDeviceInfo.html
     抓取: 2026-10-14T14:09:05+0800  字节: 452217  sha256(html): 36edc7752a4b69d5a193cf326b1aba2a2c05fe5eb21a3b02eb2634a028dd2c0d
     正文由微信开放文档页面 #docContent 提取，pandoc 转 GFM；改动请重跑 scripts/wechat-docs/fetch-official-docs.py -->

# Object wx.getDeviceInfo()

> 基础库 2.20.1 开始支持，低版本需做[兼容处理](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html)。

> **小程序插件**：支持，需要小程序基础库版本不低于 [2.21.3](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html)
>
> **微信 Windows 版**：支持
>
> **微信 Mac 版**：支持
>
> **微信 鸿蒙 OS 版**：支持

## 功能描述

获取设备基础信息

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
<td>abi</td>
<td>string</td>
<td>应用（微信APP）二进制接口类型（仅 Android 支持）</td>
<td></td>
</tr>
<tr>
<td><em></em></td>
<td>deviceAbi</td>
<td>string</td>
<td>设备二进制接口类型（仅 Android 支持）</td>
<td><a href="https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html">2.25.1</a></td>
</tr>
<tr>
<td><em></em></td>
<td>benchmarkLevel</td>
<td>number</td>
<td>设备性能等级（仅 Android 支持）。取值为：-2 或 0（该设备无法运行小游戏），-1（性能未知），&gt;=1（设备性能值，该值越高，设备性能越好，目前最高不到50） 注意：从基础库3.4.5开始，本返回值停止维护，请使用<a href="https://developers.weixin.qq.com/miniprogram/dev/api/base/system/wx.getDeviceBenchmarkInfo.html">wx.getDeviceBenchmarkInfo</a>获取设备性能等级</td>
<td></td>
</tr>
<tr>
<td><em></em></td>
<td>brand</td>
<td>string</td>
<td>设备品牌</td>
<td></td>
</tr>
<tr>
<td><em></em></td>
<td>model</td>
<td>string</td>
<td>设备型号。新机型刚推出一段时间会显示unknown，微信会尽快进行适配。</td>
<td></td>
</tr>
<tr>
<td><em></em></td>
<td>system</td>
<td>string</td>
<td>操作系统及版本</td>
<td></td>
</tr>
<tr>
<td><em></em></td>
<td>platform</td>
<td>string</td>
<td>客户端平台</td>
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
<td>ios</td>
<td>iOS微信（包含 iPhone、iPad）</td>
</tr>
<tr>
<td>android</td>
<td>Android微信</td>
</tr>
<tr>
<td>ohos</td>
<td>HarmonyOS 手机端微信</td>
</tr>
<tr>
<td>ohos_pc</td>
<td>HarmonyOS PC微信</td>
</tr>
<tr>
<td>windows</td>
<td>Windows微信</td>
</tr>
<tr>
<td>mac</td>
<td>macOS微信</td>
</tr>
<tr>
<td>devtools</td>
<td>微信开发者工具</td>
</tr>
</tbody>
</table></td>
<td></td>
<td></td>
<td></td>
</tr>
<tr>
<td><em></em></td>
<td>cpuType</td>
<td>string</td>
<td>设备 CPU 型号（仅 Android 支持）（Tips: GPU 型号可通过 WebGLRenderingContext.getExtension('WEBGL_debug_renderer_info') 来获取）</td>
<td>[2.29.0](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html)</td>
</tr>
<tr>
<td><em></em></td>
<td>memorySize</td>
<td>string</td>
<td>设备内存大小，单位为 MB</td>
<td>[2.30.0](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html)</td>
</tr>
</tbody>
</table>


## 示例代码


``` js
const deviceInfo = wx.getDeviceInfo()

console.log(deviceInfo.abi)
console.log(deviceInfo.benchmarkLevel)
console.log(deviceInfo.brand)
console.log(deviceInfo.model)
console.log(deviceInfo.platform)
console.log(deviceInfo.system)
```
