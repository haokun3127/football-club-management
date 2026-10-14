import { useRef, useState } from "react";
import { ProTable, type ActionType } from "@ant-design/pro-components";
import {
  Alert,
  App,
  Button,
  Drawer,
  Form,
  Input,
  Popconfirm,
  Space,
} from "antd";
import { api, errorText } from "../services/api";
interface Scout {
  id: string;
  name: string;
  birthDate: string;
  maskedDocument: string;
  status: "active" | "enrolled";
}
export default function Scouts() {
  const { message } = App.useApp();
  const action = useRef<ActionType>();
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false),
    [canCreate, setCanCreate] = useState(false),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  return (
    <>
      <ProTable<Scout>
        actionRef={action}
        rowKey="id"
        headerTitle="球探人员"
        search={false}
        columns={[
          { title: "姓名", dataIndex: "name" },
          { title: "出生日期", dataIndex: "birthDate" },
          { title: "证件尾号", dataIndex: "maskedDocument" },
          {
            title: "状态",
            dataIndex: "status",
            valueEnum: { active: "球探档案", enrolled: "已转正式" },
          },
          {
            title: "操作",
            valueType: "option",
            render: (_, row) =>
              canCreate && row.status === "active" ? (
                <Popconfirm
                  title="沿用此人员档案转为正式学员？"
                  description="转正式后可在学员档案中维护，不会自动加入队伍或绑定家长。"
                  onConfirm={async () => {
                    try {
                      await api(`scouts/${encodeURIComponent(row.id)}/enroll`, {
                        method: "POST",
                        body: { requestId: crypto.randomUUID() },
                      });
                      void message.success("已转正式");
                      await action.current?.reload();
                    } catch (e) {
                      void message.error(errorText(e));
                    }
                  }}
                >
                  <Button type="link">转正式学员</Button>
                </Popconfirm>
              ) : null,
          },
        ]}
        toolbar={{
          search: {
            placeholder: "搜索姓名或证件尾号",
            onSearch: () => void action.current?.reload(),
          },
        }}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        request={async (params) => {
          try {
            const result = await api<{
              players: Scout[];
              total: number;
              canCreate: boolean;
            }>(
              `scouts?search=${encodeURIComponent(String(params.keyword ?? ""))}&offset=${((params.current ?? 1) - 1) * 20}`,
            );
            setCanCreate(result.canCreate);
            setError("");
            return { data: result.players, total: result.total, success: true };
          } catch (e) {
            setError(errorText(e));
            return { data: [], total: 0, success: false };
          }
        }}
        toolBarRender={() =>
          canCreate
            ? [
                <Button
                  key="new"
                  type="primary"
                  onClick={() => {
                    form.resetFields();
                    setOpen(true);
                    setError("");
                  }}
                >
                  新增球探人员
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
        title="新增球探人员"
        width={560}
        onClose={() => {
          if (!saving) {
            setOpen(false);
            form.resetFields();
          }
        }}
        destroyOnClose
        footer={
          <Space>
            <Button
              disabled={saving}
              onClick={() => {
                setOpen(false);
                form.resetFields();
              }}
            >
              取消
            </Button>
            <Button
              type="primary"
              loading={saving}
              onClick={() => form.submit()}
            >
              保存
            </Button>
          </Space>
        }
      >
        <Alert
          type="info"
          message="证件用于核对重复身份，保存后仅展示尾号。"
          className="form-alert"
        />
        {error && <Alert type="error" message={error} className="form-alert" />}
        <Form
          form={form}
          layout="vertical"
          onFinish={async (values) => {
            if (saving) return;
            setSaving(true);
            try {
              await api("scouts", {
                method: "POST",
                body: { ...values, requestId: crypto.randomUUID() },
              });
              form.resetFields();
              setOpen(false);
              void message.success("档案已保存");
              await action.current?.reload();
            } catch (e) {
              setError(errorText(e));
            } finally {
              setSaving(false);
            }
          }}
        >
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
            <Input maxLength={60} />
          </Form.Item>
          <Form.Item
            name="identityNumber"
            label="身份证号码"
            rules={[
              { required: true },
              { len: 18, message: "请输入18位身份证号码" },
            ]}
          >
            <Input.Password maxLength={18} autoComplete="off" />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
}
