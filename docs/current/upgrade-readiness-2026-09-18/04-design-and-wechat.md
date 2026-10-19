# 设计系统、交互和微信适配

Figma 文件：https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs 。通过 Figma MCP 的可编辑节点、变量、组件和原型能力，由 AI 直接生成设计。没有宣称使用不可用的 Figma Make 或原生一键 AI 插件。所有数字、姓名和场景均为合成示例，带“演示”或设计说明。

## 1. 视觉与布局
沿用源码品牌色 #A80F1B、按压 #7F0B14、品牌浅底 #FCEEEF；页面 #F6F7F9、卡片白、正文 #202124、次级文字 #667085。红色承担品牌与主操作，成功/警告/错误保留语义色并配文字，不仅靠颜色辨识。采用原生系统字体；Figma 用可用 Noto Sans SC 作中文设计替代，实施时需检查系统字体字宽。

44 个变量分 primitive/semantic/dimensions，7 个文字样式，按钮、输入框、徽标、导航、业务卡片组件可复用。375逻辑像素基准：页面边距16、分组16—24、卡片圆角12、按钮48高。字号12—32是设计候选，非微信官方强制尺寸。正文15/行高24；重要操作触区目标48，文字可换行。后台基准1440×1024、主导航224、内容区留白32，主要操作与数据表清楚区分。

首页采用学员/里程碑轮播区、俱乐部 Banner、四个可自定义快捷入口；成长只比较个人历史和适用标准。训练页突出安排与请假，不引入逐课评价或打卡审批。教练工作页优先课程准备、异常及测评。后台按数据管理、评测与模型、BI、专业服务组织，工作台和设置为公共入口。

2026-09-20 目标补充：当前小程序不展示课包余额、扣减及余额提醒，后台能力保留；战术板改自由拖入/移动/拖回名单，不选阵型、不固定人数；测评显示原始成绩、整数分值、等级及所选课程。已有画布尚未同步，详见 [16号规格](16-confirmed-rules-and-engineering-spec.md)。

## 2. 关键行为
- 请假：选孩子和课程 → 提交 → 立即生效。失败保留输入，重复提交返回同一结果。
- 课次修正：看当前来源 → 修改 → 直接保存；409 显示服务器版本与本次修改供核对。历史可见，恢复原值也有记录。
- 测评：按人或项目分批录入、逐项选实际训练课、服务器确认保存；个人齐全后确认。过期周期提示补录，不能锁死；不测评与缺测分开。修订前后已发布版本可查。
- 导入：类型 → 映射 → 校验和影响预览 → 明确确认 → 结果。模板声明全拒绝/部分成功；展示失败原因和幂等重试。
- 模型：配置草稿 → 试算 → 新版本发布。没有标准依据不预填评分公式，不随展示分组重算。
- 服务：咨询、分派、承接、执行、交付各自显示；不模拟已付款。
- 原型是页面跳转演示，按钮不真实提交数据；文本输入、拖动战术板、轮播和权限弹窗的实际运行需实现后验收。

## 3. 微信适配技术契约
现有 app.json 使用原生页面、style v2、requiredComponents。保持原生 TS/WXML/WXSS，不把后台 Web 布局直接嵌成小程序页面。页面拆包与构建体积根据实际增长评估，保持旧 deep link 可迁移。

- 布局以弹性容器、内容宽度约束和必要断点适配。官方当前优先推荐 vw，但同时反对滥用 vw/rpx 的全屏比例缩放；宽度确需随屏变化时再使用。保留现有 rpx，逐页评估，不做机械全量替换。375设计像素/750rpx只是基准，不等同设备物理像素。[WXSS](https://developers.weixin.qq.com/miniprogram/dev/framework/view/wxss.html)
- 系统导航优先原生；自定义导航运行时读取 wx.getWindowInfo（基础库2.20.1起）和 wx.getMenuButtonBoundingClientRect（2.1.0起），做能力检测。胶囊坐标以屏幕左上角为原点、单位px，计算内容位置时区分屏幕与窗口坐标。Figma的44+44是示意，不能硬编码。[窗口](https://developers.weixin.qq.com/miniprogram/dev/api/base/system/wx.getWindowInfo.html)、[胶囊](https://developers.weixin.qq.com/miniprogram/dev/api/ui/menu/wx.getMenuButtonBoundingClientRect.html)
- 安全区由实际窗口 safeArea/系统 inset 推导；官方声明 safeArea 可能缺失，必须有保守回退，不能直接解引用；底部按钮与 TabBar 避开手势条和软键盘。设计中的34底部安全区仅为示例。键盘出现时当前输入和错误信息保持可见，保存状态不能被遮挡。
- 字体随微信设置适配，从 wx.getAppBaseInfo 读取 fontSizeScaleFactor / fontSizeSetting 并检测字段可用性；后者从2.23.4起。320、375、430宽及140%适老化示例用于布局检查，文字换行后容器重排，不能固定高截断。1.4倍只是官方适老化示例，不是全部实际档位；iOS/Android须逐档检查长姓名、项目名和极端数据。[字体信息](https://developers.weixin.qq.com/miniprogram/dev/api/base/system/wx.getAppBaseInfo.html)、[适老化](https://developers.weixin.qq.com/miniprogram/design/elderly.html)
- 图像保留宽高比、加载占位和失败态；分享使用授权普通照片，不抠图换球衣。相册权限只在保存动作请求，拒绝后保留替代路径；系统授权 UI 不伪装成自制弹框。
- 登录不替代隐私授权。管理后台声明实际信息用途；使用隐私接口前检查 wx.getPrivacySetting，提供 wx.openPrivacyContract 入口，通过 agreePrivacyAuthorization 及相应事件同步显式同意（这些能力从2.32.3支持）。拒绝后保留不依赖该信息的功能。平台隐私同意与系统相册权限分层处理；X12指引入口目前是设计占位。[隐私开发指南](https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/PrivacyAuthorize.html)
- 令牌不进入日志；退出及切换角色处理缓存。请求失败有重试与真实保存状态，不能离线显示“服务器已保存”。
- 优先原生组件的无障碍能力，自定义控件补充ARIA标签和状态；不只靠颜色表达。依据适老化建议，检查普通文字4.5:1、大字3:1对比度和至少44pt触区；本项目48逻辑像素为设计目标，仍需真机验证。[无障碍](https://developers.weixin.qq.com/miniprogram/design/accessibility.html)、[适老化](https://developers.weixin.qq.com/miniprogram/design/elderly.html)
- 列表懒加载分页，长表使用逐段/分组；避免一次渲染全部测评人员和所有图表。草稿按项节流保存及带 revision，批量保存展示逐项结果。
- Tab候选：家长：首页/日程/成长/我的；教练：日程/测评/队伍/我的。这是 O-07 的设计候选，非已确认最终导航。
- 后台建议桌面1440、窄桌面1024；窄宽表格优先保留关键列和受控横向滚动，不挤成不可读密集卡片。后台手机完整支持不是当前已确认范围。

## 4. 官方来源核查状态
2026-09-18 已通过新获准的只读HTTP请求取得9份微信官方正文，覆盖设计、WXSS、窗口、胶囊、字体、隐私、适老化、大屏和无障碍；已按差异更新本文与Figma。完整来源、响应哈希及核验边界见 [外部核验](08-external-verification.md) 和 [机器可读证据](external-verification.json)。此前抓取/审批服务失败属于已解除的历史限制。

开发时仍须记录目标基础库和开发者工具版本，检验微信管理后台配置，并用真实设备检查胶囊、安全区、字体、键盘与授权流程。画板与官方正文核对不能替代平台审核、业务接口测试或真机通过证明。
