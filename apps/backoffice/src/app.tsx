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
        token: {
          colorPrimary: "#A80F1B",
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
