# Parent Growth Active-Student Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure parent growth milestones and training history always load the selected child from the persisted parent session.

**Architecture:** Reuse the existing session-aware child resolution used by the growth home page. Keep the current APIs and Figma layouts unchanged; only correct the student id passed into existing loaders and filters.

**Tech Stack:** WeChat Mini Program TypeScript/WXML, Vitest, pnpm workspace, Trellis task artifacts.

## Global Constraints

- Figma authority remains `zZ6wKyOHKcO4UYXDd9jGwv`, with P4.1 `499:2` and P4.2 `499:18`.
- Do not touch unrelated dirty paths or generated WeChat `index.js` files.
- Do not add fake data or API responses.
- WXML must not call `.map()`, `.filter()`, `.slice()`, or `.indexOf()`.

## Task 1: Add regression coverage

**Files:** `apps/miniprogram-cq-talent/pages/parent/training-history/index.test.mjs`, `apps/miniprogram-cq-talent/pages/parent/milestones/index.test.mjs`.

- [ ] Configure the page mocks with two children and `currentStudentId: "student-2"`.
- [ ] Assert the page requests the selected student's calendar/growth data.
- [ ] Run the focused tests and observe the expected failure against the current `children[0]` implementation.

## Task 2: Implement the minimal fix

**Files:** `apps/miniprogram-cq-talent/pages/parent/training-history/index.ts`, `apps/miniprogram-cq-talent/pages/parent/milestones/index.ts`.

- [ ] Resolve `children.find((child) => child.id === session.currentStudentId) ?? children[0]`.
- [ ] Pass the resolved id through existing data calls and membership filtering.
- [ ] Re-run the focused tests and confirm green.

## Task 3: Full verification and bookkeeping

**Files:** `docs/current/progress.md` plus the task artifacts.

- [ ] Run focused tests, mini-program typecheck, full `npx --yes pnpm@10.33.0 run check`, and `git diff --check`.
- [ ] Review the diff and commit only paths touched by this batch.
