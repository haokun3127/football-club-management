# Execution plan — current online root-page navigation and TabBar re-audit

1. Read live root pages `4:6` and `4:7`, then re-enumerate all current `<role-tabbar>` consumers and affected top-nav patterns; map them to live Figma nodes and record any route/board mismatch before capture.
2. Verify WeChatIDE MCP can capture the current real session at 375×812 without creating a second DevTools window.
3. Audit parent routes in small batches: live Figma context + Figma screenshot → runtime screenshot + sidecar → visual comparison record.
4. Audit coach routes using the same sequence. For long routes and fixed CTA pages, also inspect the bottom viewport.
5. For each actual defect: write a failing focused regression test, make the minimum repair, run the focused test and typecheck, ask the simulator to compile, and capture the corrected route before a scoped commit. Shared top-navigation defects use `components/app-header` first; C2/C9-style local navs remain explicit and receive their own tests.
6. Re-enumerate all consumers, verify every one has a fresh result, run the final quality gate for any repaired code, and record completed / exempt / blocked outcomes.

## Validation

- Runtime screenshots: `node scripts/devtools/wechatide-mcp-capture.cjs --route <route> --output <absolute png>`.
- Consumer inventory: `rg -l '<role-tabbar' apps/miniprogram-cq-talent/pages -g '*.wxml'`.
- Code repair only: package-focused Vitest and TypeScript checks, followed by `npx --yes pnpm@10.33.0 run check` before final completion.
- Hygiene: `git diff --check` and `git diff --cached --check` before every commit.

## Rollback

Each confirmed repair is committed independently and can be reverted by its commit hash. Audit artifacts are append-only and do not affect runtime behavior.
