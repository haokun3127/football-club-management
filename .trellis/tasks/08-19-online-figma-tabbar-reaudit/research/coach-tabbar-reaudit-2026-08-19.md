# Coach TabBar online Figma re-audit — 2026-08-19

## Evidence standard

Each result separately records a fresh online design-context read, a live Figma screenshot, a route-verified 375×812 WeChatIDE MCP runtime capture, and a completed visual comparison. The WeChat platform capsule/status area and missing activity parameters are not treated as TabBar defects.

| Route / state | Live Figma node | Runtime evidence | Visual comparison | Result |
|---|---|---|---|---|
| `/pages/coach/schedule/index` | C1 `93:578`; live design context + screenshot `figma/c1-schedule-online-2026-08-19.png` | `captures/c1-schedule-runtime-2026-08-19.png` + JSON sidecar | Completed. Fixed 70px three-item coach shell, schedule red active icon/label/dot, icon-to-label spacing and safe area agree. Current schedule uses an empty live-date data state. | Pass — data exemption only. |
| `/pages/coach/event-change/index` | C3 `93:634`; live design context + screenshot `figma/c3-event-change-online-2026-08-19.png` | `captures/c3-event-change-runtime-2026-08-19.png` + JSON sidecar | Completed. Fixed coach schedule-active shell agrees. Runtime cannot submit a change without the required activity parameter; this is a data precondition, not a TabBar variance. | Pass — data precondition exemption only. |
| `/pages/coach/attendance/index` | C4 `93:665`; live design context + screenshot `figma/c4-attendance-online-2026-08-19.png` | `captures/c4-attendance-runtime-2026-08-19.png` + JSON sidecar | Completed. Same fixed schedule-active shell, 70px height, three columns and safe-area placement match. Missing activity ID produces the expected empty-state body. | Pass — data precondition exemption only. |
| `/pages/coach/attendance-success/index` | C4.1 `93:696`; live design context + screenshot `figma/c4-1-attendance-success-online-2026-08-19.png` | `captures/c4-1-attendance-success-runtime-2026-08-19.png` + JSON sidecar | Completed. The result screen has no activity ID, but its schedule-active bottom shell is fixed and visually matches. | Pass — data precondition exemption only. |
| `/pages/coach/attendance/index?correction=1` | C4.2 `93:715`; live design context + screenshot `figma/c4-2-attendance-correction-online-2026-08-19.png` | `captures/c4-2-attendance-correction-runtime-2026-08-19.png` + JSON sidecar | Completed. Correction's schedule-active shell is fixed and matches C4.2; missing activity ID affects only the page body. | Pass — data precondition exemption only. |

## Findings so far

No coach TabBar implementation repair is warranted in C1/C3/C4/C4.1/C4.2.

## Root-page overlay re-read — 2026-08-19

The audit was re-opened after the user correctly pointed out that the online page root, rather than a child-board-only review, is the source for current shared TabBar changes. The authoritative root is `4:7` (**06 Coach Generated**).

- Live Figma root screenshot: `figma/coach-page-4-7-online-2026-08-19-reread.png`.
- Current C1 overlay: `197:2889` (`TabIconsOverlay`), captured live as `figma/coach-c1-tabbar-overlay-4-7-2026-08-19.png`.
- Geometry read from the live node: each coach item is 125px wide; icon `x=6,y=8,16×16`; label `x=6,y=28,9px` in a 14px line box; active dot `x=12,y=42,4×4`; overlay height 70px.
- Fresh runtime frame after the repair: `captures/c1-schedule-runtime-dot-8rpx-2026-08-19.png`; direct 70px crop `captures/c1-schedule-tabbar-crop-dot-8rpx-2026-08-19.png`.
- Direct comparison: `captures/coach-tabbar-overlay-vs-runtime-dot-8rpx-2026-08-19.png`.

**Confirmed repair.** The earlier `left` alignment change covered the icon and label positions but not active-dot scale: `4rpx` rendered as 2 CSS pixels at 375px. The shared component now uses `8rpx` for a true 4px dot in both roles. The Figma grey home-indicator versus the simulator's black native indicator is a platform-only exclusion.

## Root-page top-navigation correction — 2026-08-19

The user's correction was valid: reviewing `TabIconsOverlay` alone does **not** validate the arrow, title, or action typography updated in root `4:7`.

- Root screenshot re-read: `figma/coach-root-4-7-live.png`.
- Live Figma metadata/screenshot references: C2 top nav `196:1518` → `figma/c2-top-nav-live-2026-08-19.png`; C4 top nav `196:1676` → `figma/c4-top-nav-live-2026-08-19.png`; C9 top nav `197:199` → `figma/c9-top-nav-live-2026-08-19.png`.
- Shared rule confirmed from those live nodes: back icon `24×24px`; left title begins at `x=40`; title line box is `22px` / visual 18px; C2 action `结束训练` uses the updated 15px treatment.
- Regression evidence: initially failed focused tests for C2 (`‹`, 24rpx gap, 22px title), C9 (8px extra gap), and `app-header` (text glyph/16px title/13px action). The repairs replace the text glyph with `/assets/icons/chevron-left.svg`, remove the extra local gaps, and align shared title/action values.
- Runtime captures after WeChatIDE recompilation: `runtime/c2-event-top-nav-2026-08-19.png`, `runtime/c4-app-header-top-nav-2026-08-19.png`, `runtime/c9-team-top-nav-2026-08-19.png`; each is exactly `375×812`.
- Completed visual comparison: C2, C4 and C9 top shells match their respective online navigation strips. The C2/C4 body error cards reflect the missing/failed activity request and are not navigation defects.

## Root-page follow-up — C1 / C7 / C8 — 2026-08-19

The root-page re-read was repeated after the user clarified that the online root pages `4:6` and `4:7`, including their current overlays and navigation strips, must be used as the acceptance source. `get_design_context` cannot currently resolve a root canvas without a Figma desktop selection, but `get_metadata` and `get_screenshot` successfully read the live roots and the child navigation nodes below.

| Route | Current live Figma read | Defect confirmed by red test | Repair and fresh runtime evidence | Result |
|---|---|---|---|---|
| `/pages/coach/schedule/index` | Root `4:7`; top nav `196:1423`, `日程` is 18px and avatar is 36px. Saved screenshot: `figma/c1-top-nav-reread-2026-08-19.png`. | Local `.c1-nav__title` was `44rpx/54rpx` (22px/27px), not the 18px live title. | Regression test failed, then changed to `36rpx/44rpx`. Fresh `375×812`: `runtime/c1-schedule-topnav-reread-2026-08-19.png`. | Repaired and visually re-captured. |
| `/pages/coach/tactical-board/index` | Root `4:7`; top nav `196:2187`, child arrow `196:2189` is the 24px chevron (no horizontal shaft), title is 18px and directly follows the 24px icon. Saved screenshot: `figma/c7-top-nav-reread-2026-08-19.png`. | Local nav used a 12px gap, a 22px title, and the shafted `c11-arrow-left.svg`. | Regression test failed for gap/title/icon source, then changed to `gap: 0`, `36rpx/44rpx`, and `/assets/icons/chevron-left.svg`. Fresh `375×812`: `runtime/c7-tactical-board-topnav-reread-fixed-2026-08-19.png`. | Repaired and visually re-captured. |
| `/pages/coach/training/index` | Root `4:7`; top nav `196:2283`, `训练管理` is 18px. Saved screenshot: `figma/c8-top-nav-reread-2026-08-19.png`. | Local `.c8-nav__title` was `40rpx/48rpx` (20px/24px), not the 18px live title. | Regression test failed, then changed to `36rpx/44rpx`. Fresh `375×812`: `runtime/c8-training-topnav-reread-2026-08-19.png`. | Repaired and visually re-captured. |

Focused Vitest after repairs: 25/25 passing across C1, C7 and C8. Workspace typecheck passed. The C7 runtime has no activity ID and therefore retains the truthful empty body; that is unrelated to the repaired navigation shell.

### Workspace-gate observation

`npx --yes pnpm@10.33.0 run check` was re-run after this visual batch. Domain checks (19 tests), mini-program checks (343 tests), and all typechecks passed. The API suite did **not** clear because two current persistence tests timed out while reopening SQLite; neither test file nor persistence code is in this batch's staged scope:

- `apps/api/test/app-client-match-event-create.test.ts:135` — `retains the created event and metric record after reopening SQLite` timed out at its 10-second limit.
- `apps/api/test/persistence.test.ts:13` — `persists assessment tasks across a file database reopen` timed out at its 15-second limit.

This is recorded as a distinct workspace-gate failure, not a claim that the visual repair caused or resolved it. The scoped C1/C7/C8 regressions and root typecheck are green.

## Follow-up evidence batch — 2026-08-28

The live online file was re-read through the Figma MCP using file key `zZ6wKyOHKcO4UYXDd9jGwv`. The coach root remains `4:7`; the current coach TabBar overlay is `529:124`. The fresh online reference is retained at `research/live-2026-08-28/coach-tabbar-online.png`.

- Fresh runtime frame: `research/live-2026-08-28/coach-schedule-runtime-after-fix.png` (`375×812`), route `/pages/coach/schedule/index`.
- Comparison: the three-item coach shell, 70px height, 16px icons, 4px active dot, active schedule state, and safe-area placement agree with the online overlay. The schedule body is live data and is not part of this TabBar disposition.
- Disposition: coach TabBar comparison **passed** for this batch. The parent and coach results remain separate because the parent route could not be entered with the current coach session.
