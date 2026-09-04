# Current-State Research — 2026-09-03

- Figma V6 sources confirmed: Parent Growth `1610:466`, Parent Ability Radar `1610:626`, Coach Assessment Tasks `1617:2`, project entry `1905:2`, project draft `1907:2`, Student Radar `1909:2`, Team Ability `1619:2`, assessment entry `1623:2`, and submit `1913:2`.
- The Figma design-system search returned no reusable named components, variables, or styles for Chinese queries for top navigation, buttons, and cards. V7 must reuse cloned screen structure and existing visual primitives instead of inventing a separate library.
- Existing API contains `buildStudentGrowthTimeline`, `lessonStats`, training-content assessments, assessment tasks, and assessment submissions linked through `assessmentTaskId`.
- Parent and coach target pages already have TypeScript, WXML, WXSS, and page-level tests, so the work can extend established page structure without creating alternate feature directories.
