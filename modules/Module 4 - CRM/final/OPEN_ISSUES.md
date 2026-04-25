# CRM — Open Issues (Post E2E Testing)

> **Created:** 2026-04-24
> **Source:** End-to-end testing of STOREFRONT_FORMS feature
> **Last sync:** 2026-04-25 (CRM_OPEN_ISSUES_CLEANUP_2026-04-25 SPEC)
> **Status:** 19/25 resolved. Open: #11, #13, #18, #19, #20, #21 (4 deferred, 2 actively tracked).

---

## 1. קישורים קצרים (חובה) — ✅ RESOLVED 2026-04-24

**Priority:** CRITICAL
**Description:** הטוקנים ב-URL של הרשמה והסרה ארוכים מאוד (~200 תווים).
צריך מנגנון קיצור — או טוקן קצר יותר, או שירות redirect, או lookup table.
**Current:** `prizma-optic.co.il/event-register?token=ZjQ5ZDRkOGU...G36E8pn...`
**Expected:** קישור קצר שעובד ב-SMS (160 תווים מקסימום להודעה).
**Resolution:** Closed by SHORT_LINKS SPEC (commit 33fd7215) + CRM_HOTFIXES
verification of send-message EF v5 deploy (2026-04-24 05:30 UTC). EF now
wraps HMAC URLs in `/r/XXXXXXXX` short codes via `short_links` table.

---

## 2. סטטוס ליד → "הוזמן לאירוע" בשליחת הזמנה — ✅ RESOLVED 2026-04-24

**Priority:** HIGH
**Description:** כשליד מקבל הודעת הזמנה לאירוע, הסטטוס שלו בבורד "רשומים"
צריך להשתנות ל-"הוזמן לאירוע" (invited). כרגע הסטטוס לא משתנה.
**Resolution:** CRM_HOTFIXES Fix 2 — commit 9fe1e36. Added
`promoteWaitingLeadsToInvited` helper in `crm-automation-engine.js`.

---

## 3. שינוי סטטוס מרובה (Bulk Status Change) — ✅ RESOLVED 2026-04-24 (already shipped in P2a)

**Priority:** MEDIUM
**Resolution:** EVENT_CONFIRMATION_EMAIL SPEC pre-flight discovered the
feature was already fully implemented in P2a (2026-04-21).

---

## 4. כפתור "שלח הודעה" באירוע — לא עובד — ✅ RESOLVED 2026-04-24

**Priority:** HIGH
**Resolution:** CRM_HOTFIXES Fix 3 — commit 99ca541. Added
`crm-event-send-message.js` (180 lines) with channel picker and
attendee-status filter.

---

## 5. קיבולת אירוע vs קופונים — בדיקת תקינות — ✅ RESOLVED 2026-04-24 (no code change)

**Priority:** MEDIUM
**Resolution:** Verified both are correct — no code change needed.

---

## 6. QR Code חסר באישור הרשמה — ✅ RESOLVED 2026-04-24

**Priority:** CRITICAL
**Resolution:** EVENT_CONFIRMATION_EMAIL SPEC. QR embedded as
`<img src="https://api.qrserver.com/v1/create-qr-code/?data=%lead_id%...">`
in the email template body.

---

## 7. עיצוב מייל אישור הרשמה — ✅ RESOLVED 2026-04-24

**Priority:** HIGH
**Resolution:** EVENT_CONFIRMATION_EMAIL SPEC. New body 3039 chars,
table-based layout, RTL, Prizma branding.

---

## 8. קבצים מושחתים ב-working tree — ✅ RESOLVED 2026-04-24

**Priority:** HIGH
**Resolution:** Iron Rule 31 + `scripts/verify-tree-integrity.mjs`
installed by INTEGRITY_GATE_SETUP SPEC. Two real null-byte
corruption events fixed (CLAUDE.md, Module 3 SESSION_CONTEXT).

---

## 9. Propagate all message templates demo → prizma (P7 cutover) — ✅ RESOLVED 2026-04-25

**Priority:** HIGH (was blocking Prizma production cutover)
**Resolution:** OVERNIGHT_M4_SCALE_AND_UI Phase 3 (commit landed
2026-04-25). Prizma tenant now has all 24 templates synchronized
from demo. The original blocker — empty `crm_message_templates`
on prizma — is gone.

---

## 10. כפתור "שלח" בקופון ב-Event Day לא שולח הודעה — ✅ RESOLVED 2026-04-24

**Priority:** HIGH
**Resolution:** COUPON_SEND_WIRING SPEC. `toggleCoupon` now calls
`CrmCouponDispatch.dispatch` → SMS+Email via `CrmMessaging.sendMessage`
with `event_coupon_delivery` templates.

---

## 11. "הוספה ליומן" בהודעות — ⚠️ DEFERRED

**Priority:** LOW
**Description:** Calendar button removed during Make→Supabase migration.
**Status:** Awaiting `calendar.ics` endpoint + `%event_date_iso%` variable.

---

## 12. Event lifecycle: leads stuck in confirmed after event ends — ✅ RESOLVED 2026-04-24

**Priority:** HIGH
**Resolution:** EVENT_CLOSE_COMPLETE_STATUS_FLOW SPEC + regression fix
in commit `5e93fb3` (skip_auto_promote flag).

---

## 13. Quick-register terms-approval flow — ⚠️ DEFERRED

**Priority:** MEDIUM
**Description:** Walk-in customers from quick-register lack consent capture.
**Status:** Awaits dedicated SPEC for WhatsApp-link approve flow + EF.

---

## 14. Message queue infrastructure (rate-limit, retry, dispatch backoff) — ✅ RESOLVED 2026-04-25

**Priority:** HIGH
**Created:** 2026-04-25 (retroactively logged)
**Resolution:** OVERNIGHT_M4_SCALE_AND_UI Phase 5 (`crm_message_queue` +
`dispatch-queue` EF + pg_cron 1-min tick + 1-second throttle + 3-layer
phone allowlist gate). Closed in same SPEC: queue draining works
end-to-end, retry-failed EF for run-level retries.

---

## 15. Server-side pagination for leads + incoming tabs — ✅ RESOLVED 2026-04-25

**Priority:** HIGH
**Created:** 2026-04-25 (retroactively logged)
**Resolution:** OVERNIGHT_M4_SCALE_AND_UI Phase 10. Added .range()-based
SERVER_PAGE=200 server-side fetch with "Load more" pagination across
crm-leads-tab.js + crm-incoming-tab.js. Initial-load cost <500ms even
at 20K-row tenants. (Caveat: search/filter still client-side over
loaded slice — see #21 for full server-side filter migration.)

---

## 16. Per-rule-firing observability (automation history view) — ✅ RESOLVED 2026-04-25

**Priority:** HIGH
**Created:** 2026-04-25 (retroactively logged)
**Resolution:** OVERNIGHT_M4_SCALE_AND_UI Phases 4 + 7. New table
`crm_automation_runs` (run-level metadata + counts) + automation history
UI tab with drill-down to per-message log rows. Counter-correctness fixes
landed in AUTOMATION_HISTORY_FIXES SPEC (run_id stamping in rejected
inserts; finishRun derives counts via GROUP BY).

---

## 17. Event edit modal — ✅ RESOLVED 2026-04-25

**Priority:** MEDIUM
**Created:** 2026-04-25 (retroactively logged)
**Resolution:** OVERNIGHT_M4_SCALE_AND_UI Phase 9. New
`modules/crm/crm-event-edit.js` (91 lines). Edit modal-stack closure
bug (closing both modals on save) fixed in EVENT_EDIT_MODAL_STACK_FIX
SPEC; events-list staleness (#23) and sub-tab reset (#24) fixed in
CRM_OPEN_ISSUES_CLEANUP_2026-04-25 SPEC.

---

## 18. Dev-server caching makes hot-reload unreliable — 🟡 OPEN (deferred)

**Priority:** MEDIUM
**Created:** 2026-04-25 (retroactively logged from
WAITING_LIST_PUBLIC_REGISTRATION_FIX)
**Description:** During QA, ad-hoc fixes to `modules/crm/*.js` files
sometimes don't hot-reload — the in-memory module on the local server
stays stale until a hard refresh with `ignoreCache=true`. Manifested in
WAITING_LIST_PUBLIC_REGISTRATION_FIX where a coupon-dispatch helper
appeared undefined despite the source file having the fix.
**Where:** Local dev server config + browser cache headers.
**Next step:** Either (a) add Cache-Control: no-store to the dev server's
JS responses, or (b) mint a per-request build hash query param so each
load forces a re-fetch.
**Status:** Workaround documented (chrome-devtools navigate_page
ignoreCache=true). Not blocking shipping.

---

## 19. Build server-side rule evaluator EF — ⚠️ DEFERRED (post-P7)

**Priority:** HIGH (architectural)
**Created:** 2026-04-24
**Description:** `CrmAutomation.evaluate` is client-side only. Public
form via `event-register` EF and `lead-intake` EF reimplement rule-like
dispatch with hardcoded template mappings. Server-side triggers cannot
read demo's `crm_automation_rules` table at all.
**Status:** Defer until after P7 Prizma cutover to reduce churn. Until
then, every new automation rule on demo needs coordinated EF code if
a non-UI entry point can trigger it.

---

## 20. send-message EF MCP deploy returns InternalServerError persistently — 🟡 OPEN (escalated)

**Priority:** HIGH (infra)
**Created:** 2026-04-25 (retroactively logged from OVERNIGHT F2 +
AUTOMATION_HISTORY_FIXES F1)
**Description:** Five+ consecutive SPECs report
`mcp__claude_ai_Supabase__deploy_edge_function` returning
`InternalServerErrorException: Function deploy failed due to an
internal error` for the `send-message` slug only. Other EFs
(retry-failed, dispatch-queue, lead-intake) deploy cleanly via
MCP on first try. Workaround applied every time: write source to
disk + Daniel runs manual CLI deploy.
**Where:** Supabase MCP server, project_ref `tsxrrxzmdxaenlvocyit`,
function slug `send-message`.
**Next step:** Open a Supabase support ticket with the project_ref
+ slug + timestamps of the 5+ failures + recent deploy logs from
the platform side. Ticket payload draft is in
final/OVERNIGHT_M4_SCALE_AND_UI/EXECUTION_REPORT.md §10.
**Status:** Escalated to product. Not blocking — manual CLI works.

---

## 21. Server-side filter/sort for leads-tab — 🟡 OPEN

**Priority:** MEDIUM
**Created:** 2026-04-25 (retroactively logged from OVERNIGHT F4)
**Description:** Phase 10 (#15) introduced server-side .range() pagination
with a 200-row initial fetch. But search/filter/sort still operate on
the loaded slice only. At 20K+ leads, scrolling filter results may miss
rows not yet loaded.
**Where:** `modules/crm/crm-leads-tab.js` + `crm-lead-filters.js` + sort
dropdown.
**Next step:** Migrate search/filter to the server query:
`q.or('full_name.ilike.%X%,phone.ilike.%X%,email.ilike.%X%')`,
`q.in('status', [...])`, `q.order(column, { ascending: dir })`.
Scope ~40 lines. Follow-up SPEC.
**Status:** Open — not yet scheduled. Acceptable for current demo
volumes; visible at production scale only.

---

## 22. lead_intake trigger unwired — ✅ RESOLVED 2026-04-25

**Priority:** MEDIUM
**Created:** 2026-04-25 (logged from AUTOMATION_HISTORY_NOT_TRIGGERED F1)
**Description:** `CrmAutomation.evaluate('lead_intake', …)` was declared
in the engine's TRIGGER_TYPES map but never invoked. Same pattern as
`lead_status_change` gap (resolved in AUTOMATION_HISTORY_NOT_TRIGGERED).
**Resolution:** CRM_OPEN_ISSUES_CLEANUP_2026-04-25 SPEC. Wired
`CrmAutomation.evaluate('lead_intake', { leadId })` into
`createManualLead` after the INSERT + ActivityLog write. Demo rule
"ליד חדש: ברוך הבא" inserted (id `e878749b-…`) with always-condition
+ `lead_intake_new` template. Verified end-to-end via chrome-devtools:
manual lead "QA Test 0004" → CrmConfirmSend → toast "נשלחו 1, נכשלו 0,
נדחו 1" → run row in `crm_automation_runs` (`8691592c-…`).
Public-form lead-intake EF still uses its hardcoded dispatch (see #19).

---

## 23. Events-list cell stale after edit save — ✅ RESOLVED 2026-04-25

**Priority:** LOW
**Created:** 2026-04-25 (logged from EVENT_EDIT_MODAL_STACK_FIX F1)
**Description:** After an event edit save, the parent events-list table
behind the modal still showed the old name until the user navigated
away and back. The fix was to call `window.reloadCrmEventsTab()` after
the in-place detail-modal re-render.
**Resolution:** CRM_OPEN_ISSUES_CLEANUP_2026-04-25 SPEC (commit c6e2d80).
1-line addition in `renderAndWire`'s edit-success closure.

---

## 24. Sub-tab reset to "משתתפים" after re-render — ✅ RESOLVED 2026-04-25

**Priority:** LOW
**Created:** 2026-04-25 (logged from EVENT_EDIT_MODAL_STACK_FIX F2)
**Description:** When event-detail re-rendered after an edit save (or
any other in-place refresh), the active sub-tab was reset to the
default "משתתפים" — losing context if the user was on סטטיסטיקות.
**Resolution:** CRM_OPEN_ISSUES_CLEANUP_2026-04-25 SPEC (commit c6e2d80).
`renderAndWire` now captures the active sub-tab key (via the unique
`text-indigo-600` class on the active button) before innerHTML wipe
and programmatically clicks the matching button after re-render.

---

## 25. Toast labels rejected as "נכשלו" instead of "נדחו" — ✅ RESOLVED 2026-04-25

**Priority:** LOW (UX)
**Created:** 2026-04-25 (logged from AUTOMATION_HISTORY_NOT_TRIGGERED F4)
**Description:** Both `approveAndSend` (CrmConfirmSend modal) and
`dispatchPlanDirect` (engine fallback) collapsed `failed` + `rejected`
into a single counter, so the success toast read "נכשלו 1" for an
allowlist-rejected SMS. The history view showed the right category;
the toast did not.
**Resolution:** CRM_OPEN_ISSUES_CLEANUP_2026-04-25 SPEC (commit c6e2d80).
Both call sites now count rejected separately
(`r.value.error === 'phone_not_allowed'` is the EF's marker). Toast
emits 3 numbers always: "נשלחו X, נכשלו Y, נדחו Z" — verified via
chrome-devtools on the QA Test 0004 flow ("נשלחו 1, נכשלו 0, נדחו 1").

---
