# C15.1 Assessment Submit — live Figma comparison

Date: 2026-08-29

## Sources

- Figma file key: `zZ6wKyOHKcO4UYXDd9jGwv`
- Figma node: `93:1163` (`C15.1 Assessment Submit`)
- Figma screenshot: `c151-online-2.png`
- Runtime route: `/pages/coach/assessment-submit/index?title=能力评估&count=2`
- Runtime screenshot: `c151-runtime-final-normalized.png`
- Runtime sidecar: `c151-runtime-final-normalized.png.json`

## Evidence levels

1. Online design read: **complete**. `get_design_context` and `get_screenshot` both read node `93:1163` from the current online file. The Figma render is `375×812`.
2. Runtime capture: **complete**. WeChatIDE MCP opened the exact coach route and captured a raw `564×1220` simulator image. The project capture pipeline normalized it to `375×812`; the sidecar records iPhone X logical viewport `375×812` and `devicePixelRatio=3`.
3. Visual comparison: **complete**. The online render and normalized simulator capture were inspected side by side.

## Comparison

- Top navigation: pass. The pink top bar, left chevron, title position, title size, and right placeholder align with the Figma structure. The simulator's status bar and WeChat capsule are platform-owned additions.
- Success state: pass. The white success circle, green check asset, title hierarchy, and centered alignment match the online board.
- Summary card: pass. Card radius, padding, shadow, two-column rows, status chip, labels, and value alignment match the online board.
- Actions: pass. The red primary action and outlined secondary action retain the online dimensions, radius, spacing, and centered labels.
- Coach TabBar: pass. Three items, icon/label hierarchy, selected training state, active red dot, and bottom safe area are visible without overlap.

## Explicit exemptions

- The online board uses example content (`技术评估`, `处理中`, `18名`, and a 24-hour message). The runtime keeps the actual route data and current implementation copy (`能力评估`, `已提交`, `2 名`, and `已记录本次评估提交`); replacing it with Figma sample data would violate the real-data contract.
- The simulator status bar, WeChat capsule, and home indicator are platform chrome and are not part of the Figma content comparison.

## Verification

- Focused Vitest: `index.test.mjs` — 4/4 passed.
- Mini-program TypeScript: `tsc --noEmit -p apps/miniprogram-cq-talent/tsconfig.json` — passed.
- Simulator console filter (`error|exception|fail|undefined|route is not defined|wx:else|appid missing`) — no matches.
- No business code, API, production data, or Figma content was changed for C15.1.

## Verdict

**Pass — real-data and platform-chrome exemptions recorded.**
