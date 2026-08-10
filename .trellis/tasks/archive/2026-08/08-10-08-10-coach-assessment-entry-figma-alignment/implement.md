# Implementation Plan: C15 Coach Assessment Entry

1. Add focused RED coverage for exact request status behavior, preserving the
   default `2xx` path for unrelated callers, and for the assessment helper's
   `201` requirement and actor-free body.
2. Add the C15 page test before implementation. Cover missing parameters and
   non-coach zero requests; concurrent load stale success/failure; real
   group/test-item mapping; draft version/team/form validation; submission
   single-flight; each `201` clearing only its corresponding draft; partial,
   unexpected-status, and network outcomes retaining drafts without navigation;
   and all-confirmed redirect count.
3. Add optional exact `expectedStatus` support in the request layer and use it
   only for `submitCoachAssessment`. Preserve default `2xx` behavior.
4. Replace C15's legacy field-id fallback and unscoped local draft with the
   validated page-local model. Render the current Figma hierarchy using only
   real data and safe page-owned copy. Keep WXML free of JavaScript helpers.
5. Run focused tests first, then the mini-program package test and typecheck,
   `task.py validate`, and `git diff --check`. Report any unrelated existing
   failure precisely. Do not commit, archive, or make screenshot claims.
