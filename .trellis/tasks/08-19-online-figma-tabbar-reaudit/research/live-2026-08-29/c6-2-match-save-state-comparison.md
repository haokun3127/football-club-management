# C6.2 Save State live Figma comparison — 2026-08-29

## Evidence

- Live Figma file: `zZ6wKyOHKcO4UYXDd9jGwv`, node `93:858`, read with `get_design_context` and `get_screenshot` before the repair.
- Online reference: `research/live-2026-08-29/c6-2-online.png`, natural size `375×812`.
- Runtime route: `/pages/coach/match/index?id=event-cq-talent-secure-test-1-completed-match`, opened through WeChatIDE MCP with the existing real coach session.
- A compatible local draft was created through the real flow: open C6.1 from the match page, enter minute `54`, then navigate back. No API response, page data, or storage payload was injected.
- Runtime before repair: the same route showed the local-draft overlay, but the modal was constrained to approximately `327px`, the success icon container was `52px`, the icon was a hand-drawn CSS check, and the background used `#d1fadf`.
- Runtime after repair: `research/live-2026-08-29/c6-2-runtime-repaired.png`, strict `375×812`.
- Runtime bottom viewport after `pageScrollTo`: `research/live-2026-08-29/c6-2-runtime-repaired-bottom.png`, strict `375×812`.

## Confirmed differences and repair

- The live board's modal is `315×270px`, centered with `24px` internal padding, `20px` vertical gaps, and no extra overlay padding. The page now uses a `630rpx` border-box modal, `48rpx` padding, `40rpx` gaps, and a zero-padding full-screen mask.
- The live board's success container is `64×64px` with `#ecfdf5` and a `32×32px` cloud-check asset. The page now uses a `128rpx` container, `#ecfdf5`, and the exact Figma-exported `/assets/icons/c6-2-cloud-check.svg`; the authored CSS check was removed.
- The live board uses sample in-progress match content and the text `已自动保存`. The runtime retains real completed-match content and the truthful local-only wording `未提交草稿已保存 / 这条未提交的比赛事件仅保存在当前设备`; these are data/state and persistence-scope differences, not copied Figma facts.
- The live board and runtime both keep the overlay above the fixed coach TabBar. The bottom viewport confirmed no TabBar obstruction. The simulator console filter `error|exception|fail|undefined|route is not defined|wx:else|appid missing` returned no matches.

## Verification

- Focused C6 match test was intentionally red after adding the new geometry/asset/color assertions, then green at `10/10` after the repair.
- WeChatIDE `compile_wxml` and `compile_wxss` both returned success. The runtime page reported `hasLocalDraftOverlay=true` after reopening the real route.
- Disposition: **repaired-and-recaptured**.

