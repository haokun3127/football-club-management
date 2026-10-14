import { useRef, useState } from "react";
import { ProTable, type ActionType } from "@ant-design/pro-components";
import {
  Alert,
  App,
  Button,
  Descriptions,
  Drawer,
  Form,
  Input,
  Space,
  Switch,
  Table,
  Typography,
} from "antd";
import { api, ApiError, errorText } from "../services/api";
interface TrainingRecord {
  revision: number;
  counted: boolean;
  source: string;
  occurredAt: string;
  history: Array<{
    revision: number;
    counted: boolean;
    source: string;
    reason: string;
    actorDisplayName?: string;
    changedAt: string;
  }>;
}
interface Row {
  eventId: string;
  studentId: string;
  title: string;
  name: string;
  record: TrainingRecord | null;
}
export default function TrainingRecords() {
  const action = useRef<ActionType>();
  const [row, setRow] = useState<Row>();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [latest, setLatest] = useState<TrainingRecord>();
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const pending = useRef<{ body: string; requestId: string }>();
  return (
    <>
      <ProTable<Row>
        actionRef={action}
        headerTitle="训练计次与更正"
        rowKey={(r) => JSON.stringify([r.eventId, r.studentId])}
        search={false}
        columns={[
          { title: "活动", dataIndex: "title" },
          { title: "学员", dataIndex: "name" },
          {
            title: "计入训练",
            render: (_, r) =>
              r.record ? (r.record.counted ? "是" : "否") : "尚未生成",
          },
          {
            title: "来源",
            render: (_, r) =>
              r.record?.source === "automatic"
                ? "系统自动"
                : r.record
                  ? "人工更正"
                  : "—",
          },
          {
            title: "操作",
            valueType: "option",
            render: (_, r) => (
              <Button
                type="link"
                onClick={() => {
                  setRow(r);
                  form.setFieldsValue({
                    counted: r.record?.counted ?? false,
                    reason: "",
                  });
                  setError("");
                  setLatest(undefined);
                  pending.current = undefined;
                }}
              >
                详情 / 更正
              </Button>
            ),
          },
        ]}
        request={async () => {
          try {
            const rows = await api<Row[]>("training-records");
            setError("");
            return { data: rows, success: true, total: rows.length };
          } catch (e) {
            setError(errorText(e));
            return { data: [], success: false };
          }
        }}
        tableExtraRender={() =>
          error && !row ? <Alert type="error" message={error} /> : undefined
        }
      />
      <Drawer
        open={!!row}
        width={680}
        title="训练记录更正"
        destroyOnClose
        onClose={() => {
          if (!saving) setRow(undefined);
        }}
        footer={
          <Space>
            <Button disabled={saving} onClick={() => setRow(undefined)}>
              关闭
            </Button>
            <Button
              type="primary"
              loading={saving}
              disabled={!!latest}
              onClick={() => form.submit()}
            >
              保存更正
            </Button>
          </Space>
        }
      >
        <Typography.Paragraph>
          更正保存后立即生效，每次保留原因和操作者。此操作不会修改课包余额。
        </Typography.Paragraph>
        {row && (
          <Descriptions
            items={[
              { key: "event", label: "活动", children: row.title },
              { key: "student", label: "学员", children: row.name },
            ]}
            column={1}
          />
        )}{" "}
        {error && <Alert type="error" message={error} className="form-alert" />}
        {latest && (
          <Alert
            type="warning"
            message={`最新版本 ${latest.revision}：${latest.counted ? "计入训练" : "未计入训练"}`}
            description={
              <Button
                onClick={() => {
                  setRow((old) => (old ? { ...old, record: latest } : old));
                  setLatest(undefined);
                  setError("");
                  pending.current = undefined;
                }}
              >
                已核对，以最新版本保存我的输入
              </Button>
            }
          />
        )}
        <Form
          form={form}
          layout="vertical"
          onFinish={async (values) => {
            if (!row || saving) return;
            const body = {
              ...values,
              eventId: row.eventId,
              studentId: row.studentId,
              expectedRevision: row.record?.revision ?? 0,
            };
            const serialized = JSON.stringify(body);
            if (pending.current?.body !== serialized)
              pending.current = {
                body: serialized,
                requestId: crypto.randomUUID(),
              };
            setSaving(true);
            try {
              await api("training-records", {
                method: "PUT",
                body: { ...body, requestId: pending.current!.requestId },
              });
              void message.success("更正已保存");
              setRow(undefined);
              await action.current?.reload();
            } catch (e) {
              setError(errorText(e));
              if (e instanceof ApiError && Array.isArray(e.details)) {
                const current = (e.details[0] as { latest?: TrainingRecord })
                  .latest;
                if (current) setLatest(current);
              }
            } finally {
              setSaving(false);
            }
          }}
        >
          <Form.Item label="计入训练" name="counted" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item
            label="更正原因"
            name="reason"
            rules={[{ required: true, message: "请填写更正原因" }]}
          >
            <Input.TextArea rows={3} maxLength={500} />
          </Form.Item>
        </Form>
        <Typography.Title level={5}>历史</Typography.Title>
        <Table
          size="small"
          rowKey="revision"
          dataSource={row?.record?.history}
          pagination={false}
          columns={[
            { title: "版本", dataIndex: "revision" },
            {
              title: "计入",
              dataIndex: "counted",
              render: (v: boolean) => (v ? "是" : "否"),
            },
            { title: "原因", dataIndex: "reason" },
            {
              title: "操作者",
              dataIndex: "actorDisplayName",
              render: (v) => v ?? "系统",
            },
            { title: "时间", dataIndex: "changedAt" },
          ]}
        />
      </Drawer>
    </>
  );
}
