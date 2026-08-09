# C16.1 design

The page is a local projection of the authenticated coach session. It makes no network request and does not mutate capabilities. The session's roleEntrypoints.coach is normalized against a fixed allowlist and then displayed in that fixed order. Each rendered row denotes an available entrypoint only; it must not imply a create, edit, approve, or save permission.

The page calls requireRole("coach") before reading the session. A missing or non-coach session returns immediately, preserving the established role redirect and creating no page request. Missing client, missing roleEntrypoints, an empty list, or a list containing only ignored values renders the explicit no-entrypoint state.

Figma switch assets may communicate the static available/unavailable style but have no touch binding. The explanatory CTA is a non-interactive view with the text 仅管理员可调整; no page-local setting, storage state, or BFF write path is introduced. Rollback is the single page/asset/task change set.
