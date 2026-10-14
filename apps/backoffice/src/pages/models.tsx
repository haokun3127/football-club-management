import ModelDisplay, { type Display } from "./model-display";
import { useEffect, useRef, useState } from "react";
import { ProTable, type ActionType } from "@ant-design/pro-components";
import {
  Alert,
  App,
  Button,
  Card,
  Drawer,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  Typography,
} from "antd";
import { api, ApiError, errorText } from "../services/api";
interface Definition {
  name: string;
  version: string;
  applicability: string;
  basis: "trial" | "official";
  reference: string;
  ageGroup?: string;
  teamLevel?: string;
  references?: Array<{
    versionId: string;
    metricId: string;
    selection: "same_assessment";
  }>;
  inputs: Array<{
    testItemId: string;
    scoreMappingVersionId?: string;
    gradeMappingVersionId?: string;
  }>;
  outputs: Array<{
    metricId: string;
    method: string;
    inputs: Array<{ metricId: string; weight: number }>;
    rounding: string;
    inputScale?: number;
    maxScore?: number;
  }>;
}
interface Model {
  id: string;
  templateId: string;
  scope: string;
  status: string;
  definition: Definition;
  legacy: boolean;
  canEdit: boolean;
  revision: string;
  display?: Display;
  issues: Array<{ code: string; objectId?: string }>;
}
interface Detail {
  record: Model;
  displayHistory: Array<{
    id: number;
    actor: string;
    action: string;
    occurredAt: string;
  }>;
  history: Array<{
    id: number;
    actor: string;
    action: string;
    occurredAt: string;
  }>;
}
interface Catalog {
  items: Array<{
    id: string;
    name: string;
    metricId: string;
    valueKind: string;
    unit?: string;
    status?: string;
  }>;
  metrics: Array<{
    id: string;
    name: string;
    metricKind: string;
    maxScore?: number;
    status?: string;
  }>;
}
interface Mapping {
  id: string;
  testItemId: string;
  status: string;
  definition: { name: string; stage: string };
}
const labels: Record<string, string> = {
  draft: "草稿",
  active: "已发布",
  archived: "已停用",
  create: "新增",
  update: "修改",
  publish: "发布",
  deactivate: "停用",
};
const issueLabels: Record<string, string> = {
  model_inputs_required: "请选择采集项目",
  model_applicability_required: "请填写适用条件",
  invalid_project: "项目或指标已停用",
  duplicate_input_metric: "多个项目对应同一指标",
  invalid_mapping_binding: "两段映射不匹配",
  formal_mapping_required: "须绑定已发布的正式映射",
  invalid_mapping_definition: "映射单位、范围或等级覆盖不完整",
  score_scale_mismatch: "映射分值超出上限",
  project_mappings_required: "正式发布须配置该项目的两段映射",
  input_unit_mismatch: "输入指标须声明分值单位和上限",
  duplicate_model_output: "输出指标重复",
  invalid_output_metric: "输出指标无效",
  invalid_output_inputs: "输出输入关联无效",
  missing_model_input: "未纳入的输入",
  sum_weights_must_be_one: "求和权重须为1",
  normalization_parameters_required: "请填写归一参数",
  model_graph_invalid: "关联不完整或存在循环",
  output_scale_mismatch: "计算上限与指标声明不一致",
};
const valueKeys: Record<string, string> = {
  score_0_100: "score",
  rating_1_5: "score",
  count: "count",
  percentage: "percentage",
  duration_minutes: "minutes",
  duration_seconds: "seconds",
  distance_meters: "meters",
  measurement: "value",
};
const showError = (e: unknown) =>
  e instanceof ApiError && e.code === "formal_standard_required"
    ? "发布须有已核定的正式依据。"
    : errorText(e);
export default function Models({ canWrite }: { canWrite: boolean }) {
  const { message } = App.useApp();
  const action = useRef<ActionType>();
  const [form] = Form.useForm<Definition>();
  const [catalog, setCatalog] = useState<Catalog>({ items: [], metrics: [] });
  const [versions, setVersions] = useState<Model[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Detail>();
  const [source, setSource] = useState<Model>();
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [latest, setLatest] = useState<Model>();
  const [trial, setTrial] = useState<Record<string, number>>({});
  const [outputs, setOutputs] = useState<
    Array<{
      metricId: string;
      value: { value?: number; score?: number; unit?: string };
    }>
  >();
  const generation = useRef(0);
  const pending = useRef<{ hash: string; requestId: string }>();
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  const writable = canWrite && (!detail || detail.record.canEdit);
  const metricName = (id: string) =>
    catalog.metrics.find((m) => m.id === id)?.name ?? id;
  async function edit(row?: Model, copy = false) {
    const current = ++generation.current;
    setOpen(true);
    setBusy(true);
    setError("");
    setLatest(undefined);
    setDetail(undefined);
    setSource(undefined);
    setTrial({});
    setOutputs(undefined);
    pending.current = undefined;
    form.resetFields();
    try {
      const [c, m, d, v] = await Promise.all([
        api<Catalog>("model-catalog"),
        api<Mapping[]>("mappings"),
        row ? api<Detail>(`models/${row.id}`) : Promise.resolve(undefined),
        api<Model[]>("models"),
      ]);
      if (current !== generation.current) return;
      setCatalog(c);
      setVersions(v);
      setMappings(m);
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
              applicability: "",
              basis: "trial",
              reference: "",
              inputs: [],
              outputs: [],
            },
      );
    } catch (e) {
      if (current === generation.current) setError(showError(e));
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }
  async function save() {
    if (saving) return;
    let definition: Definition;
    try {
      definition = await form.validateFields();
      definition = {
        ...definition,
        ageGroup: definition.ageGroup?.trim() || undefined,
        teamLevel: definition.teamLevel?.trim() || undefined,
        outputs: definition.outputs.map((output) => ({
          ...output,
          inputScale: output.inputScale ?? undefined,
          maxScore: output.maxScore ?? undefined,
        })),
      };
    } catch {
      return;
    }
    const body = {
      definition,
      expectedRevision: detail?.record.revision ?? null,
      ...(source
        ? {
            sourceId: source.id,
            sourceRevision: source.revision,
            ...(source.scope === "club"
              ? { templateId: source.templateId }
              : {}),
          }
        : {}),
    };
    const hash = JSON.stringify(body);
    if (pending.current?.hash !== hash)
      pending.current = { hash, requestId: crypto.randomUUID() };
    setSaving(true);
    setError("");
    try {
      const result = await api<Model>(
        detail ? `models/${detail.record.id}` : "models",
        {
          method: detail ? "PUT" : "POST",
          body: { ...body, requestId: pending.current.requestId },
        },
      );
      setDetail(await api<Detail>(`models/${result.id}`));
      setSource(undefined);
      pending.current = undefined;
      setOutputs(undefined);
      void message.success("模型草稿已保存");
      void action.current?.reload();
    } catch (e) {
      setError(showError(e));
      if (e instanceof ApiError && e.code === "revision_conflict")
        try {
          setLatest((await api<Detail>(`models/${detail!.record.id}`)).record);
        } catch {
          // Keep the entered draft and the original conflict if refreshing fails.
        }
    } finally {
      setSaving(false);
    }
  }
  async function transition(actionName: "publish" | "deactivate") {
    if (!detail || saving) return;
    setSaving(true);
    setError("");
    try {
      await api(`models/${detail.record.id}/transitions`, {
        method: "POST",
        body: {
          action: actionName,
          expectedRevision: detail.record.revision,
          requestId: crypto.randomUUID(),
        },
      });
      setDetail(await api<Detail>(`models/${detail.record.id}`));
      void action.current?.reload();
    } catch (e) {
      setError(showError(e));
    } finally {
      setSaving(false);
    }
  }
  async function calculate() {
    if (!detail) return;
    setSaving(true);
    setError("");
    try {
      const values = detail.record.definition.inputs.map((binding) => {
        const item = catalog.items.find((i) => i.id === binding.testItemId)!;
        return {
          testItemId: item.id,
          value: {
            kind: item.valueKind,
            [valueKeys[item.valueKind] ?? "value"]: trial[item.id],
            ...(item.valueKind === "measurement"
              ? { unit: item.unit ?? "" }
              : {}),
          },
        };
      });
      const result = await api<{ outputs: NonNullable<typeof outputs> }>(
        `models/${detail.record.id}/trial`,
        { method: "POST", body: { values } },
      );
      setOutputs(result.outputs);
    } catch (e) {
      setError(showError(e));
      setOutputs(undefined);
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <ProTable<Model>
        actionRef={action}
        rowKey="id"
        search={false}
        headerTitle="评估模型版本"
        pagination={{ pageSize: 20 }}
        request={async () => {
          try {
            const data = await api<Model[]>("models");
            return { data, total: data.length, success: true };
          } catch (e) {
            setError(showError(e));
            return { data: [], success: false };
          }
        }}
        toolBarRender={() => [
          canWrite && (
            <Button key="new" type="primary" onClick={() => void edit()}>
              新建模型
            </Button>
          ),
        ]}
        columns={[
          { title: "名称", render: (_, r) => r.definition.name },
          { title: "版本", render: (_, r) => r.definition.version },
          { title: "状态", render: (_, r) => labels[r.status] },
          { title: "适用条件", render: (_, r) => r.definition.applicability },
          {
            title: "输入 / 输出",
            render: (_, r) =>
              `${r.definition.inputs.length} / ${r.definition.outputs.length}`,
          },
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
        title={
          detail
            ? `${detail.record.definition.name} · ${labels[detail.record.status]}`
            : "新建模型草稿"
        }
        width={Math.min(900, window.innerWidth - 24)}
        open={open}
        destroyOnClose
        onClose={() => {
          if (!saving) {
            generation.current++;
            setOpen(false);
          }
        }}
        extra={
          <Space>
            {writable && (
              <Button
                type="primary"
                loading={saving}
                aria-busy={saving}
                aria-label="保存草稿"
                disabled={busy || Boolean(latest)}
                onClick={() => void save()}
              >
                保存草稿
              </Button>
            )}
            {detail?.record.canEdit && canWrite && (
              <Popconfirm
                title="确认发布此已保存的正式模型版本？"
                onConfirm={() => transition("publish")}
              >
                <Button loading={saving} aria-busy={saving} aria-label="发布">
                  发布
                </Button>
              </Popconfirm>
            )}
            {detail?.record.status === "active" &&
              canWrite &&
              !detail.record.legacy && (
                <Popconfirm
                  title="停用后旧任务保留固定版本。"
                  onConfirm={() => transition("deactivate")}
                >
                  <Button loading={saving} aria-busy={saving} aria-label="停用">
                    停用
                  </Button>
                </Popconfirm>
              )}
          </Space>
        }
      >
        {busy ? (
          <Spin />
        ) : (
          <>
            {error && <Alert type="error" message={error} />}{" "}
            {latest && (
              <Alert
                type="warning"
                message="其他管理员已保存，当前输入保留。"
                action={
                  <Button
                    onClick={() => {
                      form.setFieldsValue(latest.definition);
                      setDetail(
                        detail ? { ...detail, record: latest } : undefined,
                      );
                      setLatest(undefined);
                      setError("");
                    }}
                  >
                    放弃本地输入并载入最新
                  </Button>
                }
              />
            )}
            <Form form={form} layout="vertical" disabled={!writable || saving}>
              <Space>
                <Form.Item
                  label="模型名称"
                  name="name"
                  rules={[{ required: true }]}
                >
                  <Input maxLength={100} />
                </Form.Item>
                <Form.Item
                  label="版本标识"
                  name="version"
                  rules={[{ required: true }]}
                >
                  <Input maxLength={32} />
                </Form.Item>
              </Space>
              <Form.Item
                name="applicability"
                label="适用条件"
                rules={[{ required: true }]}
              >
                <Input.TextArea maxLength={500} />
              </Form.Item>
              <Space>
                <Form.Item name="ageGroup" label="年龄组标签">
                  <Input maxLength={32} />
                </Form.Item>
                <Form.Item name="teamLevel" label="水平标签">
                  <Input maxLength={32} />
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
              <Form.Item name="reference" label="标准来源及核定说明">
                <Input.TextArea maxLength={1000} />
              </Form.Item>
              <Typography.Title level={5}>
                复用已发布模型的指定输出
              </Typography.Title>
              <Alert
                type="info"
                message="引用固定版本并使用本次测评的原始输入重新计算。所需项目和映射随源版本加入；如需改变这些映射，先移除引用。"
              />
              <Form.List name="references">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map((field) => (
                      <Card
                        key={field.key}
                        size="small"
                        extra={
                          writable && (
                            <Button onClick={() => remove(field.name)}>
                              移除引用
                            </Button>
                          )
                        }
                      >
                        <Form.Item
                          name={[field.name, "versionId"]}
                          label="固定的已发布模型版本"
                          rules={[{ required: true }]}
                        >
                          <Select
                            showSearch
                            optionFilterProp="label"
                            onChange={() =>
                              form.setFieldValue(
                                ["references", field.name, "metricId"],
                                undefined,
                              )
                            }
                            options={versions
                              .filter(
                                (version) =>
                                  !version.legacy &&
                                  version.status === "active" &&
                                  version.id !== detail?.record.id,
                              )
                              .map((version) => ({
                                value: version.id,
                                label: `${version.definition.name} · ${version.definition.version} · ${version.definition.applicability}`,
                              }))}
                          />
                        </Form.Item>
                        <Form.Item shouldUpdate noStyle>
                          {() => {
                            const version = versions.find(
                              (version) =>
                                version.id ===
                                form.getFieldValue([
                                  "references",
                                  field.name,
                                  "versionId",
                                ]),
                            );
                            const ids = [
                              ...new Set([
                                ...(version?.definition.outputs.map(
                                  (output) => output.metricId,
                                ) ?? []),
                                ...(version?.definition.references?.map(
                                  (reference) => reference.metricId,
                                ) ?? []),
                              ]),
                            ];
                            return (
                              <Form.Item
                                name={[field.name, "metricId"]}
                                label="指定输出"
                                rules={[{ required: true }]}
                              >
                                <Select
                                  options={ids.map((id) => ({
                                    value: id,
                                    label: metricName(id),
                                  }))}
                                />
                              </Form.Item>
                            );
                          }}
                        </Form.Item>
                        <Form.Item
                          name={[field.name, "selection"]}
                          label="取值时机"
                          rules={[{ required: true }]}
                        >
                          <Select
                            options={[
                              {
                                value: "same_assessment",
                                label: "本次测评的同一学员与原始输入",
                              },
                            ]}
                          />
                        </Form.Item>
                      </Card>
                    ))}
                    {writable && (
                      <Button
                        onClick={() => add({ selection: "same_assessment" })}
                      >
                        添加模型输出引用
                      </Button>
                    )}
                  </>
                )}
              </Form.List>
              <Typography.Title level={5}>采集项目与固定映射</Typography.Title>
              <Form.List name="inputs">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map((f) => (
                      <Card
                        key={f.key}
                        size="small"
                        extra={
                          writable && (
                            <Button onClick={() => remove(f.name)}>移除</Button>
                          )
                        }
                      >
                        <Form.Item
                          name={[f.name, "testItemId"]}
                          label="采集项目"
                          rules={[{ required: true }]}
                        >
                          <Select
                            showSearch
                            optionFilterProp="label"
                            options={catalog.items
                              .filter((i) => i.status !== "inactive")
                              .map((i) => ({
                                value: i.id,
                                label: `${i.name} · ${i.unit ?? i.valueKind}`,
                              }))}
                          />
                        </Form.Item>
                        <Form.Item shouldUpdate noStyle>
                          {() => {
                            const id = form.getFieldValue([
                              "inputs",
                              f.name,
                              "testItemId",
                            ]);
                            return (
                              <Space>
                                {[
                                  "scoreMappingVersionId",
                                  "gradeMappingVersionId",
                                ].map((key, index) => (
                                  <Form.Item
                                    key={key}
                                    name={[f.name, key]}
                                    label={
                                      index
                                        ? "整数分值 → 等级"
                                        : "原始值 → 整数分值"
                                    }
                                  >
                                    <Select
                                      allowClear
                                      options={mappings
                                        .filter(
                                          (m) =>
                                            m.testItemId === id &&
                                            m.definition.stage ===
                                              (index
                                                ? "score_grade"
                                                : "raw_score"),
                                        )
                                        .map((m) => ({
                                          value: m.id,
                                          label: `${m.definition.name} · ${labels[m.status]}`,
                                        }))}
                                    />
                                  </Form.Item>
                                ))}
                              </Space>
                            );
                          }}
                        </Form.Item>
                      </Card>
                    ))}
                    {writable && (
                      <Button onClick={() => add({})}>添加采集项目</Button>
                    )}
                  </>
                )}
              </Form.List>
              <Typography.Title level={5}>计算输出</Typography.Title>
              <Form.List name="outputs">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map((f) => (
                      <Card
                        key={f.key}
                        size="small"
                        extra={
                          writable && (
                            <Button onClick={() => remove(f.name)}>
                              移除输出
                            </Button>
                          )
                        }
                      >
                        <Form.Item
                          name={[f.name, "metricId"]}
                          label="输出指标"
                          rules={[{ required: true }]}
                        >
                          <Select
                            showSearch
                            optionFilterProp="label"
                            options={catalog.metrics
                              .filter(
                                (m) =>
                                  ["computed", "composite"].includes(
                                    m.metricKind,
                                  ) && m.status !== "inactive",
                              )
                              .map((m) => ({
                                value: m.id,
                                label: `${m.name} · 上限 ${m.maxScore ?? "未声明"}`,
                              }))}
                          />
                        </Form.Item>
                        <Space wrap>
                          <Form.Item
                            name={[f.name, "method"]}
                            label="计算方式"
                            rules={[{ required: true }]}
                          >
                            <Select
                              options={[
                                {
                                  value: "weighted_average",
                                  label: "加权平均",
                                },
                                {
                                  value: "normalized_weighted_sum",
                                  label: "归一加权和",
                                },
                                { value: "sum", label: "求和" },
                              ]}
                            />
                          </Form.Item>
                          <Form.Item
                            name={[f.name, "rounding"]}
                            label="输出精度"
                          >
                            <Select
                              options={[
                                { value: "none", label: "不舍入" },
                                { value: "integer", label: "整数" },
                                { value: "two_decimals", label: "两位小数" },
                              ]}
                            />
                          </Form.Item>
                          <Form.Item
                            name={[f.name, "inputScale"]}
                            label="归一输入尺度"
                          >
                            <InputNumber min={0.001} />
                          </Form.Item>
                          <Form.Item
                            name={[f.name, "maxScore"]}
                            label="归一输出尺度"
                          >
                            <InputNumber min={0.001} />
                          </Form.Item>
                        </Space>
                        <Form.List name={[f.name, "inputs"]}>
                          {(inputs, { add: addInput, remove: removeInput }) => (
                            <>
                              {inputs.map((i) => (
                                <Space key={i.key}>
                                  <Form.Item
                                    name={[i.name, "metricId"]}
                                    label="输入指标或同版本输出"
                                    rules={[{ required: true }]}
                                  >
                                    <Select
                                      showSearch
                                      optionFilterProp="label"
                                      options={catalog.metrics.map((m) => ({
                                        value: m.id,
                                        label: m.name,
                                      }))}
                                    />
                                  </Form.Item>
                                  <Form.Item
                                    name={[i.name, "weight"]}
                                    label="权重"
                                    rules={[{ required: true }]}
                                  >
                                    <InputNumber min={0.001} />
                                  </Form.Item>
                                  {writable && (
                                    <Button onClick={() => removeInput(i.name)}>
                                      移除
                                    </Button>
                                  )}
                                </Space>
                              ))}
                              {writable && (
                                <Button onClick={() => addInput({ weight: 1 })}>
                                  添加输入关联
                                </Button>
                              )}
                            </>
                          )}
                        </Form.List>
                      </Card>
                    ))}
                    {writable && (
                      <Button
                        onClick={() =>
                          add({
                            method: "weighted_average",
                            rounding: "two_decimals",
                            inputs: [],
                          })
                        }
                      >
                        添加输出
                      </Button>
                    )}
                  </>
                )}
              </Form.List>
            </Form>
            {detail && (
              <Card title="已保存版本试算" size="small">
                <Alert
                  type="info"
                  message="修改配置后先保存，试算不产生学员成绩。"
                />
                {detail.record.definition.inputs.map((b) => {
                  const i = catalog.items.find((i) => i.id === b.testItemId);
                  return (
                    <div key={b.testItemId}>
                      {i?.name ?? b.testItemId} · {i?.unit ?? i?.valueKind}
                      <InputNumber
                        value={trial[b.testItemId]}
                        onChange={(v) =>
                          setTrial((old) => ({
                            ...old,
                            [b.testItemId]: v ?? NaN,
                          }))
                        }
                      />
                    </div>
                  );
                })}
                <Button
                  loading={saving}
                  aria-label="试算已保存版本"
                  onClick={() => void calculate()}
                >
                  试算已保存版本
                </Button>
                {outputs && (
                  <Table
                    size="small"
                    pagination={false}
                    rowKey="metricId"
                    dataSource={outputs}
                    columns={[
                      {
                        title: "输出指标",
                        render: (_, r) => metricName(r.metricId),
                      },
                      {
                        title: "结果",
                        render: (_, r) => r.value.value ?? r.value.score,
                      },
                      {
                        title: "单位",
                        render: (_, r) => r.value.unit ?? "score",
                      },
                    ]}
                  />
                )}
              </Card>
            )}
            {detail && detail.displayHistory?.length > 0 && (
              <Card title="展示调整历史" size="small">
                {detail.displayHistory.map((item) => (
                  <p key={item.id}>
                    {item.occurredAt} · {item.actor} · {item.action}
                  </p>
                ))}
              </Card>
            )}
            {detail?.record.display && (
              <ModelDisplay
                key={detail.record.id}
                id={detail.record.id}
                display={detail.record.display}
                choices={[
                  ...new Set([
                    ...detail.record.definition.inputs.flatMap((input) =>
                      catalog.items.find((item) => item.id === input.testItemId)
                        ?.metricId
                        ? [
                            catalog.items.find(
                              (item) => item.id === input.testItemId,
                            )!.metricId,
                          ]
                        : [],
                    ),
                    ...detail.record.definition.outputs.map(
                      (output) => output.metricId,
                    ),
                    ...(detail.record.definition.references?.map(
                      (reference) => reference.metricId,
                    ) ?? []),
                  ]),
                ].map((id) => ({ value: id, label: metricName(id) }))}
                canWrite={
                  canWrite &&
                  !detail.record.legacy &&
                  detail.record.scope === "club" &&
                  detail.record.status !== "archived"
                }
                onChanged={(display) =>
                  setDetail((current) =>
                    current
                      ? { ...current, record: { ...current.record, display } }
                      : undefined,
                  )
                }
              />
            )}
            {detail?.record.issues.length ? (
              <Alert
                type="warning"
                message="发布校验未通过"
                description={detail.record.issues.map((i, n) => (
                  <div key={n}>
                    {issueLabels[i.code] ?? "请核对模型配置"}
                    {i.objectId ? ` · ${metricName(i.objectId)}` : ""}
                  </div>
                ))}
              />
            ) : null}
            {detail && (
              <Card title="修改历史" size="small">
                {detail.history.map((h) => (
                  <p key={h.id}>
                    {labels[h.action] ?? h.action} · {h.actor} ·{" "}
                    {new Date(h.occurredAt).toLocaleString("zh-CN")}
                  </p>
                ))}
              </Card>
            )}
          </>
        )}
      </Drawer>
    </>
  );
}
