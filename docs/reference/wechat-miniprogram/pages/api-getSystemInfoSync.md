<!-- 来源: https://developers.weixin.qq.com/miniprogram/dev/api/base/system/wx.getSystemInfoSync.html
     抓取: 2026-10-14T14:09:05+0800  字节: 463494  sha256(html): 0dec6d5b1cf452732368052ecb3f899ca8dd73e6d8f2b2cfec85728c4ed19539
     正文由微信开放文档页面 #docContent 提取，pandoc 转 GFM；改动请重跑 scripts/wechat-docs/fetch-official-docs.py -->

# Object wx.getSystemInfoSync()

从基础库 [2.20.1](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html) 开始，本接口停止维护，请使用 [wx.getSystemSetting](https://developers.weixin.qq.com/miniprogram/dev/api/base/system/wx.getSystemSetting.html)、[wx.getAppAuthorizeSetting](https://developers.weixin.qq.com/miniprogram/dev/api/base/system/wx.getAppAuthorizeSetting.html)、[wx.getDeviceInfo](https://developers.weixin.qq.com/miniprogram/dev/api/base/system/wx.getDeviceInfo.html)、[wx.getWindowInfo](https://developers.weixin.qq.com/miniprogram/dev/api/base/system/wx.getWindowInfo.html)、[wx.getAppBaseInfo](https://developers.weixin.qq.com/miniprogram/dev/api/base/system/wx.getAppBaseInfo.html) 代替

> **以 [Promise 风格](https://developers.weixin.qq.com/miniprogram/dev/framework/app-service/api.html#异步-API-返回-Promise) 调用**：支持
>
> **小程序插件**：支持，需要小程序基础库版本不低于 [1.9.6](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html)
>
> **微信 Windows 版**：支持
>
> **微信 Mac 版**：支持
>
> **微信 鸿蒙 OS 版**：支持

## 功能描述

[wx.getSystemInfo](https://developers.weixin.qq.com/miniprogram/dev/api/base/system/wx.getSystemInfo.html) 的同步版本

## 返回值

### Object res


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
<td>brand</td>
<td>string</td>
<td>设备品牌</td>
<td><a href="https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html">1.5.0</a></td>
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
<td>pixelRatio</td>
<td>number</td>
<td>设备像素比</td>
<td></td>
</tr>
<tr>
<td><em></em></td>
<td>screenWidth</td>
<td>number</td>
<td>屏幕宽度，单位px</td>
<td><a href="https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html">1.1.0</a></td>
</tr>
<tr>
<td><em></em></td>
<td>screenHeight</td>
<td>number</td>
<td>屏幕高度，单位px</td>
<td><a href="https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html">1.1.0</a></td>
</tr>
<tr>
<td><em></em></td>
<td>windowWidth</td>
<td>number</td>
<td>可使用窗口宽度，单位px</td>
<td></td>
</tr>
<tr>
<td><em></em></td>
<td>windowHeight</td>
<td>number</td>
<td>可使用窗口高度，单位px</td>
<td></td>
</tr>
<tr>
<td><em></em></td>
<td>statusBarHeight</td>
<td>number</td>
<td>状态栏的高度，单位px</td>
<td><a href="https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html">1.9.0</a></td>
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
<td>fontSizeSetting</td>
<td>number</td>
<td>用户字体大小（单位px）。以微信客户端「我-设置-通用-字体大小」中的设置为准</td>
<td>[1.5.0](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html)</td>
</tr>
<tr>
<td><em></em></td>
<td>SDKVersion</td>
<td>string</td>
<td>客户端基础库版本</td>
<td>[1.1.0](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html)</td>
</tr>
<tr>
<td><em></em></td>
<td>benchmarkLevel</td>
<td>number</td>
<td>设备性能等级（仅 Android）。取值为：-2 或 0（该设备无法运行小游戏），-1（性能未知），&gt;=1（设备性能值，该值越高，设备性能越好） 注意：性能等级当前仅反馈真机机型，暂不支持 IDE 模拟器机型</td>
<td>[1.8.0](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html)</td>
</tr>
<tr>
<td><em></em></td>
<td>albumAuthorized</td>
<td>boolean</td>
<td>允许微信使用相册的开关（仅 iOS 有效）</td>
<td>[2.6.0](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html)</td>
</tr>
<tr>
<td><em></em></td>
<td>cameraAuthorized</td>
<td>boolean</td>
<td>允许微信使用摄像头的开关</td>
<td>[2.6.0](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html)</td>
</tr>
<tr>
<td><em></em></td>
<td>locationAuthorized</td>
<td>boolean</td>
<td>允许微信使用定位的开关</td>
<td>[2.6.0](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html)</td>
</tr>
<tr>
<td><em></em></td>
<td>microphoneAuthorized</td>
<td>boolean</td>
<td>允许微信使用麦克风的开关</td>
<td>[2.6.0](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html)</td>
</tr>
<tr>
<td><em></em></td>
<td>notificationAuthorized</td>
<td>boolean</td>
<td>允许微信通知的开关</td>
<td>[2.6.0](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html)</td>
</tr>
<tr>
<td><em></em></td>
<td>notificationAlertAuthorized</td>
<td>boolean</td>
<td>允许微信通知带有提醒的开关（仅 iOS 有效）</td>
<td>[2.6.0](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html)</td>
</tr>
<tr>
<td><em></em></td>
<td>notificationBadgeAuthorized</td>
<td>boolean</td>
<td>允许微信通知带有标记的开关（仅 iOS 有效）</td>
<td>[2.6.0](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html)</td>
</tr>
<tr>
<td><em></em></td>
<td>notificationSoundAuthorized</td>
<td>boolean</td>
<td>允许微信通知带有声音的开关（仅 iOS 有效）</td>
<td>[2.6.0](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html)</td>
</tr>
<tr>
<td><em></em></td>
<td>phoneCalendarAuthorized</td>
<td>boolean</td>
<td>允许微信使用日历的开关</td>
<td>[2.19.3](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html)</td>
</tr>
<tr>
<td><em></em></td>
<td>bluetoothEnabled</td>
<td>boolean</td>
<td>蓝牙的系统开关</td>
<td>[2.6.0](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html)</td>
</tr>
<tr>
<td><em></em></td>
<td>locationEnabled</td>
<td>boolean</td>
<td>地理位置的系统开关</td>
<td>[2.6.0](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html)</td>
</tr>
<tr>
<td><em></em></td>
<td>wifiEnabled</td>
<td>boolean</td>
<td>Wi-Fi 的系统开关</td>
<td>[2.6.0](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html)</td>
</tr>
<tr>
<td><em></em></td>
<td>safeArea</td>
<td>Object</td>
<td>在竖屏正方向下的安全区域。部分机型没有安全区域概念，也不会返回 safeArea 字段，开发者需自行兼容。</td>
<td>[2.7.0](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html)</td>
</tr>
<tr>
<td><em></em></td>
<td>
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
<td></td>
</tr>
<tr>
<td><em></em></td>
<td>locationReducedAccuracy</td>
<td>boolean</td>
<td>`true` 表示模糊定位，`false` 表示精确定位，仅 iOS 支持</td>
<td></td>
</tr>
<tr>
<td><em></em></td>
<td>theme</td>
<td>string</td>
<td>系统当前主题，取值为`light`或`dark`，全局配置`"darkmode":true`时才能获取，否则为 undefined （不支持小游戏）</td>
<td>[2.11.0](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html)</td>
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
<td>host</td>
<td>Object</td>
<td>当前小程序运行的宿主环境</td>
<td>[2.12.3](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html)</td>
</tr>
<tr>
<td><em></em></td>
<td>
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
<td>宿主 app 对应的 appId</td>
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
<td>enableDebug</td>
<td>boolean</td>
<td>是否已打开调试。可通过右上角菜单或 [wx.setEnableDebug](https://developers.weixin.qq.com/miniprogram/dev/api/base/debug/wx.setEnableDebug.html) 打开调试。</td>
<td>[2.15.0](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html)</td>
</tr>
<tr>
<td><em></em></td>
<td>deviceOrientation</td>
<td>string</td>
<td>设备方向（注意：IOS客户端横屏游戏获取deviceOrientation可能不准，建议以屏幕宽高为准）</td>
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
<td>portrait</td>
<td>竖屏</td>
</tr>
<tr>
<td>landscape</td>
<td>横屏</td>
</tr>
</tbody>
</table></td>
<td></td>
<td></td>
<td></td>
</tr>
</tbody>
</table>


## 示例代码

[在开发者工具中预览效果](https://developers.weixin.qq.com/s/WkUCgXmS7mqO)


``` js
wx.getSystemInfo({
  success (res) {
    console.log(res.model)
    console.log(res.pixelRatio)
    console.log(res.windowWidth)
    console.log(res.windowHeight)
    console.log(res.language)
    console.log(res.version)
    console.log(res.platform)
  }
})
```


``` js
try {
  const res = wx.getSystemInfoSync()
  console.log(res.model)
  console.log(res.pixelRatio)
  console.log(res.windowWidth)
  console.log(res.windowHeight)
  console.log(res.language)
  console.log(res.version)
  console.log(res.platform)
} catch (e) {
  // Do something when catch error
}
```


## 注意事项

- 当 wx.getSystemInfoSync() 接口发生错误时可能会返回空对象
- wx.getSystemInfo 接口由于会获取系统权限，可能触发授权弹窗，请使用 [wx.getSystemSetting](https://developers.weixin.qq.com/miniprogram/dev/api/base/system/wx.getSystemSetting.html)、[wx.getAppAuthorizeSetting](https://developers.weixin.qq.com/miniprogram/dev/api/base/system/wx.getAppAuthorizeSetting.html)、[wx.getDeviceInfo](https://developers.weixin.qq.com/miniprogram/dev/api/base/system/wx.getDeviceInfo.html)、[wx.getWindowInfo](https://developers.weixin.qq.com/miniprogram/dev/api/base/system/wx.getWindowInfo.html)、[wx.getAppBaseInfo](https://developers.weixin.qq.com/miniprogram/dev/api/base/system/wx.getAppBaseInfo.html) 替代
