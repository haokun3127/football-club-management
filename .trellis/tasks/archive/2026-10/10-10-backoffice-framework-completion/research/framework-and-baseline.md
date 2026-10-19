# 框架与现有能力核对（2026-10-10）

## 事实、推论与待验证
事实：apps/api/backoffice/app.js 的 api() 只有 GET/POST，当前页面是登录加只读目录；应用层 backoffice-catalog.ts 明确裁剪字段，球探和正式学生分离。浏览器认证、来源检查和环境隔离已有契约与测试。

事实：现有 application/services.ts 提供建队、成员、日历等共同业务能力；data-capability.routes.ts 有 Excel/WPS 预览/确认、集成同步、隐私等路由；assessment-workflow.* 有评测流程。历史已存在不等于所有对象支持管理编辑和前端页面。

推论：采用独立客户端包、少量浏览器适配路由并复用服务层，比替换 Fastify/数据库更符合当前业务和现有授权。通用表格框架不能自动补齐领域约束、历史和权限。

待验证：当前实际 schema/迁移版本、各对象编辑和历史的完整程度、权限动作的粒度、正式评分阈值来源、模板依赖兼容性、CSP 支持和浏览器发布路径。不存在的 verify-backoffice-server.ts 未作为验收命令引用；实施应定位现有夹具或补可销毁本地夹具。

## 官方框架资料
- Umi Max 模板与内置布局/请求/权限插件：https://umijs.org/en-US/docs/max/introduce/
- Ant Design Pro 官方源码配置：https://github.com/ant-design/ant-design-pro/blob/master/config/config.ts
- 官方运行时初始化：https://github.com/ant-design/ant-design-pro/blob/master/src/app.tsx
- 官方依赖与脚本：https://github.com/ant-design/ant-design-pro/blob/master/package.json
- React-admin 自定义数据适配：https://marmelab.com/react-admin/DataProviderWriting.html
- React-admin 鉴权适配：https://github.com/marmelab/react-admin/blob/master/docs/Authentication.md

官方模板支持快速获得管理布局和工程配置。推荐 Ant Design Pro 是结合本项目中文后台与复杂表单流程的判断，不是官方对本项目的建议。查阅时 master 变化中，其 package version 6.0.3 不作为本项目已锁定版本；实施先固定来源提交并验证依赖。React-admin 文档中的 localStorage token 示例不适用于本项目 HttpOnly Cookie 安全契约。

## 本地规范与需求
- .trellis/spec/api/backend/backoffice-authentication.md
- .trellis/spec/api/backend/quality-guidelines.md
- .trellis/spec/api/frontend/{index,directory-structure,component-guidelines,quality-guidelines}.md
- docs/current/product-requirements/{02-backoffice,03-data-and-permissions,04-acceptance}.md
- docs/current/upgrade-readiness-2026-09-18/16-confirmed-rules-and-engineering-spec.md §7

前端规范描述当前原生 DOM 客户端。用户偏好成熟框架构成项目级变更方向；实施时更新受影响规范，保留权限、字段裁剪和安全要求，不让旧实现描述阻止已授权架构调整。
