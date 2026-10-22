import type { Field } from "./resource-fields";

// Group labels are presentation only. Leaf IDs remain the server resource keys.
export const DATA_RESOURCE_GROUPS = [
  {
    id: "people",
    name: "人员与队伍",
    resources: [
      ["students", "学员档案"],
      ["teams", "队伍"],
      ["members", "队伍成员"],
      ["coaches", "教练"],
      ["assignments", "教练任职"],
      ["parents", "家长资料"],
      ["guardians", "家长绑定"],
      ["contacts", "学员联系人"],
      ["operations", "学员运营资料"],
      ["scouts", "球探人员"],
    ],
  },
  {
    id: "courses",
    name: "课程与记录",
    resources: [
      ["events", "课程与活动"],
      ["venues", "场地"],
      ["terms", "学期"],
      ["participants", "活动参训记录"],
      ["training-records", "训练计次与更正"],
      ["insurance", "保险资料"],
      ["credits", "课包台账"],
    ],
  },
  {
    id: "teaching",
    name: "教学资源",
    resources: [
      ["drills", "训练练习库"],
      ["plans", "公共训练计划"],
      ["metrics", "能力指标定义"],
      ["testitems", "测评采集项目"],
      ["evaluation-phrases", "评价用语"],
    ],
  },
  {
    id: "content",
    name: "内容与展示",
    resources: [
      ["articles", "公告与内容"],
      ["branding", "队徽与展示主题"],
      ["banners", "新闻 Banner"],
      ["share-templates", "预制分享模板"],
      ["optional-features", "小程序可选功能目录"],
    ],
  },
  {
    id: "operations",
    name: "导入与账号",
    resources: [
      ["imports", "导入与批次"],
      ["memberships", "账号与角色"],
    ],
  },
] as const;

type FieldGroup = readonly [title: string, keys: readonly string[]];
const GROUPS: Record<string, readonly FieldGroup[]> = {
  students: [
    ["基本身份", ["name", "birthDate", "gender"]],
    ["训练档案", ["dominantFoot", "currentLevel", "notes"]],
  ],
  teams: [
    ["队伍资料", ["name", "ageGroup", "level", "status"]],
    ["教学安排", ["defaultCoachId", "defaultLocationId"]],
  ],
  coaches: [
    ["教练身份", ["name", "userId", "status", "wechatId"]],
    [
      "教学与服务",
      ["specialties", "acceptsPrivateLessons", "availabilitySlots"],
    ],
  ],
  events: [
    ["活动与时间", ["title", "type", "status", "startsAt", "endsAt"]],
    ["人员与场地", ["primaryTeamId", "ownerCoachId", "locationId"]],
    [
      "教学与比赛安排",
      [
        "kind",
        "sessionPlanId",
        "intensity",
        "matchType",
        "opponentName",
        "ageGroup",
        "competitionFormat",
        "notes",
      ],
    ],
  ],
  metrics: [["指标定义", ["name", "code", "category", "unit", "description"]]],
  testitems: [
    ["采集项目", ["name", "code", "category", "unit", "description"]],
  ],
};

export function groupResourceFields(resource: string, fields: Field[]) {
  const definitions = GROUPS[resource] ?? [];
  const used = new Set<string>();
  const groups = definitions
    .map(([title, keys]) => ({
      title,
      fields: fields.filter((field) => {
        if (!keys.includes(field.key) || used.has(field.key)) return false;
        used.add(field.key);
        return true;
      }),
    }))
    .filter((group) => group.fields.length);
  const remaining = fields.filter((field) => !used.has(field.key));
  if (remaining.length)
    groups.push({
      title: groups.length ? "其他资料" : "基本资料",
      fields: remaining,
    });
  return groups;
}
