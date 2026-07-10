# 执行计划

1. [已完成] 使用完整 Figma 设计源 `zZ6wKyOHKcO4UYXDd9jGwv`，读取页面、组件、变量和关键截图；忽略页面流为空的旧草稿 `7AVltoFaYTW2goH4Zp287N`。
2. [已完成] 建立 `research/figma-page-diff-matrix.md`，按直接还原/适配新结构/设计系统派生/暂不实现分类。
3. 创建 UI-1、UI-2、UI-3、Tactical Board MVP 四个子任务；UI-1 先行，UI-2/UI-3/战术板在其后实施，当前任务保留为最终集成门槛。
4. 清理临时 sqlite，启动本地 API，运行 health 与 app-client smoke。
5. 运行小程序 typecheck和 DevTools CLI `islogin/open/preview`，保存关键输出。
6. 使用 Computer Use 检查 DevTools 项目窗口与模拟器，验证家长端主流程和 API 请求。
7. 切换开发身份后验证教练任务工作台和核心入口；再恢复默认家长身份，避免留下意外配置。
8. 生成 preview 二维码后交给用户扫码，收集真机型号、微信/基础库版本和人工结论。
9. 若发现缺陷，最小修复并重复相关验证；更新人工验收和 release readiness 记录。
10. 运行 Trellis check、更新规范（如有新长期约束）、提交并归档。

## 自动验证命令

```bash
pnpm --filter @football-club/miniprogram-cq-talent typecheck
API_BASE_URL=http://127.0.0.1:3000 pnpm --filter @football-club/miniprogram-cq-talent smoke:app-client
pnpm --filter @football-club/miniprogram-cq-talent devtools:preview
```

## 人工交接

二维码生成成功后，用户需要用测试成员微信扫码并反馈：机型、微信版本、基础库版本、是否成功进入、家长/教练身份验证结果以及任何截图/错误提示。
