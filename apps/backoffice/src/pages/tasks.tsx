import { useLocation } from "@umijs/max";
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
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Typography,
} from "antd";
import { api, ApiError, errorText } from "../services/api";
interface Task {
  id: string;
  title: string;
  teamId: string;
  termLabel: string;
  startsOn: string;
  dueOn: string;
  revision: string;
  summary?: {
    totalStudents: number;
    completedStudents: number;
    notAssessedStudents: number;
    processedStudents: number;
    publishedStudents: number;
  };
  error?: string;
}
interface Catalog {
  enabled: boolean;
  teams: Array<{ id: string; name: string; studentIds: string[] }>;
  students: Array<{ id: string; name: string }>;
  versions: Array<{ id: string; name: string; version: string }>;
}
interface State {
  revision: number;
  notAssessed?: { reason: string; recordedAt: string };
  entries: Record<string, { value: Record<string, unknown>; eventId?: string }>;
  changes: Array<{
    revision: number;
    reason?: string;
    changedAt: string;
    coachId: string;
  }>;
  publications: Array<{
    revision: number;
    assessmentId: string;
    publishedAt: string;
  }>;
}
interface Detail {
  task: Task;
  canWrite: boolean;
  actingCoach: { id: string; name: string } | null;
  summary: {
    enabled: boolean;
    templateVersionId: string;
    students: Array<{
      studentId: string;
      name: string;
      revision: number;
      completedFields: number;
      totalFields: number;
      canPublish: boolean;
      notAssessed: { reason: string } | null;
    }>;
  };
  items: Array<{
    id: string;
    name: string;
    valueKind: string;
    unit?: string;
    protocol?: string;
  }>;
  courses: Array<{
    id: string;
    title: string;
    occurredAt: string;
    studentIds: string[];
  }>;
  states: Array<{ studentId: string; state: State }>;
  computedResults: Array<{
    id: string;
    studentId: string;
    assessmentId: string;
    templateVersionId?: string;
    metricId: string;
    name: string;
    value: Record<string, unknown>;
    occurredAt: string;
    lineage?: {
      definitionId: string;
      definitionVersion: string;
      inputRecordIds: string[];
      computedAt: string;
    };
  }>;
  results: Array<{
    id: string;
    studentId: string;
    testItemId: string;
    value: Record<string, unknown>;
    occurredAt?: string;
    recordedAt?: string;
    mapping?: {
      integerScore: number;
      grade: string;
      rawScoreVersionId: string;
      gradeVersionId: string;
      mappedAt: string;
    };
  }>;
}
const keys: Record<string, string> = {
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
  e instanceof ApiError && e.code === "assessment_revision_conflict"
    ? "成绩已更新，本机输入已保留。请核对最新状态后重新录入。"
    : e instanceof ApiError && e.code === "teaching_authorization_required"
      ? "录入与确认须具备教学授权、本人教练档案及队伍任职。"
      : errorText(e);
export default function Tasks({ canCreate }: { canCreate: boolean }) {
  const { message } = App.useApp();
  const table = useRef<ActionType>();
  const [catalog, setCatalog] = useState<Catalog>({
    enabled: false,
    teams: [],
    students: [],
    versions: [],
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [detail, setDetail] = useState<Detail>();
  const [detailOpen, setDetailOpen] = useState(false);
  const [studentId, setStudentId] = useState<string>();
  const [form] = Form.useForm();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [reason, setReason] = useState("");
  const generation = useRef(0);
  const pending = useRef<{ hash: string; requestId: string }>();
  useEffect(() => {
    void api<Catalog>("task-catalog")
      .then(setCatalog)
      .catch((e) => setError(showError(e)));
    return () => {
      generation.current++;
    };
  }, []);
  const location = useLocation();
  useEffect(() => {
    const id = new URLSearchParams(location.search).get("taskId");
    if (id) void read(id);
  }, [location.search]);
  async function read(id: string) {
    const current = ++generation.current;
    setDetailOpen(true);
    setBusy(true);
    setError("");
    setDetail(undefined);
    try {
      const d = await api<Detail>(`assessment-tasks/${id}`);
      if (current === generation.current) setDetail(d);
    } catch (e) {
      if (current === generation.current) setError(showError(e));
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }
  const state = detail?.states.find((s) => s.studentId === studentId)?.state;
  const student = detail?.summary.students.find(
    (s) => s.studentId === studentId,
  );
  function editStudent(id: string) {
    const s = detail?.states.find((s) => s.studentId === id)?.state;
    setStudentId(id);
    setConflict(false);
    setDirty(false);
    setReason("");
    form.resetFields();
    form.setFieldsValue({
      scores: Object.fromEntries(
        Object.entries(s?.entries ?? {}).map(([id, e]) => [
          id,
          e.value[keys[String(e.value.kind)] ?? "value"],
        ]),
      ),
      courses: Object.fromEntries(
        Object.entries(s?.entries ?? {}).map(([id, e]) => [id, e.eventId]),
      ),
    });
  }
  async function refresh() {
    if (!detail) return;
    setDetail(await api<Detail>(`assessment-tasks/${detail.task.id}`));
    void table.current?.reload();
  }
  async function save() {
    if (!detail || !state || !studentId || busy) return;
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const entries = detail.items
      .filter(
        (i) =>
          values.scores?.[i.id] !== null && values.scores?.[i.id] !== undefined,
      )
      .map((i) => ({
        testItemId: i.id,
        value: {
          kind: i.valueKind,
          [keys[i.valueKind] ?? "value"]: values.scores[i.id],
          ...(i.valueKind === "measurement" ? { unit: i.unit ?? "" } : {}),
        },
        eventId: values.courses?.[i.id] ?? values.defaultCourse,
      }));
    if (!entries.length) {
      setError("请录入至少一项成绩，或填写不测评原因。");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(
        `assessment-tasks/${detail.task.id}/students/${studentId}/entries`,
        {
          method: "PUT",
          body: {
            expectedRevision: state.revision,
            entries,
            ...(values.reason ? { reason: values.reason } : {}),
          },
        },
      );
      await refresh();
      setDirty(false);
      void message.success("草稿成绩已保存");
    } catch (e) {
      setError(showError(e));
      if (e instanceof ApiError && e.code === "assessment_revision_conflict")
        setConflict(true);
    } finally {
      setBusy(false);
    }
  }
  async function publish() {
    if (!detail || !state || !studentId || busy || dirty) return;
    setBusy(true);
    setError("");
    try {
      const r = await api<{
        results: Array<{ success: boolean; error?: { code: string } }>;
      }>(`assessment-tasks/${detail.task.id}/publications`, {
        method: "POST",
        body: { students: [{ studentId, expectedRevision: state.revision }] },
      });
      if (!r.results[0]?.success)
        throw new ApiError(
          409,
          r.results[0]?.error?.code ?? "publication_failed",
        );
      await refresh();
      void message.success("所查看修订已确认发布");
    } catch (e) {
      setError(showError(e));
      if (e instanceof ApiError && e.code === "assessment_revision_conflict")
        setConflict(true);
    } finally {
      setBusy(false);
    }
  }
  async function handling(reopen = false) {
    if (!detail || !state || !studentId || busy || dirty) return;
    setBusy(true);
    try {
      await api(
        `assessment-tasks/${detail.task.id}/students/${studentId}/handling`,
        {
          method: "PUT",
          body: {
            expectedRevision: state.revision,
            reason: reopen ? null : reason,
          },
        },
      );
      await refresh();
      setError("");
    } catch (e) {
      setError(showError(e));
      if (e instanceof ApiError && e.code === "assessment_revision_conflict")
        setConflict(true);
    } finally {
      setBusy(false);
    }
  }
  async function create() {
    if (busy) return;
    const values = await createForm.validateFields(),
      selections = (values.teamIds as string[]).flatMap((teamId) =>
        values.selectionsByTeam?.[teamId]?.length
          ? [{ teamId, studentIds: values.selectionsByTeam[teamId] }]
          : [],
      );
    const body = {
      title: values.title,
      termLabel: values.termLabel,
      templateVersionId: values.templateVersionId,
      teamIds: values.teamIds,
      startsOn: values.startsOn,
      dueOn: values.dueOn,
      ...(selections.length ? { selections } : {}),
    };
    const hash = JSON.stringify(body);
    if (pending.current?.hash !== hash)
      pending.current = { hash, requestId: crypto.randomUUID() };
    setBusy(true);
    try {
      const result = await api<{ taskIds: string[] }>("assessment-tasks", {
        method: "POST",
        body: { ...body, requestId: pending.current.requestId },
      });
      void message.success(`已下发 ${result.taskIds.length} 队任务`);
      setCreateOpen(false);
      pending.current = undefined;
      void table.current?.reload();
    } catch (e) {
      setError(showError(e));
    } finally {
      setBusy(false);
    }
  }
  const teamName = (id: string) =>
    catalog.teams.find((t) => t.id === id)?.name ?? id;
  return (
    <>
      <ProTable<Task>
        actionRef={table}
        rowKey="id"
        search={false}
        headerTitle="测评任务与结果"
        request={async () => {
          try {
            const data = await api<Task[]>("assessment-tasks");
            return { data, total: data.length, success: true };
          } catch (e) {
            setError(showError(e));
            return { data: [], success: false };
          }
        }}
        toolBarRender={() => [
          canCreate && (
            <Button
              key="new"
              type="primary"
              onClick={() => {
                createForm.resetFields();
                setCreateOpen(true);
                setError("");
                pending.current = undefined;
              }}
            >
              多队下发任务
            </Button>
          ),
        ]}
        columns={[
          { title: "任务", dataIndex: "title" },
          { title: "队伍", render: (_, r) => teamName(r.teamId) },
          { title: "周期", render: (_, r) => `${r.startsOn} — ${r.dueOn}` },
          {
            title: "应处理",
            render: (_, r) => r.summary?.totalStudents ?? "—",
          },
          {
            title: "已录齐 / 不测评",
            render: (_, r) =>
              r.summary
                ? `${r.summary.completedStudents} / ${r.summary.notAssessedStudents ?? 0}`
                : "配置待核对",
          },
          {
            title: "已确认",
            render: (_, r) => r.summary?.publishedStudents ?? "—",
          },
          {
            title: "操作",
            valueType: "option",
            render: (_, r) => [
              <Button key="view" type="link" onClick={() => void read(r.id)}>
                查看任务与结果
              </Button>,
            ],
          },
        ]}
      />
      {error && !detailOpen && !createOpen && (
        <Alert type="error" message={error} />
      )}
      <Drawer
        title="多队下发测评任务"
        open={createOpen}
        width={Math.min(760, window.innerWidth - 24)}
        onClose={() => {
          if (!busy) setCreateOpen(false);
        }}
        extra={
          <Button
            type="primary"
            loading={busy}
            aria-label="确认下发"
            aria-busy={busy}
            onClick={() => void create()}
          >
            确认下发
          </Button>
        }
      >
        {error && <Alert type="error" message={error} />}{" "}
        {!catalog.enabled && (
          <Alert
            type="info"
            message="当前俱乐部尚未开放成绩发布；任务可建立并查阅，录入与发布由环境配置控制。"
          />
        )}
        <Form form={createForm} layout="vertical" disabled={busy}>
          <Form.Item name="title" label="任务名称" rules={[{ required: true }]}>
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item
            name="termLabel"
            label="周、月或学期标签"
            rules={[{ required: true }]}
          >
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item
            name="templateVersionId"
            label="固定模板版本"
            rules={[{ required: true }]}
          >
            <Select
              options={catalog.versions.map((v) => ({
                value: v.id,
                label: `${v.name} · ${v.version}`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="teamIds"
            label="下发队伍"
            rules={[{ required: true }]}
          >
            <Select
              mode="multiple"
              options={catalog.teams.map((t) => ({
                value: t.id,
                label: t.name,
              }))}
            />
          </Form.Item>
          <Space>
            <Form.Item
              name="startsOn"
              label="周期开始"
              rules={[{ required: true }]}
            >
              <Input type="date" />
            </Form.Item>
            <Form.Item
              name="dueOn"
              label="周期结束"
              rules={[{ required: true }]}
            >
              <Input type="date" />
            </Form.Item>
          </Space>
          <Alert
            type="info"
            message="未指定学员时，任务固定选择该队当前全部在队学员；请假不改变任务对象。周期结束后仍可补录符合来源要求的成绩。"
          />
          <Form.Item noStyle shouldUpdate>
            {() =>
              ((createForm.getFieldValue("teamIds") ?? []) as string[]).map(
                (id) => {
                  const team = catalog.teams.find((t) => t.id === id);
                  return (
                    <Form.Item
                      key={id}
                      name={["selectionsByTeam", id]}
                      label={`${team?.name ?? id} · 指定学员（可选）`}
                    >
                      <Select
                        mode="multiple"
                        options={catalog.students
                          .filter((s) => team?.studentIds.includes(s.id))
                          .map((s) => ({ value: s.id, label: s.name }))}
                      />
                    </Form.Item>
                  );
                },
              )
            }
          </Form.Item>
        </Form>
      </Drawer>
      <Drawer
        title={detail?.task.title ?? "任务与结果"}
        open={detailOpen}
        width={Math.min(1080, window.innerWidth - 24)}
        destroyOnClose
        onClose={() => {
          if (!busy && !studentId) {
            generation.current++;
            setDetailOpen(false);
          }
        }}
        loading={busy && !detail}
      >
        {error && <Alert type="error" message={error} />}{" "}
        {detail && (
          <>
            <Typography.Paragraph>
              {teamName(detail.task.teamId)} · {detail.task.startsOn} 至{" "}
              {detail.task.dueOn} · 固定模板版本{" "}
              {detail.summary.templateVersionId}
            </Typography.Paragraph>
            {!detail.canWrite && (
              <Alert
                type="info"
                message="当前为查阅状态"
                description="成绩录入需教学授权、本人的有效教练档案及队伍任职，并且俱乐部已开放发布且任务已开始。"
              />
            )}
            {detail.actingCoach && (
              <Typography.Paragraph>
                教学操作身份：{detail.actingCoach.name}
              </Typography.Paragraph>
            )}
            <Table
              rowKey="studentId"
              size="small"
              dataSource={detail.summary.students}
              pagination={{ pageSize: 15 }}
              columns={[
                { title: "学员", dataIndex: "name" },
                {
                  title: "已录项目",
                  render: (_, r) => `${r.completedFields} / ${r.totalFields}`,
                },
                {
                  title: "处理情况",
                  render: (_, r) =>
                    r.notAssessed
                      ? `不测评 · ${r.notAssessed.reason}`
                      : r.canPublish
                        ? "待确认"
                        : r.completedFields === r.totalFields
                          ? "已录齐"
                          : "待补录",
                },
                {
                  title: "操作",
                  render: (_, r) => (
                    <Button onClick={() => editStudent(r.studentId)}>
                      成绩与历史
                    </Button>
                  ),
                },
              ]}
            />
            <Typography.Title level={5}>
              已确认的原始成绩与映射来源
            </Typography.Title>
            <Table
              rowKey="id"
              size="small"
              dataSource={detail.results}
              pagination={{ pageSize: 15 }}
              scroll={{ x: 1100 }}
              columns={[
                {
                  title: "学员",
                  render: (_, r) =>
                    detail.summary.students.find(
                      (s) => s.studentId === r.studentId,
                    )?.name ?? r.studentId,
                },
                {
                  title: "项目",
                  render: (_, r) =>
                    detail.items.find((i) => i.id === r.testItemId)?.name ??
                    r.testItemId,
                },
                {
                  title: "原始值",
                  render: (_, r) =>
                    String(
                      r.value[keys[String(r.value.kind)] ?? "value"] ??
                        r.value.text ??
                        r.value.tag ??
                        "—",
                    ),
                },
                {
                  title: "整数分值",
                  render: (_, r) => r.mapping?.integerScore ?? "原标准分值",
                },
                { title: "等级", render: (_, r) => r.mapping?.grade ?? "—" },
                {
                  title: "来源时间",
                  render: (_, r) =>
                    r.occurredAt
                      ? new Date(r.occurredAt).toLocaleString("zh-CN")
                      : "历史来源不完整",
                },
                {
                  title: "映射时间",
                  render: (_, r) =>
                    r.mapping
                      ? new Date(r.mapping.mappedAt).toLocaleString("zh-CN")
                      : "—",
                },
                {
                  title: "固定映射版本",
                  render: (_, r) =>
                    r.mapping
                      ? `${r.mapping.rawScoreVersionId} / ${r.mapping.gradeVersionId}`
                      : "旧标准评分",
                },
              ]}
            />
            <Typography.Title level={5}>已确认的模型计算结果</Typography.Title>
            <Table
              rowKey="id"
              size="small"
              dataSource={detail.computedResults}
              pagination={{ pageSize: 15 }}
              scroll={{ x: 1200 }}
              columns={[
                {
                  title: "学员",
                  render: (_, r) =>
                    detail.summary.students.find(
                      (s) => s.studentId === r.studentId,
                    )?.name ?? r.studentId,
                },
                { title: "指标", dataIndex: "name" },
                {
                  title: "结果",
                  render: (_, r) =>
                    `${r.value[keys[String(r.value.kind)] ?? "value"] ?? "—"} ${r.value.unit ?? ""}`,
                },
                { title: "确认批次", dataIndex: "assessmentId" },
                { title: "固定模板版本", dataIndex: "templateVersionId" },
                {
                  title: "计算来源",
                  render: (_, r) =>
                    r.lineage
                      ? `${r.lineage.definitionId} · ${r.lineage.definitionVersion}`
                      : "历史来源不完整",
                },
                {
                  title: "计算时间",
                  render: (_, r) =>
                    r.lineage
                      ? new Date(r.lineage.computedAt).toLocaleString("zh-CN")
                      : "—",
                },
              ]}
              expandable={{
                expandedRowRender: (r) => (
                  <Typography.Paragraph>
                    输入记录：
                    {r.lineage?.inputRecordIds.join("、") ?? "历史来源不完整"}
                  </Typography.Paragraph>
                ),
              }}
            />
          </>
        )}
      </Drawer>
      <Modal
        title={`${student?.name ?? "学员"} · 修订 ${state?.revision ?? 0}`}
        open={Boolean(studentId)}
        width={Math.min(900, window.innerWidth - 24)}
        footer={null}
        destroyOnClose
        onCancel={() => {
          if (busy) return;
          if (dirty)
            Modal.confirm({
              title: "放弃本机未保存成绩？",
              onOk: () => setStudentId(undefined),
            });
          else setStudentId(undefined);
        }}
      >
        {detail && state && student && (
          <>
            {error && <Alert type="error" message={error} />}{" "}
            {conflict && (
              <Alert
                type="warning"
                message="当前输入保留，保存和确认已暂停。"
                action={
                  <Popconfirm
                    title="放弃本机输入并载入最新成绩？"
                    onConfirm={async () => {
                      const latest = await api<Detail>(
                        `assessment-tasks/${detail.task.id}`,
                      );
                      setDetail(latest);
                      const s = latest.states.find(
                        (s) => s.studentId === studentId,
                      )?.state;
                      form.resetFields();
                      form.setFieldsValue({
                        scores: Object.fromEntries(
                          Object.entries(s?.entries ?? {}).map(([id, e]) => [
                            id,
                            e.value[keys[String(e.value.kind)] ?? "value"],
                          ]),
                        ),
                        courses: Object.fromEntries(
                          Object.entries(s?.entries ?? {}).map(([id, e]) => [
                            id,
                            e.eventId,
                          ]),
                        ),
                      });
                      setConflict(false);
                      setDirty(false);
                      setError("");
                    }}
                  >
                    <Button>载入最新并放弃输入</Button>
                  </Popconfirm>
                }
              />
            )}
            <Space wrap>
              <Button
                type="primary"
                disabled={
                  !detail.canWrite || Boolean(state.notAssessed) || conflict
                }
                loading={busy}
                aria-label="保存草稿成绩"
                aria-busy={busy}
                onClick={() => void save()}
              >
                保存草稿成绩
              </Button>
              <Popconfirm
                title={`确认发布所查看的修订 ${state.revision}？`}
                description="已保存且完整的成绩才会进入家长成长记录。"
                onConfirm={() => publish()}
              >
                <Button
                  disabled={
                    !detail.canWrite || !student.canPublish || dirty || conflict
                  }
                  loading={busy}
                >
                  确认发布此修订
                </Button>
              </Popconfirm>
            </Space>
            {dirty && (
              <Alert
                type="info"
                message="本机有未保存输入，请先保存再确认发布。"
              />
            )}
            {state.notAssessed ? (
              <Alert
                type="info"
                message={`不测评：${state.notAssessed.reason}`}
                action={
                  detail.canWrite && (
                    <Button
                      disabled={busy || dirty || conflict}
                      onClick={() => void handling(true)}
                    >
                      重新打开录入
                    </Button>
                  )
                }
              />
            ) : (
              <Form
                form={form}
                layout="vertical"
                disabled={!detail.canWrite || busy || conflict}
                onValuesChange={() => setDirty(true)}
              >
                <Form.Item
                  name="defaultCourse"
                  label="统一来源课程（可逐项覆盖）"
                >
                  <Select
                    allowClear
                    options={detail.courses
                      .filter((c) => c.studentIds.includes(studentId!))
                      .map((c) => ({
                        value: c.id,
                        label: `${c.title} · ${new Date(c.occurredAt).toLocaleString("zh-CN")}`,
                      }))}
                  />
                </Form.Item>
                {detail.items.map((item) => (
                  <Card
                    key={item.id}
                    size="small"
                    title={`${item.name} · ${item.unit ?? item.valueKind}`}
                  >
                    <Typography.Paragraph type="secondary">
                      {item.protocol}
                    </Typography.Paragraph>
                    <Space wrap>
                      <Form.Item name={["scores", item.id]} label="原始成绩">
                        <InputNumber
                          precision={
                            item.valueKind === "count" ||
                            item.valueKind === "rating_1_5"
                              ? 0
                              : undefined
                          }
                        />
                      </Form.Item>
                      <Form.Item
                        name={["courses", item.id]}
                        label="此项来源课程"
                      >
                        <Select
                          allowClear
                          options={detail.courses
                            .filter((c) => c.studentIds.includes(studentId!))
                            .map((c) => ({
                              value: c.id,
                              label: `${c.title} · ${new Date(c.occurredAt).toLocaleString("zh-CN")}`,
                            }))}
                        />
                      </Form.Item>
                    </Space>
                  </Card>
                ))}
                <Form.Item name="reason" label="已确认成绩的更正原因">
                  <Input.TextArea maxLength={1000} />
                </Form.Item>
              </Form>
            )}
            {!state.publications.length &&
              !state.notAssessed &&
              detail.canWrite && (
                <Card title="不测评处理" size="small">
                  <Input.TextArea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    maxLength={1000}
                    placeholder="填写真实原因，不测评不产生分值。"
                  />
                  <Popconfirm
                    title="确认此学员不测评？"
                    onConfirm={() => handling()}
                  >
                    <Button
                      disabled={busy || dirty || conflict || !reason.trim()}
                    >
                      记录不测评原因
                    </Button>
                  </Popconfirm>
                </Card>
              )}
            <Typography.Title level={5}>更正与确认历史</Typography.Title>
            {state.changes.map((c) => (
              <p key={c.revision}>
                修订 {c.revision} · {c.reason ?? "成绩录入"} · {c.coachId} ·{" "}
                {new Date(c.changedAt).toLocaleString("zh-CN")}
              </p>
            ))}
            {state.publications.map((p) => (
              <p key={p.assessmentId}>
                已确认修订 {p.revision} ·{" "}
                {new Date(p.publishedAt).toLocaleString("zh-CN")} ·{" "}
                {p.assessmentId}
              </p>
            ))}
          </>
        )}
      </Modal>
    </>
  );
}
