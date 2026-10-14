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
  Typography,
} from "antd";
import { api, ApiError, errorText } from "../services/api";
interface Definition {
  name: string;
  version: string;
  targetType: "project" | "metric";
  targetId: string;
  unit: string;
  direction: "higher" | "lower" | "within";
  minimum: number;
  maximum: number;
  applicability: string;
  ageMinimum?: number;
  ageMaximum?: number;
  ageReferenceDate?: string;
  teamLevel?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  basis: "trial" | "official";
  reference: string;
  modelVersionId?: string;
}
interface Version {
  id: string;
  status: string;
  definition: Definition;
  revision: string;
  issues: string[];
}
interface Detail {
  record: Version;
  history: Array<{
    id: number;
    actor: string;
    action: string;
    occurredAt: string;
  }>;
}
interface Catalog {
  items: Array<{ id: string; name: string; unit?: string; valueKind: string }>;
  metrics: Array<{
    id: string;
    name: string;
    unit?: string;
    valueKind: string;
  }>;
}
const statusNames: Record<string, string> = {
  draft: "草稿",
  active: "已发布",
  archived: "已停用",
  create: "新增",
  update: "修改",
  publish: "发布",
  deactivate: "停用",
};
const issueNames: Record<string, string> = {
  invalid_standard_target: "目标不可用",
  standard_unit_mismatch: "单位与目标定义不一致",
  invalid_standard_range: "参考范围无效",
  age_reference_required: "年龄条件须指定参考日期",
  invalid_age_range: "年龄范围无效",
  invalid_effective_dates: "生效日期范围无效",
  invalid_model_output: "须关联已发布模型的对应输出",
};
export default function Standards({ canWrite }: { canWrite: boolean }) {
  const { message } = App.useApp();
  const action = useRef<ActionType>();
  const [form] = Form.useForm<Definition>();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Detail>();
  const [source, setSource] = useState<Version>();
  const [catalog, setCatalog] = useState<Catalog>({ items: [], metrics: [] });
  const [models, setModels] = useState<
    Array<{
      id: string;
      status: string;
      definition: {
        name: string;
        version: string;
        outputs: Array<{ metricId: string }>;
      };
    }>
  >([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [latest, setLatest] = useState<Version>();
  const [value, setValue] = useState<number | null>(null);
  const [comparison, setComparison] = useState<boolean>();
  const generation = useRef(0);
  const pending = useRef<{ hash: string; requestId: string }>();
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  const writable = canWrite && (!detail || detail.record.status === "draft");
  async function edit(row?: Version, copy = false) {
    const current = ++generation.current;
    setOpen(true);
    setBusy(true);
    setError("");
    setDetail(undefined);
    setSource(undefined);
    setLatest(undefined);
    setComparison(undefined);
    pending.current = undefined;
    form.resetFields();
    try {
      const [c, m, d] = await Promise.all([
        api<Catalog>("model-catalog"),
        api<typeof models>("models"),
        row ? api<Detail>(`standards/${row.id}`) : Promise.resolve(undefined),
      ]);
      if (current !== generation.current) return;
      setCatalog(c);
      setModels(m);
      setDetail(copy ? undefined : d);
      setSource(copy ? d?.record : undefined);
      form.setFieldsValue(
        d
          ? {
              ...d.record.definition,
              ...(copy
                ? {
                    version: `${d.record.definition.version}-copy`,
                    basis: "trial" as const,
                    reference: "",
                  }
                : {}),
            }
          : {
              name: "",
              version: "1",
              targetType: "project",
              direction: "within",
              basis: "trial",
              reference: "",
              applicability: "",
              effectiveFrom: new Date().toLocaleDateString("en-CA"),
            },
      );
    } catch (e) {
      setError(errorText(e));
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }
  async function save() {
    if (busy) return;
    let definition: Definition;
    try {
      definition = await form.validateFields();
      for (const key of [
        "ageReferenceDate",
        "teamLevel",
        "effectiveTo",
        "modelVersionId",
      ] as const)
        if (!definition[key]) delete definition[key];
      for (const key of ["ageMinimum", "ageMaximum"] as const)
        if (definition[key] == null) delete definition[key];
    } catch {
      return;
    }
    const body = {
      definition,
      expectedRevision: detail?.record.revision ?? null,
      ...(source
        ? { sourceId: source.id, sourceRevision: source.revision }
        : {}),
    };
    const hash = JSON.stringify(body);
    if (pending.current?.hash !== hash)
      pending.current = { hash, requestId: crypto.randomUUID() };
    setBusy(true);
    setError("");
    try {
      const row = await api<Version>(
        detail ? `standards/${detail.record.id}` : "standards",
        {
          method: detail ? "PUT" : "POST",
          body: { ...body, requestId: pending.current.requestId },
        },
      );
      setDetail(await api<Detail>(`standards/${row.id}`));
      setSource(undefined);
      pending.current = undefined;
      void action.current?.reload();
      void message.success("标准草稿已保存");
    } catch (e) {
      setError(errorText(e));
      if (e instanceof ApiError && e.code === "revision_conflict")
        setLatest((await api<Detail>(`standards/${detail!.record.id}`)).record);
    } finally {
      setBusy(false);
    }
  }
  async function transition(name: "publish" | "deactivate") {
    if (!detail || busy) return;
    setBusy(true);
    try {
      await api(`standards/${detail.record.id}/transitions`, {
        method: "POST",
        body: {
          action: name,
          expectedRevision: detail.record.revision,
          requestId: crypto.randomUUID(),
        },
      });
      setDetail(await api<Detail>(`standards/${detail.record.id}`));
      void action.current?.reload();
      setError("");
    } catch (e) {
      setError(
        e instanceof ApiError && e.code === "formal_standard_required"
          ? "发布须填写正式核定依据。"
          : errorText(e),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <ProTable<Version>
        actionRef={action}
        rowKey="id"
        search={false}
        headerTitle="培养标准版本"
        request={async () => {
          try {
            const data = await api<Version[]>("standards");
            return { data, total: data.length, success: true };
          } catch (e) {
            setError(errorText(e));
            return { data: [], success: false };
          }
        }}
        toolBarRender={() => [
          canWrite && (
            <Button key="new" type="primary" onClick={() => void edit()}>
              新增培养标准
            </Button>
          ),
        ]}
        columns={[
          { title: "名称", render: (_, r) => r.definition.name },
          { title: "版本", render: (_, r) => r.definition.version },
          { title: "状态", render: (_, r) => statusNames[r.status] },
          { title: "适用条件", render: (_, r) => r.definition.applicability },
          { title: "生效日期", render: (_, r) => r.definition.effectiveFrom },
          {
            title: "操作",
            valueType: "option",
            render: (_, r) => [
              <Button key="edit" type="link" onClick={() => void edit(r)}>
                查看 / 配置
              </Button>,
              canWrite && (
                <Button
                  key="copy"
                  type="link"
                  onClick={() => void edit(r, true)}
                >
                  复制为新版本
                </Button>
              ),
            ],
          },
        ]}
      />
      {error && !open && <Alert type="error" message={error} />}
      <Drawer
        width={Math.min(800, window.innerWidth - 24)}
        title="培养标准"
        open={open}
        destroyOnClose
        onClose={() => {
          if (!busy) {
            generation.current++;
            setOpen(false);
          }
        }}
        extra={
          <Space>
            {writable && (
              <Button
                type="primary"
                loading={busy}
                aria-label="保存草稿"
                aria-busy={busy}
                disabled={Boolean(latest)}
                onClick={() => void save()}
              >
                保存草稿
              </Button>
            )}
            {writable && detail && (
              <Popconfirm
                title="确认发布此已保存版本？"
                onConfirm={() => transition("publish")}
              >
                <Button loading={busy} aria-busy={busy} aria-label="发布">
                  发布
                </Button>
              </Popconfirm>
            )}
            {detail?.record.status === "active" && canWrite && (
              <Popconfirm
                title="确认停用此版本？"
                onConfirm={() => transition("deactivate")}
              >
                <Button loading={busy} aria-busy={busy} aria-label="停用">
                  停用
                </Button>
              </Popconfirm>
            )}
          </Space>
        }
      >
        <Alert
          type="info"
          message="标准由专业人员明确选择"
          description="涉及年龄时须记录参考日期，由专业人员核对年龄、适用条件及重叠标准；试比不自动改变学员评价。"
        />
        {error && <Alert type="error" message={error} />}{" "}
        {latest && (
          <Alert
            type="warning"
            message="版本已更新，当前输入保留。"
            action={
              <Button
                onClick={() => {
                  form.setFieldsValue(latest.definition);
                  setDetail(detail ? { ...detail, record: latest } : undefined);
                  setLatest(undefined);
                }}
              >
                放弃输入并载入最新
              </Button>
            }
          />
        )}
        <Form form={form} layout="vertical" disabled={!writable || busy}>
          <Space>
            <Form.Item
              name="name"
              label="标准名称"
              rules={[{ required: true }]}
            >
              <Input maxLength={100} />
            </Form.Item>
            <Form.Item name="version" label="版本" rules={[{ required: true }]}>
              <Input maxLength={32} />
            </Form.Item>
            <Form.Item name="targetType" label="关联目标类型">
              <Select
                onChange={() =>
                  form.setFieldsValue({
                    targetId: undefined,
                    modelVersionId: undefined,
                  })
                }
                options={[
                  { value: "project", label: "采集项目" },
                  { value: "metric", label: "分值指标或模型输出" },
                ]}
              />
            </Form.Item>
          </Space>
          <Form.Item shouldUpdate noStyle>
            {() => {
              const kind = form.getFieldValue("targetType"),
                options = kind === "project" ? catalog.items : catalog.metrics;
              return (
                <Form.Item
                  name="targetId"
                  label="关联项目或输出"
                  rules={[{ required: true }]}
                >
                  <Select
                    showSearch
                    optionFilterProp="label"
                    options={options.map((o) => ({
                      value: o.id,
                      label: `${o.name} · ${o.unit ?? o.valueKind}`,
                    }))}
                  />
                </Form.Item>
              );
            }}
          </Form.Item>
          <Form.Item
            name="modelVersionId"
            label="固定模型版本（比较模型输出时）"
          >
            <Select
              allowClear
              options={models
                .filter((m) => m.status === "active")
                .map((m) => ({
                  value: m.id,
                  label: `${m.definition.name} · ${m.definition.version}`,
                }))}
            />
          </Form.Item>
          <Space wrap>
            <Form.Item
              name="unit"
              label="比较单位"
              rules={[{ required: true }]}
            >
              <Input maxLength={32} />
            </Form.Item>
            <Form.Item name="direction" label="比较方向">
              <Select
                options={[
                  { value: "higher", label: "不低于下限" },
                  { value: "lower", label: "不高于上限" },
                  { value: "within", label: "位于参考区间" },
                ]}
              />
            </Form.Item>
            <Form.Item
              name="minimum"
              label="参考下限"
              rules={[{ required: true }]}
            >
              <InputNumber />
            </Form.Item>
            <Form.Item
              name="maximum"
              label="参考上限"
              rules={[{ required: true }]}
            >
              <InputNumber />
            </Form.Item>
          </Space>
          <Form.Item
            name="applicability"
            label="适用条件"
            rules={[{ required: true }]}
          >
            <Input.TextArea maxLength={500} />
          </Form.Item>
          <Space wrap>
            <Form.Item name="ageMinimum" label="最低年龄">
              <InputNumber min={0} max={120} />
            </Form.Item>
            <Form.Item name="ageMaximum" label="最高年龄">
              <InputNumber min={0} max={120} />
            </Form.Item>
            <Form.Item name="ageReferenceDate" label="年龄参考日期">
              <Input type="date" />
            </Form.Item>
            <Form.Item name="teamLevel" label="队伍水平">
              <Input maxLength={32} />
            </Form.Item>
          </Space>
          <Space>
            <Form.Item
              name="effectiveFrom"
              label="生效日期"
              rules={[{ required: true }]}
            >
              <Input type="date" />
            </Form.Item>
            <Form.Item name="effectiveTo" label="结束日期">
              <Input type="date" />
            </Form.Item>
            <Form.Item name="basis" label="依据性质">
              <Select
                options={[
                  { value: "trial", label: "试验配置" },
                  { value: "official", label: "正式依据" },
                ]}
              />
            </Form.Item>
          </Space>
          <Form.Item name="reference" label="正式依据与核定说明">
            <Input.TextArea maxLength={1000} />
          </Form.Item>
        </Form>
        {detail?.record.issues.length ? (
          <Alert
            type="warning"
            message="发布校验"
            description={detail.record.issues.map((i) => (
              <div key={i}>{issueNames[i] ?? i}</div>
            ))}
          />
        ) : null}
        {detail && (
          <>
            <Typography.Title level={5}>已保存标准试比</Typography.Title>
            <Space>
              <InputNumber value={value} onChange={(v) => setValue(v)} />
              <Typography.Text>{detail.record.definition.unit}</Typography.Text>
              <Button
                disabled={value === null || busy}
                onClick={async () => {
                  try {
                    const result = await api<{ meetsReference: boolean }>(
                      `standards/${detail.record.id}/compare`,
                      {
                        method: "POST",
                        body: { value, unit: detail.record.definition.unit },
                      },
                    );
                    setComparison(result.meetsReference);
                    setError("");
                  } catch (e) {
                    setError(errorText(e));
                  }
                }}
              >
                试比
              </Button>
            </Space>
            {comparison !== undefined && (
              <Alert
                type="info"
                message={comparison ? "满足此参考条件" : "未满足此参考条件"}
                description="请核对适用人群、参考日期和依据后作出专业评价。"
              />
            )}
            <Typography.Title level={5}>修改历史</Typography.Title>
            {detail.history.map((h) => (
              <p key={h.id}>
                {statusNames[h.action] ?? h.action} · {h.actor} ·{" "}
                {new Date(h.occurredAt).toLocaleString("zh-CN")}
              </p>
            ))}
          </>
        )}
      </Drawer>
    </>
  );
}
