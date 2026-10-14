import { useLocation, history } from "@umijs/max";
import ResourceExport from "./resource-export";
import { useEffect, useRef, useState } from "react";
import {
  ProTable,
  type ProColumns,
  type ActionType,
} from "@ant-design/pro-components";
import {
  Alert,
  App,
  Button,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Spin,
  Switch,
  Tabs,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { api, ApiError, errorText } from "../services/api";
export interface Field {
  key: string;
  label: string;
  kind: string;
  required?: boolean;
  options?: Option[];
  reference?: string;
  multiple?: boolean;
  minimum?: number;
  maximum?: number;
  appliesTo?: string;
  virtual?: boolean;
}
export interface Option {
  value: string;
  label: string;
}
export interface RecordRow {
  id: string;
  revision: string;
  updatedAt: string;
  values: Record<string, unknown>;
  readOnly?: boolean;
}
export interface ResourceList {
  resource: string;
  title: string;
  fields: Field[];
  rows: RecordRow[];
  total: number;
  canWrite: boolean;
  canCreate: boolean;
  canExport: boolean;
  snapshot: string;
}
interface Detail {
  record: RecordRow;
  history: Array<{
    id: number;
    actor: string;
    occurredAt: string;
    action: string;
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
  }>;
}
export const renderValue = (value: unknown, field?: Field) =>
  value == null
    ? "—"
    : Array.isArray(value)
      ? value
          .map((v) => field?.options?.find((o) => o.value === v)?.label ?? v)
          .join("、")
      : typeof value === "boolean"
        ? value
          ? "是"
          : "否"
        : (field?.options?.find((o) => o.value === value)?.label ??
          String(value));
export default function Management({ resource }: { resource: string }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const action = useRef<ActionType>();
  const [data, setData] = useState<ResourceList>();
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Detail>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [latest, setLatest] = useState<RecordRow>();
  const [choices, setChoices] = useState<Record<string, Option[]>>({});
  const editorGeneration = useRef(0);
  function closeEditor() {
    if (saving) return;
    editorGeneration.current += 1;
    setOpen(false);
  }
  const eventType = Form.useWatch("type", form);
  const pending = useRef<{ serialized: string; requestId: string }>();
  useEffect(() => {
    setData(undefined);
    setError("");
    setOpen(false);
    return () => {
      editorGeneration.current += 1;
    };
  }, [resource]);
  async function edit(row?: Pick<RecordRow, "id">, copy = false) {
    const generation = ++editorGeneration.current;
    setOpen(true);
    setLoading(true);
    setDetail(undefined);
    setSaveError("");
    setLatest(undefined);
    pending.current = undefined;
    form.resetFields();
    try {
      const value = row
        ? await api<Detail>(
            `resources/${resource}/${encodeURIComponent(row.id)}`,
          )
        : undefined;
      const fields = data?.fields ?? [];
      const references = [
        ...new Set(fields.flatMap((f) => (f.reference ? [f.reference] : []))),
      ];
      const options = await Promise.all(
        references.map(
          async (key) => [key, await api<Option[]>(`options/${key}`)] as const,
        ),
      );
      if (generation !== editorGeneration.current) return;
      setChoices(Object.fromEntries(options));
      setDetail(copy ? undefined : value);
      form.setFieldsValue(
        Object.fromEntries(
          fields.map((f) => {
            const input = value?.record.values[f.key];
            return [
              f.key,
              input != null
                ? f.kind === "date" || f.kind === "datetime"
                  ? dayjs(String(input))
                  : input
                : f.kind === "tags" || f.multiple
                  ? []
                  : f.kind === "boolean"
                    ? false
                    : undefined,
            ];
          }),
        ),
      );
    } catch (e) {
      if (generation === editorGeneration.current) setSaveError(errorText(e));
    } finally {
      if (generation === editorGeneration.current) setLoading(false);
    }
  }
  async function save() {
    if (saving || loading || !data) return;
    let input: Record<string, unknown>;
    try {
      input = await form.validateFields();
    } catch {
      return;
    }
    const values = Object.fromEntries(
      data.fields
        .filter((f) => f.key !== "balanceAfter")
        .map((f) => {
          const value =
            f.appliesTo && f.appliesTo !== input.type ? null : input[f.key];
          return [
            f.key,
            value == null || value === ""
              ? null
              : f.kind === "date"
                ? dayjs(value as string).format("YYYY-MM-DD")
                : f.kind === "datetime"
                  ? dayjs(value as string).toISOString()
                  : value,
          ];
        }),
    );
    const body = { values, expectedRevision: detail?.record.revision ?? null };
    const serialized = JSON.stringify(body);
    if (pending.current?.serialized !== serialized)
      pending.current = { serialized, requestId: crypto.randomUUID() };
    setSaving(true);
    setSaveError("");
    try {
      await api<RecordRow>(
        `resources/${resource}${detail ? `/${encodeURIComponent(detail.record.id)}` : ""}`,
        {
          method: detail ? "PUT" : "POST",
          body: { ...body, requestId: pending.current!.requestId },
        },
      );
      void message.success("已保存");
      setOpen(false);
      pending.current = undefined;
      await action.current?.reload();
    } catch (e) {
      setSaveError(errorText(e));
      if (
        e instanceof ApiError &&
        e.status === 409 &&
        Array.isArray(e.details)
      ) {
        const conflict = e.details[0] as { latest?: RecordRow };
        if (conflict?.latest) setLatest(conflict.latest);
      }
    } finally {
      setSaving(false);
    }
  }
  const location = useLocation(),
    deepLink = new URLSearchParams(location.search).get("recordId"),
    openedLink = useRef<string>();
  useEffect(() => {
    if (data && deepLink && openedLink.current !== deepLink) {
      openedLink.current = deepLink;
      void edit({ id: deepLink });
    }
  }, [data, deepLink]);
  const [exportSearch, setExportSearch] = useState("");
  const fields = data?.fields ?? [];
  const columns: ProColumns<RecordRow>[] = [
    ...fields.slice(0, 5).map((f) => ({
      title: f.label,
      key: f.key,
      search: false,
      render: (_: unknown, row: RecordRow) => renderValue(row.values[f.key], f),
    })),
    {
      title: "操作",
      valueType: "option",
      render: (_, row) => (
        <Button type="link" onClick={() => void edit(row)}>
          {data?.canWrite && !row.readOnly ? "查看 / 编辑" : "详情"}
        </Button>
      ),
    },
  ];
  return (
    <>
      <ProTable<RecordRow>
        actionRef={action}
        rowKey="id"
        headerTitle={data?.title ?? "管理资料"}
        columns={columns}
        search={false}
        options={{ density: false }}
        toolbar={{
          search: {
            placeholder: "搜索资料",
            onSearch: () => void action.current?.reload(),
          },
        }}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        request={async (params) => {
          try {
            const result = await api<ResourceList>(
              `resources/${resource}?offset=${((params.current ?? 1) - 1) * 20}&search=${encodeURIComponent(String(params.keyword ?? ""))}`,
            );
            setData(result);
            setExportSearch(String(params.keyword ?? ""));
            setError("");
            return { data: result.rows, total: result.total, success: true };
          } catch (e) {
            setError(errorText(e));
            return { data: [], total: 0, success: false };
          }
        }}
        tableAlertRender={false}
        toolBarRender={() => [
          ...(data?.canCreate && !["club", "memberships"].includes(resource)
            ? [
                <Button
                  key="import"
                  onClick={() =>
                    history.push(
                      `/data/imports?resourceKey=${encodeURIComponent(resource)}`,
                    )
                  }
                >
                  导入此类资料
                </Button>,
              ]
            : []),
          ...(data?.canCreate
            ? [
                <Button key="create" type="primary" onClick={() => void edit()}>
                  新增{data.title}
                </Button>,
              ]
            : []),
          ...(data?.canExport
            ? [
                <ResourceExport
                  key="export"
                  resource={resource}
                  fields={data.fields}
                  search={exportSearch}
                  snapshot={data.snapshot}
                />,
              ]
            : []),
        ]}
        tableExtraRender={() =>
          error ? (
            <Alert
              type="error"
              message={error}
              action={
                <Button onClick={() => void action.current?.reload()}>
                  重试
                </Button>
              }
            />
          ) : undefined
        }
      />
      <Drawer
        title={detail ? `${data?.title}详情` : `新增${data?.title ?? "资料"}`}
        open={open}
        width={680}
        onClose={() => {
          closeEditor();
        }}
        maskClosable={!saving}
        destroyOnClose
        footer={
          <Space>
            {["drills", "metrics", "testitems"].includes(resource) &&
              detail &&
              data?.canCreate && (
                <Button
                  disabled={saving || loading}
                  onClick={() => void edit(detail.record, true)}
                >
                  复制为新定义
                </Button>
              )}
            <Button disabled={saving} onClick={closeEditor}>
              关闭
            </Button>
            {data?.canWrite && !detail?.record.readOnly && (
              <Button
                type="primary"
                disabled={loading || !!latest}
                loading={saving}
                onClick={() => void save()}
              >
                保存
              </Button>
            )}
          </Space>
        }
      >
        {detail && ["students", "teams"].includes(resource) && (
          <Space wrap>
            <Button
              onClick={() =>
                history.push(
                  `/bi/overview?${resource === "teams" ? "teamId" : "studentId"}=${encodeURIComponent(detail.record.id)}&topic=training`,
                )
              }
            >
              课程与训练记录
            </Button>
            <Button
              onClick={() =>
                history.push(
                  `/bi/overview?${resource === "teams" ? "teamId" : "studentId"}=${encodeURIComponent(detail.record.id)}&topic=growth`,
                )
              }
            >
              已确认测评
            </Button>
            <Button
              onClick={() =>
                history.push(
                  `/bi/overview?${resource === "teams" ? "teamId" : "studentId"}=${encodeURIComponent(detail.record.id)}&topic=services`,
                )
              }
            >
              专业服务记录
            </Button>
          </Space>
        )}
        {saveError && (
          <Alert className="form-alert" type="error" message={saveError} />
        )}
        {latest && (
          <Alert
            type="warning"
            message="其他人已更新此记录，你的输入已保留。"
            description={
              <>
                <Descriptions
                  column={1}
                  size="small"
                  items={fields.map((f) => ({
                    key: f.key,
                    label: f.label,
                    children: renderValue(latest.values[f.key], f),
                  }))}
                />
                <Button
                  onClick={() => {
                    setDetail((old) =>
                      old ? { ...old, record: latest } : old,
                    );
                    setLatest(undefined);
                    pending.current = undefined;
                    setSaveError("");
                  }}
                >
                  已核对，使用最新版本再保存我的输入
                </Button>
              </>
            }
          />
        )}
        {loading ? (
          <Spin />
        ) : (
          <Tabs
            items={[
              {
                key: "edit",
                label: "资料",
                children: (
                  <Form
                    form={form}
                    layout="vertical"
                    disabled={
                      !data?.canWrite || detail?.record.readOnly || saving
                    }
                  >
                    {fields
                      .filter(
                        (f) =>
                          (!f.appliesTo || f.appliesTo === eventType) &&
                          (!f.virtual || f.key !== "balanceAfter" || !!detail),
                      )
                      .map((f) => (
                        <Form.Item
                          key={f.key}
                          name={f.key}
                          label={f.label}
                          valuePropName={
                            f.kind === "boolean" ? "checked" : "value"
                          }
                          rules={
                            f.required
                              ? [
                                  {
                                    required: true,
                                    message: `请填写${f.label}`,
                                  },
                                ]
                              : []
                          }
                        >
                          {f.kind === "date" || f.kind === "datetime" ? (
                            <DatePicker
                              showTime={f.kind === "datetime"}
                              className="full-width"
                            />
                          ) : f.kind === "number" ? (
                            <InputNumber
                              min={f.minimum}
                              max={f.maximum}
                              className="full-width"
                            />
                          ) : f.kind === "boolean" ? (
                            <Switch />
                          ) : f.kind === "textarea" ? (
                            <Input.TextArea rows={4} maxLength={5000} />
                          ) : f.kind === "reference" ||
                            f.options ||
                            f.kind === "tags" ? (
                            <Select
                              allowClear={!f.required}
                              showSearch
                              optionFilterProp="label"
                              mode={
                                f.kind === "tags"
                                  ? f.options
                                    ? "multiple"
                                    : "tags"
                                  : f.multiple
                                    ? "multiple"
                                    : undefined
                              }
                              options={
                                f.options ??
                                (f.reference ? choices[f.reference] : [])
                              }
                            />
                          ) : (
                            <Input maxLength={500} />
                          )}
                        </Form.Item>
                      ))}
                  </Form>
                ),
              },
              {
                key: "history",
                label: "操作历史",
                children: detail?.history.length ? (
                  detail.history.map((item) => (
                    <section key={item.id} className="history-entry">
                      <Typography.Text strong>
                        {item.action === "create" ? "新增" : "修改"} ·{" "}
                        {item.actor}
                      </Typography.Text>
                      <Typography.Paragraph type="secondary">
                        {dayjs(item.occurredAt).format("YYYY-MM-DD HH:mm:ss")}
                      </Typography.Paragraph>
                      <Descriptions
                        size="small"
                        column={1}
                        items={fields
                          .filter(
                            (f) =>
                              JSON.stringify(item.before?.[f.key]) !==
                              JSON.stringify(item.after?.[f.key]),
                          )
                          .map((f) => ({
                            key: f.key,
                            label: f.label,
                            children: `${renderValue(item.before?.[f.key], f)} → ${renderValue(item.after?.[f.key], f)}`,
                          }))}
                      />
                    </section>
                  ))
                ) : (
                  <Typography.Text type="secondary">
                    暂无后台操作记录
                  </Typography.Text>
                ),
              },
            ]}
          />
        )}
      </Drawer>
    </>
  );
}
