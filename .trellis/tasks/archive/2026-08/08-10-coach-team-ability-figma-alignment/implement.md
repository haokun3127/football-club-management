# C14 implementation

1. Inspect C14, existing BFF calls and Figma node.
2. Add RED tests for guards, one-time `Promise.allSettled` reads, team-only partial failure, overview failure, no N+1, fixed Hero radar-center overlay, invalid radar, disabled unavailable actions and WXML constraints. Prohibit Figma sample season/team/name/score/ranking data.
3. Implement page-local C14 view model and Figma structure using existing radar canvas size parameters.
4. Run focused, typecheck, package test and scoped diff check; independent review then code commit and separate task archive.
