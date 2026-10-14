import { useEffect, useRef, useState } from "react";
import { Alert, Button, Checkbox, Modal, Space } from "antd";
import { api, errorText } from "../services/api";
import { downloadExcel } from "../services/download";
export default function ResourceExport({
  resource,
  fields,
  search,
  snapshot,
}: {
  resource: string;
  fields: Array<{ key: string; label: string }>;
  search: string;
  snapshot: string;
}) {
  const [open, setOpen] = useState(false),
    [selected, setSelected] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const generation = useRef(0),
    pending = useRef<{ hash: string; requestId: string }>();
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  async function download() {
    if (busy) return;
    const body = { fields: selected, search, snapshot },
      hash = JSON.stringify(body);
    if (pending.current?.hash !== hash)
      pending.current = { hash, requestId: crypto.randomUUID() };
    const current = generation.current;
    setBusy(true);
    setError("");
    try {
      const file = await api<{ fileName: string; contentBase64: string }>(
        `exports/${resource}`,
        {
          method: "POST",
          body: { ...body, requestId: pending.current.requestId },
        },
      );
      if (current !== generation.current) return;
      downloadExcel(file);
      setOpen(false);
      pending.current = undefined;
    } catch (e) {
      if (current === generation.current) setError(errorText(e));
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }
  return (
    <>
      <Button
        onClick={() => {
          setSelected(fields.map((field) => field.key));
          setError("");
          setOpen(true);
        }}
      >
        导出当前条件
      </Button>
      <Modal
        open={open}
        title="选择导出字段"
        onCancel={() => {
          if (!busy) setOpen(false);
        }}
        footer={
          <Space>
            <Button onClick={() => setOpen(false)} disabled={busy}>
              取消
            </Button>
            <Button
              type="primary"
              aria-label="下载明细"
              aria-busy={busy}
              loading={busy}
              disabled={!selected.length}
              onClick={() => void download()}
            >
              下载明细
            </Button>
          </Space>
        }
      >
        {error && <Alert type="error" message={error} />}
        <Alert
          type="info"
          message="导出包含当前检索条件、事实版本、行标识和更新版本。数据变化后请刷新列表重新核对。"
        />
        <Checkbox.Group
          value={selected}
          onChange={(values) => setSelected(values as string[])}
          options={fields.map((field) => ({
            value: field.key,
            label: field.label,
          }))}
        />
      </Modal>
    </>
  );
}
