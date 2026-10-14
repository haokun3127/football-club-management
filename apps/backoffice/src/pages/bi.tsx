import { history, useLocation } from "@umijs/max";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Typography,
} from "antd";
import { api, errorText } from "../services/api";
import { downloadExcel } from "../services/download";
type Option = { value: string; label: string };
interface Snapshot {
  id: string;
  topic: string;
  filters: Record<string, string>;
  factVersion: string;
  createdAt: string;
  stale?: boolean;
  data: {
    cards: Array<{
      key: string;
      label: string;
      value: number | null;
      unit?: string;
    }>;
    columns: Array<{ key: string; label: string }>;
    rows: Array<{
      id: string;
      values: Record<string, string | number | boolean | null>;
    }>;
    notes: string[];
  };
}
export default function Bi() {
  const { message } = App.useApp();
  const location = useLocation(),
    params = new URLSearchParams(location.search);
  const [form] = Form.useForm(),
    [catalog, setCatalog] = useState<{
      topics: Option[];
      teams: Option[];
      students: Option[];
      metrics: Option[];
    }>({ topics: [], teams: [], students: [], metrics: [] }),
    [snapshot, setSnapshot] = useState<Snapshot>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const generation = useRef(0),
    pending = useRef<{ hash: string; requestId: string }>();
  useEffect(() => {
    void api<typeof catalog>("bi-catalog")
      .then(setCatalog)
      .catch((e) => setError(errorText(e)));
    return () => {
      generation.current++;
    };
  }, []);
  async function query() {
    if (busy) return;
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const filters = Object.fromEntries(
        ["from", "to", "teamId", "studentId", "metricId"]
          .filter((key) => values[key])
          .map((key) => [key, values[key]]),
      ),
      body = { topic: values.topic, filters },
      hash = JSON.stringify(body);
    if (pending.current?.hash !== hash)
      pending.current = { hash, requestId: crypto.randomUUID() };
    const current = generation.current;
    setBusy(true);
    setError("");
    try {
      const next = await api<Snapshot>("bi-snapshots", {
        method: "POST",
        body: { ...body, requestId: pending.current.requestId },
      });
      if (current === generation.current) {
        setSnapshot(next);
        pending.current = undefined;
      }
    } catch (e) {
      if (current === generation.current) setError(errorText(e));
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }
  async function exportSnapshot() {
    if (!snapshot || busy) return;
    setBusy(true);
    setError("");
    const current = generation.current;
    try {
      const file = await api<{ fileName: string; contentBase64: string }>(
        `bi-snapshots/${snapshot.id}/export`,
        {
          method: "POST",
          body: {
            factVersion: snapshot.factVersion,
            requestId: crypto.randomUUID(),
          },
        },
      );
      if (current === generation.current) downloadExcel(file);
    } catch (e) {
      if (current === generation.current) setError(errorText(e));
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }
  const trend =
      snapshot?.topic === "growth" && snapshot.filters.metricId
        ? snapshot.data.rows
            .filter((row) => typeof row.values.value === "number")
            .sort((a, b) =>
              String(a.values.date).localeCompare(String(b.values.date)),
            )
            .slice(-30)
        : [],
    groups = [
      ...new Set(
        trend.map((row) =>
          JSON.stringify([row.values.studentId, row.values.templateVersionId]),
        ),
      ),
    ];
  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Card title="主题分析">
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            topic: params.get("topic") ?? "operations",
            studentId: params.get("studentId") ?? undefined,
            teamId: params.get("teamId") ?? undefined,
          }}
          disabled={busy}
        >
          <Space wrap>
            <Form.Item
              name="topic"
              label="分析主题"
              rules={[{ required: true }]}
            >
              <Select style={{ width: 200 }} options={catalog.topics} />
            </Form.Item>
            <Form.Item name="from" label="开始日期">
              <Input type="date" />
            </Form.Item>
            <Form.Item name="to" label="结束日期">
              <Input type="date" />
            </Form.Item>
            <Form.Item name="teamId" label="队伍">
              <Select
                allowClear
                style={{ width: 180 }}
                options={catalog.teams}
              />
            </Form.Item>
            <Form.Item name="studentId" label="学员">
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                style={{ width: 160 }}
                options={catalog.students}
              />
            </Form.Item>
            <Form.Item name="metricId" label="成长指标">
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                style={{ width: 240 }}
                options={catalog.metrics}
              />
            </Form.Item>
          </Space>
          <Button
            type="primary"
            loading={busy}
            aria-label="查询并生成快照"
            aria-busy={busy}
            onClick={() => void query()}
          >
            查询并生成快照
          </Button>
        </Form>
      </Card>
      {error && <Alert type="error" message={error} />}{" "}
      {!snapshot && !busy && (
        <Alert
          type="info"
          message="选择主题与条件后查询；卡片、明细和导出将使用同一事实快照。"
        />
      )}
      {snapshot && (
        <>
          <Card>
            <Typography.Title level={4}>
              {catalog.topics.find((topic) => topic.value === snapshot.topic)
                ?.label ?? snapshot.topic}
            </Typography.Title>
            <Descriptions
              size="small"
              column={2}
              items={[
                {
                  key: "time",
                  label: "统计快照",
                  children: new Date(snapshot.createdAt).toLocaleString(
                    "zh-CN",
                  ),
                },
                {
                  key: "version",
                  label: "事实版本",
                  children: (
                    <Typography.Text copyable>
                      {snapshot.factVersion}
                    </Typography.Text>
                  ),
                },
                {
                  key: "filters",
                  label: "当前快照条件",
                  children:
                    Object.entries(snapshot.filters)
                      .map(
                        ([key, value]) =>
                          `${({ from: "开始日期", to: "结束日期", teamId: "队伍", studentId: "学员", metricId: "指标" } as Record<string, string>)[key] ?? key}：${[...catalog.teams, ...catalog.students, ...catalog.metrics].find((option) => option.value === value)?.label ?? value}`,
                      )
                      .join("；") || "全部",
                },
              ]}
            />
            <Space>
              <Button
                disabled={busy}
                onClick={async () => {
                  const current = generation.current;
                  setBusy(true);
                  try {
                    const next = await api<Snapshot>(
                      `bi-snapshots/${snapshot.id}`,
                    );
                    if (current === generation.current) {
                      setSnapshot(next);
                      void message.info(
                        next.stale
                          ? "来源数据已变化，请重新查询生成新快照。"
                          : "来源数据与此快照一致。",
                      );
                    }
                  } catch (e) {
                    if (current === generation.current) setError(errorText(e));
                  } finally {
                    if (current === generation.current) setBusy(false);
                  }
                }}
              >
                核对来源变化
              </Button>
              <Button disabled={busy} onClick={() => void exportSnapshot()}>
                导出此快照
              </Button>
            </Space>
            {snapshot.stale && (
              <Alert
                type="warning"
                message="来源数据已变化，当前仍显示原快照；请重新查询查看新结果。"
              />
            )}
          </Card>
          <Row gutter={[16, 16]}>
            {snapshot.data.cards.map((card) => (
              <Col key={card.key} xs={24} sm={12} lg={8}>
                <Card>
                  <Statistic
                    title={card.label}
                    value={card.value ?? "无法判断"}
                    suffix={card.unit}
                  />
                </Card>
              </Col>
            ))}
          </Row>
          {snapshot.topic === "growth" && !snapshot.filters.metricId && (
            <Alert
              type="info"
              message="选择单一成长指标后显示按实际测评时间分段的结果图。不同模板版本分别展示。"
            />
          )}
          {groups.map((version) => {
            const points = trend.filter(
                (row) =>
                  JSON.stringify([
                    row.values.studentId,
                    row.values.templateVersionId,
                  ]) === version,
              ),
              maximum = Math.max(
                1,
                ...points.map((row) => Number(row.values.value)),
              ),
              minimum = Math.min(
                0,
                ...points.map((row) => Number(row.values.value)),
              ),
              zeroY = 150 - ((0 - minimum) / (maximum - minimum)) * 120;
            return (
              <Card
                key={version}
                title={`已确认趋势 · ${points[0]?.values.student} · ${points[0]?.values.templateVersionId}`}
              >
                <svg
                  role="img"
                  aria-label={`模板 ${version} 的 ${points.length} 条已确认结果`}
                  viewBox="0 0 900 190"
                  style={{ width: "100%", maxHeight: 240 }}
                >
                  <title>按实际测评时间展示的已确认结果</title>
                  <line x1={20} x2={890} y1={zeroY} y2={zeroY} stroke="#999" />
                  {points.map((row, index) => {
                    const x = 35 + (index * 830) / Math.max(points.length, 1),
                      valueY =
                        150 -
                        ((Number(row.values.value) - minimum) /
                          (maximum - minimum)) *
                          120,
                      height = Math.abs(valueY - zeroY);
                    return (
                      <g key={row.id}>
                        <title>
                          {row.values.student} · {row.values.date} ·{" "}
                          {row.values.value} {row.values.unit}
                        </title>
                        <rect
                          x={x}
                          y={Math.min(valueY, zeroY)}
                          width={Math.min(32, 650 / points.length)}
                          height={height}
                          fill="#A80F1B"
                        />
                        <text x={x} y={Math.max(15, valueY - 10)} fontSize="12">
                          {row.values.value}
                        </text>
                        <text x={x} y={170} fontSize="10">
                          {String(row.values.date).slice(5, 10)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </Card>
            );
          })}
          <Table
            rowKey="id"
            size="small"
            dataSource={snapshot.data.rows}
            pagination={{ pageSize: 20 }}
            scroll={{ x: Math.max(900, snapshot.data.columns.length * 150) }}
            columns={[
              {
                title: "源记录",
                key: "source",
                fixed: "left" as const,
                width: 130,
                render: (_: unknown, row: Snapshot["data"]["rows"][number]) => {
                  const source =
                    snapshot.topic === "services"
                      ? `/services/${row.values.resource}?recordId=${encodeURIComponent(row.id)}`
                      : snapshot.topic === "assessment" ||
                          snapshot.topic === "growth"
                        ? row.values.taskId
                          ? `/assessment/tasks?taskId=${encodeURIComponent(String(row.values.taskId))}`
                          : undefined
                        : snapshot.topic === "training"
                          ? `/data/events?recordId=${encodeURIComponent(String(row.values.eventId))}`
                          : `/data/students?recordId=${encodeURIComponent(row.id)}`;
                  return source ? (
                    <Button type="link" onClick={() => history.push(source)}>
                      查看源记录
                    </Button>
                  ) : (
                    <span>历史结果</span>
                  );
                },
              },
              ...snapshot.data.columns.map((column) => ({
                title: column.label,
                key: column.key,
                render: (_: unknown, row: Snapshot["data"]["rows"][number]) => {
                  const value = row.values[column.key];
                  return value === null || value === undefined
                    ? "无记录 / 不适用"
                    : typeof value === "boolean"
                      ? value
                        ? "是"
                        : "否"
                      : String(value);
                },
              })),
            ]}
            expandable={{
              expandedRowRender: (row) => (
                <Descriptions
                  column={2}
                  items={[
                    { key: "id", label: "记录标识", children: row.id },
                    ...Object.entries(row.values)
                      .filter(([key]) => key.endsWith("Id"))
                      .map(([key, value]) => ({
                        key,
                        label: key,
                        children: (
                          <Typography.Text copyable>
                            {String(value ?? "未知")}
                          </Typography.Text>
                        ),
                      })),
                  ]}
                />
              ),
            }}
          />
          {snapshot.data.notes.map((note) => (
            <Alert key={note} type="info" message={note} />
          ))}
        </>
      )}
    </Space>
  );
}
