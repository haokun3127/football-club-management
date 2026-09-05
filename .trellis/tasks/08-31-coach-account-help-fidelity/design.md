# Technical design — coach account and help Figma fidelity

## Boundaries

The repair has two independent mini-program-only paths:

- **C16.3 account data projection:** extend the durable session projection with the current authenticated profile's phone and binding result. The account page renders only that persisted session projection and continues to obtain team names from `getCoachHome()`.
- **C16.4 help presentation:** retain `getContentFaqs()` as the sole FAQ data source, but separate Figma quick-start navigation from server taxonomy. A local, immutable six-topic presentation list maps each topic to known category keywords and derives the filtered real FAQ list in TypeScript.

No API endpoint, database table, login response shape, or production seed is changed.

## C16.3 data flow

```text
authenticated LoginResult
  -> persistAuthenticatedSession()
  -> SessionState { phone?, phoneBinding? }
  -> wx durable session storage
  -> requireRole("coach")
  -> accountPageData()
  -> own masked phone + binding visual state
```

`phone` is optional so previously persisted session objects remain readable. The page maps raw phone to a local mask helper and never calls an account mutation. `phoneBinding === "accepted"` renders the bound variant; every missing or non-accepted value retains the existing truthful pending copy.

## C16.4 data flow

```text
real ContentFaq[]
  -> presentQuestions()
  -> fixed HelpTopic[] (Figma order)
  -> resolveTopicFilter(topic, FAQ.category)
  -> visibleQuestions
  -> template card state / FAQ list / search / expansion
```

The six topic cards are a design navigation model, not live API records. This makes their geometry and order stable across FAQ content edits. Filtering remains derived from the real fetched FAQ objects. `all` is the default filter but intentionally has no rendered quick-start card because node `93:1286` has exactly six cards.

The support block is presentation-only because there is currently no support-contact BFF contract. It must contain no `bindtap`, platform contact button, modal, fabricated request, or false successful action.

## Compatibility and rollback

- Existing stored sessions without new optional properties continue to normalize and load.
- Existing FAQ endpoint and free-form category strings remain compatible; a topic simply shows an empty FAQ state if no returned record maps to it.
- Each page's test and runtime repair is independently commit-ready. Reverting the commit restores only the old session projection/help presentation and does not alter stored server data.
