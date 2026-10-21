# 控件迁移盘点 B1

TDesign 1.17.0，原生微信包；由当前WXML盘点。保留的微信开放能力按钮在B3处理协议与布局，保证授权事件链。

| 页面/组件 | 本批迁移数 | 官方组件 | 原生例外 |
| --- | --- | --- | --- |
| pages/login/index.wxml | 3 | t-button | 微信开放能力button，保留原生授权事件链 |
| pages/parent/training-history/index.wxml | 6 | t-button,t-textarea |  |
| pages/parent/home/index.wxml | 10 | t-button |  |
| pages/parent/content/index.wxml | 1 | t-input |  |
| pages/parent/venues/index.wxml | 1 | t-input |  |
| pages/parent/private/index.wxml | 1 | t-textarea |  |
| pages/parent/help/index.wxml | 1 | t-input |  |
| pages/parent/confirmed-results/index.wxml | 1 | t-button |  |
| pages/coach/schedule/index.wxml | 5 | t-button |  |
| pages/coach/training-assessment/index.wxml | 2 | t-input |  |
| pages/coach/assessment-bulk-entry/index.wxml | 3 | t-button,t-input |  |
| pages/coach/test-entry/index.wxml | 2 | t-input |  |
| pages/coach/content-copy/index.wxml | 10 | t-button |  |
| pages/coach/match-edit/index.wxml | 6 | t-input |  |
| pages/coach/student-radar/index.wxml | 4 | t-button |  |
| pages/coach/scout/index.wxml | 9 | t-button,t-input |  |
| pages/coach/tactical-board/index.wxml | 5 | t-button |  |
| pages/coach/content-select/index.wxml | 2 | t-button,t-input |  |
| pages/coach/test-task-create/index.wxml | 15 | t-button,t-input |  |
| pages/coach/match-event-add/index.wxml | 2 | t-input,t-textarea |  |
| pages/coach/event-change/index.wxml | 2 | t-input,t-textarea |  |
| pages/coach/assessment-projects/index.wxml | 4 | t-button |  |
| pages/coach/lesson/index.wxml | 9 | t-button,t-textarea |  |
| pages/coach/event/index.wxml | 11 | t-button,t-input |  |
| pages/coach/student-results/index.wxml | 1 | t-button |  |
| pages/coach/help/index.wxml | 1 | t-input |  |
| pages/shared/student-evaluation/index.wxml | 5 | t-button,t-textarea |  |
| components/activity-card/index.wxml | 1 | t-button |  |
| components/privacy-authorize/index.wxml | 1 | t-button | 微信开放能力button，保留原生授权事件链 |
| components/submit-bar/index.wxml | 2 | t-button |  |
| components/status-view/index.wxml | 1 | t-button |  |

日期picker在B2统一；switch及共享底栏/状态见后续B1记录。

补充：3个原生switch迁移t-switch；共享role-tabbar使用官方TabBar/TabBarItem；student-switcher使用CheckTag；status-chip使用Tag；status-view使用Loading/Icon。app-header因胶囊避让与业务侧操作保留薄封装。字体角色已覆盖60个页面WXSS，保留英雄数字和零字号图标容器。
