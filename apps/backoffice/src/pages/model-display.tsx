import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
} from "antd";
import { api, ApiError, errorText } from "../services/api";
export interface Display {
  groups: Array<{ name: string; metricIds: string[] }>;
  revision: string;
}
export default function ModelDisplay({
  id,
  display,
  choices,
  canWrite,
  onChanged,
}: {
  id: string;
  display: Display;
  choices: Array<{ value: string; label: string }>;
  canWrite: boolean;
  onChanged: (display: Display) => void;
}) {
  const [form] = Form.useForm<Display>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [latest, setLatest] = useState<Display>();
  const pending = useRef<{ hash: string; requestId: string }>();
  const generation = useRef(0);
  useEffect(() => {
    form.setFieldsValue({ groups: display.groups });
    setError("");
    setLatest(undefined);
    pending.current = undefined;
    return () => {
      generation.current++;
    };
  }, [id]);
  async function save() {
    if (busy) return;
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const body = {
        groups: values.groups ?? [],
        expectedRevision: display.revision,
      },
      hash = JSON.stringify(body);
    if (pending.current?.hash !== hash)
      pending.current = { hash, requestId: crypto.randomUUID() };
    const current = generation.current;
    setBusy(true);
    setError("");
    try {
      const next = await api<Display>(`models/${id}/display`, {
        method: "PUT",
        body: { ...body, requestId: pending.current.requestId },
      });
      if (current !== generation.current) return;
      onChanged(next);
      pending.current = undefined;
    } catch (e) {
      if (current !== generation.current) return;
      setError(errorText(e));
      if (e instanceof ApiError && e.code === "revision_conflict") {
        try {
          const detail = await api<{ record: { display: Display } }>(
            `models/${id}`,
          );
          if (current === generation.current) setLatest(detail.record.display);
        } catch {
          /* Keep the entered groups and the original conflict on refresh failure. */
        }
      }
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }
  return (
    <Card title="展示分组与顺序" size="small">
      <Alert
        type="info"
        message="展示设置独立保存，调整分组和顺序不会改变模型公式、版本或已有分值。"
      />
      {error && <Alert type="error" message={error} />}{" "}
      {latest && (
        <Alert
          type="warning"
          message="展示设置已更新，本机输入保留。"
          action={
            <Popconfirm
              title="放弃本机分组并载入最新？"
              onConfirm={() => {
                form.setFieldsValue({ groups: latest.groups });
                onChanged(latest);
                setLatest(undefined);
                setError("");
                pending.current = undefined;
              }}
            >
              <Button>载入最新</Button>
            </Popconfirm>
          }
        />
      )}
      <Form form={form} layout="vertical" disabled={!canWrite || busy}>
        <Form.List name="groups">
          {(fields, { add, remove, move }) => (
            <>
              {fields.map((f) => (
                <Card size="small" key={f.key}>
                  <Space wrap>
                    <Form.Item
                      name={[f.name, "name"]}
                      label="分组名称"
                      rules={[{ required: true }]}
                    >
                      <Input maxLength={100} />
                    </Form.Item>
                    <Form.Item
                      name={[f.name, "metricIds"]}
                      label="项目分值或模型输出"
                      rules={[{ required: true }]}
                    >
                      <Select
                        mode="multiple"
                        style={{ minWidth: 260 }}
                        options={choices}
                      />
                    </Form.Item>
                    {canWrite && (
                      <>
                        <Button
                          disabled={f.name === 0}
                          onClick={() => move(f.name, f.name - 1)}
                        >
                          上移
                        </Button>
                        <Button
                          disabled={f.name === fields.length - 1}
                          onClick={() => move(f.name, f.name + 1)}
                        >
                          下移
                        </Button>
                        <Button onClick={() => remove(f.name)}>移除分组</Button>
                      </>
                    )}
                  </Space>
                </Card>
              ))}
              {canWrite && (
                <Button onClick={() => add({ name: "", metricIds: [] })}>
                  添加展示分组
                </Button>
              )}
            </>
          )}
        </Form.List>
      </Form>
      {canWrite && (
        <Button
          aria-label="保存展示设置"
          aria-busy={busy}
          loading={busy}
          disabled={Boolean(latest)}
          onClick={() => void save()}
        >
          保存展示设置
        </Button>
      )}
    </Card>
  );
}
