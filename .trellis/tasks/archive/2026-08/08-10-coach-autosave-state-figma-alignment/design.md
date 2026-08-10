# C12.1 Design

`loadAssessmentDraft(eventId, templateVersionId)` already scopes storage by the event and form version. C12.1 consumes that existing draft map after the current workbench and matching form have passed C12's guards; it does not change storage or API contracts.

The page derives `validDraftEntries` by intersecting draft rows with the current roster student IDs and form test item IDs, then excluding `empty` status. The modal is shown only when that intersection is nonempty. Its local timestamp is the latest parseable `updatedAt` among those entries. An absent or invalid timestamp remains an honest local-draft label rather than a fabricated time.

The page owns `draftResumeVisible`, `draftResumeUpdatedAtLabel`, and an exit-once state. It sets `canSubmit` false while the modal is visible and explicitly guards input, missing-state changes, field selection, submission, and retry/navigation entry points. The full-screen event mask covers the tab bar. Continue restores only presentation interactivity; it never mutates the draft. Exit sets the once guard before `wx.navigateBack` and never clears storage.

Each `load` increments a page-local token before awaiting the workbench. Every post-await success or failure checks that token before changing data. This keeps a slower earlier request from showing a resume modal for an outdated event.

The Figma modal is adapted to WXML/WXSS: a dim event mask, `331px`-equivalent `662rpx` content card, direct Figma check asset, and Continue/Exit controls. It preserves the role tab bar beneath the mask and contains no WXML method calls.
