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
  Popconfirm,
  Select,
  Space,
  Spin,
  Switch,
  Tabs,
  Typography,
} from "antd";
import { api, ApiError, errorText } from "../services/api";
const kindNames: Record<string, string> = {
  rating_1_5: "1–5 量表",
  score_0_100: "0–100 分",
  count: "次数",
  percentage: "百分比",
  duration_minutes: "分钟",
  duration_seconds: "秒",
  distance_meters: "米",
  measurement: "数值测量",
  tag: "标签",
  text: "文本",
};
const actionNames: Record<string, string> = {
  create: "新增",
  update: "修改",
  publish: "发布",
  deactivate: "停用",
};
interface Rule {
  lower: number;
  upper: number;
  lowerInclusive: boolean;
  upperInclusive: boolean;
  score?: number;
  grade?: string;
}
interface Definition {
  name: string;
  stage: "raw_score" | "score_grade";
  unit: string;
  minimum: number;
  maximum: number;
  applicability: string;
  basis: "trial" | "official";
  reference: string;
  rules: Rule[];
}
interface Version {
  id: string;
  testItemId: string;
  status: "draft" | "active" | "archived";
  definition: Definition;
  revision: string;
  issues: Array<{ code: string; rule?: number }>;
}
interface Item {
  id: string;
  name: string;
  valueKind: string;
  unit?: string;
}
interface Detail {
  record: Version;
  history: Array<{
    id: number;
    actor: string;
    occurredAt: string;
    action: string;
    before: { definition?: Definition } | null;
    after: { definition?: Definition } | null;
  }>;
}
const stages = {
  raw_score: "原始成绩 → 整数分值",
  score_grade: "整数分值 → 等级",
};
const issueNames: Record<string, string> = {
  definition_required: "请填写名称、单位和适用条件",
  invalid_domain: "输入范围无效",
  rules_required: "至少添加一条区间",
  invalid_interval: "区间无效",
  invalid_output: "输出须为整数分值或有效等级",
  outside_domain: "区间超出输入范围",
  domain_gap: "区间未覆盖全部输入",
  interval_overlap: "区间交叠",
};
function showError(error: unknown) {
  if (error instanceof ApiError && error.code === "formal_standard_required")
    return "请填写已核定的正式标准依据；试验配置可保存和试算。";
  if (error instanceof ApiError && error.code === "mapping_unit_mismatch")
    return "单位须与项目定义一致，等级映射的输入单位为 score。";
  if (error instanceof ApiError && error.code === "invalid_mapping_trial")
    return "此版本区间尚不完整，或试算值/单位不在配置范围内。";
  return errorText(error);
}
const defaultUnit = (item?: Item) =>
  item?.unit ??
  (
    {
      score_0_100: "score",
      rating_1_5: "score",
      count: "count",
      percentage: "%",
      duration_minutes: "min",
      duration_seconds: "s",
      distance_meters: "m",
    } as Record<string, string>
  )[item?.valueKind ?? ""] ??
  "";
export default function Mappings({ canWrite }: { canWrite: boolean }) {
  const { message } = App.useApp(),
    action = useRef<ActionType>(),
    [form] = Form.useForm();
  const [items, setItems] = useState<Item[]>([]),
    [error, setError] = useState(""),
    [open, setOpen] = useState(false),
    [loading, setLoading] = useState(false),
    [saving, setSaving] = useState(false),
    [detail, setDetail] = useState<Detail>(),
    [source, setSource] = useState<Version>(),
    [conflict, setConflict] = useState(false),
    [trialValue, setTrialValue] = useState<number | null>(null),
    [trial, setTrial] = useState<string>("");
  const generation = useRef(0),
    pending = useRef<{ body: string; requestId: string }>();
  const stage = Form.useWatch(["definition", "stage"], form) as
    Definition["stage"] | undefined;
  useEffect(() => {
    void api<Item[]>("mapping-items")
      .then(setItems)
      .catch((e) => setError(showError(e)));
    return () => {
      generation.current++;
    };
  }, []);
  const close = () => {
    if (!saving) {
      generation.current++;
      setOpen(false);
    }
  };
  async function edit(row?: Version, copy = false) {
    const current = ++generation.current;
    setOpen(true);
    setLoading(true);
    setError("");
    setDetail(undefined);
    setSource(undefined);
    setConflict(false);
    setTrial("");
    setTrialValue(null);
    pending.current = undefined;
    form.resetFields();
    try {
      const data = row
        ? await api<Detail>(`mappings/${encodeURIComponent(row.id)}`)
        : undefined;
      if (current !== generation.current) return;
      if (copy) setSource(data?.record);
      else setDetail(data);
      form.setFieldsValue(
        data
          ? {
              testItemId: data.record.testItemId,
              definition: {
                ...data.record.definition,
                ...(copy ? { basis: "trial", reference: "" } : {}),
              },
            }
          : {
              definition: {
                stage: "raw_score",
                basis: "trial",
                reference: "",
                minimum: 0,
                maximum: 100,
                rules: [],
              },
            },
      );
    } catch (e) {
      if (current === generation.current) setError(showError(e));
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }
  async function transition(row: Version, operation: "publish" | "deactivate") {
    if (saving) return;
    setSaving(true);
    try {
      await api(`mappings/${encodeURIComponent(row.id)}/transitions`, {
        method: "POST",
        body: {
          action: operation,
          expectedRevision: row.revision,
          requestId: crypto.randomUUID(),
        },
      });
      void message.success(
        operation === "publish" ? "规则版本已发布" : "规则版本已停用",
      );
      await action.current?.reload();
    } catch (e) {
      void message.error(showError(e));
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <Typography.Paragraph type="secondary">
        分别配置两段映射，保留原始精度与规则版本。缺正式标准时使用草稿和试算；已发布版本保持不变，修订须复制。适用条件需要与测评任务的版本选择一起核对。
      </Typography.Paragraph>
      {error && !open && <Alert type="error" message={error} />}
      <Tabs
        items={[
          {
            key: "versions",
            label: "映射版本",
            children: (
              <ProTable<Version>
                actionRef={action}
                rowKey="id"
                search={false}
                headerTitle="测评评分规则"
                columns={[
                  { title: "名称", render: (_, row) => row.definition.name },
                  {
                    title: "项目",
                    render: (_, row) =>
                      items.find((i) => i.id === row.testItemId)?.name ??
                      row.testItemId,
                  },
                  {
                    title: "映射",
                    render: (_, row) => stages[row.definition.stage],
                  },
                  { title: "单位", render: (_, row) => row.definition.unit },
                  {
                    title: "状态",
                    dataIndex: "status",
                    valueEnum: {
                      draft: "草稿",
                      active: "已发布",
                      archived: "已停用",
                    },
                  },
                  {
                    title: "校验",
                    render: (_, row) =>
                      row.issues.length
                        ? `${row.issues.length} 项待修正`
                        : "区间校验通过",
                  },
                  {
                    title: "操作",
                    valueType: "option",
                    render: (_, row) => (
                      <Space wrap>
                        <Button type="link" onClick={() => void edit(row)}>
                          详情
                          {canWrite && row.status === "draft" ? " / 编辑" : ""}
                        </Button>
                        {canWrite && (
                          <>
                            <Button
                              type="link"
                              onClick={() => void edit(row, true)}
                            >
                              复制为新版本
                            </Button>
                            {row.status === "draft" ? (
                              <Popconfirm
                                title="发布此规则版本？"
                                description="发布后内容固定，后续修改需要创建新版本。"
                                onConfirm={() => transition(row, "publish")}
                              >
                                <Button
                                  type="link"
                                  disabled={saving || row.issues.length > 0}
                                >
                                  发布
                                </Button>
                              </Popconfirm>
                            ) : row.status === "active" ? (
                              <Popconfirm
                                title="停止新任务使用此版本？"
                                description="已有历史结果继续保留。"
                                onConfirm={() => transition(row, "deactivate")}
                              >
                                <Button type="link" disabled={saving}>
                                  停用
                                </Button>
                              </Popconfirm>
                            ) : null}
                          </>
                        )}
                      </Space>
                    ),
                  },
                ]}
                request={async () => {
                  try {
                    const rows = await api<Version[]>("mappings");
                    setError("");
                    return { data: rows, total: rows.length, success: true };
                  } catch (e) {
                    setError(showError(e));
                    return { data: [], success: false };
                  }
                }}
                toolBarRender={() =>
                  canWrite
                    ? [
                        <Button
                          key="new"
                          type="primary"
                          onClick={() => void edit()}
                        >
                          新增映射草稿
                        </Button>,
                      ]
                    : []
                }
              />
            ),
          },
          {
            key: "items",
            label: "采集项目",
            children: (
              <ProTable<Item>
                rowKey="id"
                search={false}
                dataSource={items}
                columns={[
                  { title: "项目名称", dataIndex: "name" },
                  {
                    title: "数据类型",
                    dataIndex: "valueKind",
                    render: (_, row) =>
                      kindNames[row.valueKind] ?? row.valueKind,
                  },
                  { title: "单位", dataIndex: "unit" },
                ]}
              />
            ),
          },
        ]}
      />
      <Drawer
        open={open}
        title={
          source ? "复制规则版本" : detail ? "规则版本详情" : "新增映射草稿"
        }
        width={900}
        destroyOnClose
        onClose={close}
        footer={
          <Space>
            <Button onClick={close} disabled={saving}>
              关闭
            </Button>
            {canWrite && (!detail || detail.record.status === "draft") && (
              <Button
                type="primary"
                loading={saving}
                disabled={loading || conflict}
                onClick={() => form.submit()}
              >
                保存草稿
              </Button>
            )}
          </Space>
        }
      >
        {error && <Alert type="error" message={error} />}
        {conflict && (
          <Alert
            type="warning"
            message="版本或来源已变化，输入已保留。请重新读取并核对。"
            action={
              <Button
                onClick={() =>
                  void edit(detail?.record ?? source, Boolean(source))
                }
              >
                重新读取
              </Button>
            }
          />
        )}
        {loading ? (
          <Spin />
        ) : (
          <Form
            form={form}
            layout="vertical"
            disabled={
              saving ||
              !canWrite ||
              Boolean(detail && detail.record.status !== "draft")
            }
            onFinish={async (values) => {
              if (saving || conflict) return;
              const body = {
                  ...values,
                  expectedRevision: detail?.record.revision ?? null,
                  ...(source
                    ? { sourceId: source.id, sourceRevision: source.revision }
                    : {}),
                },
                serialized = JSON.stringify(body);
              if (pending.current?.body !== serialized)
                pending.current = {
                  body: serialized,
                  requestId: crypto.randomUUID(),
                };
              setSaving(true);
              try {
                await api(
                  `mappings${detail ? `/${encodeURIComponent(detail.record.id)}` : ""}`,
                  {
                    method: detail ? "PUT" : "POST",
                    body: { ...body, requestId: pending.current!.requestId },
                  },
                );
                void message.success("草稿已保存");
                setOpen(false);
                await action.current?.reload();
              } catch (e) {
                setError(showError(e));
                if (e instanceof ApiError && e.status === 409)
                  setConflict(true);
              } finally {
                setSaving(false);
              }
            }}
          >
            <Form.Item
              name="testItemId"
              label="采集项目"
              rules={[{ required: true }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                disabled={Boolean(detail || source)}
                options={items.map((item) => ({
                  value: item.id,
                  label: item.name,
                }))}
                onChange={(value) =>
                  form.setFieldValue(
                    ["definition", "unit"],
                    stage === "score_grade"
                      ? "score"
                      : defaultUnit(items.find((i) => i.id === value)),
                  )
                }
              />
            </Form.Item>
            <Form.Item
              name={["definition", "name"]}
              label="规则名称"
              rules={[{ required: true }]}
            >
              <Input maxLength={100} />
            </Form.Item>
            <Form.Item
              name={["definition", "stage"]}
              label="映射阶段"
              rules={[{ required: true }]}
            >
              <Select
                disabled={Boolean(detail || source)}
                options={Object.entries(stages).map(([value, label]) => ({
                  value,
                  label,
                }))}
                onChange={(value) => {
                  form.setFieldValue(["definition", "rules"], []);
                  form.setFieldValue(
                    ["definition", "unit"],
                    value === "score_grade"
                      ? "score"
                      : defaultUnit(
                          items.find(
                            (i) => i.id === form.getFieldValue("testItemId"),
                          ),
                        ),
                  );
                }}
              />
            </Form.Item>
            <Space>
              <Form.Item
                name={["definition", "unit"]}
                label="输入单位"
                rules={[{ required: true }]}
              >
                <Input maxLength={32} />
              </Form.Item>
              <Form.Item
                name={["definition", "minimum"]}
                label="输入最小值"
                rules={[{ required: true }]}
              >
                <InputNumber
                  precision={stage === "score_grade" ? 0 : undefined}
                />
              </Form.Item>
              <Form.Item
                name={["definition", "maximum"]}
                label="输入最大值"
                rules={[{ required: true }]}
              >
                <InputNumber
                  precision={stage === "score_grade" ? 0 : undefined}
                />
              </Form.Item>
            </Space>
            <Form.Item
              name={["definition", "applicability"]}
              label="适用条件"
              rules={[{ required: true }]}
            >
              <Input.TextArea
                maxLength={500}
                rows={2}
                placeholder="注明适用人群、测量方法和条件"
              />
            </Form.Item>
            <Form.Item
              name={["definition", "basis"]}
              label="标准依据"
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { value: "trial", label: "试验配置，仅草稿与试算" },
                  { value: "official", label: "已核定正式标准" },
                ]}
              />
            </Form.Item>
            <Form.Item
              name={["definition", "reference"]}
              label="依据文档 / 来源说明"
            >
              <Input.TextArea maxLength={1000} rows={2} />
            </Form.Item>
            <Form.List name={["definition", "rules"]}>
              {(fields, { add, remove }) => (
                <>
                  <Typography.Title level={5}>区间规则</Typography.Title>
                  {fields.map((field, index) => (
                    <section key={field.key} className="history-entry">
                      <Space align="start" wrap>
                        <Form.Item
                          name={[field.name, "lower"]}
                          label={`区间 ${index + 1} 下界`}
                          rules={[{ required: true }]}
                        >
                          <InputNumber
                            precision={stage === "score_grade" ? 0 : undefined}
                          />
                        </Form.Item>
                        <Form.Item
                          name={[field.name, "lowerInclusive"]}
                          label="包含下界"
                          valuePropName="checked"
                        >
                          <Switch />
                        </Form.Item>
                        <Form.Item
                          name={[field.name, "upper"]}
                          label="上界"
                          rules={[{ required: true }]}
                        >
                          <InputNumber
                            precision={stage === "score_grade" ? 0 : undefined}
                          />
                        </Form.Item>
                        <Form.Item
                          name={[field.name, "upperInclusive"]}
                          label="包含上界"
                          valuePropName="checked"
                        >
                          <Switch />
                        </Form.Item>
                        {stage === "score_grade" ? (
                          <Form.Item
                            name={[field.name, "grade"]}
                            label="评价等级"
                            rules={[{ required: true }]}
                          >
                            <Input maxLength={32} style={{ width: 110 }} />
                          </Form.Item>
                        ) : (
                          <Form.Item
                            name={[field.name, "score"]}
                            label="整数分值"
                            rules={[{ required: true }]}
                          >
                            <InputNumber min={0} max={1000000} precision={0} />
                          </Form.Item>
                        )}
                        <Button onClick={() => remove(field.name)}>移除</Button>
                      </Space>
                    </section>
                  ))}
                  <Button
                    onClick={() =>
                      add({ lowerInclusive: true, upperInclusive: false })
                    }
                  >
                    添加区间
                  </Button>
                </>
              )}
            </Form.List>
          </Form>
        )}
        {detail && (
          <>
            <Typography.Title level={5}>已保存版本校验与试算</Typography.Title>
            {detail.record.issues.length ? (
              <Alert
                type="warning"
                message={detail.record.issues
                  .map(
                    (issue) =>
                      `${issue.rule === undefined ? "" : `区间 ${issue.rule + 1}：`}${issueNames[issue.code] ?? issue.code}`,
                  )
                  .join("；")}
              />
            ) : (
              <Typography.Paragraph>
                区间校验通过；试算不会写入学员成绩。
              </Typography.Paragraph>
            )}
            <Space>
              <InputNumber
                aria-label="试算输入"
                value={trialValue}
                onChange={setTrialValue}
                precision={
                  detail.record.definition.stage === "score_grade"
                    ? 0
                    : undefined
                }
              />
              <span>{detail.record.definition.unit}</span>
              <Button
                disabled={trialValue === null || loading}
                onClick={async () => {
                  try {
                    const result = await api<{
                      score?: number;
                      grade?: string;
                    }>(
                      `mappings/${encodeURIComponent(detail.record.id)}/trial`,
                      {
                        method: "POST",
                        body: {
                          value: trialValue,
                          unit: detail.record.definition.unit,
                        },
                      },
                    );
                    setTrial(
                      result.score !== undefined
                        ? `整数分值：${result.score}`
                        : `评价等级：${result.grade}`,
                    );
                  } catch (e) {
                    setTrial(showError(e));
                  }
                }}
              >
                试算已保存版本
              </Button>
            </Space>
            {trial && <Typography.Paragraph>{trial}</Typography.Paragraph>}
            <Typography.Title level={5}>操作历史</Typography.Title>
            {detail.history.map((item) => (
              <section className="history-entry" key={item.id}>
                {item.actor} · {actionNames[item.action] ?? item.action} ·{" "}
                {new Date(item.occurredAt).toLocaleString("zh-CN")}
                <br />
                规则：{item.before?.definition?.name ?? "—"} →{" "}
                {item.after?.definition?.name ?? "—"}
                <br />
                {item.after?.definition?.rules
                  .map(
                    (rule) =>
                      `${rule.lowerInclusive ? "[" : "("}${rule.lower}, ${rule.upper}${rule.upperInclusive ? "]" : ")"} → ${rule.score ?? rule.grade}`,
                  )
                  .join("；")}
              </section>
            ))}
          </>
        )}
      </Drawer>
    </>
  );
}
