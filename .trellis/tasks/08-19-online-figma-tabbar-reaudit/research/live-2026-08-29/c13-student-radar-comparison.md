# C13 Student Radar — 2026-08-29 online comparison

## Sources

- Online Figma file: `zZ6wKyOHKcO4UYXDd9jGwv`
- C13 node: `93:1080` (`C13 Student Radar`)
- Online screenshot: `c13-online.png` (`375×908`)
- Fresh online screenshot: `c13-online-fresh.png` (`375×908`, retained for traceability)
- Runtime route: `/pages/coach/student-radar/index?source=goal`
- Pre-repair runtime screenshots: `c13-runtime-ready.png`, `c13-runtime-bottom.png`
- Repaired runtime screenshot: `c13-runtime-repaired-verified.png` (`375×812`)
- Repaired runtime sidecar: `c13-runtime-repaired-verified.png.json`
- Capture method: WeChatIDE MCP route-verified `simulator_screenshot`

## Separate evidence levels

1. **Online design read:** `get_design_context` succeeded for node `93:1080`; the current board contains the 88px top bar, 16px content inset, 32px player chips, 260px radar hero, dimensions card, feedback card, and coach TabBar.
2. **Runtime capture:** the real coach session opened the actual student-radar route. The repaired capture passed route verification and was normalized to strict `375×812`; its sidecar records `devicePixelRatio=3` and zero filtered console matches.
3. **Visual comparison:** the online screenshot and repaired runtime screenshot were inspected side by side, including the first viewport. A pre-repair comparison isolated a 5px Hero displacement caused by an unconstrained `scroll-view`/chip height.

## Comparison and repair

The real runtime data contains eight students and eight dimensions, while the Figma sample contains five students and six dimensions. Names, labels, values, score, and assessment date are real API data and are explicitly exempt from sample-content matching.

The pre-repair runtime Hero began at approximately `y=157`; the online board begins at `y=152`. The student strip had no fixed outer height and the chip used vertical padding, allowing the native scroll container to contribute extra height. The minimum repair was:

- fix `.student-strip` and `.student-strip__inner` at `64rpx`;
- fix `.student-chip` at `64rpx`, `box-sizing:border-box`, `padding:0 32rpx`, and `line-height:60rpx`;
- keep the existing 16px-equivalent strip-to-Hero gap and all API-driven data projection unchanged.

After the repair, the strict runtime screenshot returns the Hero top to `y=152`, matching the online board's geometry. The top bar, chip shape, Hero radius/height, dimensions hierarchy, feedback state, coach TabBar, and safe-area reservation remain structurally aligned. WeChat status bar, capsule, Home Indicator, and real data are platform/data exemptions.

## Verification

- Red-green focused test: before repair `10 passed / 1 failed`; after repair `11 passed / 11 passed`.
- Mini-program TypeScript check: exit `0`.
- Route-verified MCP capture: exit `0`, normalized PNG `375×812`.
- Simulator console filter (`error|exception|fail|undefined|route is not defined|wx:else|appid missing`): no matches.

## Disposition

**C13: repaired and re-captured; visual pass for the current real-data state.**
