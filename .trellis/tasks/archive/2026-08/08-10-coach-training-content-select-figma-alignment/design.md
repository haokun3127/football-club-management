# C10 Technical Design

## Data Flow

When a non-empty route `eventId` is present, C10 starts the existing project
tree and workbench reads concurrently. It accepts the workbench only when its
event ID equals the route ID, its event type is `training`, and its status is
not `cancelled`. Any other result is a non-writing safe state.

The page constructs one project view model by merging every tree group that
references a project ID. A project has a stable source order from its first
appearance and a union of its real group names. Selection is the stable,
deduplicated intersection of known project IDs and workbench-selected IDs. The
same canonical list is sent through the existing PUT and compared to the
post-save workbench readback. A readback mismatch, PUT failure, or reread
failure keeps the cards and selection intact with a fixed safe error message.

Duration is derived only from numeric `durationMinutes`: unavailable values are
shown as unavailable, never as a guessed number. Search, group filters,
selection count, total duration, and template flags are page-owned TypeScript
view data.

## Navigation and Presentation

The existing C2 action remains gated by its real training workbench action and
routes with that event ID to C10. C10 owns a 176rpx, border-box pink navigation
bar. Existing icons are reused only after glyph verification; otherwise any new
asset is exported directly from Figma node `93:952`. Target color rotation is
decorative and has no category meaning.

## Rollback

Only the C10 page, its direct Figma icon assets if needed, C2's page-owned
route, tests, and task artifacts may change. Reverting those files restores the
previous flow without API, shared-component, app configuration, or backend
rollback work.
