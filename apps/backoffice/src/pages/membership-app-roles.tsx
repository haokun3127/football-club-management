import { useEffect, useRef, useState } from "react";
import {
  Alert,
  App,
  Button,
  Form,
  Select,
  Space,
  Spin,
  Typography,
} from "antd";
import { api, ApiError, errorText } from "../services/api";
import type { Option, RecordRow, ResourceList } from "./management";
type Role = "parent" | "coach";
export default function MembershipAppRoles({
  userId,
  roles,
  canWrite,
}: {
  userId: string;
  roles: string[];
  canWrite: boolean;
}) {
  const { message } = App.useApp(),
    generation = useRef(0),
    receipts = useRef(new Map<string, { body: string; requestId: string }>());
  const [clients, setClients] = useState<Option[]>([]),
    [rows, setRows] = useState<RecordRow[]>([]),
    [desired, setDesired] = useState<Record<string, Role | null>>({}),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [conflict, setConflict] = useState(false),
    [reload, setReload] = useState(0);
  useEffect(() => {
    const token = ++generation.current;
    setLoading(true);
    setError("");
    setConflict(false);
    receipts.current.clear();
    Promise.all([
      api<Option[]>("options/app-clients"),
      api<ResourceList>(
        `resources/app-role-preferences?search=${encodeURIComponent(userId)}`,
      ),
    ])
      .then(([options, data]) => {
        if (token !== generation.current) return;
        const records = data.rows.filter((row) => row.values.userId === userId);
        setClients(options);
        setRows(records);
        setDesired(
          Object.fromEntries(
            options.map((client) => [
              client.value,
              (records.find((row) => row.values.appClientId === client.value)
                ?.values.defaultRole || null) as Role | null,
            ]),
          ),
        );
      })
      .catch((e) => {
        if (token === generation.current) setError(errorText(e));
      })
      .finally(() => {
        if (token === generation.current) setLoading(false);
      });
    return () => {
      generation.current++;
    };
  }, [userId, reload]);
  async function save(clientId: string) {
    if (busy || !canWrite || conflict) return;
    const token = generation.current,
      record = rows.find((row) => row.values.appClientId === clientId),
      values = {
        userId,
        appClientId: clientId,
        defaultRole: desired[clientId] || null,
      },
      body = JSON.stringify(values);
    let receipt = receipts.current.get(clientId);
    if (receipt?.body !== body) {
      receipt = { body, requestId: crypto.randomUUID() };
      receipts.current.set(clientId, receipt);
    }
    setBusy(clientId);
    setError("");
    try {
      const result = await api<RecordRow>(
        `resources/app-role-preferences${record ? `/${record.id}` : ""}`,
        {
          method: record ? "PUT" : "POST",
          body: {
            values,
            expectedRevision: record?.revision || null,
            requestId: receipt.requestId,
          },
        },
      );
      const detail = await api<{ record: RecordRow }>(
        `resources/app-role-preferences/${result.id}`,
      );
      if (token !== generation.current) return;
      setRows((previous) => [
        ...previous.filter((row) => row.values.appClientId !== clientId),
        detail.record,
      ]);
      receipts.current.delete(clientId);
      message.success("默认身份已保存");
    } catch (e) {
      if (token !== generation.current) return;
      setError(errorText(e));
      setConflict(e instanceof ApiError && e.status === 409);
    } finally {
      if (token === generation.current) setBusy("");
    }
  }
  const options: Option[] = [];
  if (roles.includes("parent"))
    options.push({ value: "parent", label: "家长" });
  if (
    roles.some((role) => ["coach", "owner", "admin", "operator"].includes(role))
  )
    options.push({ value: "coach", label: "教练" });
  if (loading) return <Spin tip="正在读取默认身份" />;
  return (
    <section aria-label="默认小程序身份">
      <Typography.Paragraph type="secondary">
        首次登录按默认身份进入；用户在“我的”成功切换后，下次优先恢复上次有效身份。单一有效身份自动进入。
      </Typography.Paragraph>
      {error && (
        <Alert
          type="error"
          message={error}
          action={
            <Button
              onClick={() => setReload((value) => value + 1)}
              disabled={!!busy}
            >
              {conflict ? "重新读取并核对" : "重试读取"}
            </Button>
          }
        />
      )}
      <Form layout="vertical">
        {clients.map((client) => {
          const row = rows.find(
            (item) => item.values.appClientId === client.value,
          );
          return (
            <Form.Item
              key={client.value}
              label={client.label}
              htmlFor={`default-${client.value}`}
            >
              <Space wrap>
                <Select
                  className="role-default-select"
                  id={`default-${client.value}`}
                  aria-label={`${client.label}默认身份`}
                  placeholder="未配置"
                  options={options}
                  value={desired[client.value] ?? undefined}
                  allowClear
                  disabled={!canWrite || !!busy || conflict}
                  onChange={(value) =>
                    setDesired((previous) => ({
                      ...previous,
                      [client.value]: (value as Role | undefined) || null,
                    }))
                  }
                />
                <Button
                  onClick={() => void save(client.value)}
                  loading={busy === client.value}
                  disabled={
                    !canWrite ||
                    !!busy ||
                    conflict ||
                    (!row && !desired[client.value])
                  }
                >
                  保存默认身份
                </Button>
              </Space>
            </Form.Item>
          );
        })}
      </Form>
      {!clients.length && (
        <Typography.Paragraph>暂无启用的小程序客户端。</Typography.Paragraph>
      )}
    </section>
  );
}
