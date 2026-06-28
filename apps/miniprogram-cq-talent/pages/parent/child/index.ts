import { mockStudents } from "../../../utils/mock";
import { openPage } from "../../../utils/navigation";

const firstStudent = mockStudents[0];

Page({
  data: {
    student: {
      name: firstStudent?.name ?? "暂无孩子",
      ageGroup: firstStudent?.ageGroup ?? "",
      teamsText: firstStudent?.teams.join("｜") ?? "",
      coachesText: firstStudent?.coachNames.join("、") ?? "",
    },
  },
  goSchedule() {
    openPage("/pages/parent/schedule/index");
  },
  goGrowth() {
    openPage("/pages/parent/growth/index");
  },
});
