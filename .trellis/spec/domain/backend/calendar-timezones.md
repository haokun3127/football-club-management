# Recurring calendar timezones

## 1. Scope / trigger
Recurring events contain absolute ISO instants plus a business timezone. Local Mac and UTC CI/server must produce identical instants.

## 2. Signatures
`expandRecurringCalendarEvent({event,recurrence:{rrule,timezone,startsAt},range,maxOccurrences})`. `expandRecurringTimeRanges` retains its existing UTC-only input contract.

## 3. Contracts
Use existing Temporal to translate absolute DTSTART to business wall time represented in a floating UTC Date. Expand RRULE with UTC timezone; translate each floating wall time back through the explicit business timezone. Normalize Z-suffixed UNTIL to the same floating clock. Filter by original instant boundaries and preserve absolute event duration. Never mutate process.env.TZ in domain behavior. Temporal compatible disambiguation applies to ambiguous/nonexistent local times; no new booking policy is inferred.

## 4. Validation / error matrix
Invalid instant/timezone or non-positive duration rejects. Inclusive ranges and absolute UNTIL retain exact boundary behavior. Host timezone does not move a Hong Kong 17:00 course or change its UTC09:00 instant. New York09:00 repeats shift14Z→13Z across spring DST while retaining duration.

## 5. Good / base / bad cases
Good: Hong Kong and UTC hosts return the same business schedule; New York DST preserves local09:00. Base: a non-recurring UTC time range is unchanged. Bad: pass an absolute new Date(startsAt) together with business TZID to rrule and interpret its floating Date as a true UTC instant.

## 6. Tests required
calendar.test.ts has existing Hong Kong weekly expectations and explicit UTC/Hong Kong/Los Angeles host cases, DST transition, absolute UNTIL inclusivity and preserved90-minute duration. Run `TZ=UTC pnpm check:delivery` and actual GitHub CI. Local Hong Kong success alone did not expose rrule's host-relative TZID conversion.

## 7. Wrong vs correct
Wrong: rrulestr(rule,{dtstart:new Date(absolute),tzid:businessZone}) → date.toISOString(). Correct: Temporal explicit business-wall conversion → UTC floating recurrence → Temporal business-zone instant conversion.
