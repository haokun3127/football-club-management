const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = __dirname.replace(/\\utils$/, "");

const pageTopBars = [
  ["pages/coach/account/index.wxss", ".c163-nav"],
  ["pages/coach/assessment-entry/index.wxss", ".c15-nav"],
  ["pages/coach/assessment-submit/index.wxss", ".c151-nav"],
  ["pages/coach/content-select/index.wxss", ".select-nav"],
  ["pages/coach/coverage/index.wxss", ".coverage-nav"],
  ["pages/coach/event/index.wxss", ".c2-nav"],
  ["pages/coach/help/index.wxss", ".c164-nav"],
  ["pages/coach/permissions/index.wxss", ".c161-nav"],
  ["pages/coach/private-interest/index.wxss", ".c162-nav"],
  ["pages/coach/schedule/index.wxss", ".c1-nav"],
  ["pages/coach/student-radar/index.wxss", ".radar-nav"],
  ["pages/coach/tactical-board/index.wxss", ".c7-header-shell"],
  ["pages/coach/team-ability/index.wxss", ".ability-nav"],
  ["pages/coach/team-selector/index.wxss", ".team-selector-nav"],
  ["pages/coach/team/index.wxss", ".team-nav"],
  ["pages/coach/test-entry/index.wxss", ".c12-nav"],
  ["pages/coach/test-task-create/index.wxss", ".page-nav"],
  ["pages/coach/test-tasks/index.wxss", ".tasks-nav"],
  ["pages/coach/training/index.wxss", ".c8-nav"],
  ["pages/coach/me/index.wxss", ".c16-bar"],
  ["pages/parent/article/index.wxss", ".page-nav"],
  ["pages/parent/binding/index.wxss", ".binding-nav"],
  ["pages/parent/child/index.wxss", ".p7-nav"],
  ["pages/parent/coaches/index.wxss", ".coaches-nav"],
  ["pages/parent/content/index.wxss", ".page-nav"],
  ["pages/parent/day/index.wxss", ".p11-nav"],
  ["pages/parent/event/index.wxss", ".p2-nav"],
  ["pages/parent/growth/index.wxss", ".p4-nav"],
  ["pages/parent/guide/index.wxss", ".page-nav"],
  ["pages/parent/help/index.wxss", ".page-nav"],
  ["pages/parent/match-history/index.wxss", ".page-nav"],
  ["pages/parent/metric/index.wxss", ".p6-nav"],
  ["pages/parent/milestones/index.wxss", ".page-nav"],
  ["pages/parent/private-success/index.wxss", ".page-nav"],
  ["pages/parent/private/index.wxss", ".page-nav"],
  ["pages/parent/radar/index.wxss", ".p5-nav"],
  ["pages/parent/reminders/index.wxss", ".reminders-nav"],
  ["pages/parent/schedule/index.wxss", ".p1-nav"],
  ["pages/parent/semester-report/index.wxss", ".page-nav"],
  ["pages/parent/status/index.wxss", ".status-nav"],
  ["pages/parent/training-history/index.wxss", ".page-nav"],
  ["pages/parent/venues/index.wxss", ".venues-nav"],
  ["pages/login/index.wxss", ".login-nav"],
];

test("page-level top bars stay pinned to the viewport top", () => {
  for (const [relativePath, selector] of pageTopBars) {
    const css = fs.readFileSync(path.join(root, relativePath), "utf8");
    const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const selectorPattern = new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`);
    const match = css.match(selectorPattern);
    assert.ok(match, `${relativePath} is missing ${selector}`);
    assert.match(
      css,
      new RegExp(`${escapedSelector}\\s*\\{[^}]*position\\s*:\\s*(?:sticky|fixed)[^}]*top\\s*:\\s*0[^}]*z-index\\s*:\\s*100`),
      `${relativePath} must keep ${selector} above scrolling content`,
    );
  }
});

test("the shared app header keeps its flow reservation and fixes only the visible surface", () => {
  const template = fs.readFileSync(path.join(root, "components/app-header/index.wxml"), "utf8");
  const css = fs.readFileSync(path.join(root, "components/app-header/index.wxss"), "utf8");
  assert.match(template, /class="app-header__surface app-header--\{\{theme\}\}"/);
  assert.match(css, /\.app-header\s*\{[^}]*position\s*:\s*relative[^}]*height\s*:\s*88px/);
  assert.match(css, /\.app-header__surface\s*\{[^}]*position\s*:\s*fixed[^}]*top\s*:\s*0[^}]*right\s*:\s*0[^}]*left\s*:\s*0[^}]*z-index\s*:\s*100/);
});
