export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly details?: unknown,
  ) {
    super(code);
  }
}
export interface Session {
  environment: string;
  clubId: string;
  user: { name: string; roles: string[] };
}
export interface Catalog {
  title: string;
  columns: string[];
  rows: Array<{ id: string; values: string[] }>;
  total: number;
  offset: number;
  pageSize: number;
}
export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const config = window.__FCM_CONFIG__;
  const response = await fetch(`${config.path}/api/${path}`, {
    method: options.method ?? "GET",
    credentials: "same-origin",
    cache: "no-store",
    redirect: "error",
    signal: options.signal,
    headers: {
      "X-FCM-Environment": config.environment,
      ...(options.body === undefined
        ? {}
        : { "Content-Type": "application/json" }),
    },
    ...(options.body === undefined
      ? {}
      : { body: JSON.stringify(options.body) }),
  });
  const data: unknown = await response.json();
  if (!response.ok) {
    if (response.status === 401 && path !== "login")
      window.dispatchEvent(new Event("fcm:unauthorized"));
    const error =
      typeof data === "object" && data !== null && "error" in data
        ? (data.error as { code?: string; details?: unknown })
        : undefined;
    throw new ApiError(
      response.status,
      error?.code ?? "request_failed",
      error?.details,
    );
  }
  return data as T;
}
export function validSession(value: Session): boolean {
  return (
    value.environment === window.__FCM_CONFIG__.environment &&
    typeof value.clubId === "string" &&
    typeof value.user?.name === "string" &&
    Array.isArray(value.user.roles)
  );
}
export function validCatalog(value: Catalog): boolean {
  return (
    typeof value.title === "string" &&
    Number.isInteger(value.total) &&
    Array.isArray(value.columns) &&
    value.columns.every((c) => typeof c === "string") &&
    Array.isArray(value.rows) &&
    value.rows.every(
      (r) =>
        typeof r.id === "string" &&
        Array.isArray(r.values) &&
        r.values.every((v) => typeof v === "string"),
    )
  );
}
export function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    const messages:Record<string,string>={assessment_incomplete:"该学员尚未录齐全部项目，不能确认发布。",assessment_not_assessed:"此学员已标记不测评，请先重新打开录入。",assessment_workflow_disabled:"此俱乐部尚未开放成绩录入与发布。",assessment_task_not_active:"任务尚未开始，当前可查阅。",assessment_course_required:"请为所录成绩选择真实来源课程。",invalid_assessment_course:"来源课程须在周期内，学员实际参加且你有权操作。",assessment_course_changed:"来源课程已改期，请核对并重新保存。",correction_reason_required:"更正已确认成绩须填写原因。",assessment_already_published:"已有确认成绩，请通过更正流程处理。",invalid_entry_value:"原始值、单位或固定版本范围不匹配。",invalid_model_definition:"请先修正模型校验问题。",invalid_model_trial:"此模型或输入尚不能计算，请核对配置。",invalid_trial_input:"试算值或单位不符合项目及映射范围。",formal_standard_required:"发布须填写已核定的正式标准依据。",invalid_standard_definition:"请先修正培养标准校验问题。",standard_unit_mismatch:"比较单位须与目标定义一致。",invalid_task_students:"所选学员须在对应队伍的当前有效名单中。"};
    if(messages[error.code])return messages[error.code]!;
    if (
      [
        "plan_in_use_copy_required",
        "drill_in_use_copy_required",
        "project_in_use_copy_required",
        "metric_in_use_copy_required",
      ].includes(error.code)
    )
      return "此定义已被引用，请复制为新版本后配置。";
    if (error.code === "profile_account_exists")
      return "此账号已有档案，请编辑现有档案。";
    if (error.status === 403) return "你暂无此项操作权限。";
    if (error.status === 409) return "记录已被更新，请核对最新内容后再保存。";
    if (error.status === 400) return "请核对输入内容和关联资料。";
    if (error.status === 429) return "尝试次数较多，请15分钟后再试。";
    if (error.status === 401) return "登录已失效，请重新登录。";
  }
  return "暂时无法完成操作，请重试。";
}
