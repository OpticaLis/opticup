# FOREMAN_REVIEW — M4_MESSAGE_PERFORMANCE_RPC_AND_DATE_COLUMNS

> **Verdict:** 🟢 **CLOSED.**

## Audit
- Both outcomes shipped: (a) message-perf screen has dates + rollup + drill-down + bold discriminator; (b) dispatch_preview <10s target met at 10K (3.98 s — closes Sprint-1 F-02).
- jsonb-RPC pattern proven across three surfaces now: dashboard (Sprint 1 SPEC 3), message-perf screen (here), dispatch_preview EF (here). Shape-fallback pattern documented as a future codified helper.

## IR34 runtime trace evidence
Live Chrome MCP on `http://localhost:3000/crm.html?t=demo`. Two captures:

**Message-perf screen (DOM probe):**
```
n_rows: 35  (per-template default view)
n_columns: 11
headers: ["", "תבנית", "ערוץ", "אירועים", "נשלחו", "הוקלקו", "% הקלקות",
          "נרשמו", "% המרה", "נשלח ראשון", "נשלח אחרון"]
bold_discriminator_segments: ["open", "open_tomorrow", "confirmation", "delivery",
  "duplicate", "waiting_list", "new", "list_confirmation", "list", "moved_unpaid",
  "moved_paid"]
first_row: ["▸", "event_registration_open_email_he", "אימייל", "19", "67", "3",
            "4.5%", "0", "0.0%", "23/04/26 13:40", "21/05/26 12:08"]
click first row -> 20 sub-rows appeared (drill-down), total table rows 55,
  caret toggled ▸→▾
```
Screenshot: `msg-perf-after-fix.png`.

**Dispatch_preview EF (browser fetch trace):**
```js
sb.functions.invoke('automation-engine', { body: { mode:'dispatch_preview', ... } })
  .then(res => ({
    time_ms: 3985,
    under_10s: true,
    recipient_count_total: 10000,
    recipients_returned: 10000,
    first_recipient_created_at: "2026-04-25T17:25:29.855511+00:00"
  }))
```
No console errors; clean response with correct data shape.

## Verdict justification
🟢 — clean execution. The single architectural pattern (jsonb-scalar RPC) addresses two separate user-facing bugs at once. The Sprint-1 leftover that I'd marked as "needs further investigation" was solved by the defensive shape-handling — turns out one extra triple-fallback was the missing line.

## Sprint 3 candidates surfaced
1. **`M4_JSONB_RPC_SHARED_HELPER`** — codify `unwrapJsonbArray(data)` in a shared utility so every future jsonb-RPC consumer gets the same defensive shape handling for free. ~20 lines.
2. **`M4_DISPATCH_PREVIEW_100K_VERIFICATION`** — full re-inject of 100K leads + measure end-to-end (browser timing + EF logs + cleanup). Validates the pattern at the Prizma future-scale target.

## 2 author-skill proposals
1. **When a Sprint-N SPEC notes "deferred to Sprint N+1: investigate why X happened", treat the investigation as REQUIRED reading at SPEC authoring time.** This SPEC's authoring carefully reviewed the Sprint-1 F-02 finding ("supabase-js returned 0 from jsonb-RPC") and pre-planned the shape-fallback — that 5-minute upfront read saved a full second iteration.
2. **For SPECs that have TWO independent outcomes, declare both acceptance bars in §1 and prove EACH separately.** This SPEC's §1 listed 8 criteria; one section per outcome (screen + EF). Easier to audit per-criterion than a single mega-list.

## 2 executor-skill proposals
(See EXECUTION_REPORT §"Skill improvement proposals" — both endorsed.)

---
*End of FOREMAN_REVIEW.*
