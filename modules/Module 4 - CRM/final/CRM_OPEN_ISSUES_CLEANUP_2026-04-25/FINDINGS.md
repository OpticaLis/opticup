# FINDINGS — CRM_OPEN_ISSUES_CLEANUP_2026-04-25

---

## F1 — Public-form lead-intake EF still uses hardcoded dispatch — INFO

**Severity:** INFO (architectural, deferred per OPEN_ISSUES #19)
**Location:** `supabase/functions/lead-intake/index.ts` —
hardcoded `template_slug='lead_intake_new'` /
`'lead_intake_duplicate'` dispatch on public-form lead creation.

**Description:** This SPEC wired `CrmAutomation.evaluate('lead_intake')`
into the manual-entry path (`createManualLead`). The public-form
path (lead-intake EF) does NOT go through the engine and continues
to use its own hardcoded template-slug dispatch. Net effect: today,
demo's "ליד חדש: ברוך הבא" rule fires for manual-entry leads (UI
flow) but NOT for public-form leads (EF flow). For demo this is
fine — manual entry is the active QA flow. For Prizma cutover, this
divergence becomes user-visible: a public-form lead and a
manual-entry lead in the same tenant would receive the SAME welcome
message, but only the manual one shows up in the automation history.

**Why not fixed here:** Wiring the EF through the engine would
cause double-sends (EF's hardcoded dispatch + the rule's dispatch
both fire). The architectural fix is OPEN_ISSUES #19 (build
`rule-evaluate` EF) which is deferred post-P7.

**Workaround for the meantime:** Keep parity by ensuring the
hardcoded EF dispatch and the demo `lead_intake_new` rule use the
same template slug. They do today (`lead_intake_new`).

---

## F2 — `Toast.summary` helper would deduplicate the new 3-tuple message format — INFO

**Severity:** INFO (developer ergonomics)
**Location:** `shared/js/toast.js` (no helper today),
`crm-confirm-send.js:248`, `crm-automation-engine.js:336` (both
duplicate the new 3-tuple format).

**Description:** A1 introduced the same 3-line message-build block
in two places:

```js
var msg = 'נשלחו ' + r.sent + ', נכשלו ' + r.failed + ', נדחו ' + (r.rejected || 0);
if (r.failed === 0 && (r.rejected || 0) === 0) Toast.success(msg);
else Toast.warning(msg);
```

Future call sites (e.g., bulk-status batch send if it grows a
broadcast path) will likely copy-paste this block, accumulating
drift. A `Toast.summary({sent, failed, rejected, queued})` helper
would emit the canonical message and pick severity correctly.

**Suggested:** Add to `shared/js/toast.js`. ~6 lines. Then both
call sites become `Toast.summary(r)`. Future maintainers can
extend the format (e.g., add "בתור W" for queued count) in one
place.

---

## F3 — Backfilled OPEN_ISSUES entries are dated 2026-04-25 even though work landed earlier — INFO

**Severity:** INFO (documentation accuracy)
**Location:** `modules/Module 4 - CRM/final/OPEN_ISSUES.md` issues
#14, #15, #16, #17 — header reads "Created: 2026-04-25
(retroactively logged)".

**Description:** Daniel asked me to add issues #14–#17 as
RESOLVED 2026-04-25 (the OVERNIGHT batch landed earlier in the
day). For chronological precision, these issues actually existed
unlogged from the moment OVERNIGHT_M4_SCALE_AND_UI started its
work — sometime before 2026-04-25 03:00. The "Created" stamp is
the date they were logged, not the date the underlying work began.
This is fine for an issue-tracker semantic (ticket creation date)
but a reader looking for chronological progress should consult
`final/OVERNIGHT_M4_SCALE_AND_UI/EXECUTION_REPORT.md` for the
actual completion timestamps.

**Suggested:** No action. Documented here for historical clarity.

---

## F4 — Sub-tab restoration depends on Tailwind class as state marker — LOW

**Severity:** LOW (coupling)
**Location:** `modules/crm/crm-events-detail.js:renderAndWire` —
detection of the active sub-tab uses
`button[data-event-subtab].text-indigo-600`.

**Description:** A3's restoration logic relies on the
`text-indigo-600` Tailwind class being present on the active button
(part of `CLS_SUBTAB_ACT`) and absent from inactive buttons (part
of `CLS_SUBTAB`). If a future styling change reuses
`text-indigo-600` on an inactive sub-tab (e.g., for a hover state
that gets stuck), the selector would match the wrong button.

**Suggested fix:** Add an `aria-current="page"` or
`data-active="true"` attribute to the active button when
`wireSubTabs` flips its className. Then the selector becomes
`button[data-event-subtab][aria-current="page"]` — semantic
intent rather than visual class. ~3 lines change.

**Not urgent:** Today's CSS layout has no such reuse. Logged for
future-resilience.

---

## F5 — `lead_intake` rule will fire for every public-form lead AFTER F1 is fixed — MEDIUM

**Severity:** MEDIUM (forward-looking)
**Location:** `crm_automation_rules` row id `e878749b-…` (the new
demo rule from this SPEC).

**Description:** Today the rule fires only on the manual-entry
path. Once OPEN_ISSUES #19 lands (server-side rule evaluator EF
that the public lead-intake form delegates to), the SAME rule will
fire on EVERY public-form submission — at significantly higher
volume than manual entry. The current demo template `lead_intake_new`
is identical to what the EF currently dispatches hardcoded, so
behavior parity is preserved. But: at production scale on Prizma,
firing this welcome message on every public-form submission may
exceed Make's webhook quota or burn through SMS allowances.

**Suggested:** Before #19 ships, add a `condition.type='source_equals'`
filter to the rule (or a new rule) that limits the welcome message
to specific lead sources (`source IN ('manual','storefront_form')`)
or rate-limits per tenant per day. The engine already supports the
`source_equals` condition type — see
`crm-automation-engine.js:CONDITIONS.source_equals`.

**Not urgent:** OPEN_ISSUES #19 is deferred post-P7 and won't ship
in the next batch. Logged so the future #19 SPEC author knows to
revisit this rule.
