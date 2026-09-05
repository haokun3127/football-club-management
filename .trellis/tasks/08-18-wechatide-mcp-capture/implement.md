# WeChatIDE MCP Capture Implementation Plan

**Goal:** Replace default DevTools visual evidence with a fail-closed WeChatIDE MCP simulator screenshot command.

**Architecture:** A dedicated root developer-tool CLI owns MCP stdio framing, route/screenshot sequencing, image validation, and atomic evidence output. It is tested with an injected MCP transport and image normalizer; no test communicates with the real DevTools process.

**Tech Stack:** Node.js CommonJS, `node:test`, Python Pillow, WeChatIDE MCP stdio.

## Global Constraints

- Never add a pseudo session, role, phone number, API response, WeChat mock, cache clear, upload, preview, or publish action.
- Require a real authorized WeChatIDE MCP connection and fail closed when it is unavailable.
- Do not touch unrelated dirty files; use exact-path staging only.
- A valid visual artifact is a normalized `375×812` PNG with a matching JSON sidecar and exact route evidence.

### Task 1: Establish the command contract with unit tests

**Files:**
- Create: `scripts/devtools/wechatide-mcp-capture.test.cjs`
- Create: `scripts/devtools/wechatide-mcp-capture.cjs`

**Interfaces:**
- Produces `parseArgs(argv)`, `assertCaptureDimensions(raw)`, `writeEvidenceAtomically(options)`, and `runCli(dependencies)`.

- [ ] Write tests for an exact route requirement, `375×812` normalization metadata, malformed/non-uniform PNG rejection, and atomic sidecar output.
- [ ] Run `node --test scripts/devtools/wechatide-mcp-capture.test.cjs`; observe the expected module-not-found failure.
- [ ] Implement only argument parsing, geometry checks, atomic publishing, and dependency-injected orchestration needed to turn those tests green.
- [x] Re-run the same test command until it passes.

### Task 2: Add the real MCP transport and smoke it

**Files:**
- Modify: `scripts/devtools/wechatide-mcp-capture.cjs`
- Modify: `package.json`

**Interfaces:**
- Consumes the Task 1 orchestration interface.
- Adds a `devtools:mcp:screenshot` package command.

- [ ] Write a failing transport test verifying the MCP sequence `initialize → tools/list → check_wechatide_status → open_project_window → simulator_open_page → currentPage → systemInfo → simulator_screenshot` and rejection on unknown tool/result shape.
- [ ] Run the focused test and observe the expected missing transport behavior.
- [x] Implement JSON-RPC stdio request correlation, timeouts, and the tool-call adapter. On Windows launch the fixed Unicode `wechatide.cmd` path through encoded PowerShell invocation; do not pass any user-supplied string to a shell.
- [x] Run the focused tests, then execute the command against the already open DevTools project and confirm an evidence PNG/sidecar is emitted with rendered content; the verified smoke artifact is `C:\Users\ASUS\AppData\Local\Temp\cq-talent-mcp-coach-schedule-20260818-final.png`.

### Task 3: Move operational documentation to MCP-first

**Files:**
- Modify: `scripts/devtools/README.md`
- Modify: `docs/current/miniprogram-manual-acceptance-cq-talent.md`
- Modify: `HANDOFF-NEXT.md`
- Modify: `HANDOFF-2026-08-14.md`

- [x] Replace the current screenshot default instructions with the exact new command and evidence contract.
- [x] Preserve the legacy Python capture section as manual emergency fallback, explicitly stating it is never automatic evidence fallback.
- [x] Run the focused Node tests plus `npx --yes pnpm@10.33.0 run check`.

### Task 4: Record and deliver

**Files:**
- Modify: `.trellis/tasks/08-18-wechatide-mcp-capture/task.json`
- Modify: `.trellis/workspace/dongjun/journal-1.md` only through the Trellis session script.

- [x] Mark task scope/package appropriately and record commands; the simulator is now iPhone X `375×812` and the smoke artifact is valid.
- [x] Run `git diff --check` and inspect the exact paths planned for staging.
- [ ] Present the exact commit batch to the user before staging/committing, following repository Trellis commit discipline.
