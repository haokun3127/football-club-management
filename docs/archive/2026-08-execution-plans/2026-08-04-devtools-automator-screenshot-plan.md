# DevTools Automator Screenshot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `test-driven-development` task-by-task. This user requested inline execution; do not dispatch separate agent conversations.

**Goal:** Replace the abandoned Chrome-DevTools-style screenshot prototype with a verified `miniprogram-automator` workflow that connects to a DevTools automation window and writes a guarded `375x812` PNG plus sidecar metadata.

**Architecture:** The official SDK owns the protocol: `automator.launch` opens an automation-enabled DevTools window and `automator.connect` attaches to it at `ws://127.0.0.1:<port>`. The capture command will only use the SDK's public `currentPage`, `pageStack`, and `screenshot({ path })` methods. It will never send raw `App.*` RPC messages, navigate, log in, authorize, manufacture a session, or choose a role.

**Tech Stack:** Node.js ESM, `miniprogram-automator@0.12.1`, Vitest, Windows WeChat DevTools CLI.

## Global Constraints

- Online Figma remains the visual authority; this task produces evidence only and changes no page layout.
- The current Stable CLI reports an HTTP `--port`; the SDK launcher is the compatibility boundary for the official `auto --auto-port` invocation.
- Screenshot output must be an existing-parent, new absolute Windows `.png` path outside the repository; UNC, ADS, existing output and non-`375x812` images must fail.
- The image command may only attach to a pre-opened automation window. It must verify the current route before capture and disconnect without closing or changing the user’s DevTools window.
- Tests, TypeScript checks and connection evidence are distinct from a Figma visual-completion claim.

### Task 1: Prove the public Automator contract in a failing test

**Files:**
- Modify: `apps/miniprogram-cq-talent/scripts/devtools-screenshot.test.mjs`

**Interfaces:**
- Consumes: `runCli({ argv, automatorImpl })`.
- Produces: an assertion that capture calls `automator.connect({ wsEndpoint })`, reads `currentPage` and `pageStack`, calls `screenshot({ path })`, and disconnects.

- [ ] **Step 1: Add the focused failing test** with a fake `automatorImpl` that records `connect`, writes a minimal `375x812` PNG only from its `screenshot` method, and reports `/pages/parent/schedule/index`.
- [ ] **Step 2: Verify RED**

```powershell
npx.cmd --yes pnpm@10.33.0 --filter @football-club/miniprogram-cq-talent exec vitest run scripts/devtools-screenshot.test.mjs
```

Expected: the new assertion fails because the old script never calls `automator.connect` and instead sends raw `App.captureScreenshot` RPC messages.

### Task 2: Replace the raw RPC implementation with the official SDK

**Files:**
- Modify: `apps/miniprogram-cq-talent/package.json`
- Modify: `apps/miniprogram-cq-talent/scripts/devtools-screenshot.mjs`
- Create: `apps/miniprogram-cq-talent/scripts/devtools-automator-open.mjs`
- Modify: `apps/miniprogram-cq-talent/scripts/devtools-screenshot.test.mjs`

**Interfaces:**
- `openAutomation({ automatorImpl, cliPath, projectPath, port })` launches the SDK-managed automation window and then disconnects without closing it.
- `runCli({ argv, automatorImpl })` connects to an existing automation window, checks its current route and stack, captures through `miniProgram.screenshot({ path })`, validates the written PNG, and writes sidecar metadata.

- [ ] **Step 1: Add `miniprogram-automator@0.12.1` as a mini-program development dependency.**
- [ ] **Step 2: Replace raw WebSocket/RPC code with public SDK methods only.** Preserve strict argument and output-path validation; add `--port` as an explicit validated option.
- [ ] **Step 3: Add the opener command** `devtools:automator:open`, which launches only the separate automation window. It must not capture, authenticate, route, or close the user’s normal DevTools window.
- [ ] **Step 4: Verify GREEN** using the focused Vitest file. Expected: SDK contract tests pass and no test contains `App.captureScreenshot`.

### Task 3: Verify the actual DevTools boundary and document the result

**Files:**
- Modify: `apps/miniprogram-cq-talent/README.md`
- Modify: `docs/current/miniprogram-manual-acceptance-cq-talent.md`

- [ ] **Step 1: Run `devtools:automator:open` against the existing project and record only its launch/connection result.**
- [ ] **Step 2: After a user manually reaches the real parent schedule in that automation window, run `devtools:screenshot` with an external output path and `/pages/parent/` route prefix.**
- [ ] **Step 3: Record separate outcomes for SDK connection, route verification, PNG dimensions, and Figma comparison. Do not claim visual completion unless a new raw `375x812` image exists.**

### Task 4: Final checks and commit

- [ ] Run focused screenshot tests, the full mini-program test suite, typecheck, and `git diff --check`.
- [ ] Review the diff for raw `App.captureScreenshot`, pseudo-authentication, session/role writes, and repository-local screenshots; none may remain.
- [ ] Commit only the verified Automator tool and factual documentation as one logical batch. Leave unrelated journal, archive, plan and unused-icon work untouched.
