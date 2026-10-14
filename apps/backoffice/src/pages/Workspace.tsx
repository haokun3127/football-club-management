import Bi from "./bi";
import Imports from "./imports";
import Tasks from "./tasks";
import Standards from "./standards";
import Models from "./models";
import Mappings from "./mappings";
import { useEffect, useState } from "react";
import { history, useLocation } from "@umijs/max";
import { ProLayout } from "@ant-design/pro-components";
import {
  Alert,
  App,
  Button,
  Form,
  Input,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import {
  DashboardOutlined,
  DatabaseOutlined,
  ExperimentOutlined,
  BarChartOutlined,
  TeamOutlined,
  SettingOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import {
  api,
  ApiError,
  errorText,
  validSession,
  type Session,
} from "../services/api";
import Scouts from "./scouts";
import TrainingRecords from "./training-records";
import Plans from "./plans";
import Management from "./management";
import GrantsPage from "./grants";
import Workbench from "./workbench";
const names = { develop: "开发环境", trial: "体验环境", release: "正式环境" };
const routes = [
  { path: "/", name: "工作台", icon: <DashboardOutlined /> },
  {
    path: "/data",
    name: "数据管理",
    icon: <DatabaseOutlined />,
    routes: [
      ["imports", "导入与批次"],
      ["students", "学员档案"],
      ["scouts", "球探人员"],
      ["teams", "队伍"],
      ["coaches", "教练"],
      ["events", "课程与活动"],
      ["members", "队伍成员"],
      ["assignments", "教练任职"],
      ["parents", "家长资料"],
      ["guardians", "家长绑定"],
      ["contacts", "学员联系人"],
      ["operations", "学员运营资料"],
      ["venues", "场地"],
      ["terms", "学期"],
      ["participants", "活动参训记录"],
      ["training-records", "训练计次与更正"],
      ["insurance", "保险资料"],
      ["credits", "课包台账"],
      ["articles", "公告与内容"],
      ["branding", "队徽与展示主题"],
      ["banners", "新闻 Banner"],
      ["share-templates", "预制分享模板"],
      ["evaluation-phrases", "评价用语"],
      ["optional-features", "小程序可选功能目录"],
      ["drills", "训练练习库"],
      ["plans", "公共训练计划"],
      ["metrics", "能力指标定义"],
      ["testitems", "测评采集项目"],
      ["memberships", "账号与角色"],
    ].map(([id, name]) => ({ path: `/data/${id}`, name })),
  },
  {
    path: "/assessment",
    name: "评测与模型",
    icon: <ExperimentOutlined />,
    routes: [
      { path: "/assessment/projects", name: "区间映射" },
      { path: "/assessment/models", name: "模型版本" },
      { path: "/assessment/standards", name: "培养标准" },
      { path: "/assessment/tasks", name: "任务与结果" },
    ],
  },
  { path: "/bi/overview", name: "BI 分析", icon: <BarChartOutlined /> },
  {
    path: "/services",
    name: "专业服务",
    icon: <TeamOutlined />,
    routes: [
      ["service-catalog", "服务目录"],
      ["consultations", "私教咨询与承接"],
      ["service-cases", "培养与测评服务需求"],
      ["scout-work", "球探观察与跟进"],
    ].map(([key, name]) => ({ path: `/services/${key}`, name })),
  },
  { path: "/settings/club", name: "管理设置", icon: <SettingOutlined /> },
];
export default function Workspace() {
  const { message } = App.useApp();
  const { pathname } = useLocation();
  const [session, setSession] = useState<Session>();
  const [loading, setLoading] = useState(true);
  const [restorationError, setRestorationError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [form] = Form.useForm();
  const config = window.__FCM_CONFIG__;
  async function restore() {
    setLoading(true);
    setRestorationError("");
    try {
      const value = await api<Session>("session");
      if (!validSession(value)) throw new Error("Invalid session");
      setSession(value);
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401))
        setRestorationError(errorText(error));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void restore();
    const reset = () => setSession(undefined);
    window.addEventListener("fcm:unauthorized", reset);
    return () => window.removeEventListener("fcm:unauthorized", reset);
  }, []);
  if (loading)
    return (
      <div className="loading">
        <Spin size="large" tip="正在读取工作台…">
          <div className="loading-space" />
        </Spin>
      </div>
    );
  if (!session)
    return (
      <main className="login-page">
        <section className="login-story">
          <div className="brand-mark">FC</div>
          <p>FOOTBALL CLUB MANAGEMENT</p>
          <Typography.Title>
            让每一次训练
            <br />
            都有迹可循。
          </Typography.Title>
          <Typography.Paragraph>
            人员、课程、评测和成长数据，在同一个工作台里连接。
          </Typography.Paragraph>
        </section>
        <section className="login-panel">
          <Tag>{names[config.environment]}</Tag>
          <Typography.Title level={2}>登录工作台</Typography.Title>
          <Typography.Paragraph type="secondary">
            使用俱乐部分配的管理账号
          </Typography.Paragraph>
          {restorationError ? (
            <Alert
              type="error"
              message={restorationError}
              action={<Button onClick={() => void restore()}>重试</Button>}
            />
          ) : (
            <Form
              form={form}
              layout="vertical"
              initialValues={{ clubId: config.clubs[0]?.id }}
              onFinish={async (values: {
                clubId: string;
                username: string;
                password: string;
              }) => {
                if (submitting) return;
                setSubmitting(true);
                setLoginError("");
                try {
                  const value = await api<Session>("login", {
                    method: "POST",
                    body: values,
                  });
                  if (!validSession(value)) throw new Error("Invalid session");
                  form.resetFields(["password"]);
                  setSession(value);
                } catch (error) {
                  setLoginError(
                    error instanceof ApiError && error.status === 401
                      ? "账号或密码不正确，或账号暂无后台权限。"
                      : errorText(error),
                  );
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              <Form.Item
                name="clubId"
                label="俱乐部"
                rules={[{ required: true, message: "请选择俱乐部" }]}
              >
                <Select
                  options={config.clubs.map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                />
              </Form.Item>
              <Form.Item
                name="username"
                label="账号"
                rules={[{ required: true, message: "请输入账号" }]}
              >
                <Input autoComplete="username" maxLength={64} size="large" />
              </Form.Item>
              <Form.Item
                name="password"
                label="密码"
                rules={[{ required: true, message: "请输入密码" }]}
              >
                <Input.Password
                  autoComplete="current-password"
                  maxLength={128}
                  size="large"
                />
              </Form.Item>
              {loginError && (
                <Alert
                  type="error"
                  message={loginError}
                  className="form-alert"
                />
              )}
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                size="large"
                block
              >
                登录工作台
              </Button>
            </Form>
          )}
        </section>
      </main>
    );
  const table = pathname.startsWith("/data/")
    ? (pathname.split("/")[2] ?? "service-catalog")
    : undefined;
  return (
    <ProLayout
      title={
        config.clubs.find((c) => c.id === session.clubId)?.name ?? "俱乐部管理"
      }
      logo={`${config.path}/assets/favicon.svg`}
      layout="mix"
      fixSiderbar
      fixedHeader
      route={{ routes }}
      location={{ pathname }}
      token={{
        header: { colorBgHeader: "#fff" },
        sider: { colorBgMenuItemSelected: "#F9E9EB" },
      }}
      menuItemRender={(item, dom) => (
        <a
          href={`#${item.path}`}
          onClick={(event) => {
            event.preventDefault();
            if (item.path) history.push(item.path);
          }}
        >
          {dom}
        </a>
      )}
      actionsRender={() => [
        <Tag key="env">{names[config.environment]}</Tag>,
        <Space key="identity">
          <span>{session.user.name}</span>
          <Button
            icon={<LogoutOutlined />}
            loading={submitting}
            onClick={async () => {
              if (submitting) return;
              setSubmitting(true);
              try {
                await api("logout", { method: "POST", body: {} });
                setSession(undefined);
                history.replace("/");
              } catch (error) {
                void message.error(errorText(error));
              } finally {
                setSubmitting(false);
              }
            }}
          >
            退出
          </Button>
        </Space>,
      ]}
    >
      {pathname === "/" ? (
        <Workbench />
      ) : table ? (
        table === "imports" ? (
          <Imports />
        ) : table === "scouts" ? (
          <Scouts />
        ) : table === "plans" ? (
          <Plans
            canWrite={session.user.roles.some(
              (role) => role === "owner" || role === "admin",
            )}
          />
        ) : table === "training-records" ? (
          <TrainingRecords />
        ) : (
          <Management key={table} resource={table} />
        )
      ) : pathname === "/assessment/tasks" ? (
        <Tasks
          canCreate={session.user.roles.some(
            (role) => role === "owner" || role === "admin",
          )}
        />
      ) : pathname === "/assessment/standards" ? (
        <Standards
          canWrite={session.user.roles.some(
            (role) => role === "owner" || role === "admin",
          )}
        />
      ) : pathname === "/assessment/models" ? (
        <Models
          canWrite={session.user.roles.some(
            (role) => role === "owner" || role === "admin",
          )}
        />
      ) : pathname.startsWith("/assessment/") ? (
        <Mappings
          canWrite={session.user.roles.some(
            (role) => role === "owner" || role === "admin",
          )}
        />
      ) : pathname.startsWith("/bi/") ? (
        <Bi />
      ) : pathname.startsWith("/services/") ? (
        <Management
          key={pathname}
          resource={
            pathname.split("/")[2] === "catalog"
              ? "service-catalog"
              : (pathname.split("/")[2] ?? "service-catalog")
          }
        />
      ) : pathname.startsWith("/settings/") ? (
        <GrantsPage />
      ) : (
        <Alert
          type="info"
          message="页面不存在"
          description="请从左侧菜单选择管理模块。"
        />
      )}
    </ProLayout>
  );
}
