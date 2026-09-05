# Adopt WechatIDE MCP simulator capture

## Goal

Make the authorized WeChatIDE MCP simulator capture path the only default source of visual evidence for the Chongqing Talent mini-program.

## Requirements

- A repository command must compile/open a requested mini-program route through the authorized local WeChatIDE MCP connection, verify the current route, and request the simulator's raw PNG screenshot.
- The command must normalize the evidence into a real `375×812` PNG while retaining the MCP raw image dimensions and scale in a same-name JSON sidecar.
- Omitted output must use `%TEMP%\\cq-talent-visual-evidence`; explicit output and `CQ_TALENT_VISUAL_EVIDENCE_DIR` must reject the Desktop and this repository worktree.
- The command must fail closed: failed authorization, project selection, compilation, route verification, MCP screenshot, malformed PNG, or invalid scale must not publish a PNG or sidecar.
- The command must never log in, request a phone number, inject a session/role/phone/API response, clear cache, upload, publish, or use WeChat mock APIs.
- Windows `PrintWindow`, desktop capture, `screen-shot.py`, and `crop-phone.py` remain available only as explicitly invoked historical/emergency tools. The new command must not silently invoke them.
- Documentation and handoff material must name the MCP command as the current default and describe the explicit emergency fallback boundary.

## Acceptance Criteria

- [x] Unit tests cover argument validation, route mismatch, invalid PNG dimensions, output atomicity, and a successful normalized capture sidecar.
- [x] The command can use the local authorized `D:\微信web开发者工具\wechatide.cmd mcp` stdio server without adding a real session or other privileged test state.
- [x] A smoke run captures the current simulator route and emits a valid `375×812` PNG plus sidecar declaring `captureMethod: "wechatide-mcp simulator_screenshot"`.
- [x] Existing full repository checks remain green.
- [x] `scripts/devtools/README.md`, the mini-program manual acceptance guide, and handoff files no longer describe a Windows window crop as the default evidence path.
- [x] Output-path regression tests reject the Desktop and repository worktree while retaining the isolated system temporary directory as the default.

## Resolved runtime race

The authorized MCP connection and iPhone X (`375×812`) simulator are working. A smoke run initially produced a white image because route verification completed before the new WXML tree mounted. The command now passes `waitForSelector: "view"` to `simulator_screenshot`; the verified rerun contains the rendered coach schedule page and publishes a valid `375×812` PNG plus sidecar.
