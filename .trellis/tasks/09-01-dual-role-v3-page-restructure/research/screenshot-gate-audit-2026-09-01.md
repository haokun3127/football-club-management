# Screenshot gate audit — 2026-09-01

## Evidence

- The screenshot gate files `scripts/devtools/wechatide-mcp-capture.test.cjs` and `scripts/devtools/visual-evidence-path.test.cjs` use Node's built-in `node:test` API, not Vitest.
- Running them through Vitest reports `No test suite found`; this is a test-runner mismatch, not a failure of the gate implementation.
- The authoritative command is:

```powershell
node --test scripts/devtools/wechatide-mcp-capture.test.cjs scripts/devtools/visual-evidence-path.test.cjs
```

- Result on 2026-09-01: `13` tests passed, `0` failed.
- The gate verifies isolated system-temp output, absolute-path and exact-route requirements, route correlation, `375×812` viewport validation, delayed file publication, and refusal to publish evidence when the route or MCP capability is invalid.

## Current blocker

The connected Figma identity `1039746386@qq.com` still has a `View` seat on file `zZ6wKyOHKcO4UYXDd9jGwv`. Figma V6 page creation cannot start until that identity receives edit access. Existing V5 nodes remain read-only reference material.

## Product boundary retained

Coach schedule remains an all-permitted-team course overview. Team selection belongs only to Coach Training Management and its dedicated selector route; the selected team is used for training, attendance, assessment, and statistics queries.
