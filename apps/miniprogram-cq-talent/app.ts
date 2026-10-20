import { restoreAppState } from "./utils/store";
import { registerGlobalPrivacyHandler } from "./utils/privacy";

// 平台侧人工待办（代码无法替代）：在「小程序管理后台-设置-服务内容声明-用户隐私保护指引」
// 声明「收集你的手机号」与「读取你的剪切板」并通过审核，否则对应隐私接口会被平台直接禁用。
App({
  onLaunch() {
    restoreAppState();
    // 全局隐私授权处理（官方弹窗协议）：未同意隐私协议前，
    // getPhoneNumber / setClipboardData 等隐私接口不会被实际执行。
    registerGlobalPrivacyHandler();
  },
  globalData: {},
});
