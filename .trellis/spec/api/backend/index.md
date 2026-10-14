# Backend Development Guidelines

> Best practices for backend development in this project.

---

## Overview

This directory contains guidelines for backend development. Fill in each file with your project's specific conventions.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Module organization and file layout | To fill |
| [Database Guidelines](./database-guidelines.md) | ORM patterns, queries, migrations | To fill |
| [Error Handling](./error-handling.md) | Error types, handling strategies | To fill |
| [Quality Guidelines](./quality-guidelines.md) | Code standards, forbidden patterns | To fill |
| [Logging Guidelines](./logging-guidelines.md) | Structured logging, log levels | To fill |
| [App Client BFF Contracts](./app-client-bff-contracts.md) | Mini-program app-client API boundary and role contracts | Active |
| [Active Role Sessions](./active-role-sessions.md) | Durable dual-role session and switching contract | Active |
| [Secure Test-Account Operations](./secure-test-account-operations.md) | Controlled file-SQLite import and rollback contract | Active |
| [Restart-Safe Phone Binding Seed](./phone-binding-seed.md) | Seed behavior for preserving real WeChat phone bindings across API restarts | Active |

---

## How to Fill These Guidelines

For each guideline file:

1. Document your project's **actual conventions** (not ideals)
2. Include **code examples** from your codebase
3. List **forbidden patterns** and why
4. Add **common mistakes** your team has made

The goal is to help AI assistants and new team members understand how YOUR project works.

---

**Language**: All documentation should be written in **English**.

- [Assessment publication](./assessment-publication.md): project drafts, revision checks, explicit publication, score scales and restart contracts.

- [Runtime Environment Isolation](./environment-isolation.md): explicit startup environment, database ownership, Referer/declaration routing guard, separate deployment volumes and safe local smoke.
- [Training Records and Corrections](./training-records.md): shared parent/coach training facts, optimistic corrections, history and financial separation.

- [Coach Team Scope](./coach-team-scope.md): explicit collaboration and head-coach planning boundaries across BFF and legacy routes.
- [Training Templates](./training-templates.md): authorized reusable snapshots, reviewed copy, capability-based exclusion and atomic target updates.
- [Team Student Evaluations](./student-evaluations.md): per-team current communication, revision history, guardian reads and BFF/client integration.
- [Scout Identities](./scout-identities.md): encrypted identity registration, natural retries, club isolation and coach library.
- [Temporary Event Rosters](./temporary-rosters.md): direct authorized changes, atomic late participation, immutable facts and explicit measurement selection.
- [Backoffice Authentication](./backoffice-authentication.md): browser origin/environment boundary, password sessions, private provisioning and scoped read catalogs.

- [Backoffice Management](./backoffice-management.md): framework resource contracts, write revisions, grants, audit, shared facts and protected histories.

- [Backoffice Integration](./backoffice-integration.md): versioned configuration, typed encrypted imports, snapshot BI, services/content and workbench.

- [Public Presentation and Confirmed Child Results](./public-presentation-results.md): native configuration, scoped preferences and guardian-only raw/mapped confirmation readback.
