# C16.2 design

`private_lessons` is a club feature flag, not a coach-specific acceptance, scheduling, confirmation, or availability contract. The page therefore has no data request and no local override. It projects the authenticated coach session into one of three read-only messages: unavailable, club feature enabled with coach details pending, or feature status pending sync.

Parent private-lesson GET and POST remain out of scope: they are separate persisted parent requests and do not establish a coach work queue. The C16.2 page must not claim that a request belongs to the signed-in coach, can be accepted, can be confirmed, or can be scheduled.

The page owns its Figma navigation and styling. Its only touch binding is the return affordance. The static availability marker does not carry a checked value or handler. Rollback is limited to this page, direct chevron export, and task materials.
