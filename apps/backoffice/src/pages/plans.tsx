import { useEffect, useRef, useState } from "react";
import { ProTable, type ActionType } from "@ant-design/pro-components";
import {
  Alert,
  App,
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Spin,
  Typography,
} from "antd";
import { api, ApiError, errorText } from "../services/api";
import type { Option } from "./management";
interface Plan {
  id: string;
  name: string;
  revision: string;
  scope: string;
  status: "active" | "inactive";
  canSetStatus: boolean;
  estimatedMinutes: number;
  canEdit: boolean;
  used: boolean;
  blocks: Array<{
    id: string;
    drillId: string;
    plannedMinutes: number;
    notes?: string;
  }>;
}
interface Detail {
  record: Plan;
  history: Array<{
    id: number;
    action: string;
    actor: string;
    occurredAt: string;
    before: Pick<
      Plan,
      "name" | "blocks" | "estimatedMinutes" | "status"
    > | null;
    after: Pick<Plan, "name" | "blocks" | "estimatedMinutes" | "status"> | null;
  }>;
}
export default function Plans({ canWrite }: { canWrite: boolean }) {
  const action = useRef<ActionType>();
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [open, setOpen] = useState(false),
    [detail, setDetail] = useState<Detail>(),
    [source, setSource] = useState<Plan>(),
    [choices, setChoices] = useState<Option[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [saving, setSaving] = useState(false);
  const generation = useRef(0),
    pending = useRef<{ body: string; requestId: string }>();
  const [conflict, setConflict] = useState(false);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  const blocks = Form.useWatch("blocks", form) as Plan["blocks"] | undefined;
  function close() {
    if (saving) return;
    generation.current++;
    setOpen(false);
  }
  async function edit(row?: Plan, copy = false) {
    const current = ++generation.current;
    setOpen(true);
    setLoading(true);
    setError("");
    setConflict(false);
    setDetail(undefined);
    setSource(undefined);
    form.resetFields();
    pending.current = undefined;
    try {
      const value = row
        ? await api<Detail>(`plans/${encodeURIComponent(row.id)}`)
        : undefined;
      const options = await api<Option[]>("options/drills");
      if (current !== generation.current) return;
      setChoices(options);
      if (copy) setSource(value?.record);
      else setDetail(value);
      form.setFieldsValue({
        name: value?.record.name,
        status: copy ? "active" : (value?.record.status ?? "active"),
        blocks: value?.record.blocks.map(
          ({ drillId, plannedMinutes, notes }) => ({
            drillId,
            plannedMinutes,
            notes,
          }),
        ) ?? [{ plannedMinutes: 10 }],
      });
    } catch (e) {
      if (current === generation.current) setError(errorText(e));
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }
  return (
    <>
      <ProTable<Plan>
        actionRef={action}
        rowKey="id"
        headerTitle="公共训练计划"
        search={false}
        columns={[
          { title: "名称", dataIndex: "name" },
          {
            title: "范围",
            dataIndex: "scope",
            valueEnum: { system: "共享目录", club: "本俱乐部" },
          },
          { title: "时长（分钟）", dataIndex: "estimatedMinutes" },
          {
            title: "状态",
            dataIndex: "status",
            valueEnum: { active: "开展中", inactive: "已停用" },
          },
          {
            title: "课程引用",
            render: (_, row) => (row.used ? "已被课程使用" : "未引用"),
          },
          {
            title: "操作",
            valueType: "option",
            render: (_, row) => (
              <Space>
                <Button type="link" onClick={() => void edit(row)}>
                  {row.canEdit ? "查看 / 编辑" : "详情"}
                </Button>
                {row.canSetStatus && (
                  <Button
                    type="link"
                    disabled={saving}
                    onClick={async () => {
                      setSaving(true);
                      try {
                        const next = await api<Detail>(
                          `plans/${encodeURIComponent(row.id)}`,
                        );
                        if (next.record.revision !== row.revision)
                          throw new ApiError(409, "revision_conflict");
                        await api(`plans/${encodeURIComponent(row.id)}`, {
                          method: "PUT",
                          body: {
                            name: next.record.name,
                            blocks: next.record.blocks.map(
                              ({ drillId, plannedMinutes, notes }) => ({
                                drillId,
                                plannedMinutes,
                                notes,
                              }),
                            ),
                            status:
                              row.status === "active" ? "inactive" : "active",
                            expectedRevision: row.revision,
                            requestId: crypto.randomUUID(),
                          },
                        });
                        void message.success("计划状态已更新");
                        await action.current?.reload();
                      } catch (e) {
                        void message.error(errorText(e));
                      } finally {
                        setSaving(false);
                      }
                    }}
                  >
                    {row.status === "active" ? "停用" : "恢复"}
                  </Button>
                )}
                {canWrite && (
                  <Button type="link" onClick={() => void edit(row, true)}>
                    复制为新计划
                  </Button>
                )}
              </Space>
            ),
          },
        ]}
        request={async () => {
          try {
            const rows = await api<Plan[]>("plans");
            setError("");
            return { data: rows, total: rows.length, success: true };
          } catch (e) {
            setError(errorText(e));
            return { data: [], success: false };
          }
        }}
        toolBarRender={() =>
          canWrite
            ? [
                <Button key="new" type="primary" onClick={() => void edit()}>
                  新增训练计划
                </Button>,
              ]
            : []
        }
        tableExtraRender={() =>
          error && !open ? <Alert type="error" message={error} /> : undefined
        }
      />
      <Drawer
        open={open}
        title={
          source ? "复制训练计划" : detail ? "训练计划详情" : "新增训练计划"
        }
        width={740}
        onClose={close}
        destroyOnClose
        footer={
          <Space>
            <Button disabled={saving} onClick={close}>
              关闭
            </Button>
            {canWrite && (!detail || detail.record.canEdit) && (
              <Button
                type="primary"
                loading={saving}
                disabled={loading || conflict}
                onClick={() => form.submit()}
              >
                保存
              </Button>
            )}
          </Space>
        }
      >
        <Typography.Paragraph type="secondary">
          使用中的计划保留原版本，可复制后重新配置。每个练习保留顺序、时长和说明，保存后可用于课程安排。
        </Typography.Paragraph>
        {error && <Alert type="error" message={error} className="form-alert" />}
        {conflict && (
          <Alert
            type="warning"
            message="当前计划或来源已变化。请重新读取并核对后操作，输入仍保留。"
            action={
              <Button
                onClick={() => {
                  if (detail) void edit(detail.record);
                  else if (source) void edit(source, true);
                }}
              >
                重新读取
              </Button>
            }
          />
        )}{" "}
        {loading ? (
          <Spin />
        ) : (
          <Form
            form={form}
            layout="vertical"
            disabled={
              saving || !canWrite || (!!detail && !detail.record.canEdit)
            }
            onFinish={async (values) => {
              if (saving || conflict) return;
              const body = {
                ...values,
                expectedRevision: detail?.record.revision ?? null,
                ...(source
                  ? { sourceId: source.id, sourceRevision: source.revision }
                  : {}),
              };
              const serialized = JSON.stringify(body);
              if (pending.current?.body !== serialized)
                pending.current = {
                  body: serialized,
                  requestId: crypto.randomUUID(),
                };
              setSaving(true);
              try {
                await api(
                  `plans${detail ? `/${encodeURIComponent(detail.record.id)}` : ""}`,
                  {
                    method: detail ? "PUT" : "POST",
                    body: { ...body, requestId: pending.current!.requestId },
                  },
                );
                void message.success("训练计划已保存");
                setOpen(false);
                await action.current?.reload();
              } catch (e) {
                setError(errorText(e));
                if (e instanceof ApiError && e.status === 409)
                  setConflict(true);
              } finally {
                setSaving(false);
              }
            }}
          >
            <Form.Item
              name="name"
              label="计划名称"
              rules={[{ required: true }]}
            >
              <Input maxLength={100} />
            </Form.Item>
            <Form.Item
              name="status"
              label="开展状态"
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { value: "active", label: "开展中" },
                  { value: "inactive", label: "已停用" },
                ]}
              />
            </Form.Item>
            <Form.List
              name="blocks"
              rules={[
                {
                  validator: async (_, value) => {
                    if (!value?.length) throw new Error("至少添加一个练习");
                  },
                },
              ]}
            >
              {(fields, { add, remove }, { errors }) => (
                <>
                  <Form.ErrorList errors={errors} />
                  {fields.map((field, index) => (
                    <section className="history-entry" key={field.key}>
                      <Space align="start">
                        <Form.Item
                          name={[field.name, "drillId"]}
                          label={`练习 ${index + 1}`}
                          rules={[{ required: true, message: "请选择练习" }]}
                        >
                          <Select
                            showSearch
                            optionFilterProp="label"
                            options={choices}
                            style={{ width: 300 }}
                          />
                        </Form.Item>
                        <Form.Item
                          name={[field.name, "plannedMinutes"]}
                          label="时长（分钟）"
                          rules={[{ required: true }]}
                        >
                          <InputNumber min={1} max={1440} />
                        </Form.Item>
                        <Button onClick={() => remove(field.name)}>移除</Button>
                      </Space>
                      <Form.Item name={[field.name, "notes"]} label="说明">
                        <Input.TextArea rows={2} maxLength={500} />
                      </Form.Item>
                    </section>
                  ))}
                  <Button onClick={() => add({ plannedMinutes: 10 })}>
                    添加练习
                  </Button>
                  <Typography.Paragraph>
                    总时长：
                    {(blocks ?? []).reduce(
                      (sum, block) => sum + (Number(block.plannedMinutes) || 0),
                      0,
                    )}{" "}
                    分钟
                  </Typography.Paragraph>
                </>
              )}
            </Form.List>
          </Form>
        )}
        {detail?.history.map((item) => (
          <Typography.Paragraph key={item.id}>
            {item.action === "create" ? "新增" : "修改"} · {item.actor} ·{" "}
            {item.occurredAt}
            <br />
            名称：{item.before?.name ?? "—"} → {item.after?.name ?? "—"}
            <br />
            时长：{item.before?.estimatedMinutes ?? "—"} →{" "}
            {item.after?.estimatedMinutes ?? "—"} 分钟
            <br />
            练习：
            {item.after?.blocks
              ?.map(
                (block) =>
                  `${choices.find((c) => c.value === block.drillId)?.label ?? block.drillId}（${block.plannedMinutes}分钟${block.notes ? `，${block.notes}` : ""}）`,
              )
              .join("、") ?? "—"}
          </Typography.Paragraph>
        ))}
      </Drawer>
    </>
  );
}
