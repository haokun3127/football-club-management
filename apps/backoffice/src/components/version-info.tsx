import { useEffect, useRef, useState } from "react";
import { Alert, Button, Descriptions, Modal, Spin, Typography } from "antd";
import { getServiceVersion, publicBuild, type BuildIdentity, type ServiceVersion } from "../services/version";

const environments: Record<string, string> = { develop: "开发环境", trial: "体验环境", release: "正式环境" };
function Identity({ environment, build }: { environment: string | null; build: BuildIdentity | null }) {
  const pending = "版本待确认";
  return <Descriptions column={1} size="small" items={[
    { key: "environment", label: "运行环境", children: environments[environment ?? ""] ?? "环境待确认" },
    { key: "id", label: "构建标识", children: <span className="version-identity">{build?.buildId ?? pending}</span> },
    { key: "sha", label: "源码版本", children: <span className="version-identity">{build?.sourceRevision ?? pending}</span> },
    { key: "time", label: "构建时间（UTC）", children: <span className="version-identity">{build?.builtAt ?? pending}</span> },
  ]} />;
}

export default function VersionInfo() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [server, setServer] = useState<ServiceVersion>();
  const read = useRef<AbortController>();
  useEffect(() => () => read.current?.abort(), []);
  async function refresh() {
    read.current?.abort();
    const controller = new AbortController(); read.current = controller;
    setState("loading"); setServer(undefined);
    try {
      const value = await getServiceVersion(controller.signal);
      if (controller.signal.aborted || read.current !== controller) return;
      setServer(value); setState("ready");
    } catch {
      if (!controller.signal.aborted && read.current === controller) setState("error");
    }
  }
  function close() { read.current?.abort(); setOpen(false); }
  const config = window.__FCM_CONFIG__;
  return <>
    <Button onClick={() => { setOpen(true); void refresh(); }}>版本信息</Button>
    <Modal title="版本信息" open={open} onCancel={close} footer={<Button onClick={close}>关闭</Button>}>
      <Typography.Title level={5}>当前已加载的后台包</Typography.Title>
      <Identity environment={config.environment} build={publicBuild(config.build)} />
      <Typography.Title level={5}>服务端</Typography.Title>
      {state === "loading" ? <Spin tip="正在读取服务版本"><div className="version-loading" /></Spin>
        : state === "error" ? <Alert type="error" showIcon message="服务版本暂时不可用，请重试" />
        : <Identity environment={server?.environment ?? null} build={server?.build ?? null} />}
      <Button onClick={() => void refresh()} loading={state === "loading"} disabled={state === "loading"} className="version-refresh">{state === "error" ? "重试读取版本" : "刷新服务版本"}</Button>
    </Modal>
  </>;
}
