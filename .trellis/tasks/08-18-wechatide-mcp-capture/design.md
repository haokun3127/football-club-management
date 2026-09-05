# WeChatIDE MCP Capture Design

## Decision

The authorized WeChatIDE MCP stdio server is the default capture transport. It is a direct simulator-renderer channel and replaces the previous combination of Automator route inspection with Windows `PrintWindow`/screen pixel extraction.

MCP failures are terminal for normal visual evidence. The older Python window-capture scripts remain in the repository for a human to invoke intentionally during an emergency; the new command never chains into them.

## Boundary and data flow

`scripts/devtools/wechatide-mcp-capture.cjs` is a small CLI façade and contains no business behavior. It starts `D:\微信web开发者工具\wechatide.cmd mcp` over stdio, completes the MCP initialization handshake, and calls the DevTools tools in this order:

1. Check WeChatIDE connection/authorization.
2. Select the repository mini-program project and compile/open the requested route.
3. Query `currentPage` and reject a route that differs from the exact expected route.
4. Ask `simulator_screenshot` for an unoptimized raw PNG after waiting for the generic `view` page root, so route replacement and WXML mounting are both complete.
5. Parse and validate the PNG. Its aspect ratio must be exactly (within one pixel of scale rounding) `375:812` and its scale must be uniform.
6. Resample the raw image to `375×812`, then atomically publish the normalized PNG and a JSON sidecar.

The sidecar includes no tokens or MCP request payload. It stores only capture time, route, raw/normalized dimensions, scale, SHA-256, and the fixed capture-method label.

## Interfaces

```text
node scripts/devtools/wechatide-mcp-capture.cjs \
  --route /pages/coach/schedule/index \
  --output C:\\Users\\ASUS\\AppData\\Local\\Temp\\coach-schedule.png
```

- `--route` is an exact mini-program route beginning with `/`.
- `--output` is an absolute Windows `.png` path outside the repository. Neither target file may already exist.
- `WECHATIDE_MCP_COMMAND` may override the executable only for local diagnostics; production defaults to `D:\微信web开发者工具\wechatide.cmd`.
- `WECHATIDE_MCP_PROJECT_PATH` may override the project path only for isolated tests; normal runs use `apps/miniprogram-cq-talent`.

## PNG normalization

The WeChatIDE screenshot observed on 2026-08-18 was `546×1179`, an approximately `1.45×` capture of iPhone X's `375×812` logical area. The source aspect ratio may differ by less than 0.5% because DevTools rounds its renderer raster. The normalizer rejects larger deviations and uses Python Pillow `ImageOps.fit(..., centering=(0.5, 0.5))` to crop only the fractional edge difference before high-quality downsampling. Python is already a hard requirement of the retained Windows capture tooling, and Pillow `12.3.0` is present in the current environment; this avoids adding an unpinned npm image dependency. Tests inject a PNG-normalizer so protocol behavior is testable without starting DevTools.

## Failure and rollback behavior

- A tool error, malformed response, unexpected current route, malformed image, source aspect ratio beyond the 0.5% DevTools rounding tolerance, or failed write removes temporary data and exits nonzero.
- Output/sidecar publication is a pair: neither final file remains after a partial write.
- No changes are made to mini-program runtime state except the requested normal compile/open route action exposed by the MCP tool.
- Removing the new command and restoring the documented legacy command is sufficient rollback. Existing legacy scripts are retained unchanged.
