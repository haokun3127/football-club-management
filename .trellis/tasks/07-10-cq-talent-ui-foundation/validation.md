# 验证记录

- `pnpm check`：通过；domain 6 files / 14 tests，API 5 files / 55 tests。
- `pnpm --filter @football-club/miniprogram-cq-talent smoke:app-client`：通过，覆盖 200 学员数据和家长/教练 BFF。
- `pnpm --filter @football-club/miniprogram-cq-talent devtools:preview`：测试 AppID `wx3df49f3b936ab2ed` 通过，包体约 168 KB。
- DevTools 基础库：锁定本机可用 `3.15.1`；`3.16.x` 下载失败会导致模拟器空白，不是页面编译错误。
- 渲染检查：登录页 AppHeader 未遮挡胶囊；教练任务工作台正常；25 人点名页显示真实姓名、0 已到、25 未点名和固定保存栏。
- 行为检查：开发 `dev-*` token 不再作为 Bearer 提交；API fixture 可重复启动；未知考勤状态不再静默转成到课。
- 静态检查：无 Figma 临时资源 URL、旧品牌三色和用户可见 API/BFF/P1/P2/PATCH 文案；`git diff --check` 通过。
