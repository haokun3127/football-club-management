# Execution plan — dual-role TabBar visual acceptance

1. Enumerate all `<role-tabbar>` consumers and map them to current online Figma nodes. Record the coverage table in `research/`.
2. Verify that the WeChat DevTools MCP capture command can open a known coach route and produce a route-verified 375×812 screenshot.
3. Capture parent schedule, growth, child, and discover routes. For each: online Figma context → screenshot → compare → test-first repair if needed → compile → repeat screenshot.
4. Capture coach schedule, training, and me routes using the same sequence.
5. Re-enumerate consumers to prove that all routes were covered, run the mini-program check plus `git diff --check`, update acceptance documentation, and commit each code/document batch with paths limited to task-owned files.

## Batch validation

- Component tests: `npx --yes pnpm@10.33.0 --filter miniprogram-cq-talent test -- components/role-tabbar/index.test.mjs` (or the repository's equivalent focused command).
- Build/type checks: the package-level command documented by its spec, followed by the full repository `npx --yes pnpm@10.33.0 run check` for the final batch.
- Visual proof: fresh `wechatide-mcp-capture.cjs` PNG plus JSON sidecar for every covered route.
- Hygiene: `git diff --check` and scoped `git add <paths>` only.
