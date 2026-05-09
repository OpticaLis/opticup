# SPEC — B8_DAY_OF_WEEK_TIMEZONE_FIX

> **Location:** `modules/Module 4 - CRM/docs/specs/B8_DAY_OF_WEEK_TIMEZONE_FIX/SPEC.md`
> **Authored by:** opticup-strategic (Foreman) via Campaign Overseer
> **Authored on:** 2026-05-01 (post-PRE_CUTOVER_QA browser-pass)
> **Module:** 4 — CRM
> **Phase:** Hot-fix follow-up to PRE_CUTOVER_QA_A B8

---

## 1. Goal

Fix the off-by-one timezone bug in `hebrewDayOfWeek(ymd)` that causes every Hebrew weekday computed from an `event_date` (YYYY-MM-DD) to render as the day BEFORE the actual day. The bug exists in two code paths and silently corrupts both UI labels (CRM admin event-create form) and customer-facing message bodies (SMS + email) that include `%event_day_of_week%`.

Zero behavior changes outside this single function. Symbol stays `hebrewDayOfWeek` in both files.

---

## 1.5 Pre-flight verification (Foreman)

- **Bug reproduced:** Browser QA on production 2026-05-01 (TEST 2 PROD) confirmed: `2026-05-15` (real Friday) renders as "יום חמישי"; `2026-05-02` (real Saturday) renders as "יום שישי". Off-by-one is consistent.
- **Root cause:** `new Date(ymd + 'T00:00:00+03:00')` constructs an instant equal to Israel-midnight, which is `21:00 UTC the previous day`. Calling `.getUTCDay()` on it returns the previous day's UTC weekday, not the Israel-local one.
- **Two affected files (verified by direct read):**
  - `modules/crm/crm-helpers.js:185-189` — UI helper, used by event create + edit forms
  - `supabase/functions/send-message/event-variables.ts:35-38` — EF helper, used to inject `%event_day_of_week%` into SMS + email templates
- **Customer-facing impact:** the EF code path corrupts every customer message that uses `%event_day_of_week%`. As of 2026-05-01 there are 5 email templates × 2 tenants = 10 active rows that include this variable (per PRE_CUTOVER_QA_A B8 §3 #16). Every customer who receives one of those will see the wrong Hebrew day.
- **Severity:** HIGH (customer-facing string corruption). Did NOT block cutover because at the time of PR #36 merge no customer messages had fired yet on the new EF; but every future customer message is wrong until this ships.

---

## 2. Background & Motivation

PRE_CUTOVER_QA_A B8 wired `%event_day_of_week%` end-to-end (helper + EF + UI + 5 email templates). The static + DB QA passed because the helper exists and substitution works mechanically. The bug only surfaced during browser QA when an actual date was rendered.

The fix is a 1-line code change per file. Justifies a standalone hot-fix SPEC because:
- Two separate repos / file types touched (browser JS + Deno EF TS) — single PR keeps the fix coherent
- Customer-facing impact justifies dedicated review trail
- Trivial scope makes it easy to land + verify within 30 minutes

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state at SPEC close | On `develop`, clean | `git status` → "nothing to commit" |
| 2 | Commits produced | 2 (fix + closing) | `git log origin/develop..HEAD --oneline` |
| 3 | Integrity gate | passes | `npm run verify:integrity` → exit 0 |
| 4 | `crm-helpers.js:185-189` rewritten so `hebrewDayOfWeek('2026-05-15')` returns `'יום שישי'` (Friday) | Friday | inline node -e test in commit message |
| 5 | `event-variables.ts:35-38` rewritten with same fix logic | Friday | inline deno test in commit message |
| 6 | Spot-check: `hebrewDayOfWeek('2026-05-02')` returns `'שבת'` (Saturday) | Saturday | inline test |
| 7 | Spot-check: `hebrewDayOfWeek('2026-05-17')` returns `'יום ראשון'` (Sunday) | Sunday | inline test |
| 8 | Spot-check: `hebrewDayOfWeek('2026-01-01')` returns `'יום חמישי'` (Thursday) | Thursday | inline test |
| 9 | EF `send-message` redeployed to Supabase production | version increments (currently v15) | `supabase functions list \| grep send-message` |
| 10 | Browser smoke on CRM admin event-create form: pick `2026-05-15` → subtext shows `יום שישי` | matches Friday | manual QA in next browser pass |
| 11 | No other behavior changes — function signature unchanged, exports unchanged | identical | code review |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read and edit `modules/crm/crm-helpers.js` + `supabase/functions/send-message/event-variables.ts` only
- Deploy `send-message` EF via Supabase MCP `deploy_edge_function`
- Run integrity gate + verify scripts
- Commit + push to `develop`
- Run inline node/deno spot-tests to confirm behavior
- Update `MODULE_MAP.md` if the helper signature changes (it does not, so no update needed)

### What REQUIRES stopping and reporting
- Any change to call sites (caller code stays identical — only the helper body changes)
- Any change to other functions in the same files
- Any change to template bodies that use `%event_day_of_week%` (out of scope)
- Any merge to main
- Any verify failure
- Any test from §3 #4-#8 returning a value other than the expected day

---

## 5. Stop-on-Deviation Triggers

- If after the fix any of the 5 spot-checks (§3 #4-#8) returns wrong value → STOP, the fix logic is wrong, do not commit
- If `send-message` EF deploy fails → STOP, do not commit code change without working deploy
- If the fix requires more than ~5 lines per file → STOP, you're over-engineering

---

## 6. Rollback Plan

1. Capture START_COMMIT before any change
2. On failure: `git reset --hard $(START_COMMIT) && git push --force-with-lease origin develop`
3. EF rollback: redeploy the previous version of `send-message` (v15) — Supabase MCP supports rollback via re-deploying from prior repo state
4. Notify Daniel; SPEC marked REOPEN

---

## 7. Out of Scope (explicit)

- Template body wording (sealed per V2)
- Other timezone-related code (e.g. `formatDate` helper — uses different logic, works correctly)
- Backfill of message_log rows that were sent with the wrong day before the fix (~0 rows expected since cutover hasn't happened — but do not backfill regardless)
- Any other helper in `crm-helpers.js` or `event-variables.ts`

---

## 8. Expected Final State

### Modified files
- `modules/crm/crm-helpers.js` — `hebrewDayOfWeek` body rewritten (signature, name, callers unchanged)
- `supabase/functions/send-message/event-variables.ts` — `hebrewDayOfWeek` body rewritten (signature, name, callers unchanged)

### Cloud state
- `send-message` EF redeployed (v15 → v16)

### DB state
- Unchanged

### Docs updated (MUST include)
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — append entry
- `modules/Module 4 - CRM/docs/CHANGELOG.md` — new section
- `roles/campaign-overseer/CAMPAIGN_OVERSEER_HANDOFF.md` §15 — add B8-fix-shipped note

---

## 9. Commit Plan

2 commits:

1. `fix(crm): B8 hot-fix — correct off-by-one in hebrewDayOfWeek helper (UTC parsing bug); affects CRM helper + send-message EF event-variables` — touches both files, deploys EF
2. `chore(spec): close B8_DAY_OF_WEEK_TIMEZONE_FIX with retrospective` — touches EXECUTION_REPORT + FINDINGS + SESSION_CONTEXT + CHANGELOG + HANDOFF

---

## 10. Recommended fix logic (executor may use directly)

The simplest fix: parse the YMD string manually, build a UTC midnight Date, then read UTC day. UTC is timezone-agnostic, so the day matches the calendar day.

```javascript
// crm-helpers.js — replacement body for hebrewDayOfWeek
function hebrewDayOfWeek(ymd) {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return '';
  var parts = ymd.split('-');
  var d = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
  return _HE_DOW[d.getUTCDay()] || '';
}
```

```typescript
// event-variables.ts — replacement body for hebrewDayOfWeek
export function hebrewDayOfWeek(eventDateIsoYmd: string): string {
  const [yearStr, monthStr, dayStr] = eventDateIsoYmd.split("-");
  const d = new Date(Date.UTC(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, parseInt(dayStr, 10)));
  return HEBREW_DOW[d.getUTCDay()];
}
```

This is the recommended path — but if you have a strictly cleaner alternative that passes all 5 spot-checks in §3, use it.

---

## 11. Lessons Already Incorporated

- FROM PRE_CUTOVER_QA_A FOREMAN_REVIEW Proposal A (verify column names) → APPLIED — both file paths grep-confirmed before SPEC
- FROM PRE_CUTOVER_QA_A FOREMAN_REVIEW Proposal B (live-state baseline) → APPLIED — bug reproduced with actual dates before SPEC
- FROM SPEC-B FOREMAN_REVIEW Proposal A (verify the consumer surface) → APPLIED — confirmed both surfaces (UI + EF) before authoring
- FROM CLAUDE.md First Action protocol → APPLIED — executor must run sync gate before touching files

---

## 12. QA Plan

### Smoke (mandatory)
1. `npm run verify:integrity` → exit 0
2. Inline node test in commit message: each of the 5 spot-checks (§3 #4-#8) returns expected day
3. Inline deno test confirming EF helper produces same answers

### Manual (Daniel — after deploy)
4. Open CRM admin event-create form on demo (or prizma — Daniel's call). Pick `2026-05-15`. Verify subtext: `יום שישי`.
5. After cutover (NOT this session): trigger one customer message that includes `%event_day_of_week%`. Confirm the rendered day matches the actual weekday of `event_date`.

---

## 13. Closing Deliverables

In `modules/Module 4 - CRM/docs/specs/B8_DAY_OF_WEEK_TIMEZONE_FIX/`:
- `EXECUTION_REPORT.md`
- `FINDINGS.md` (likely empty — focused hot-fix)

---

*End of SPEC.md.*
