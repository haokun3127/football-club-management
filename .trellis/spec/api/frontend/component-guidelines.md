# Backoffice Components

Use ProLayout and ProTable for navigation and server-driven lists; use Ant Design Form/Drawer for structured editing. Preserve the light background and #A80F1B brand. Labels, validation, loading, retry, empty, permission and conflict states must remain usable. Render user values as React text; never interpolate HTML.

Return only explicitly allowed fields. Shared catalogs are read-only, used training definitions require copies, and append-only ledger rows have no edit action. Each enabled action must perform its named operation. Date inputs normalize through dayjs and the shared API contract. Long forms/tables must remain reachable in the rendered browser.

CSP is enforced during modal/drawer use too. ConfigProvider receives the server nonce; the versioned rc-util patch propagates it to dynamically injected portal scrollbar styles. Test securitypolicyviolation events against the current build. Do not infer CSP behavior solely from a style selector, since the nonce property and CSSOM styles differ from serialized attributes.

## Task and object navigation (2026-10-22)

- `resource-presentation.ts` owns five data-menu groups and the unchanged 29 leaf IDs. ProLayout group nodes need a stable path to retain expandable descendants; only leaves navigate to resource APIs. Verify rendered links, not just the config array.
- `Management` owns permissions, loads, form state and revision/requestId writes; `ResourceFields` owns field rendering. Group by stable keys, retain every unrecognized server field in a fallback group, and preserve required/options/range/appliesTo semantics. Details show object identity and update time. Keep save off history and app-role tabs.
- Bind ProTable search through `options.search` so keyword enters request params and exportSearch. A toolbar callback that only reloads silently exports an unfiltered list. Verify both a no-match search and a matching export in the browser.
- Closing, copying or navigating from a dirty drawer requires discard acknowledgement. Cancelling keeps inputs. Editor-load errors disable saving and expose retry; 409 keeps the existing explicit reconciliation step.
- Use the approved red/neutral AntD tokens, 16px body and 44px controls; disabled values remain readable. Inspect 1440 and 1024 widths, long drawer scroll/focus, and CSP events after actual portals open.
