# Cross-Layer Thinking Guide

> **Purpose**: Think through data flow across layers before implementing.

---

## The Problem

**Most bugs happen at layer boundaries**, not within layers.

Common cross-layer bugs:

- API returns format A, frontend expects format B
- Database stores X, service transforms to Y, but loses data
- Multiple layers implement the same logic differently

---

## Before Implementing Cross-Layer Features

### Step 1: Map the Data Flow

Draw out how data moves:

```
Source → Transform → Store → Retrieve → Transform → Display
```

For each arrow, ask:

- What format is the data in?
- What could go wrong?
- Who is responsible for validation?

### Step 2: Identify Boundaries

| Boundary              | Common Issues                     |
| --------------------- | --------------------------------- |
| API ↔ Service         | Type mismatches, missing fields   |
| Service ↔ Database    | Format conversions, null handling |
| Backend ↔ Frontend    | Serialization, date formats       |
| Component ↔ Component | Props shape changes               |

### Step 3: Define Contracts

For each boundary:

- What is the exact input format?
- What is the exact output format?
- What errors can occur?

---

## Common Cross-Layer Mistakes

### Mistake 1: Implicit Format Assumptions

**Bad**: Assuming date format without checking

**Good**: Explicit format conversion at boundaries

### Mistake 2: Scattered Validation

**Bad**: Validating the same thing in multiple layers

**Good**: Validate once at the entry point

### Mistake 3: Leaky Abstractions

**Bad**: Component knows about database schema

**Good**: Each layer only knows its neighbors

### Mistake 4: Every Consumer Parses The Same Payload

**Bad**: A command reads JSONL events and casts fields inline:

```typescript
const thread = (ev as { thread?: string }).thread;
const labels = (ev as { labels?: string[] }).labels;
```

This looks local, but it means every consumer owns a private version of the
event contract. The next field change will update one command and miss another.

**Good**: Decode once at the event boundary, then export typed projections:

```typescript
if (!isThreadEvent(ev)) return false;
return ev.thread === filter.thread;
```

**Rule**: For append-only logs, JSON streams, RPC payloads, or config files,
create one owner for:

- event / payload type definitions
- type guards and normalization from `unknown`
- metadata projections used by UI commands
- reducers that replay state from the source of truth

Rendering code may format fields, but it must not redefine the payload contract.

---

## Checklist for Cross-Layer Features

Before implementation:

- [ ] Mapped the complete data flow
- [ ] Identified all layer boundaries
- [ ] Defined format at each boundary
- [ ] Decided where validation happens

After implementation:

- [ ] Tested with edge cases (null, empty, invalid)
- [ ] Verified error handling at each boundary
- [ ] Checked data survives round-trip
- [ ] Checked that consumers import shared decoders / projections instead of
      casting payload fields locally
- [ ] Checked that derived state points back to the source event identifier
      (`seq`, `id`, `version`) instead of inventing a second cursor

---

## Scenario: WeChat DevTools Automator Screenshot Evidence

### 1. Scope / Trigger

- Trigger: a visual-evidence command crosses the Windows DevTools CLI, an
  Automator WebSocket, mini-program runtime information, and a PNG artifact.
- The authoritative implementation and acceptance notes live in
  `apps/miniprogram-cq-talent/scripts/devtools-screenshot.mjs` and
  `docs/current/miniprogram-manual-acceptance-cq-talent.md`.

### 2. Signatures

```text
devtools:automator:open
devtools:screenshot -- --output <absolute-outside-repo.png>
  --expect-route-prefix <route-prefix> [--port <automation-port>]
```

### 3. Contracts

- Use `miniprogram-automator`, not project-owned raw DevTools RPC.
- On Windows, treat the DevTools HTTP service port and the Automator WebSocket
  port as different contracts. `cli auto --port <ide-http-port>` attaches to
  the manually opened IDE; `--auto-port <automator-port>` exposes the SDK
  endpoint. Never pass one as the other.
- `scripts/devtools/automation-session.cjs` is the one source of truth for
  the successful Automator endpoint. After a real `currentPage()` handshake,
  `devtools:automator:open` writes only the port, project path, CLI path, and
  creation time to ignored `tmp/devtools-automation-session.json`; it must not
  store a token, phone number, session, role, or API response.
- Before launching another IDE window, the opener performs read-only discovery
  over its bounded Automator range and adopts an already reachable endpoint.
  Every tracked helper resolves the same state file; `MP_AUTO_PORT` is a
  temporary explicit override, not a new default to copy into a script.
- Capture PNG and inspect `systemInfo` through two consecutive read-only SDK
  connections; re-check the route before accepting the second connection.
- `windowWidth` and `windowHeight` must be `375×812`. Preserve the raw PNG and
  record both `devicePixelRatio` and the PNG's actual raster scale. Do not
  infer PNG dimensions from `devicePixelRatio`.
- The command must not navigate, authenticate, change role, create session, or
  fabricate API data. Output and sidecar are published only after every check.

### 4. Validation & Error Matrix

| Condition | Required behavior |
| --- | --- |
| No stored/explicit Automator port | Fail with the state-file recovery command; do not guess a legacy port. |
| Existing Automator endpoint is discovered | Handshake and persist it before any CLI launch. |
| CLI path or automation endpoint unavailable | Fail with the endpoint/path; do not publish evidence. |
| Route prefix mismatch or route changes between connections | Fail before publishing PNG or sidecar. |
| Runtime logical viewport is not `375×812` | Reject the capture. |
| PNG is not a full, uniformly scaled viewport | Reject the capture. |

### 5. Good / Base / Bad Cases

- Good: runtime reports `375×812`; original PNG is an equal-scale raster such
  as `563×1218`; sidecar records the distinct logical, runtime, and raster
  values.
- Base: a `375×812` PNG with `devicePixelRatio: 1` is accepted and recorded.
- Bad: treating iPhone X `pixelRatio: 3` as a requirement for a
  `1125×2436` PNG, or accepting a screenshot after the verified route changed.

### 6. Tests Required

- Unit test the Windows `.bat` launch and endpoint retry without closing
  DevTools.
- Unit test session read/write, explicit-port override, HTTP-versus-WebSocket
  CLI arguments, empty-session failure, and that each tracked helper imports
  the shared resolver instead of a private numeric fallback.
- Unit test route verification, route re-check, atomic no-output failure,
  `375×812` logical-viewport validation, normal and high-density rasters, and
  non-uniform raster rejection.
- Real DevTools evidence is separate from unit tests: retain the resulting PNG
  and sidecar, then perform the Figma comparison.

### 7. Wrong vs Correct

#### Wrong

```js
if (png.width !== 375 || png.height !== 812) throw new Error("wrong size");
```

#### Correct

```js
const viewport = await inspectionProgram.systemInfo();
// Validate the logical 375×812 viewport, retain the original PNG,
// and record its independently measured raster scale.
```

### 8. Compatibility Probe and Stop Condition

- Before changing page code for a capture failure, record the DevTools `Tool.getInfo`, route, page stack, and the exact SDK operation that does not return.
- If route and page-stack requests succeed but `MiniProgram.screenshot()` receives no response within the bounded timeout, classify the failure as a DevTools/Automator capability boundary—not a UI, login, API, role, or viewport defect.
- Preserve the no-output rule: a timeout must leave no PNG and no sidecar. Do not replace it with a desktop crop, black image, route text, or manually edited image.
- Before treating a timeout as a version incompatibility, verify process freshness: the requested automation port must be newly listening after the entire IDE process has exited. A project-window reopen that leaves the old port owned by the old process is not a clean retry.
- Retry after that full-process restart or an external compatibility change (for example, a verified real device). Repeated page rebuilds and reconnect-order tweaks do not constitute visual acceptance.

### 8.1 Connection Refused Retrospective (2026-08-17)

- Symptom: a user could have a healthy manually opened DevTools window while
  different repository scripts still attempted `ws://127.0.0.1:9421`, `9425`,
  `9429`, `9430`, or `9432` and reported connection refused.
- Root cause: private fallback ports were copied across scripts, and launcher
  code omitted the active `.ide` HTTP port. That can ask the CLI to create a
  different project window instead of attaching to the user's healthy IDE.
- Correct recovery: run `devtools:automator:open`; it first reuses a verified
  active endpoint, otherwise registers one against the active `.ide` HTTP
  service and persists the handshake. Do not change page code, API state,
  roles, or authentication while this boundary is failing.

### 8.2 Fixed TabBar bottom-safe-area convention (2026-08-29)

- A page that renders the fixed `role-tabbar` must reserve its `140rpx` height in the page root when its content can exceed one viewport; otherwise a bottom CTA can be hidden behind the TabBar even though the first screenshot looks correct.
- Verify both the first viewport and a bottom viewport after `wx.pageScrollTo`; the bottom CTA, correction link, and final list row must be fully above the fixed TabBar.
- Good: `.page { padding-bottom: 140rpx; }` with a bottom screenshot proving the action block is unobscured. Bad: checking only the first viewport or adding an unrelated fixed offset to the action bar.

### 8.2.1 Fixed custom TopBar flow reservation (2026-08-31)

- A `navigationStyle: custom` top bar that is fixed with `position: fixed`
  must be followed by an in-flow spacer whose height equals the real status-bar
  inset plus the Figma content height. Otherwise the page starts underneath the
  bar and only appears correct on a particular device.
- The top-bar content height is specified as `88rpx`, so the spacer **must not**
  use a hard-coded `44px`. Use the shared helper instead:

  ```ts
  export function resolveTopBarHeight() {
    const width = wx.getWindowInfo?.().windowWidth ?? 375;
    return resolveNavInset() + (width * 88) / 750;
  }
  ```

- Good: `<view class="p1-top-spacer" style="height:{{topBarHeight}}px" />`
  immediately follows the fixed navigation; both `topBarHeight` and `navInset`
  come from shared presentation helpers. Bad: a fixed bar without a spacer, or
  `resolveNavInset() + 44`, which drifts on non-375px widths.
- Required checks: a unit test at a non-375px width, WXML/WXSS compilation, and
  an authenticated `375×812` simulator check that reads the page data and
  confirms the content starts below the fixed navigation.

### 8.3 Shared Figma overlay when a route has no independent board (2026-08-29)

- Some routes do not have a one-to-one Figma page board. For those routes, read the
  current role root plus the shared navigation overlay before comparing the runtime
  page. Record the exact nodes used; do not silently substitute an archived route
  board or infer body layout from the shell alone.
- A shared-overlay comparison can establish a pass for the top navigation, TabBar,
  safe-area reservation, and fixed-bottom behavior only. It cannot establish full-page
  visual acceptance when the route body has no matching board. Record that result as
  shell pass / body blocked and create a separate page-body task for any real mismatch.
- Dynamic API content, unavailable optional fields, and the platform-rendered WeChat
  capsule may be exempted only when the structural and geometric comparison is
  otherwise explicit. Never turn a data exemption into a visual pass for unrelated
  body composition.

### 9. Windows Simulator Capture Fallback (2026-08-05)

- When the Automator route, page-stack, and `systemInfo` calls work but the SDK screenshot call times out, Windows may use `scripts/devtools-simulator-capture.py` through `devtools-screenshot.mjs`.
- This fallback is valid only when all of the following hold: the tool finds exactly one visible legacy DevTools simulator title ending in “的模拟器”, or (when no standalone simulator exists) exactly one visible DevTools main window; `PrintWindow(PW_RENDERFULLCONTENT)` renders that window; the script locates the full DPI-scaled iPhone X canvas from its vertical-and-horizontal black notch signature and crops it to the verified logical viewport; and the outer Node command completes the second route check plus uniform-PNG validation before atomically publishing evidence.
- Do not replace this with a screen-coordinate crop. A normal desktop screenshot cannot prove which DevTools runtime, route, or device canvas was captured.
- If multiple standalone simulators or multiple fallback main windows are visible, reject by default and require `WECHAT_DEVTOOLS_SIMULATOR_TITLE`; if the Python helper, crop, or later route/PNG validation fails, publish neither final PNG nor sidecar.
- Required regression checks: Windows code path bypasses SDK screenshot; timeout leaves no evidence; a missing explicit title fails; an iPhone X notch offset from its host-window center still produces the exact crop; and metadata remains parseable across the Python/Node UTF-8 boundary.

---

## Cross-Platform Template Consistency

In Trellis, command templates (e.g., `record-session.md`) exist in **multiple platforms** with identical or near-identical content. This is a cross-layer boundary.

### Checklist: After Modifying Any Command Template

- [ ] Find all platforms with the same command: `find src/templates/*/commands/trellis/ -name "<command>.*"`
- [ ] Update all platform copies (Markdown `.md` and TOML `.toml`)
- [ ] For Gemini TOML: adapt line continuations (`\\` vs `\`) and triple-quoted strings
- [ ] Run `/trellis:check-cross-layer` to verify nothing was missed

**Real-world example**: Updated `record-session.md` in Claude to use `--mode record`, but forgot iFlow, Kilo, OpenCode, and Gemini — caught by cross-layer check.

---

## Generated Runtime Template Upgrade Consistency

Some generated files are both documentation and runtime input. In Trellis,
`.trellis/workflow.md` is parsed by `get_context.py`, `workflow_phase.py`,
SessionStart filters, and per-turn hooks. Template changes must be validated
against both fresh init and upgrade paths.

### Checklist: After Modifying A Runtime-Parsed Template

- [ ] Identify every runtime parser that reads the template, not just the file
      writer that installs it
- [ ] Check whether relevant syntax lives outside obvious managed regions
      such as tag blocks
- [ ] Verify fresh `init` output and a versioned `update` scenario that writes
      the older `.trellis/.version`
- [ ] Add an upgrade regression using an older pristine template fixture, then
      assert the installed file reaches the current packaged shape
- [ ] Update the backend spec that owns the runtime contract

---

## Versioned Documentation Boundary

Versioned documentation is a cross-layer boundary: source paths, `docs.json`
version routing, and the rendered version selector must all describe the same
release line.

### Checklist: Before Editing Versioned Docs

- [ ] Identify the target release line: stable, beta, or RC
- [ ] Verify the edited MDX path matches that line:
  - stable: `docs-site/{start,advanced,...}` and `docs-site/zh/{start,advanced,...}`
  - beta: `docs-site/beta/**` and `docs-site/zh/beta/**`
  - RC: `docs-site/rc/**` and `docs-site/zh/rc/**`
- [ ] Verify `docs.json` navigation points the version label to the same paths
- [ ] Grep the opposite tree for release-line-specific terms before committing
- [ ] Treat beta content appearing under root release paths as a source-path bug,
      not a rendering bug

**Real-world example**: A beta-only task workflow change documented
`prd.md` + `design.md` + `implement.md`, task-creation consent, and Codex
mode banners under root `start/` and `advanced/` paths. The docs site then
served 0.6 beta behavior under the Release selector. The fix was to restore root
release docs, move the 0.6 content to `beta/` and `zh/beta/`, and add a grep
audit for beta markers against the root release tree.

**Real-world example**: Codex inline mode changed workflow platform markers from
`[Codex]` / `[Kilo, Antigravity, Windsurf]` to `[codex-sub-agent]` /
`[codex-inline, Kilo, Antigravity, Windsurf]`. Fresh init was correct, but
`trellis update` only merged `[workflow-state:*]` blocks and preserved stale
markers outside those blocks. Result: upgraded projects got new hook scripts
but old workflow routing, so `get_context.py --mode phase --platform codex`
could return empty Phase 2.1 detail.

---

## Mode-Detection Probe Checklist

When a CLI auto-detects a mode by probing a remote resource (e.g., checking if `index.json` exists to decide marketplace vs direct download):

### Before implementing:

- [ ] Probe runs in **ALL** code paths that use the result (interactive, `-y`, `--flag` combos)
- [ ] 404 vs transient error are distinguished — don't treat both as "not found"
- [ ] Transient errors **abort or retry**, never silently switch modes
- [ ] Shared state (caches, prefetched data) is **reset** when context changes (e.g., user switches source)
- [ ] **Shortcut paths** (e.g., `--template` skipping picker) must have the same error-handling quality as the probed path — check that downstream functions don't call catch-all wrappers

### After implementing:

- [ ] Trace every path from probe result to the mode-decision branch — no fallthrough
- [ ] External format contracts (giget URI, raw URLs) are tested or at least documented as comments
- [ ] Metadata reads consume a complete response or use a streaming parser — never parse a fixed-size prefix as full JSON
- [ ] When reconstructing a composite identifier from parsed parts, verify **all** fields are included and in the **correct position** (e.g., `provider:repo/path#ref` not `provider:repo#ref/path`)
- [ ] Verify that **action functions** called after a shortcut don't internally use the old catch-all fetch — they must use the probe-quality variant when error distinction matters

**Real-world example**: Custom registry flow had 8 bugs across 3 review rounds: (1) probe only ran in interactive mode, (2) transient errors fell through to wrong mode, (3) giget URI had `#ref` in wrong position, (4) prefetched templates leaked across source switches, (5) `--template` shortcut bypassed probe but `downloadTemplateById` internally used catch-all `fetchTemplateIndex`, turning timeouts into "Template not found".

**Real-world example**: Agent-session update hints fetched npm `latest` metadata with `response.read(4096)` and then parsed it as complete JSON. The `@mindfoldhq/trellis` package metadata exceeded 4 KB, so the JSON was truncated, parse failed silently, and the first session injection showed no update hint. Fix: read the complete response before parsing, and add a regression where `version` is followed by an 8 KB metadata tail.

---

## Cross-Platform Template Consistency

In Trellis, command templates (e.g., `record-session.md`) exist in **multiple platforms** with identical or near-identical content. This is a cross-layer boundary.

### Checklist: After Modifying Any Command Template

- [ ] Find all platforms with the same command: `find src/templates/*/commands/trellis/ -name "<command>.*"`
- [ ] Update all platform copies (Markdown `.md` and TOML `.toml`)
- [ ] For Gemini TOML: adapt line continuations (`\\` vs `\`) and triple-quoted strings
- [ ] Run `/trellis:check-cross-layer` to verify nothing was missed

**Real-world example**: Updated `record-session.md` in Claude to use `--mode record`, but forgot iFlow, Kilo, OpenCode, and Gemini — caught by cross-layer check.

---

## Generated Runtime Template Upgrade Consistency

Some generated files are both documentation and runtime input. In Trellis,
`.trellis/workflow.md` is parsed by `get_context.py`, `workflow_phase.py`,
SessionStart filters, and per-turn hooks. Template changes must be validated
against both fresh init and upgrade paths.

### Checklist: After Modifying A Runtime-Parsed Template

- [ ] Identify every runtime parser that reads the template, not just the file
  writer that installs it
- [ ] Check whether relevant syntax lives outside obvious managed regions
  such as tag blocks
- [ ] Verify fresh `init` output and a versioned `update` scenario that writes
  the older `.trellis/.version`
- [ ] Add an upgrade regression using an older pristine template fixture, then
  assert the installed file reaches the current packaged shape
- [ ] Update the backend spec that owns the runtime contract

**Real-world example**: Codex inline mode changed workflow platform markers from
`[Codex]` / `[Kilo, Antigravity, Windsurf]` to `[codex-sub-agent]` /
`[codex-inline, Kilo, Antigravity, Windsurf]`. Fresh init was correct, but
`trellis update` only merged `[workflow-state:*]` blocks and preserved stale
markers outside those blocks. Result: upgraded projects got new hook scripts
but old workflow routing, so `get_context.py --mode phase --platform codex`
could return empty Phase 2.1 detail.

---

## Mode-Detection Probe Checklist

When a CLI auto-detects a mode by probing a remote resource (e.g., checking if `index.json` exists to decide marketplace vs direct download):

### Before implementing:
- [ ] Probe runs in **ALL** code paths that use the result (interactive, `-y`, `--flag` combos)
- [ ] 404 vs transient error are distinguished — don't treat both as "not found"
- [ ] Transient errors **abort or retry**, never silently switch modes
- [ ] Shared state (caches, prefetched data) is **reset** when context changes (e.g., user switches source)
- [ ] **Shortcut paths** (e.g., `--template` skipping picker) must have the same error-handling quality as the probed path — check that downstream functions don't call catch-all wrappers

### After implementing:
- [ ] Trace every path from probe result to the mode-decision branch — no fallthrough
- [ ] External format contracts (giget URI, raw URLs) are tested or at least documented as comments
- [ ] Metadata reads consume a complete response or use a streaming parser — never parse a fixed-size prefix as full JSON
- [ ] When reconstructing a composite identifier from parsed parts, verify **all** fields are included and in the **correct position** (e.g., `provider:repo/path#ref` not `provider:repo#ref/path`)
- [ ] Verify that **action functions** called after a shortcut don't internally use the old catch-all fetch — they must use the probe-quality variant when error distinction matters

**Real-world example**: Custom registry flow had 8 bugs across 3 review rounds: (1) probe only ran in interactive mode, (2) transient errors fell through to wrong mode, (3) giget URI had `#ref` in wrong position, (4) prefetched templates leaked across source switches, (5) `--template` shortcut bypassed probe but `downloadTemplateById` internally used catch-all `fetchTemplateIndex`, turning timeouts into "Template not found".

**Real-world example**: Agent-session update hints fetched npm `latest` metadata with `response.read(4096)` and then parsed it as complete JSON. The `@mindfoldhq/trellis` package metadata exceeded 4 KB, so the JSON was truncated, parse failed silently, and the first session injection showed no update hint. Fix: read the complete response before parsing, and add a regression where `version` is followed by an 8 KB metadata tail.

---

## When to Create Flow Documentation

Create detailed flow docs when:

- Feature spans 3+ layers
- Multiple teams are involved
- Data format is complex
- Feature has caused bugs before

---

## Event Log / Projection Boundary

Append-only logs are cross-layer contracts. A single event travels through:

```
CLI input → event writer → events.jsonl → reader → filter → reducer → display
```

### Checklist: After Adding A New Event Kind Or Field

- [ ] Add the event kind to the central event taxonomy
- [ ] Add a typed event variant or type guard at the event layer
- [ ] Add normalization helpers for array/object fields that come from
      user input or JSON
- [ ] Keep `seq` / `id` assignment in the event writer only
- [ ] Make filters and reducers consume the typed event guard, not local casts
- [ ] Make display code consume reducer output or typed events, not raw JSON
- [ ] Add at least one regression that proves history replay and live filtering
      use the same filter model

**Real-world example**: Thread channels added `kind: "thread"`, `description`,
`context`, labels, and `lastSeq`. The first implementation replayed thread
state correctly, but several commands still re-parsed event payload fields with
local casts. The fix was to make the core event layer own `ThreadChannelEvent`
and `isThreadEvent`, make `reduceChannelMetadata` the only channel metadata
projection, and make `reduceThreads` the only thread replay reducer.

---

## Full Quality-Gate Process Isolation

The root command `npx --yes pnpm@10.33.0 run check` runs the API's file-backed
SQLite integration tests. Start only one root check at a time and wait for its
actual exit code before launching another.

- Good: start one TTY session, poll that same session until it exits, then
  report its exact result.
- Base: a command tool reaches its short output window; inspect its session or
  child processes and wait, rather than starting a second root check.
- Bad: start another `pnpm run check` while a prior API Vitest process is still
  reopening SQLite files. This can produce artificial reopen timeouts in
  otherwise passing persistence tests.

Before classifying a SQLite reopen timeout as a repository regression, inspect
for active `pnpm run check` / API Vitest process trees launched by the current
session, let or stop only those known task-owned processes, then retry exactly
one clean serial gate.
