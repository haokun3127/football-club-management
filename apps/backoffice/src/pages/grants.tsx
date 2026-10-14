import { useEffect, useState } from "react";
import { history } from "@umijs/max";
import { Alert, App, Button, Form, Select, Typography } from "antd";
import { api, errorText } from "../services/api";
import type { Option } from "./management";
interface Grants {
  accounts: Option[];
  capabilities: string[];
  rows: Array<{ userId: string; capabilities: string[] }>;
  revision: string;
}
const labels: Record<string, string> = {
  sensitive: "敏感资料",
  export: "导出资料",
  assessment: "评测专业配置",
  assessment_entry:"评测教学录入与确认",
  service: "专业服务管理",
  finance: "课包和财务资料",
};
export default function GrantsPage() {
  const [data, setData] = useState<Grants>();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const { message } = App.useApp();
  async function load() {
    try {
      setData(await api<Grants>("grants"));
      setError("");
    } catch (e) {
      setError(errorText(e));
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <section className="content-panel">
      <Typography.Title level={3}>管理权限</Typography.Title>
      <Button onClick={() => history.push("/data/club")}>
        俱乐部资料
      </Button>{" "}
      <Button onClick={() => history.push("/data/memberships")}>
        账号与角色
      </Button>
      <Typography.Paragraph type="secondary">
        账号角色在「账号与角色」中维护。敏感资料、导出、评测、服务和财务分别授权，授权变更立即生效。
      </Typography.Paragraph>
      {error && (
        <Alert
          type="error"
          message={error}
          action={<Button onClick={() => void load()}>重新读取</Button>}
        />
      )}
      <Form
        form={form}
        layout="vertical"
        onFinish={async (values) => {
          if (!data || saving) return;
          setSaving(true);
          try {
            const next = await api<Grants>("grants", {
              method: "PUT",
              body: {
                userId: values.userId,
                capabilities: values.capabilities ?? [],
                expectedRevision: data.revision,
                requestId: crypto.randomUUID(),
              },
            });
            setData(next);
            void message.success("权限已更新");
          } catch (e) {
            setError(errorText(e));
          } finally {
            setSaving(false);
          }
        }}
      >
        <Form.Item name="userId" label="账号" rules={[{ required: true }]}>
          <Select
            options={data?.accounts}
            onChange={(id) =>
              form.setFieldValue(
                "capabilities",
                data?.rows.find((row) => row.userId === id)?.capabilities ?? [],
              )
            }
          />
        </Form.Item>
        <Form.Item name="capabilities" label="允许操作">
          <Select
            mode="multiple"
            options={data?.capabilities.map((value) => ({
              value,
              label: labels[value] ?? value,
            }))}
          />
        </Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          disabled={!data}
          loading={saving}
        >
          保存权限
        </Button>
      </Form>
    </section>
  );
}
