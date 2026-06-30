export const cqTalentFullUsersHeaders = [
  "身份证号",
  "学员姓名",
  "渠道",
  "区域",
  "学校",
  "队伍名称",
  "教练",
  "学员状态",
  "出生年月",
  "手机",
  "微信",
  "历次充值日期",
  "充值笔数",
  "保险到期日期",
  "沟通反馈",
  "签到次数",
  "最近签到时间",
] as const;

export const cqTalentPaymentEventHeaders = [
  "身份证号",
  "收费日期",
  "收费阶段",
  "沟通进度",
  "学员姓名",
  "充值类型",
  "手机",
  "微信",
  "区域",
  "学校",
  "队伍名称",
  "教练",
  "金额",
  "课时",
  "缴费证明",
  "备注",
  "支付事件填写人",
  "核对人",
  "公司实收",
  "实收审核人",
  "保险到期日期",
  "审核通过",
  "最终审核人",
  "最后修改时间",
  "审核通过时间",
  "已同步",
] as const;

export const cqTalentAttendanceHeaders = [
  "身份证号",
  "阶段",
  "姓名",
  "区域",
  "学校",
  "队伍名称",
  "教练",
  ...Array.from({ length: 27 }, (_, index) => `第${index + 1}周`),
  "在该队充值课时",
  "在该队其他情况划课",
  "本学期在该队签到",
  "在该队的剩余课时",
  "创建时间",
] as const;

export const cqTalentInsuranceHeaders = [
  "投保日期",
  "身份证号",
  "保险到期日期",
  "保单号",
  "运动项目",
  "学员姓名",
  "学校",
  "购买公司",
  "审核通过",
  "备注",
] as const;

export type CqTalentBusinessTableKey = "fullUsers" | "paymentEvents" | "attendance" | "insurance";
export type CqTalentBusinessRow = Record<string, string | number | boolean>;

export interface CqTalentSyntheticCoach {
  id: string;
  name: string;
  phone: string;
  teams: string[];
}

export interface CqTalentSyntheticFamily {
  id: string;
  surname: string;
  parentName: string;
  phone: string;
  wechat: string;
  relationship: "father" | "mother" | "guardian";
  area: string;
  school: string;
  channel: string;
}

export interface CqTalentSyntheticTeamMembership {
  teamName: string;
  coachName: string;
  isPrimary: boolean;
}

export interface CqTalentSyntheticStudent {
  id: string;
  familyId: string;
  identityNumber: string;
  name: string;
  birthDate: string;
  phone: string;
  wechat: string;
  school: string;
  area: string;
  teamName: string;
  coachName: string;
  teamMemberships: CqTalentSyntheticTeamMembership[];
  lessonHours: number;
  checkInCount: number;
  insuranceExpiresAt: string;
}

export interface CqTalentSyntheticFixture {
  students: CqTalentSyntheticStudent[];
  families: CqTalentSyntheticFamily[];
  coaches: CqTalentSyntheticCoach[];
  tables: Record<CqTalentBusinessTableKey, CqTalentBusinessRow[]>;
}

const teams = [
  { name: "U8精英队", ageYear: 2018, coach: "刘启航" },
  { name: "U9精英队", ageYear: 2017, coach: "李教练" },
  { name: "U10发展队", ageYear: 2016, coach: "陈教练" },
  { name: "U10精英队", ageYear: 2016, coach: "赵教练" },
  { name: "U11精英队", ageYear: 2015, coach: "刘教练" },
  { name: "U12精英队", ageYear: 2014, coach: "周教练" },
  { name: "周末提高班", ageYear: 2016, coach: "何教练" },
  { name: "精英小班课", ageYear: 2015, coach: "孙教练" },
] as const;

const schools = ["巴蜀小学", "人民小学", "树人小学", "谢家湾小学", "重庆天地小学", "南开小学", "育才小学", "珊瑚实验小学"];
const areas = ["渝中区", "江北区", "沙坪坝区", "九龙坡区", "南岸区", "渝北区", "两江新区"];
const channels = ["老学员转介绍", "视频号咨询", "小红书咨询", "抖音咨询", "校区地推", "公众号报名"];
const paymentStages = ["春夏班", "暑期强化", "秋季班", "精英队续费"];
const paymentTypes = ["课包充值", "精英队课包", "小班课课包"];
const communicationProgresses = ["已确认", "待回访", "家长已沟通", "续费意向强"];
const surnames = [
  "王", "李", "张", "刘", "陈", "杨", "黄", "赵", "周", "吴", "徐", "孙", "胡", "朱", "高", "林", "何", "郭", "马", "罗",
  "梁", "宋", "郑", "谢", "韩", "唐", "冯", "于", "董", "萧", "程", "曹", "袁", "邓", "许", "傅", "沈", "曾", "彭", "吕",
  "苏", "卢", "蒋", "蔡", "贾", "丁", "魏", "薛", "叶", "阎", "余", "潘", "杜", "戴", "夏", "钟", "汪", "田", "任", "姜",
];
const studentGivenNames = [
  "子轩", "浩宇", "梓睿", "俊熙", "嘉豪", "宇航", "晨阳", "思远", "奕辰", "博文", "天佑", "启航", "铭泽", "睿哲", "景然", "承泽",
  "一诺", "雨桐", "欣怡", "语晨", "梓涵", "若溪", "思琪", "佳宁", "沐辰", "星宇", "明轩", "泽宇", "辰逸", "皓然", "子墨", "亦凡",
  "俊杰", "昊然", "嘉乐", "瑞霖", "沐阳", "柏霖", "景皓", "乐天", "安然", "若安", "知远", "言蹊", "书豪", "云帆", "凌峰", "景行",
];
const parentGivenNames = [
  "建国", "志强", "伟", "敏", "静", "磊", "军", "芳", "勇", "丽", "涛", "娟", "鹏", "霞", "峰", "梅", "刚", "艳", "斌", "玲",
  "辉", "洁", "超", "丹", "波", "莉", "强", "娜", "杰", "萍", "鑫", "倩",
];

export function createCqTalentSyntheticFixture(playerCount = 200): CqTalentSyntheticFixture {
  const coaches = teams.map((team, index) => ({
    id: `coach-cq-talent-${String(index + 1).padStart(2, "0")}`,
    name: team.coach,
    phone: `1390000${String(index + 1).padStart(4, "0")}`,
    teams: [team.name],
  }));
  const familyCount = familyIndexForStudent(playerCount - 1) + 1;
  const families = Array.from({ length: familyCount }, (_, index) => createFamily(index));
  const students = Array.from({ length: playerCount }, (_, index) => createStudent(index, families[familyIndexForStudent(index)]!));

  return {
    students,
    families,
    coaches,
    tables: {
      fullUsers: students.map((student, index) => pickRow(cqTalentFullUsersHeaders, createFullUserRow(student, index))),
      paymentEvents: students.map((student, index) => pickRow(cqTalentPaymentEventHeaders, createPaymentEventRow(student, index))),
      attendance: students.map((student, index) => pickRow(cqTalentAttendanceHeaders, createAttendanceRow(student, index))),
      insurance: students.map((student, index) => pickRow(cqTalentInsuranceHeaders, createInsuranceRow(student, index))),
    },
  };
}

function createFamily(index: number): CqTalentSyntheticFamily {
  const surname = surnames[index % surnames.length]!;
  const relationship = ["father", "mother", "guardian"][index % 3] as CqTalentSyntheticFamily["relationship"];
  const area = areas[index % areas.length]!;

  return {
    id: `family-cq-talent-${String(index + 1).padStart(3, "0")}`,
    surname,
    parentName: `${surname}${parentGivenNames[index % parentGivenNames.length]!}`,
    phone: `138${String(32000000 + index + 1).padStart(8, "0")}`,
    wechat: `cq_talent_family_${String(index + 1).padStart(3, "0")}`,
    relationship,
    area,
    school: schools[index % schools.length]!,
    channel: channels[index % channels.length]!,
  };
}

function familyIndexForStudent(index: number): number {
  if (index < 120) {
    return index;
  }
  if (index < 180) {
    return 120 + Math.floor((index - 120) / 2);
  }
  return 150 + Math.floor((index - 180) / 3);
}

function createStudent(index: number, family: CqTalentSyntheticFamily): CqTalentSyntheticStudent {
  const serial = index + 1;
  const team = teams[index % teams.length]!;
  const memberships = createTeamMemberships(index, team);
  const month = index % 12 + 1;
  const day = index % 26 + 1;
  const birthDate = `${team.ageYear}-${pad(month)}-${pad(day)}`;
  const paymentCount = index % 3 + 1;
  const lessonHours = [24, 32, 48][index % 3]!;
  const checkInCount = 6 + index % 19;

  return {
    id: `student-cq-talent-${String(serial).padStart(3, "0")}`,
    familyId: family.id,
    identityNumber: `50010${String(index % 8).padStart(1, "0")}${team.ageYear}${pad(month)}${pad(day)}${String(serial).padStart(4, "0")}`,
    name: `${family.surname}${studentGivenNames[index % studentGivenNames.length]!}`,
    birthDate,
    phone: family.phone,
    wechat: family.wechat,
    school: family.school,
    area: family.area,
    teamName: team.name,
    coachName: team.coach,
    teamMemberships: memberships,
    lessonHours: lessonHours * paymentCount,
    checkInCount,
    insuranceExpiresAt: `2027-${pad(index % 12 + 1)}-${pad(index % 26 + 1)}`,
  };
}

function createTeamMemberships(index: number, primaryTeam: typeof teams[number]): CqTalentSyntheticTeamMembership[] {
  const memberships: CqTalentSyntheticTeamMembership[] = [{
    teamName: primaryTeam.name,
    coachName: primaryTeam.coach,
    isPrimary: true,
  }];
  const secondary = index % 5 === 0
    ? teams.find((team) => team.name === "周末提高班")
    : index % 7 === 0
      ? teams.find((team) => team.name === "精英小班课")
      : undefined;

  if (secondary && secondary.name !== primaryTeam.name) {
    memberships.push({
      teamName: secondary.name,
      coachName: secondary.coach,
      isPrimary: false,
    });
  }

  return memberships;
}

function createFullUserRow(student: CqTalentSyntheticStudent, index: number): CqTalentBusinessRow {
  return {
    "身份证号": student.identityNumber,
    "学员姓名": student.name,
    "渠道": channels[familyIndexForStudent(index) % channels.length]!,
    "区域": student.area,
    "学校": student.school,
    "队伍名称": student.teamName,
    "教练": student.coachName,
    "学员状态": index % 17 === 0 ? "暂停" : "在训",
    "出生年月": student.birthDate.slice(0, 7),
    "手机": student.phone,
    "微信": student.wechat,
    "历次充值日期": `2026-03-${pad(index % 20 + 1)}、2026-06-${pad(index % 20 + 1)}`,
    "充值笔数": index % 3 + 1,
    "保险到期日期": student.insuranceExpiresAt,
    "沟通反馈": index % 4 === 0 ? "家长关注精英队选拔与能力提升" : "常规训练跟进",
    "签到次数": student.checkInCount,
    "最近签到时间": `2026-06-${pad(index % 24 + 1)} 18:30`,
  };
}

function createPaymentEventRow(student: CqTalentSyntheticStudent, index: number): CqTalentBusinessRow {
  const hours = [24, 32, 48][index % 3]!;
  const amount = hours * 120;
  const paidAt = `2026-06-${pad(index % 24 + 1)}`;

  return {
    "身份证号": student.identityNumber,
    "收费日期": paidAt,
    "收费阶段": paymentStages[index % paymentStages.length]!,
    "沟通进度": communicationProgresses[index % communicationProgresses.length]!,
    "学员姓名": student.name,
    "充值类型": paymentTypes[index % paymentTypes.length]!,
    "手机": student.phone,
    "微信": student.wechat,
    "区域": student.area,
    "学校": student.school,
    "队伍名称": student.teamName,
    "教练": student.coachName,
    "金额": amount,
    "课时": hours,
    "缴费证明": `proof-${student.id}.jpg`,
    "备注": "线下确认收款，系统只同步状态",
    "支付事件填写人": "运营A",
    "核对人": "财务B",
    "公司实收": amount,
    "实收审核人": "财务主管",
    "保险到期日期": student.insuranceExpiresAt,
    "审核通过": true,
    "最终审核人": "王管理员",
    "最后修改时间": `${paidAt} 10:00`,
    "审核通过时间": `${paidAt} 12:00`,
    "已同步": false,
  };
}

function createAttendanceRow(student: CqTalentSyntheticStudent, index: number): CqTalentBusinessRow {
  const weeks = Object.fromEntries(Array.from({ length: 27 }, (_, weekIndex) => {
    const attended = weekIndex < student.checkInCount ? 1 : 0;
    return [`第${weekIndex + 1}周`, attended];
  }));
  const otherDeductedHours = index % 5 === 0 ? 1 : 0;
  const remaining = Math.max(student.lessonHours - student.checkInCount - otherDeductedHours, 0);

  return {
    "身份证号": student.identityNumber,
    "阶段": "2025-2026春夏",
    "姓名": student.name,
    "区域": student.area,
    "学校": student.school,
    "队伍名称": student.teamName,
    "教练": student.coachName,
    ...weeks,
    "在该队充值课时": student.lessonHours,
    "在该队其他情况划课": otherDeductedHours,
    "本学期在该队签到": student.checkInCount,
    "在该队的剩余课时": remaining,
    "创建时间": `2026-06-${pad(index % 24 + 1)} 20:00`,
  };
}

function createInsuranceRow(student: CqTalentSyntheticStudent, index: number): CqTalentBusinessRow {
  const purchasedAt = `2026-${pad(index % 12 + 1)}-${pad(index % 26 + 1)}`;

  return {
    "投保日期": purchasedAt,
    "身份证号": student.identityNumber,
    "保险到期日期": student.insuranceExpiresAt,
    "保单号": `CQTFB${String(index + 1).padStart(6, "0")}`,
    "运动项目": "足球",
    "学员姓名": student.name,
    "学校": student.school,
    "购买公司": index % 2 === 0 ? "太平洋保险" : "平安保险",
    "审核通过": true,
    "备注": "线下投保确认，平台同步状态",
  };
}

function pickRow<THeader extends readonly string[]>(
  headers: THeader,
  row: CqTalentBusinessRow,
): CqTalentBusinessRow {
  return Object.fromEntries(headers.map((header) => [header, row[header] ?? ""])) as CqTalentBusinessRow;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}
