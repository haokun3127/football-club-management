# Technical design — Coach C12/C12.1 final alignment

## Boundary

Only `pages/coach/test-entry`, its focused test, and C12 task/spec/progress records are in scope. There is no change to `assessment-draft`, `utils/api.ts`, API routes, or persistent assessment records.

## C12 page geometry

The existing C12 CSS changes its custom header from `border-box` to `content-box`, so the 176rpx (88px) design header remains intact after the runtime `navInset` is added. The controller continues to compute the menu inset. Body and submit-bar sides change from 32rpx to the Figma's 44rpx (22px) page gutter. The existing dark task header, dynamically projected real metric cells, field navigation and fixed action are retained.

## C12.1 draft-resume state

A `navTitle` presentation value is derived from the existing `draftResumeVisible` state. Normal C12 uses “项目评分录入”. A valid local-draft overlay uses the Figma C12.1 title “成绩录入”; `continueDraft()` changes the value back to the normal title. This does not read or write any server data and does not alter the local draft storage key or values.

## Compatibility and rollback

Existing WXML events and data fields retain their names except for the new display-only `navTitle`. A rollback is a reversion of the isolated C12 follow-up commit; score records and local draft data remain valid.

## Verification

Focused tests assert the two title states and source-level content-box/gutter invariants in addition to the existing draft/submit protections. Run mini-program typecheck, whitespace validation, and the full check before a scoped commit. If no fresh compiled DevTools screenshot is available, record that limitation rather than calling static parity a visual acceptance result.
