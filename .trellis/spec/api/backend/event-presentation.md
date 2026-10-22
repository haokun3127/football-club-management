# Event presentation and child context

## 1. Scope
The parent event detail and coach workbench share facts from the same authorized event. This is a display projection, not a new domain model or counting rule.

## 2. Contracts
`application/event-presentation.ts` exports `EventPresentation`: `startsAt`, `endsAt`, nullable `{id,name}` objects for `team`, `venue`, `coach`, and nullable training summary. Training state is `planned`, `not_arranged`, or `unavailable`; groups retain drill IDs, names and configured minutes. HTTP schema explicitly whitelists these fields. Existing event/training envelopes remain compatible.

## 3. Sources and authorization
Call `presentEvent` only after role and event authorization. Resolve the actual primary team, venue and owner coach; never infer a default coach. Reuse training session/plan and existing content summary. Missing references are unavailable, not a claim that the coach entered nothing. Coach detail requires existing team/event scope. Guardian roster filtering precedes name enrichment. The projection contains no roster, contacts or private coach fields.

## 4. Client flow
Normalize once in `utils/api.ts` to typed `ActivityPresentation`, `match` and `other`. Pages consume those properties, never parse translated labels. For legacy responses without training data, report unavailable. Preserve numeric zero. Explicit child query wins only if authorized; an invalid query is an error. A valid selected child may be reused; auto-select only a single authorized participant. Multiple children with no valid selection require a choice.

## 5. Failure and concurrency
Page requests carry a generation and selected event/child identity. Ignore late reads after switching or unloading. Failed leave-status reads disable writes and offer retry; do not invent an active record. Keep expected revisions and existing conflict refresh. A write completing after leaving may invalidate cached growth but must not update another child UI.

## 6. Examples and forbidden patterns
Good: `detail.presentation.venueName`, selected-child-filtered personal match events, null for unassigned venue. Bad: `fields.find(x => x.label === "场地")`, `participants[0]` for a multi-child selection, reporting absent data as zero, or reusing an unrelated child leave revision.

## 7. Verification
`test/event-presentation.test.ts` covers shared facts, guardian-only participants, missing assignments and unrelated-coach denial. Existing `test/server.test.ts` asserts the public contract. Mini-program `utils/api.test.mjs` and `pages/parent/event/index.test.mjs` cover normalization, multiple/invalid children, read failure and stale/unloaded requests. See the B0 task implementation record for full checks and synthetic native evidence; deployed and physical-device checks are separate.
