import { useLocation } from "@umijs/max";
import { useEffect, useRef, useState } from "react";
import { ProTable, type ActionType } from "@ant-design/pro-components";
import {
  Alert,
  App,
  Button,
  Drawer,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Typography,
  Upload,
} from "antd";
import { api, errorText } from "../services/api";
import { downloadExcel } from "../services/download";
interface Template {
  key: string;
  title: string;
  version: string;
  canImport: boolean;
  policy: string;
  fields: Array<{
    key: string;
    label: string;
    kind: string;
    required?: boolean;
  }>;
}
interface Row {
  rowNumber: number;
  externalId: string;
  action: string;
  status: string;
  error?: string;
  resultId?: string;
  values: Record<string, unknown>;
}
interface Batch {
  canExport: boolean;
  id: string;
  resourceKey: string;
  sourceName: string;
  mappingVersion: string;
  blankPolicy: string;
  rows: Row[];
  revision: string;
  createdAt: string;
}
const statuses: Record<string, string> = {
  pending: "待确认",
  success: "已入库",
  failed: "失败",
  duplicate: "重复 · 已处理",
  create: "新增",
  update: "更新",
  preserve: "保留原值",
  clear: "清空映射的空字段",
};
const errors: Record<string, string> = {
  required_field_missing: "缺少必填字段",
  invalid_field_value: "字段类型、日期、范围或选项无效",
  invalid_external_id: "外部标识缺失或在批次内重复",
  invalid_reference: "关联标识不存在或不属于此俱乐部",
  revision_conflict: "对象已更新，请核对后重新预览",
  permission_denied: "未获得对应字段权限",
  external_id_already_linked: "外部标识已绑定另一个对象",
  import_row_failed: "行提交失败，可重试",
  append_only_record: "此对象只允许追加，不能覆盖",
};
export default function Imports() {
  const { message } = App.useApp();
  const location = useLocation();
  const action = useRef<ActionType>();
  const [templates, setTemplates] = useState<Template[]>([]),
    [form] = Form.useForm(),
    [open, setOpen] = useState(false),
    [batch, setBatch] = useState<Batch>(),
    [selected, setSelected] = useState<number[]>([]),
    [file, setFile] = useState<{ fileName: string; contentBase64: string }>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const generation = useRef(0),
    pending = useRef<{ hash: string; requestId: string }>();
  const key = Form.useWatch("resourceKey", form),
    template = templates.find(
      (template) => template.key === key || template.key === batch?.resourceKey,
    );
  useEffect(() => {
    void api<Template[]>("import-templates")
      .then((next) => {
        setTemplates(next);
        const resourceKey = new URLSearchParams(location.search).get(
          "resourceKey",
        );
        if (
          next.some(
            (template) => template.key === resourceKey && template.canImport,
          )
        ) {
          form.setFieldsValue({ resourceKey, blankPolicy: "preserve" });
          setOpen(true);
        }
      })
      .catch((e) => setError(errorText(e)));
    return () => {
      generation.current++;
    };
  }, []);
  async function read(id: string) {
    const current = ++generation.current;
    setOpen(true);
    setBusy(true);
    setError("");
    setBatch(undefined);
    setFile(undefined);
    try {
      const next = await api<Batch>(`imports/${id}`);
      if (current !== generation.current) return;
      setBatch(next);
      form.setFieldsValue({
        resourceKey: next.resourceKey,
        sourceName: next.sourceName,
        blankPolicy: next.blankPolicy,
      });
      setSelected(
        next.rows
          .filter((row) => !["success", "duplicate"].includes(row.status))
          .map((row) => row.rowNumber),
      );
    } catch (e) {
      if (current === generation.current) setError(errorText(e));
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }
  async function preview() {
    if (!file || busy) return;
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const mapping = values.mapping?.length
      ? Object.fromEntries(
          values.mapping.map((row: { field: string; column: string }) => [
            row.field,
            row.column,
          ]),
        )
      : undefined;
    const body = {
        resourceKey: values.resourceKey,
        sourceName: values.sourceName,
        blankPolicy: values.blankPolicy,
        ...file,
        ...(mapping ? { mapping } : {}),
      },
      hash = JSON.stringify(body);
    if (pending.current?.hash !== hash)
      pending.current = { hash, requestId: crypto.randomUUID() };
    const current = generation.current;
    setBusy(true);
    setError("");
    try {
      const next = await api<Batch>("imports/preview", {
        method: "POST",
        body: { ...body, requestId: pending.current.requestId },
      });
      if (current !== generation.current) return;
      setBatch(next);
      setSelected(
        next.rows
          .filter((row) => row.status === "pending")
          .map((row) => row.rowNumber),
      );
      pending.current = undefined;
      void action.current?.reload();
    } catch (e) {
      if (current === generation.current) setError(errorText(e));
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }
  async function confirm() {
    if (!batch || busy) return;
    const body = { expectedRevision: batch.revision, rowNumbers: selected },
      hash = JSON.stringify({ id: batch.id, ...body });
    if (pending.current?.hash !== hash)
      pending.current = { hash, requestId: crypto.randomUUID() };
    const current = generation.current;
    setBusy(true);
    setError("");
    try {
      const next = await api<Batch>(`imports/${batch.id}/confirm`, {
        method: "POST",
        body: { ...body, requestId: pending.current.requestId },
      });
      if (current !== generation.current) return;
      setBatch(next);
      setSelected(
        next.rows
          .filter((row) => row.status === "failed")
          .map((row) => row.rowNumber),
      );
      pending.current = undefined;
      void message.success(
        `已处理：${next.rows.filter((row) => row.status === "success").length} 行成功，${next.rows.filter((row) => row.status === "failed").length} 行失败`,
      );
      void action.current?.reload();
    } catch (e) {
      if (current === generation.current) setError(errorText(e));
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }
  return (
    <>
      <ProTable<Batch>
        actionRef={action}
        rowKey="id"
        headerTitle="导入批次与结果"
        search={false}
        request={async () => {
          try {
            return { data: await api<Batch[]>("imports"), success: true };
          } catch (e) {
            setError(errorText(e));
            return { data: [], success: false };
          }
        }}
        toolBarRender={() => [
          <Button
            key="new"
            type="primary"
            onClick={() => {
              generation.current++;
              setOpen(true);
              setBatch(undefined);
              setFile(undefined);
              setSelected([]);
              setError("");
              pending.current = undefined;
              form.resetFields();
              form.setFieldsValue({ blankPolicy: "preserve" });
            }}
          >
            新建导入预览
          </Button>,
        ]}
        columns={[
          {
            title: "对象",
            dataIndex: "resourceKey",
            render: (_, row) =>
              templates.find((template) => template.key === row.resourceKey)
                ?.title ?? row.resourceKey,
          },
          { title: "来源", dataIndex: "sourceName" },
          {
            title: "预览时间",
            dataIndex: "createdAt",
            render: (_, row) => new Date(row.createdAt).toLocaleString("zh-CN"),
          },
          {
            title: "成功 / 失败 / 重复",
            render: (_, row) =>
              `${row.rows.filter((r) => r.status === "success").length} / ${row.rows.filter((r) => r.status === "failed").length} / ${row.rows.filter((r) => r.status === "duplicate").length}`,
          },
          {
            title: "操作",
            valueType: "option",
            render: (_, row) => (
              <Button onClick={() => void read(row.id)}>查看批次</Button>
            ),
          },
        ]}
      />
      {error && !open && <Alert type="error" message={error} />}
      <Drawer
        title={batch ? "导入预览与处理结果" : "类型化 Excel 导入"}
        open={open}
        width={Math.min(1100, window.innerWidth - 24)}
        destroyOnClose
        onClose={() => {
          if (!busy) {
            generation.current++;
            setOpen(false);
            setFile(undefined);
          }
        }}
      >
        {error && <Alert type="error" message={error} />}
        <Alert
          type="info"
          message={
            template?.policy ??
            "预览不写业务数据。使用稳定外部标识和关联标识，确认后按行提交。"
          }
          description="修改文件后创建新预览；重复批次不会重复新增。测评成绩须沿草稿与确认流程，不会因导入自动公开。"
        />
        <Form form={form} layout="vertical" disabled={busy || Boolean(batch)}>
          <Space wrap>
            <Form.Item
              name="resourceKey"
              label="导入对象"
              rules={[{ required: true }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                style={{ minWidth: 210 }}
                options={templates
                  .filter((template) => template.canImport)
                  .map((template) => ({
                    value: template.key,
                    label: template.title,
                  }))}
              />
            </Form.Item>
            <Form.Item
              name="sourceName"
              label="稳定来源名称"
              rules={[{ required: true }]}
            >
              <Input maxLength={128} />
            </Form.Item>
            <Form.Item name="blankPolicy" label="空单元格处理">
              <Select
                style={{ minWidth: 230 }}
                options={[
                  { value: "preserve", label: "保留原值（新增仍须必填）" },
                  { value: "clear", label: "清空已映射的空字段" },
                ]}
              />
            </Form.Item>
          </Space>
          {!batch && (
            <Form.List name="mapping">
              {(fields, { add, remove }) => (
                <>
                  <Typography.Paragraph>
                    标准模板使用固定字段名；客户表格可逐列映射。添加映射后仅处理所选字段。
                  </Typography.Paragraph>
                  {fields.map((field) => (
                    <Space key={field.key}>
                      <Form.Item
                        name={[field.name, "field"]}
                        rules={[{ required: true }]}
                      >
                        <Select
                          placeholder="目标字段"
                          style={{ width: 220 }}
                          options={template?.fields.map((field) => ({
                            value: field.key,
                            label: field.label,
                          }))}
                        />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, "column"]}
                        rules={[{ required: true }]}
                      >
                        <Input placeholder="Excel 列标题" maxLength={128} />
                      </Form.Item>
                      <Button onClick={() => remove(field.name)}>移除</Button>
                    </Space>
                  ))}
                  <Button onClick={() => add()}>添加客户列映射</Button>
                </>
              )}
            </Form.List>
          )}
        </Form>
        {!batch && (
          <Space wrap>
            <Button
              disabled={!key || busy}
              onClick={async () => {
                try {
                  downloadExcel(await api(`import-templates/${key}`));
                } catch (e) {
                  setError(errorText(e));
                }
              }}
            >
              下载对象模板
            </Button>
            <Upload
              accept=".xlsx"
              maxCount={1}
              beforeUpload={async (selectedFile) => {
                if (selectedFile.size > 2200000) {
                  setError("文件不能超过 2 MB");
                  return Upload.LIST_IGNORE;
                }
                const current = generation.current;
                try {
                  const contentBase64 = await new Promise<string>(
                    (resolve, reject) => {
                      const reader = new FileReader();
                      reader.onload = () =>
                        resolve(String(reader.result).split(",")[1] ?? "");
                      reader.onerror = () => reject(new Error("read"));
                      reader.readAsDataURL(selectedFile);
                    },
                  );
                  if (current === generation.current)
                    setFile({ fileName: selectedFile.name, contentBase64 });
                } catch {
                  if (current === generation.current)
                    setError("文件读取失败，请重新选择文件。");
                }
                return false;
              }}
              onRemove={() => setFile(undefined)}
            >
              <Button disabled={!key || busy}>选择 Excel 文件</Button>
            </Upload>
            <Button
              type="primary"
              disabled={!file || busy}
              aria-label="生成影响预览"
              aria-busy={busy}
              loading={busy}
              onClick={() => void preview()}
            >
              生成影响预览
            </Button>
          </Space>
        )}
        {batch && (
          <Button
            disabled={busy || !batch.canExport}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                downloadExcel(
                  await api<{ fileName: string; contentBase64: string }>(
                    `imports/${batch.id}/failures-export`,
                    {
                      method: "POST",
                      body: { requestId: crypto.randomUUID() },
                    },
                  ),
                );
              } catch (e) {
                setError(errorText(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            下载失败行与原因
          </Button>
        )}
        {batch && (
          <>
            <Typography.Paragraph>
              映射版本：{batch.mappingVersion} · 空值：
              {statuses[batch.blankPolicy]} · 批次：{batch.id}
            </Typography.Paragraph>
            <Table<Row>
              rowKey="rowNumber"
              size="small"
              dataSource={batch.rows}
              pagination={{ pageSize: 20 }}
              scroll={{ x: 1100 }}
              rowSelection={
                template?.canImport
                  ? {
                      selectedRowKeys: selected,
                      onChange: (keys) => setSelected(keys as number[]),
                      getCheckboxProps: (row) => ({
                        disabled:
                          busy || ["success", "duplicate"].includes(row.status),
                      }),
                    }
                  : undefined
              }
              columns={[
                { title: "Excel 行", dataIndex: "rowNumber" },
                { title: "外部标识", dataIndex: "externalId" },
                {
                  title: "影响",
                  dataIndex: "action",
                  render: (value) => statuses[value] ?? value,
                },
                {
                  title: "结果",
                  dataIndex: "status",
                  render: (value) => statuses[value] ?? value,
                },
                {
                  title: "原因",
                  dataIndex: "error",
                  render: (value) => errors[value] ?? value ?? "—",
                },
                { title: "系统标识", dataIndex: "resultId" },
              ]}
              expandable={{
                expandedRowRender: (row) => (
                  <Space wrap>
                    {Object.entries(row.values).map(([key, value]) => (
                      <Typography.Text key={key}>
                        {template?.fields.find((field) => field.key === key)
                          ?.label ?? key}
                        ：
                        {Array.isArray(value)
                          ? value.join("、")
                          : String(value ?? "空")}
                      </Typography.Text>
                    ))}
                  </Space>
                ),
              }}
            />
            {template?.canImport && (
              <Space>
                <Popconfirm
                  title={`确认处理选中的 ${selected.length} 行？合格行将保存。`}
                  onConfirm={() => void confirm()}
                  disabled={!selected.length || busy}
                >
                  <Button
                    type="primary"
                    disabled={!selected.length || busy}
                    loading={busy}
                    aria-label="确认或重试选中行"
                    aria-busy={busy}
                  >
                    确认或重试选中行
                  </Button>
                </Popconfirm>
                <Button disabled={busy} onClick={() => void read(batch.id)}>
                  回读最新批次
                </Button>
              </Space>
            )}
          </>
        )}
      </Drawer>
    </>
  );
}
