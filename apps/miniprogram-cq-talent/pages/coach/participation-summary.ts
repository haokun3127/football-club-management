// coach/team stats.attendanceRate counts present / (present + absent + excused).
// It excludes confirmed/late/pending and is separate from trainingRecords.counted.
export const MARKED_ATTENDANCE_LABEL = "点名到场占比";
export const MARKED_ATTENDANCE_EXPLANATION = "仅在已标记到场、缺席或请假的记录中计算，未点名记录不计入；与训练计次分别统计。";
