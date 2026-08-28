# C7 tactical board current Figma sync implementation plan

1. Add focused assertions for the current Figma section names/classes and the absence of global tabbar/legacy layout.
2. Update C7 WXML to render header, context/status, formation, pitch, bench, and reset/save actions using precomputed TypeScript fields.
3. Update C7 WXSS to the current 375px geometry while preserving safe-area and measured pitch coordinates.
4. Update page config and TypeScript view-model fields only where required by the new structure.
5. Run focused Vitest, mini-program TypeScript, and `git diff --check`.
6. Update `docs/current/progress.md` and commit only the C7 paths plus that entry.
