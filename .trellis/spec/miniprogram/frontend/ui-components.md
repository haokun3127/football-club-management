# 原生通用组件合同

## 1. Scope
2026-10-21，用户批准v1.1双端统一UI后适用。TDesign原生包锁定1.17.0；不引入UniApp或Web框架。主题运行源是styles/tokens.wxss。

## 2. Signatures
Button bindtap保留业务dataset；Input/Textarea的原bindinput迁为bindchange，读取event.detail.value；Switch以value替代checked，change仍读boolean。role-tabbar的官方change读取detail.value，再查本地注册清单导航；不接收任意URL。

## 3. Contracts
官方npm构建：wechatide -c Codex build_npm --project <小程序绝对目录>。miniprogram_npm为忽略的生成物，清洁检出需安装锁定依赖并官方构建。微信开放能力button允许保留原生事件链；不得为统一外观删除授权回调。CheckTag使用显式content属性，不同时提供重复slot文本。

## 4. Validation / errors
TDesign1.17的CheckTag默认content=null在本机基础库3.17.3会在slot文字后显示null；传明确字符串。新增npm组件后，热重载/旧编译缓存可能留空页面；冻结源码、必要时仅清编译缓存、官方整包auto后重建页面。清Storage/Auth不是修复模板的步骤。

## 5. Cases
Good：data-id与change一起传递到原处理器，受控value更新；Base：缺平台能力时保留薄原生封装；Bad：把官方Input仍绑定input事件，或把新增组件安装成功视为原生验收。

## 6. Tests
保留既有控制器业务测试；底栏验证合法key导航、当前key/未知key不导航。原生代表页确认输入事件更新真实字段、底栏安全区及标签文字；选择组件须读实际画面，不只读data。字体断言检查批准的语义token，不恢复旧画板的小字号。

## 7. Wrong / correct
Wrong：在每页散写按钮尺寸、缺测用0、未知球队回默认队。Correct：使用统一token及官方组件状态，数据语义继续由业务适配/服务端合同负责。完整产品范围见本轮任务，不把尚未实施的B2～B6当成已落地规范。
