import { createHash } from "node:crypto";
import type { EntityId } from "@football-club/domain";
import type { ExternalSystemConnection, ExternalTableMapping, StageExternalImportRecord } from "../data-capability/types.js";

export interface WpsConnector {
  fetchRows(input: {
    clubId: EntityId;
    connection: ExternalSystemConnection;
    tableMapping: ExternalTableMapping;
  }): StageExternalImportRecord[];
}

export class DeterministicWpsStubConnector implements WpsConnector {
  fetchRows(input: {
    clubId: EntityId;
    connection: ExternalSystemConnection;
    tableMapping: ExternalTableMapping;
  }): StageExternalImportRecord[] {
    const raw = stubRowForTable(input.tableMapping.externalTableKey);
    const canonical = JSON.stringify(Object.keys(raw).sort().map((key) => [key, raw[key]]));

    return [{
      rowNumber: 1,
      rowHash: createHash("sha256").update(`${input.connection.id}:${input.tableMapping.id}:${canonical}`).digest("hex"),
      raw,
    }];
  }
}

function stubRowForTable(externalTableKey: string): Record<string, unknown> {
  switch (externalTableKey) {
    case "payment_events":
      return {
        "身份证号": "500000201505010000",
        "收费日期": "2026-06-26",
        "收费阶段": "2025-2026春夏",
        "学员姓名": "李明",
        "充值类型": "线下课时充值",
        "手机": "13800000000",
        "微信": "wx_li_parent",
        "区域": "重庆",
        "学校": "重庆天才合作学校",
        "队伍名称": "U10发展队",
        "教练": "陈教练",
        "金额": 3200,
        "课时": 24,
        "公司实收": 3200,
        "审核通过": true,
        "已同步": false,
      };
    case "attendance_2025_2026_spring_summer":
      return {
        "身份证号": "500000201505010000",
        "阶段": "2025-2026春夏",
        "姓名": "李明",
        "区域": "重庆",
        "学校": "重庆天才合作学校",
        "队伍名称": "U10发展队",
        "教练": "陈教练",
        "第1周": 1,
        "第2周": 1,
        "本学期在该队签到": 10,
        "在该队的剩余课时": 14,
        "创建时间": "2026-06-26T08:00:00.000Z",
      };
    case "insurance_policies":
      return {
        "投保日期": "2026-06-26",
        "身份证号": "500000201505010000",
        "保险到期日期": "2027-06-26",
        "保单号": "WPS-STUB-POLICY-001",
        "运动项目": "足球",
        "学员姓名": "李明",
        "学校": "重庆天才合作学校",
        "购买公司": "线下保险公司",
        "审核通过": true,
      };
    case "talent_elite_assessment":
      return {
        "核心能力": "进攻能力",
        "得分": 4,
        "二级子项": "射门终结",
        "得分_2": 4,
        "三级子项": "正脚背射门",
        "得分_3": 4,
        "测试项目": "禁区外射门",
        "推荐训练项目": "射门专项",
      };
    case "full_users":
    default:
      return {
        "身份证号": "500000201505010000",
        "学员姓名": "李明",
        "渠道": "老学员转介绍",
        "区域": "重庆",
        "学校": "重庆天才合作学校",
        "队伍名称": "U10发展队",
        "教练": "陈教练",
        "学员状态": "在训",
        "出生年月": "2015-05",
        "手机": "13800000000",
        "微信": "wx_li_parent",
        "历次充值日期": "2026-06-01",
        "充值笔数": 1,
        "保险到期日期": "2027-06-01",
        "沟通反馈": "家长关注精英队升组路径",
        "签到次数": 8,
        "最近签到时间": "2026-06-24T10:00:00.000Z",
      };
  }
}
