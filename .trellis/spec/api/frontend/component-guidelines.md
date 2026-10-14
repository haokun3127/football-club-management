# Backoffice Components

Use ProLayout and ProTable for navigation and server-driven lists; use Ant Design Form/Drawer for structured editing. Preserve the light background and #A80F1B brand. Labels, validation, loading, retry, empty, permission and conflict states must remain usable. Render user values as React text; never interpolate HTML.

Return only explicitly allowed fields. Shared catalogs are read-only, used training definitions require copies, and append-only ledger rows have no edit action. Each enabled action must perform its named operation. Date inputs normalize through dayjs and the shared API contract. Long forms/tables must remain reachable in the rendered browser.

CSP is enforced during modal/drawer use too. ConfigProvider receives the server nonce; the versioned rc-util patch propagates it to dynamically injected portal scrollbar styles. Test securitypolicyviolation events against the current build. Do not infer CSP behavior solely from a style selector, since the nonce property and CSSOM styles differ from serialized attributes.
