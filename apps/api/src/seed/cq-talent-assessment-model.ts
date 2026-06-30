import type {
  AbilityMetric,
  AssessmentMetricBinding,
  AssessmentTemplate,
  AssessmentTemplateVersion,
  AssessmentTestItem,
  DevelopmentDimension,
  DerivedMetricDefinition,
  MetricDependency,
  MetricGraphVersion,
  MetricView,
  MetricViewNode,
  SessionPlan,
  TrainingDrill,
  TrainingObjective,
} from "@football-club/domain";
import { chongqingTalentClubId as clubId, clubCatalog, seedNow as now, systemCatalog } from "./types.js";

export interface TalentEliteAssessmentBlueprintRow {
  rowNumber: number;
  coreAbility: string;
  coreFormula: string;
  secondaryMetric: string;
  secondaryFormula: string;
  atomicMetric: string;
  sampleScore: number;
  testItem: string;
  recommendedTraining: string;
}

export const talentEliteAssessmentBlueprintRows = [
  {
    "rowNumber": 3,
    "coreAbility": "运控球",
    "coreFormula": "=D3+D4+D5+D7",
    "secondaryMetric": "球性球感",
    "secondaryFormula": "=(F3/100)*5",
    "atomicMetric": "基础球性",
    "sampleScore": 67,
    "testItem": "1 分钟颠球次数",
    "recommendedTraining": "颠球、踩球拉球、左右脚交替触球"
  },
  {
    "rowNumber": 4,
    "coreAbility": "运控球",
    "coreFormula": "=D3+D4+D5+D7",
    "secondaryMetric": "护球",
    "secondaryFormula": "=(F4/100)*5",
    "atomicMetric": "小范围护球与控球",
    "sampleScore": 78,
    "testItem": "限定区域 30 秒护球不失误",
    "recommendedTraining": "侧身护球、背对护球、小区域控球"
  },
  {
    "rowNumber": 5,
    "coreAbility": "运控球",
    "coreFormula": "=D3+D4+D5+D7",
    "secondaryMetric": "带球",
    "secondaryFormula": "=(F5*0.3+F6*0.7)/100*5",
    "atomicMetric": "直线带球",
    "sampleScore": 69,
    "testItem": "20米直线带球计时",
    "recommendedTraining": "直线加速带球、左右脚交替带球"
  },
  {
    "rowNumber": 6,
    "coreAbility": "运控球",
    "coreFormula": "=D3+D4+D5+D7",
    "secondaryMetric": "带球",
    "secondaryFormula": "=(F5*0.3+F6*0.7)/100*5",
    "atomicMetric": "变向带球",
    "sampleScore": 97,
    "testItem": "绕标志桶变向带球计时",
    "recommendedTraining": "绕桩、内外侧扣球变向"
  },
  {
    "rowNumber": 7,
    "coreAbility": "运控球",
    "coreFormula": "=D3+D4+D5+D7",
    "secondaryMetric": "突破与摆脱",
    "secondaryFormula": "=(F7*0.3+F8*0.3+F9*0.4)/100*5",
    "atomicMetric": "假动作",
    "sampleScore": 67,
    "testItem": "轻度干扰下假动作摆脱",
    "recommendedTraining": "虚晃、重心欺骗、假动作"
  },
  {
    "rowNumber": 8,
    "coreAbility": "运控球",
    "coreFormula": "=D3+D4+D5+D7",
    "secondaryMetric": "突破与摆脱",
    "secondaryFormula": "=(F7*0.3+F8*0.3+F9*0.4)/100*5",
    "atomicMetric": "节奏（急停&启动）",
    "sampleScore": 96,
    "testItem": "急停后快速启动突破",
    "recommendedTraining": "急停护球、突然启动加速"
  },
  {
    "rowNumber": 9,
    "coreAbility": "运控球",
    "coreFormula": "=D3+D4+D5+D7",
    "secondaryMetric": "突破与摆脱",
    "secondaryFormula": "=(F7*0.3+F8*0.3+F9*0.4)/100*5",
    "atomicMetric": "变向加速",
    "sampleScore": 96,
    "testItem": "变向加速通过防守线",
    "recommendedTraining": "变向 + 加速摆脱、外侧突破"
  },
  {
    "rowNumber": 10,
    "coreAbility": "1v1",
    "coreFormula": "=D10+D14",
    "secondaryMetric": "1v1 进攻",
    "secondaryFormula": "=(F10*0.25+F11*0.25+F12*0.25+F13*0.25)/100*5",
    "atomicMetric": "正面突破",
    "sampleScore": 57,
    "testItem": "边路正面 1v1 突破",
    "recommendedTraining": "正面变向过人、简单过人"
  },
  {
    "rowNumber": 11,
    "coreAbility": "1v1",
    "coreFormula": "=D10+D14",
    "secondaryMetric": "1v1 进攻",
    "secondaryFormula": "=(F10*0.25+F11*0.25+F12*0.25+F13*0.25)/100*5",
    "atomicMetric": "横向摆脱",
    "sampleScore": 74,
    "testItem": "正面压迫下横向摆脱",
    "recommendedTraining": "向两侧拉开、横向带球摆脱"
  },
  {
    "rowNumber": 12,
    "coreAbility": "1v1",
    "coreFormula": "=D10+D14",
    "secondaryMetric": "1v1 进攻",
    "secondaryFormula": "=(F10*0.25+F11*0.25+F12*0.25+F13*0.25)/100*5",
    "atomicMetric": "背对防守摆脱",
    "sampleScore": 45,
    "testItem": "背身持球转身突破",
    "recommendedTraining": "背身转身、护球后向前摆脱"
  },
  {
    "rowNumber": 13,
    "coreAbility": "1v1",
    "coreFormula": "=D10+D14",
    "secondaryMetric": "1v1 进攻",
    "secondaryFormula": "=(F10*0.25+F11*0.25+F12*0.25+F13*0.25)/100*5",
    "atomicMetric": "斜对防守摆脱",
    "sampleScore": 75,
    "testItem": "斜对位情况下突破",
    "recommendedTraining": "利用角度差、斜向加速摆脱"
  },
  {
    "rowNumber": 14,
    "coreAbility": "1v1",
    "coreFormula": "=D10+D14",
    "secondaryMetric": "1v1 防守",
    "secondaryFormula": "=(F14*0.25+F15*0.25+F16*0.25+F17*0.25)/100*5",
    "atomicMetric": "防守身体姿态",
    "sampleScore": 67,
    "testItem": "1v1 防守姿态评分",
    "recommendedTraining": "低重心、侧身站位、安全距离"
  },
  {
    "rowNumber": 15,
    "coreAbility": "1v1",
    "coreFormula": "=D10+D14",
    "secondaryMetric": "1v1 防守",
    "secondaryFormula": "=(F14*0.25+F15*0.25+F16*0.25+F17*0.25)/100*5",
    "atomicMetric": "抢断与破坏",
    "sampleScore": 65,
    "testItem": "防守观察能力评分",
    "recommendedTraining": "既看人又看球、不盲目追求"
  },
  {
    "rowNumber": 16,
    "coreAbility": "1v1",
    "coreFormula": "=D10+D14",
    "secondaryMetric": "1v1 防守",
    "secondaryFormula": "=(F14*0.25+F15*0.25+F16*0.25+F17*0.25)/100*5",
    "atomicMetric": "拦截与断抢",
    "sampleScore": 57,
    "testItem": "1v1 断球成功率",
    "recommendedTraining": "合理上抢、封堵路线"
  },
  {
    "rowNumber": 17,
    "coreAbility": "1v1",
    "coreFormula": "=D10+D14",
    "secondaryMetric": "1v1 防守",
    "secondaryFormula": "=(F14*0.25+F15*0.25+F16*0.25+F17*0.25)/100*5",
    "atomicMetric": "防守脚步移动",
    "sampleScore": 86,
    "testItem": "防守脚步合理性评分",
    "recommendedTraining": "小碎步移动、横向滑步"
  },
  {
    "rowNumber": 18,
    "coreAbility": "传接球",
    "coreFormula": "=D18+D21+D24",
    "secondaryMetric": "接球",
    "secondaryFormula": "=(F18*0.4+F19*0.2+F20*0.4)/100*3.5",
    "atomicMetric": "接地滚球",
    "sampleScore": 87,
    "testItem": "10 次接地滚球成功率",
    "recommendedTraining": "脚内侧停球、停球护球"
  },
  {
    "rowNumber": 19,
    "coreAbility": "传接球",
    "coreFormula": "=D18+D21+D24",
    "secondaryMetric": "接球",
    "secondaryFormula": "=(F18*0.4+F19*0.2+F20*0.4)/100*3.5",
    "atomicMetric": "接半高球 / 空中球",
    "sampleScore": 87,
    "testItem": "5 次半高球停球成功率",
    "recommendedTraining": "胸部停球、大腿部停球卸力"
  },
  {
    "rowNumber": 20,
    "coreAbility": "传接球",
    "coreFormula": "=D18+D21+D24",
    "secondaryMetric": "接球",
    "secondaryFormula": "=(F18*0.4+F19*0.2+F20*0.4)/100*3.5",
    "atomicMetric": "第一脚触球",
    "sampleScore": 87,
    "testItem": "第一脚触球合理性评分",
    "recommendedTraining": "停球调整方向、为下一步做准备"
  },
  {
    "rowNumber": 21,
    "coreAbility": "传接球",
    "coreFormula": "=D18+D21+D24",
    "secondaryMetric": "传球",
    "secondaryFormula": "=(F21*0.4+F22*0.4+F23*0.2)/100*3.5",
    "atomicMetric": "短传",
    "sampleScore": 87,
    "testItem": "10 次短传成功率",
    "recommendedTraining": "5-15 米脚内侧传球"
  },
  {
    "rowNumber": 22,
    "coreAbility": "传接球",
    "coreFormula": "=D18+D21+D24",
    "secondaryMetric": "传球",
    "secondaryFormula": "=(F21*0.4+F22*0.4+F23*0.2)/100*3.5",
    "atomicMetric": "一脚传球",
    "sampleScore": 87,
    "testItem": "2 人连续一脚传球次数",
    "recommendedTraining": "快速一脚出球、撞墙配合"
  },
  {
    "rowNumber": 23,
    "coreAbility": "传接球",
    "coreFormula": "=D18+D21+D24",
    "secondaryMetric": "传球",
    "secondaryFormula": "=(F21*0.4+F22*0.4+F23*0.2)/100*3.5",
    "atomicMetric": "长传",
    "sampleScore": 87,
    "testItem": "长传方向准确性评分",
    "recommendedTraining": "20-30 米方向传球"
  },
  {
    "rowNumber": 24,
    "coreAbility": "传接球",
    "coreFormula": "=D18+D21+D24",
    "secondaryMetric": "无球跑位与接应",
    "secondaryFormula": "=(F24*0.4+F25*0.3+F26*0.3)/100*3",
    "atomicMetric": "拉开空当跑位",
    "sampleScore": 87,
    "testItem": "跑位拉开空当评分",
    "recommendedTraining": "不扎堆、向空位移动"
  },
  {
    "rowNumber": 25,
    "coreAbility": "传接球",
    "coreFormula": "=D18+D21+D24",
    "secondaryMetric": "无球跑位与接应",
    "secondaryFormula": "=(F24*0.4+F25*0.3+F26*0.3)/100*3",
    "atomicMetric": "前插接应",
    "sampleScore": 87,
    "testItem": "前插接应成功率",
    "recommendedTraining": "向前插空当、接直传球"
  },
  {
    "rowNumber": 26,
    "coreAbility": "传接球",
    "coreFormula": "=D18+D21+D24",
    "secondaryMetric": "无球跑位与接应",
    "secondaryFormula": "=(F24*0.4+F25*0.3+F26*0.3)/100*3",
    "atomicMetric": "回撤接应",
    "sampleScore": 87,
    "testItem": "回撤接应评分",
    "recommendedTraining": "向后回撤接应、帮助出球"
  },
  {
    "rowNumber": 27,
    "coreAbility": "射门",
    "coreFormula": "=D27+D29+D31",
    "secondaryMetric": "静态射门",
    "secondaryFormula": "=(F27*0.5+F28*0.5)/100*3",
    "atomicMetric": "定点射门",
    "sampleScore": 87,
    "testItem": "10 次定点射门进球率",
    "recommendedTraining": "禁区内推射、抽射"
  },
  {
    "rowNumber": 28,
    "coreAbility": "射门",
    "coreFormula": "=D27+D29+D31",
    "secondaryMetric": "静态射门",
    "secondaryFormula": "=(F27*0.5+F28*0.5)/100*3",
    "atomicMetric": "点球射门",
    "sampleScore": 87,
    "testItem": "5 次点球进球数",
    "recommendedTraining": "点球节奏、方向选择"
  },
  {
    "rowNumber": 29,
    "coreAbility": "射门",
    "coreFormula": "=D27+D29+D31",
    "secondaryMetric": "动态射门",
    "secondaryFormula": "=(F29*0.7+F30*0.3)/100*6",
    "atomicMetric": "移动中射门",
    "sampleScore": 87,
    "testItem": "10 次移动射门进球率",
    "recommendedTraining": "跑动中接球射门"
  },
  {
    "rowNumber": 30,
    "coreAbility": "射门",
    "coreFormula": "=D27+D29+D31",
    "secondaryMetric": "动态射门",
    "secondaryFormula": "=(F29*0.7+F30*0.3)/100*6",
    "atomicMetric": "抢点射门 （含凌空）",
    "sampleScore": 87,
    "testItem": "传中后抢点射门成功率",
    "recommendedTraining": "跑位抢点、凌空抢点射门"
  },
  {
    "rowNumber": 31,
    "coreAbility": "射门",
    "coreFormula": "=D27+D29+D31",
    "secondaryMetric": "头球射门",
    "secondaryFormula": "=F31/100*1",
    "atomicMetric": "原地 / 跑动头球",
    "sampleScore": 87,
    "testItem": "抛球后头球攻门成功率",
    "recommendedTraining": "原地头球、跑动甩头"
  },
  {
    "rowNumber": 32,
    "coreAbility": "小组配合",
    "coreFormula": "=D32+D34+D36",
    "secondaryMetric": "2 人配合",
    "secondaryFormula": "=(F32*0.7+F33*0.3)/100*4",
    "atomicMetric": "撞墙配合",
    "sampleScore": 87,
    "testItem": "2 人连续撞墙配合次数",
    "recommendedTraining": "直传斜插、2人传切"
  },
  {
    "rowNumber": 33,
    "coreAbility": "小组配合",
    "coreFormula": "=D32+D34+D36",
    "secondaryMetric": "2 人配合",
    "secondaryFormula": "=(F32*0.7+F33*0.3)/100*4",
    "atomicMetric": "套边配合",
    "sampleScore": 87,
    "testItem": "边路套边配合成功率",
    "recommendedTraining": "边路套边、下底传中"
  },
  {
    "rowNumber": 34,
    "coreAbility": "小组配合",
    "coreFormula": "=D32+D34+D36",
    "secondaryMetric": "3 人配合",
    "secondaryFormula": "=(F34*0.7+F35*0.3)/100*4",
    "atomicMetric": "三角传球",
    "sampleScore": 87,
    "testItem": "3 人连续传球次数",
    "recommendedTraining": "3 人轮转传球、保持控球"
  },
  {
    "rowNumber": 35,
    "coreAbility": "小组配合",
    "coreFormula": "=D32+D34+D36",
    "secondaryMetric": "3 人配合",
    "secondaryFormula": "=(F34*0.7+F35*0.3)/100*4",
    "atomicMetric": "中路渗透",
    "sampleScore": 87,
    "testItem": "3 人中路渗透成功率",
    "recommendedTraining": "简单直塞 + 前插"
  },
  {
    "rowNumber": 36,
    "coreAbility": "小组配合",
    "coreFormula": "=D32+D34+D36",
    "secondaryMetric": "小组防守",
    "secondaryFormula": "=(F36*0.5+F37*0.5)/100*2",
    "atomicMetric": "局部围抢",
    "sampleScore": 87,
    "testItem": "预定时间内断球次数",
    "recommendedTraining": "2v1、3v2 小范围逼抢"
  },
  {
    "rowNumber": 37,
    "coreAbility": "小组配合",
    "coreFormula": "=D32+D34+D36",
    "secondaryMetric": "小组防守",
    "secondaryFormula": "=(F36*0.5+F37*0.5)/100*2",
    "atomicMetric": "补位协防",
    "sampleScore": 87,
    "testItem": "小组补位意识评分",
    "recommendedTraining": "队友失位后及时补位"
  },
  {
    "rowNumber": 38,
    "coreAbility": "整体战术",
    "coreFormula": "=D38+D40+D43+D45",
    "secondaryMetric": "位置与站位",
    "secondaryFormula": "=(F38*0.5+F39*0.5)/100*2.5",
    "atomicMetric": "基本位置职责",
    "sampleScore": 78,
    "testItem": "位置职责执行评分",
    "recommendedTraining": "熟悉自身位置、不随意乱跑"
  },
  {
    "rowNumber": 39,
    "coreAbility": "整体战术",
    "coreFormula": "=D38+D40+D43+D45",
    "secondaryMetric": "位置与站位",
    "secondaryFormula": "=(F38*0.5+F39*0.5)/100*2.5",
    "atomicMetric": "攻防时整体站位",
    "sampleScore": 68,
    "testItem": "整体站位合理性评分",
    "recommendedTraining": "进攻拉开、防守收缩"
  },
  {
    "rowNumber": 40,
    "coreAbility": "整体战术",
    "coreFormula": "=D38+D40+D43+D45",
    "secondaryMetric": "进攻战术",
    "secondaryFormula": "=(F40*0.4+F41*0.3+F42*0.3)/100*2.5",
    "atomicMetric": "拉开宽度、不扎堆",
    "sampleScore": 87,
    "testItem": "进攻拉开意识评分",
    "recommendedTraining": "边路拉开、中路保持空间"
  },
  {
    "rowNumber": 41,
    "coreAbility": "整体战术",
    "coreFormula": "=D38+D40+D43+D45",
    "secondaryMetric": "进攻战术",
    "secondaryFormula": "=(F40*0.4+F41*0.3+F42*0.3)/100*2.5",
    "atomicMetric": "边路与中路配合",
    "sampleScore": 68,
    "testItem": "边中配合评分",
    "recommendedTraining": "边中结合、中路包抄"
  },
  {
    "rowNumber": 42,
    "coreAbility": "整体战术",
    "coreFormula": "=D38+D40+D43+D45",
    "secondaryMetric": "进攻战术",
    "secondaryFormula": "=(F40*0.4+F41*0.3+F42*0.3)/100*2.5",
    "atomicMetric": "简单转移球",
    "sampleScore": 68,
    "testItem": "转移球选择合理性",
    "recommendedTraining": "一侧转另一侧、边路转中路"
  },
  {
    "rowNumber": 43,
    "coreAbility": "整体战术",
    "coreFormula": "=D38+D40+D43+D45",
    "secondaryMetric": "防守战术",
    "secondaryFormula": "=(F43*0.5+F44*0.5)/100*2.5",
    "atomicMetric": "集体回防",
    "sampleScore": 68,
    "testItem": "回防及时性评分",
    "recommendedTraining": "丢球后全员回防"
  },
  {
    "rowNumber": 44,
    "coreAbility": "整体战术",
    "coreFormula": "=D38+D40+D43+D45",
    "secondaryMetric": "防守战术",
    "secondaryFormula": "=(F43*0.5+F44*0.5)/100*2.5",
    "atomicMetric": "封堵与保护",
    "sampleScore": 68,
    "testItem": "防守封堵效果评分",
    "recommendedTraining": "封堵路线、身后保护"
  },
  {
    "rowNumber": 45,
    "coreAbility": "整体战术",
    "coreFormula": "=D38+D40+D43+D45",
    "secondaryMetric": "攻防转换",
    "secondaryFormula": "=(F45*0.4+F46*0.3+F47*0.3)/100*2.5",
    "atomicMetric": "丢球快速回防",
    "sampleScore": 78,
    "testItem": "丢球后回防速度评分",
    "recommendedTraining": "立刻回跑、组织防守"
  },
  {
    "rowNumber": 46,
    "coreAbility": "整体战术",
    "coreFormula": "=D38+D40+D43+D45",
    "secondaryMetric": "攻防转换",
    "secondaryFormula": "=(F45*0.4+F46*0.3+F47*0.3)/100*2.5",
    "atomicMetric": "抢球后快速反击",
    "sampleScore": 67,
    "testItem": "反击推进成功率",
    "recommendedTraining": "断球后快速向前推进"
  },
  {
    "rowNumber": 47,
    "coreAbility": "整体战术",
    "coreFormula": "=D38+D40+D43+D45",
    "secondaryMetric": "攻防转换",
    "secondaryFormula": "=(F45*0.4+F46*0.3+F47*0.3)/100*2.5",
    "atomicMetric": "抢球后快速转移",
    "sampleScore": 78,
    "testItem": "快速转移选择评分",
    "recommendedTraining": "断球后大范围转移"
  },
  {
    "rowNumber": 48,
    "coreAbility": "体能",
    "coreFormula": "=D48+D50+D52+D54",
    "secondaryMetric": "速度",
    "secondaryFormula": "=(F48*0.5+F49*0.5)/100*3",
    "atomicMetric": "直线速度",
    "sampleScore": 78,
    "testItem": "30 米冲刺计时",
    "recommendedTraining": "30 米冲刺跑"
  },
  {
    "rowNumber": 49,
    "coreAbility": "体能",
    "coreFormula": "=D48+D50+D52+D54",
    "secondaryMetric": "速度",
    "secondaryFormula": "=(F48*0.5+F49*0.5)/100*3",
    "atomicMetric": "起动速度",
    "sampleScore": 67,
    "testItem": "起动反应速度评分",
    "recommendedTraining": "反应起跑、急启急停"
  },
  {
    "rowNumber": 50,
    "coreAbility": "体能",
    "coreFormula": "=D48+D50+D52+D54",
    "secondaryMetric": "灵敏协调",
    "secondaryFormula": "=(F50*0.5+F51*0.5)/100*3",
    "atomicMetric": "变向灵敏",
    "sampleScore": 78,
    "testItem": "简易灵敏测试计时",
    "recommendedTraining": "绕桩、折返跑、十字变向"
  },
  {
    "rowNumber": 51,
    "coreAbility": "体能",
    "coreFormula": "=D48+D50+D52+D54",
    "secondaryMetric": "灵敏协调",
    "secondaryFormula": "=(F50*0.5+F51*0.5)/100*3",
    "atomicMetric": "身体协调性",
    "sampleScore": 67,
    "testItem": "协调性动作完成评分",
    "recommendedTraining": "绳梯、单脚平衡、跳跃"
  },
  {
    "rowNumber": 52,
    "coreAbility": "体能",
    "coreFormula": "=D48+D50+D52+D54",
    "secondaryMetric": "耐力",
    "secondaryFormula": "=(F52*0.5+F53*0.5)/100*2",
    "atomicMetric": "基础耐力",
    "sampleScore": 78,
    "testItem": "6 分钟跑耐力观察",
    "recommendedTraining": "慢跑、持续跑动游戏"
  },
  {
    "rowNumber": 53,
    "coreAbility": "体能",
    "coreFormula": "=D48+D50+D52+D54",
    "secondaryMetric": "耐力",
    "secondaryFormula": "=(F52*0.5+F53*0.5)/100*2",
    "atomicMetric": "间歇跑能力",
    "sampleScore": 68,
    "testItem": "比赛间歇跑运动表现",
    "recommendedTraining": "快跑 + 慢跑交替、间歇训练"
  },
  {
    "rowNumber": 54,
    "coreAbility": "体能",
    "coreFormula": "=D48+D50+D52+D54",
    "secondaryMetric": "核心与力量",
    "secondaryFormula": "=(F54*0.5+F55*0.5)/100*2",
    "atomicMetric": "核心力量",
    "sampleScore": 78,
    "testItem": "平板支撑时间",
    "recommendedTraining": "平板支撑、卷腹、臀桥"
  },
  {
    "rowNumber": 55,
    "coreAbility": "体能",
    "coreFormula": "=D48+D50+D52+D54",
    "secondaryMetric": "核心与力量",
    "secondaryFormula": "=(F54*0.5+F55*0.5)/100*2",
    "atomicMetric": "对抗力量",
    "sampleScore": 78,
    "testItem": "对抗稳定性评分",
    "recommendedTraining": "身体对抗、推拉练习"
  },
  {
    "rowNumber": 56,
    "coreAbility": "精神",
    "coreFormula": "=D56+D57+D60+D61+D63",
    "secondaryMetric": "比赛态度",
    "secondaryFormula": "=F56/100*2",
    "atomicMetric": "拼搏、积极性、战斗属性",
    "sampleScore": 78,
    "testItem": "比赛拼抢积极性评分",
    "recommendedTraining": "拼抢、回追、不放弃"
  },
  {
    "rowNumber": 57,
    "coreAbility": "精神",
    "coreFormula": "=D56+D57+D60+D61+D63",
    "secondaryMetric": "心理素质",
    "secondaryFormula": "=(F57*0.4+F58*0.3+F59*0.3)/100*2",
    "atomicMetric": "专注力、抗压力、自信心",
    "sampleScore": 78,
    "testItem": "专注力集中度评分",
    "recommendedTraining": "训练专注、少走神、听指令"
  },
  {
    "rowNumber": 58,
    "coreAbility": "精神",
    "coreFormula": "=D56+D57+D60+D61+D63",
    "secondaryMetric": "心理素质",
    "secondaryFormula": "=(F57*0.4+F58*0.3+F59*0.3)/100*2",
    "atomicMetric": "抗挫折、不放弃",
    "sampleScore": 78,
    "testItem": "情绪稳定性评分",
    "recommendedTraining": "失误不气馁、丢球不抱怨"
  },
  {
    "rowNumber": 59,
    "coreAbility": "精神",
    "coreFormula": "=D56+D57+D60+D61+D63",
    "secondaryMetric": "心理素质",
    "secondaryFormula": "=(F57*0.4+F58*0.3+F59*0.3)/100*2",
    "atomicMetric": "配合与分享球",
    "sampleScore": 87,
    "testItem": "传球配合意愿评分",
    "recommendedTraining": "愿意传球、不独踢"
  },
  {
    "rowNumber": 60,
    "coreAbility": "精神",
    "coreFormula": "=D56+D57+D60+D61+D63",
    "secondaryMetric": "团队意识",
    "secondaryFormula": "=F60/100*2",
    "atomicMetric": "尊重队友与对手",
    "sampleScore": 78,
    "testItem": "赛场礼仪评分",
    "recommendedTraining": "文明比赛、服从裁判"
  },
  {
    "rowNumber": 61,
    "coreAbility": "精神",
    "coreFormula": "=D56+D57+D60+D61+D63",
    "secondaryMetric": "比赛决断",
    "secondaryFormula": "=(F61*0.5+F62*0.5)/100*2",
    "atomicMetric": "敢于动作",
    "sampleScore": 78,
    "testItem": "自信心与敢做动作评分",
    "recommendedTraining": "敢于过人、射门、传球"
  },
  {
    "rowNumber": 62,
    "coreAbility": "精神",
    "coreFormula": "=D56+D57+D60+D61+D63",
    "secondaryMetric": "比赛决断",
    "secondaryFormula": "=(F61*0.5+F62*0.5)/100*2",
    "atomicMetric": "合理选择处理球",
    "sampleScore": 57,
    "testItem": "处理球合理性评分",
    "recommendedTraining": "该传则传、该射则射"
  },
  {
    "rowNumber": 63,
    "coreAbility": "精神",
    "coreFormula": "=D56+D57+D60+D61+D63",
    "secondaryMetric": "社交",
    "secondaryFormula": "=(F63*0.5+F64*0.5)/100*2",
    "atomicMetric": "沟通交流",
    "sampleScore": 78,
    "testItem": "沟通主动性评分",
    "recommendedTraining": "场上呼喊、提醒队友"
  },
  {
    "rowNumber": 64,
    "coreAbility": "精神",
    "coreFormula": "=D56+D57+D60+D61+D63",
    "secondaryMetric": "社交",
    "secondaryFormula": "=(F63*0.5+F64*0.5)/100*2",
    "atomicMetric": "团队融入",
    "sampleScore": 78,
    "testItem": "团队融入度评分",
    "recommendedTraining": "和队友友好相处、集体意识"
  }
] as const satisfies readonly TalentEliteAssessmentBlueprintRow[];

export const talentEliteAssessmentFinalScore = {
  "rowNumber": 65,
  "label": "最终得分",
  "formula": "=B3+B10+B18+B27+B32+B38+B48+B56"
} as const;

interface CoreGroup {
  startRow: number;
  name: string;
  formula: string;
  dimensionId: string;
  metricId: string;
  formulaId: string;
  viewNodeId: string;
}

interface SecondaryGroup {
  startRow: number;
  coreAbility: string;
  name: string;
  formula: string;
  objectiveId: string;
  metricId: string;
  formulaId: string;
  viewNodeId: string;
  maxScore: number;
}

interface AtomicMetricRow extends TalentEliteAssessmentBlueprintRow {
  metricId: string;
  testItemId: string;
}

export interface TalentEliteTrainingCatalog {
  dimensions: DevelopmentDimension[];
  objectives: TrainingObjective[];
  metrics: AbilityMetric[];
  drills: TrainingDrill[];
  sessionPlans: SessionPlan[];
}

export interface TalentEliteAssessmentCatalog {
  metricGraphVersions: MetricGraphVersion[];
  metricDependencies: MetricDependency[];
  metricViews: MetricView[];
  metricViewNodes: MetricViewNode[];
  assessmentTemplates: AssessmentTemplate[];
  assessmentTemplateVersions: AssessmentTemplateVersion[];
  assessmentMetricBindings: AssessmentMetricBinding[];
  assessmentTestItems: AssessmentTestItem[];
  derivedMetricDefinitions: DerivedMetricDefinition[];
}

export function createTalentEliteTrainingCatalog(): TalentEliteTrainingCatalog {
  const groups = buildGroups();
  const dimensions: DevelopmentDimension[] = groups.cores.map((core) => ({
    id: core.dimensionId,
    catalogScope: systemCatalog,
    code: `cq_talent_core_${rowKey(core.startRow)}`,
    name: core.name,
    description: "来自天才精英队评分表的核心能力维度。",
    createdAt: now,
    updatedAt: now,
  }));
  const objectives: TrainingObjective[] = groups.secondaries.map((secondary) => ({
    id: secondary.objectiveId,
    catalogScope: systemCatalog,
    dimensionId: coreByName(groups, secondary.coreAbility).dimensionId,
    code: `cq_talent_secondary_${rowKey(secondary.startRow)}`,
    name: secondary.name,
    description: `来源公式：${secondary.formula}`,
    createdAt: now,
    updatedAt: now,
  }));
  const metrics = createMetrics(groups);
  const drills = createRecommendedTrainingDrills(groups.atomics, groups.secondaries);
  const sessionPlanDrills = drills.slice(0, 10);
  const sessionPlans: SessionPlan[] = [{
    id: "session-plan-cq-talent-elite-training-library-sample",
    catalogScope: clubCatalog,
    name: "天才精英队训练项目库示例课",
    objectiveIds: unique(drills.flatMap((drill) => drill.objectiveIds)).slice(0, 12),
    metricIds: unique(drills.flatMap((drill) => drill.metricIds)).slice(0, 12),
    blocks: sessionPlanDrills.map((drill, index) => ({
      id: `block-cq-talent-drill-${String(index + 1).padStart(2, "0")}`,
      drillId: drill.id,
      order: index + 1,
      plannedMinutes: drill.durationMinutes,
    })),
    estimatedMinutes: sessionPlanDrills.reduce((sum, drill) => sum + drill.durationMinutes, 0),
    createdAt: now,
    updatedAt: now,
  }];

  return { dimensions, objectives, metrics, drills, sessionPlans };
}

export function createTalentEliteAssessmentCatalog(): TalentEliteAssessmentCatalog {
  const groups = buildGroups();
  const graphVersionId = "metric-graph-version-cq-talent-elite-20260326";
  const templateVersionId = "assessment-template-version-cq-talent-elite-20260326";
  const fullViewId = "metric-view-cq-talent-elite-full-graph";
  const radarViewId = "metric-view-cq-talent-elite-core-radar";
  const dependencies: MetricDependency[] = [];
  const formulas: DerivedMetricDefinition[] = [];
  const fullViewNodes: MetricViewNode[] = [];
  const radarViewNodes: MetricViewNode[] = [];

  for (const core of groups.cores) {
    fullViewNodes.push({
      id: core.viewNodeId,
      catalogScope: systemCatalog,
      viewId: fullViewId,
      metricId: core.metricId,
      label: core.name,
      sortOrder: core.startRow,
      createdAt: now,
      updatedAt: now,
    });
    radarViewNodes.push({
      id: `metric-view-node-cq-talent-radar-${rowKey(core.startRow)}`,
      catalogScope: systemCatalog,
      viewId: radarViewId,
      metricId: core.metricId,
      label: core.name,
      sortOrder: core.startRow,
      createdAt: now,
      updatedAt: now,
    });
    const referencedSecondaries = parseFormulaRefs(core.formula, "D")
      .map((ref) => groups.secondariesByRow.get(ref.rowNumber))
      .filter((secondary): secondary is SecondaryGroup => Boolean(secondary));
    formulas.push({
      id: core.formulaId,
      catalogScope: systemCatalog,
      code: `cq_talent_core_${rowKey(core.startRow)}`,
      name: `${core.name}得分`,
      outputMetricId: core.metricId,
      method: "sum",
      inputMetricIds: referencedSecondaries.map((secondary) => secondary.metricId),
      version: "20260326",
      rounding: "two_decimals",
      outputUnit: "score",
      createdAt: now,
      updatedAt: now,
    });
    referencedSecondaries.forEach((secondary) => dependencies.push({
      id: `metric-dependency-cq-talent-secondary-${rowKey(secondary.startRow)}-core-${rowKey(core.startRow)}`,
      catalogScope: systemCatalog,
      graphVersionId,
      inputMetricId: secondary.metricId,
      outputMetricId: core.metricId,
      formulaId: core.formulaId,
      weight: 1,
      role: "primary",
      sortOrder: dependencies.length + 1,
      createdAt: now,
      updatedAt: now,
    }));
  }

  for (const secondary of groups.secondaries) {
    const core = coreByName(groups, secondary.coreAbility);
    fullViewNodes.push({
      id: secondary.viewNodeId,
      catalogScope: systemCatalog,
      viewId: fullViewId,
      metricId: secondary.metricId,
      parentViewNodeId: core.viewNodeId,
      label: secondary.name,
      sortOrder: secondary.startRow,
      createdAt: now,
      updatedAt: now,
    });
    const refs = parseFormulaRefs(secondary.formula, "F");
    const inputMetricIds: string[] = [];
    const weights: Record<string, number> = {};
    refs.forEach((ref) => {
      const atomic = groups.atomicsByRow.get(ref.rowNumber);
      if (!atomic) return;
      inputMetricIds.push(atomic.metricId);
      weights[atomic.metricId] = ref.weight;
      dependencies.push({
        id: `metric-dependency-cq-talent-atomic-${rowKey(ref.rowNumber)}-secondary-${rowKey(secondary.startRow)}`,
        catalogScope: systemCatalog,
        graphVersionId,
        inputMetricId: atomic.metricId,
        outputMetricId: secondary.metricId,
        formulaId: secondary.formulaId,
        weight: ref.weight,
        role: "primary",
        sortOrder: dependencies.length + 1,
        createdAt: now,
        updatedAt: now,
      });
    });
    formulas.push({
      id: secondary.formulaId,
      catalogScope: systemCatalog,
      code: `cq_talent_secondary_${rowKey(secondary.startRow)}`,
      name: `${secondary.name}得分`,
      outputMetricId: secondary.metricId,
      method: "normalized_weighted_sum",
      inputMetricIds,
      version: "20260326",
      weights,
      inputScale: 100,
      maxScore: secondary.maxScore,
      rounding: "two_decimals",
      outputUnit: "score",
      createdAt: now,
      updatedAt: now,
    });
  }

  for (const atomic of groups.atomics) {
    const secondary = secondaryByName(groups, atomic.coreAbility, atomic.secondaryMetric);
    fullViewNodes.push({
      id: `metric-view-node-cq-talent-atomic-${rowKey(atomic.rowNumber)}`,
      catalogScope: systemCatalog,
      viewId: fullViewId,
      metricId: atomic.metricId,
      parentViewNodeId: secondary.viewNodeId,
      label: atomic.atomicMetric,
      sortOrder: atomic.rowNumber,
      createdAt: now,
      updatedAt: now,
    });
  }

  const finalFormulaId = "derived-cq-talent-final-score";
  const finalMetricId = "metric-cq-talent-final-score";
  const finalCoreRefs = parseFormulaRefs(talentEliteAssessmentFinalScore.formula, "B")
    .map((ref) => groups.coresByRow.get(ref.rowNumber))
    .filter((core): core is CoreGroup => Boolean(core));
  formulas.push({
    id: finalFormulaId,
    catalogScope: systemCatalog,
    code: "cq_talent_final_score",
    name: "最终得分",
    outputMetricId: finalMetricId,
    method: "sum",
    inputMetricIds: finalCoreRefs.map((core) => core.metricId),
    version: "20260326",
    rounding: "two_decimals",
    outputUnit: "score",
    createdAt: now,
    updatedAt: now,
  });
  finalCoreRefs.forEach((core) => dependencies.push({
    id: `metric-dependency-cq-talent-core-${rowKey(core.startRow)}-final`,
    catalogScope: systemCatalog,
    graphVersionId,
    inputMetricId: core.metricId,
    outputMetricId: finalMetricId,
    formulaId: finalFormulaId,
    weight: 1,
    role: "primary",
    sortOrder: dependencies.length + 1,
    createdAt: now,
    updatedAt: now,
  }));

  const outputBindings: AssessmentMetricBinding[] = [
    ...groups.secondaries.map((secondary, index) => outputBinding(templateVersionId, secondary.metricId, secondary.formulaId, 1000 + index)),
    ...groups.cores.map((core, index) => outputBinding(templateVersionId, core.metricId, core.formulaId, 2000 + index)),
    outputBinding(templateVersionId, finalMetricId, finalFormulaId, 3000),
  ];

  return {
    metricGraphVersions: [{
      id: graphVersionId,
      catalogScope: systemCatalog,
      name: "重庆天才精英队评分图谱",
      version: "20260326",
      status: "active",
      createdAt: now,
      updatedAt: now,
    }],
    metricDependencies: dependencies.map((dependency, index) => ({ ...dependency, sortOrder: index + 1 })),
    metricViews: [
      {
        id: radarViewId,
        catalogScope: systemCatalog,
        graphVersionId,
        name: "天才精英队核心能力雷达",
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: fullViewId,
        catalogScope: systemCatalog,
        graphVersionId,
        name: "天才精英队完整评分图谱",
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
    ],
    metricViewNodes: [...radarViewNodes, ...fullViewNodes],
    assessmentTemplates: [{
      id: "assessment-template-cq-talent-elite",
      catalogScope: systemCatalog,
      name: "天才精英队测试大纲",
      ageGroup: "U8-U12",
      teamLevel: "elite",
      status: "active",
      createdAt: now,
      updatedAt: now,
    }],
    assessmentTemplateVersions: [{
      id: templateVersionId,
      clubId,
      templateId: "assessment-template-cq-talent-elite",
      graphVersionId,
      version: "20260326",
      status: "active",
      createdAt: now,
      updatedAt: now,
    }],
    assessmentMetricBindings: [
      ...groups.atomics.map((atomic, index) => ({
        id: `assessment-binding-cq-talent-input-${rowKey(atomic.rowNumber)}`,
        clubId,
        templateVersionId,
        metricId: atomic.metricId,
        role: "input" as const,
        testItemId: atomic.testItemId,
        maxScore: 100,
        sortOrder: index + 1,
        createdAt: now,
        updatedAt: now,
      })),
      ...outputBindings,
    ],
    assessmentTestItems: groups.atomics.map((atomic) => ({
      id: atomic.testItemId,
      clubId,
      metricId: atomic.metricId,
      name: atomic.testItem,
      valueKind: "score_0_100",
      unit: "score",
      protocol: `来源：天才精英队测试大纲第${atomic.rowNumber}行；三级子项：${atomic.atomicMetric}；推荐训练项目：${atomic.recommendedTraining}；原始二级公式：${atomic.secondaryFormula}。`,
      createdAt: now,
      updatedAt: now,
    })),
    derivedMetricDefinitions: formulas,
  };
}

function buildGroups() {
  const cores: CoreGroup[] = [];
  const secondaries: SecondaryGroup[] = [];
  const atomics: AtomicMetricRow[] = talentEliteAssessmentBlueprintRows.map((row) => ({
    ...row,
    metricId: `metric-cq-talent-atomic-${rowKey(row.rowNumber)}`,
    testItemId: `assessment-test-cq-talent-${rowKey(row.rowNumber)}`,
  }));
  const coresByName = new Map<string, CoreGroup>();
  const secondariesByName = new Map<string, SecondaryGroup>();

  for (const row of talentEliteAssessmentBlueprintRows) {
    if (!coresByName.has(row.coreAbility)) {
      const core: CoreGroup = {
        startRow: row.rowNumber,
        name: row.coreAbility,
        formula: row.coreFormula,
        dimensionId: `dimension-cq-talent-core-${rowKey(row.rowNumber)}`,
        metricId: `metric-cq-talent-core-${rowKey(row.rowNumber)}`,
        formulaId: `derived-cq-talent-core-${rowKey(row.rowNumber)}`,
        viewNodeId: `metric-view-node-cq-talent-core-${rowKey(row.rowNumber)}`,
      };
      coresByName.set(row.coreAbility, core);
      cores.push(core);
    }

    const key = secondaryKeyFor(row.coreAbility, row.secondaryMetric);
    if (!secondariesByName.has(key)) {
      const secondary: SecondaryGroup = {
        startRow: row.rowNumber,
        coreAbility: row.coreAbility,
        name: row.secondaryMetric,
        formula: row.secondaryFormula,
        objectiveId: `objective-cq-talent-secondary-${rowKey(row.rowNumber)}`,
        metricId: `metric-cq-talent-secondary-${rowKey(row.rowNumber)}`,
        formulaId: `derived-cq-talent-secondary-${rowKey(row.rowNumber)}`,
        viewNodeId: `metric-view-node-cq-talent-secondary-${rowKey(row.rowNumber)}`,
        maxScore: parseMaxScore(row.secondaryFormula),
      };
      secondariesByName.set(key, secondary);
      secondaries.push(secondary);
    }
  }

  return {
    cores,
    secondaries,
    atomics,
    coresByRow: new Map(cores.map((core) => [core.startRow, core])),
    secondariesByRow: new Map(secondaries.map((secondary) => [secondary.startRow, secondary])),
    atomicsByRow: new Map(atomics.map((atomic) => [atomic.rowNumber, atomic])),
  };
}

function createMetrics(groups: ReturnType<typeof buildGroups>): AbilityMetric[] {
  const atomicMetrics: AbilityMetric[] = groups.atomics.map((row) => ({
    id: row.metricId,
    catalogScope: systemCatalog,
    code: `cq_talent_atomic_${rowKey(row.rowNumber)}`,
    name: row.atomicMetric,
    dimensionId: coreByName(groups, row.coreAbility).dimensionId,
    valueKind: "score_0_100",
    metricKind: "atomic",
    unit: "score",
    maxScore: 100,
    sourceKinds: ["assessment", "fitness_test", "training_observation"],
    version: "20260326",
    status: "active",
    description: `测试项目：${row.testItem}；推荐训练：${row.recommendedTraining}。`,
    createdAt: now,
    updatedAt: now,
  }));
  const secondaryMetrics: AbilityMetric[] = groups.secondaries.map((secondary) => ({
    id: secondary.metricId,
    catalogScope: systemCatalog,
    code: `cq_talent_secondary_${rowKey(secondary.startRow)}`,
    name: secondary.name,
    dimensionId: coreByName(groups, secondary.coreAbility).dimensionId,
    valueKind: "measurement",
    metricKind: "computed",
    unit: "score",
    maxScore: secondary.maxScore,
    sourceKinds: ["algorithm"],
    version: "20260326",
    status: "active",
    description: `公式：${secondary.formula}`,
    createdAt: now,
    updatedAt: now,
  }));
  const coreMetrics: AbilityMetric[] = groups.cores.map((core) => ({
    id: core.metricId,
    catalogScope: systemCatalog,
    code: `cq_talent_core_${rowKey(core.startRow)}`,
    name: core.name,
    dimensionId: core.dimensionId,
    valueKind: "measurement",
    metricKind: "composite",
    unit: "score",
    sourceKinds: ["algorithm"],
    version: "20260326",
    status: "active",
    description: `核心能力公式：${core.formula}`,
    createdAt: now,
    updatedAt: now,
  }));

  return [
    ...atomicMetrics,
    ...secondaryMetrics,
    ...coreMetrics,
    {
      id: "metric-cq-talent-final-score",
      catalogScope: systemCatalog,
      code: "cq_talent_final_score",
      name: "最终得分",
      dimensionId: groups.cores[0]?.dimensionId ?? "dimension-cq-talent-core-03",
      valueKind: "measurement",
      metricKind: "computed",
      unit: "score",
      maxScore: 100,
      sourceKinds: ["algorithm"],
      version: "20260326",
      status: "active",
      description: `最终得分公式：${talentEliteAssessmentFinalScore.formula}`,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function createRecommendedTrainingDrills(
  atomics: AtomicMetricRow[],
  secondaries: SecondaryGroup[],
): TrainingDrill[] {
  const secondaryLookup = new Map(secondaries.map((secondary) => [secondaryKeyFor(secondary.coreAbility, secondary.name), secondary]));
  const drills = new Map<string, { firstRow: number; name: string; objectiveIds: Set<string>; metricIds: Set<string>; points: Set<string> }>();

  for (const atomic of atomics) {
    const secondary = secondaryLookup.get(secondaryKeyFor(atomic.coreAbility, atomic.secondaryMetric));
    for (const item of splitRecommendedTrainingItems(atomic.recommendedTraining)) {
      const existing = drills.get(item) ?? { firstRow: atomic.rowNumber, name: item, objectiveIds: new Set<string>(), metricIds: new Set<string>(), points: new Set<string>() };
      if (secondary) existing.objectiveIds.add(secondary.objectiveId);
      existing.metricIds.add(atomic.metricId);
      existing.points.add(atomic.atomicMetric);
      drills.set(item, existing);
    }
  }

  return Array.from(drills.values()).map((drill, index) => ({
    id: `drill-cq-talent-assessment-${String(index + 1).padStart(3, "0")}`,
    catalogScope: systemCatalog,
    name: drill.name,
    objectiveIds: Array.from(drill.objectiveIds),
    metricIds: Array.from(drill.metricIds),
    durationMinutes: 10,
    difficulty: "standard",
    recommendedAgeGroups: ["U8", "U10", "U12"],
    recommendedLevels: ["development", "advanced", "elite"],
    equipment: ["balls", "cones", "bibs"],
    setup: `来自天才精英队评分表推荐训练项目，第${drill.firstRow}行首次出现。`,
    coachingPoints: Array.from(drill.points).slice(0, 5),
    createdAt: now,
    updatedAt: now,
  }));
}

export function splitRecommendedTrainingItems(value: string): string[] {
  return unique(value.split(/[、，,；;]/).map((item) => item.trim()).filter(Boolean));
}

function outputBinding(templateVersionId: string, metricId: string, formulaId: string, sortOrder: number): AssessmentMetricBinding {
  return {
    id: `assessment-binding-cq-talent-output-${metricId.replace(/^metric-cq-talent-/, "")}`,
    clubId,
    templateVersionId,
    metricId,
    role: "output",
    formulaId,
    sortOrder,
    createdAt: now,
    updatedAt: now,
  };
}

function parseFormulaRefs(formula: string, column: "B" | "D" | "F") {
  const refs: Array<{ rowNumber: number; weight: number }> = [];
  const pattern = new RegExp(`${column}(\\d+)(?:\\*([0-9.]+))?`, "g");
  const normalized = formula.replace(/\s+/g, "");
  let match = pattern.exec(normalized);
  while (match) {
    const rowText = match[1];
    if (rowText) {
      refs.push({ rowNumber: Number(rowText), weight: match[2] ? Number(match[2]) : 1 });
    }
    match = pattern.exec(normalized);
  }
  return refs;
}

function parseMaxScore(formula: string) {
  const normalized = formula.replace(/\s+/g, "");
  const match = normalized.match(/\/100\)?\*([0-9.]+)/);
  return match?.[1] ? Number(match[1]) : 100;
}

function coreByName(groups: ReturnType<typeof buildGroups>, name: string): CoreGroup {
  const core = groups.cores.find((item) => item.name === name);
  if (!core) throw new Error(`Missing core ability ${name}.`);
  return core;
}

function secondaryByName(groups: ReturnType<typeof buildGroups>, coreAbility: string, secondaryMetric: string): SecondaryGroup {
  const secondary = groups.secondaries.find((item) => item.coreAbility === coreAbility && item.name === secondaryMetric);
  if (!secondary) throw new Error(`Missing secondary metric ${coreAbility} / ${secondaryMetric}.`);
  return secondary;
}

function secondaryKeyFor(coreAbility: string, secondaryMetric: string) {
  return `${coreAbility}::${secondaryMetric}`;
}

function rowKey(rowNumber: number) {
  return String(rowNumber).padStart(2, "0");
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}
