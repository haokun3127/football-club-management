# Production Dual-Role Acceptance Demo — 2026-08-11

- Production API release `b462561` was deployed from the clean tracked archive only.
- Production API release `d472307` was subsequently deployed after the acceptance identity was found to retain its synthetic fixture phone on restart; the new release reads the intended binding only from the private runtime variable.
- A timestamped backup of the named SQLite volume was created in the restricted server backup area before deployment. This record deliberately excludes credentials, phone numbers, and bearer values.
- The acceptance seed is opt-in only. The production container explicitly has `FCM_CQ_TALENT_ACCEPTANCE_SEED=1`; its acceptance phone is supplied only through the private `FCM_CQ_TALENT_ACCEPTANCE_PHONE` runtime variable, so restart seeding preserves the intended real WeChat binding without committing or logging a phone number.
- The acceptance identity has both parent and coach membership, retains its two existing guardian-scoped children, and has labelled August training, match, assessment, and tactical-board demo data.
- Production BFF verification succeeded: dual available roles, exactly two parent children, coach home read, tactical-board save, API container recreation, tactical-board readback (`saved=true`, retained player coordinate), and HTTPS health all returned successful results.
- Latest local safety evidence: root check passed with domain `19/19`, mini-program `278/278`, and API `84/84`. The file-backed regression covers role selection, parent scope, tactical persistence across restart, targeted rollback, explicit seed enablement in production mode, and preservation of peer-app/foreign-club records.
- This is API/data-contract evidence only; it does not claim new 375x812 visual acceptance.
- The deployment repair rechecked HTTPS health, presence (not values) of the WeChat credentials and acceptance-phone runtime setting, and the acceptance user/parent phone match with active `parent` + `coach` membership. A user must still complete a fresh real WeChat authorization to prove the final device-side login flow.
