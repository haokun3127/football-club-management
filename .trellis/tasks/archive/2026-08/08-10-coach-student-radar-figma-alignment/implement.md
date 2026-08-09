# C13 implementation

1. Inspect C13, coach BFF normalizers and Figma node.
2. Add RED tests for route-member intersection, empty-team zero request, stale success and failure protection, occurredAt fallback copy, score/width projection, and invalid-radar no-draw states.
3. Implement page-local view model, minimal API/type preservation and Figma structure. Add only optional default-preserving radar-canvas size parameters; observe those parameters so dimension changes remeasure and redraw. C13 passes 440×360rpx, then removes its 200%/scale workaround.
4. Run focused, typecheck, package test and scoped diff check; independent review precedes code commit and task archive.
