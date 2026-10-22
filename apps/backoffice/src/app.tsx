import type { ReactNode } from "react";
import { App, ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import "./global.css";
export function rootContainer(container: ReactNode) {
  return (
    <ConfigProvider
      locale={zhCN}
      button={{ autoInsertSpace: false }}
      csp={{ nonce: window.__FCM_CONFIG__.nonce }}
      theme={{
        components: { List: { colorTextDisabled: "#667085" } },
        token: {
          colorPrimary: "#A80F1B",
          colorLink: "#A80F1B",
          colorLinkHover: "#82101C",
          colorBgLayout: "#F6F7F9",
          colorText: "#202124",
          colorTextSecondary: "#667085",
          colorTextDisabled: "#667085",
          controlHeight: 44,
          fontSize: 16,
          borderRadius: 8,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
        },
      }}
    >
      <App>{container}</App>
    </ConfigProvider>
  );
}
