import { useEffect, useState } from "react";
import { history } from "@umijs/max";
import { PageContainer, ProCard } from "@ant-design/pro-components";
import {
  Alert,
  Button,
  Col,
  Row,
  Statistic,
  Typography,
  Card,
  List,
  Space,
} from "antd";
import { api, errorText } from "../services/api";
const resources = [
  ["students", "学员"],
  ["teams", "队伍"],
  ["coaches", "教练"],
  ["events", "课程与活动"],
] as const;
export default function Workbench() {
  const [data, setData] = useState<{
    counts: Record<string, number>;
    upcoming: Array<{
      id: string;
      title: string;
      startsAt: string;
      leaveCount: number;
    }>;
    pendingTasks: Array<{
      id: string;
      title: string;
      pending: number | null;
      unpublished: number | null;
      error: string | null;
    }>;
    failedImports: Array<{ id: string; sourceName: string; failed: number }>;
    pendingServices: number | null;
  }>();
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    setData(undefined);
    void api<NonNullable<typeof data>>("workbench", {
      signal: controller.signal,
    })
      .then((value) => {
        if (!controller.signal.aborted) setData(value);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(errorText(reason));
      });
    return () => controller.abort();
  }, [attempt]);
  return (
    <PageContainer
      title="工作台"
      subTitle="跟进课堂、测评与服务，再查阅俱乐部资料"
      className="workbench"
    >
      {error && (
        <Alert
          className="form-alert"
          message={error}
          type="error"
          action={
            <Button onClick={() => setAttempt((value) => value + 1)}>
              重试
            </Button>
          }
        />
      )}
      <Typography.Title level={3}>待办与近期日程</Typography.Title>
      <Row gutter={[20, 20]}>
        <Col xs={24} lg={12}>
          <Card title="近期日程">
            <List
              dataSource={data?.upcoming ?? []}
              locale={{
                emptyText: data
                  ? "暂无近期安排"
                  : error
                    ? "暂不可用，请重试"
                    : "正在读取",
              }}
              renderItem={(event) => (
                <List.Item
                  actions={[
                    <Button
                      key="open"
                      type="link"
                      onClick={() =>
                        history.push(
                          `/data/events?recordId=${encodeURIComponent(event.id)}`,
                        )
                      }
                    >
                      查看活动
                    </Button>,
                  ]}
                >
                  {event.title} ·{" "}
                  {new Date(event.startsAt).toLocaleString("zh-CN")} · 已请假{" "}
                  {event.leaveCount} 人
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="测评待办">
            <List
              dataSource={data?.pendingTasks ?? []}
              locale={{
                emptyText: data
                  ? "暂无未处理任务"
                  : error
                    ? "暂不可用，请重试"
                    : "正在读取",
              }}
              renderItem={(task) => (
                <List.Item
                  actions={[
                    <Button
                      key="open"
                      type="link"
                      onClick={() =>
                        history.push(
                          `/assessment/tasks?taskId=${encodeURIComponent(task.id)}`,
                        )
                      }
                    >
                      查看任务
                    </Button>,
                  ]}
                >
                  {task.title} ·{" "}
                  {task.pending === null
                    ? "定义需核对"
                    : `${task.pending} 人待处理，${task.unpublished === null ? "确认进度暂不可用" : `${task.unpublished} 人待确认`}`}
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="导入问题">
            <List
              dataSource={data?.failedImports ?? []}
              locale={{
                emptyText: data
                  ? "暂无失败行"
                  : error
                    ? "暂不可用，请重试"
                    : "正在读取",
              }}
              renderItem={(batch) => (
                <List.Item>
                  {batch.sourceName} · {batch.failed} 行失败
                </List.Item>
              )}
            />
            <Button onClick={() => history.push("/data/imports")}>
              查看导入批次
            </Button>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="服务跟进">
            <Space direction="vertical">
              <Statistic
                title="待沟通或承接"
                value={data?.pendingServices ?? "—"}
              />
              <Button onClick={() => history.push("/services/consultations")}>
                查看咨询与需求
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
      <Typography.Title level={3} className="workbench-summary-title">
        俱乐部资料
      </Typography.Title>
      <Row gutter={[20, 20]}>
        {resources.map(([id, name]) => (
          <Col key={id} xs={24} sm={12} xl={6}>
            <ProCard bordered>
              <Statistic title={name} value={data?.counts[id] ?? "—"} />
              <Button type="link" onClick={() => history.push(`/data/${id}`)}>
                查看资料
              </Button>
            </ProCard>
          </Col>
        ))}
      </Row>
    </PageContainer>
  );
}
