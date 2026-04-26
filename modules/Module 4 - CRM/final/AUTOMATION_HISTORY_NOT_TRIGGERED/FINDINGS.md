# FINDINGS — AUTOMATION_HISTORY_NOT_TRIGGERED

---

## F1 — `CrmAutomation.evaluate('lead_intake', …)` is also unwired — MEDIUM

**Severity:** MEDIUM
**Location:** `modules/crm/crm-automation-engine.js:33` declares
`lead_intake: { entity: 'lead', event: 'created' }` as a supported
trigger type. No call site exists in any client-side code.

**Description:** Same shape as the bug fixed by this SPEC, just for
the manual lead-creation flow instead of the status-change flow.
When `CrmLeadActions.createManualLead` succeeds, it logs
`crm.lead.create` to ActivityLog and returns — but does not call
`CrmAutomation.evaluate('lead_intake', …)`. Any rule with
`trigger_entity='lead'`, `trigger_event='created'` will never
fire from the manual-entry path.

**Note:** The public-form lead-intake EF (`supabase/functions/
lead-intake/index.ts`) handles its OWN dispatch via a hardcoded
template-slug code path — it does not delegate to the
`CrmAutomation.evaluate` engine either. This is documented in
`crm-automation-engine.js:11-12` and `OPEN_ISSUES #19` (server-
side rule evaluator EF).

**Suggested fix:** Add a `fireLeadIntakeAutomation(leadId)` helper
call to `createManualLead` after the INSERT succeeds. Symmetric
to `fireLeadStatusAutomation`. ~5 lines. Could fold into the next
SPEC.

---

## F2 — Engine's `WIRED_TRIGGERS` registry would prevent this class of bug — INFO

**Severity:** INFO
**Location:** `modules/crm/crm-automation-engine.js` —
`TRIGGER_TYPES` map declares supported triggers, but there is no
runtime registry of WHICH ones have callers.

**Description:** The bug pattern here repeats: declare a trigger
in the engine's map, forget to wire a caller, ship code that
silently never fires. F1 above is a concrete second instance.

**Suggested fix:** Add a tiny wired-callers registration:

```js
// In each caller file:
CrmAutomation.markWired('lead_status_change');
// In engine.js:
var WIRED_TRIGGERS = {};
function markWired(t) { WIRED_TRIGGERS[t] = true; }
async function evaluate(triggerType, …) {
  if (!WIRED_TRIGGERS[triggerType]) console.warn(
    'CrmAutomation: trigger ' + triggerType +
    ' has no markWired() registration — was the wiring removed?');
  // … existing logic
}
```

This catches the OPPOSITE bug too: someone removes the wiring but
keeps the trigger map entry → next session's `evaluate` call
warns in console.

**Not urgent:** the executor proposal in EXECUTION_REPORT §"2
proposals" covers the static side via a script; this would cover
the runtime side. Either or both.

---

## F3 — `terminology drift`: status column shows lead.status enum, not terms_approved — INFO

**Severity:** INFO (UX, cosmetic)
**Location:** `modules/crm/crm-incoming-tab.js` and the
"לידים נכנסים" table — the "סטטוס" column shows label "לא אישר
תקנון" for `status='pending_terms'`. After Daniel approves terms
manually, the row's terms_approved boolean flips to true but the
**status enum stays at 'pending_terms'** until the תפעולת transfer
flips it to 'waiting'.

**Description:** During QA I saw the row continue to show "לא
אישר תקנון" right after I clicked "סמן כאישר תקנון". Initially
looked like a regression; in fact it's correct — the status
enum and the terms_approved boolean are independent, and the
"אשר ✓" button is what flips status by calling
`transferLeadToTier2`.

**Suggested:** Either (a) when terms_approved is true and
status is still 'pending_terms', display a different label like
"אישר תקנון — מוכן להעברה", OR (b) change `manualLead`'s default
status to a new "terms_approved_pending_transfer" sub-state. (a)
is the lighter touch.

**Not urgent:** clarified by the QA flow above; mostly a
documentation/naming issue.

---

## F4 — Toast "1 נכשלו" mislabels rejected as failed — LOW

**Severity:** LOW (UX, mis-categorization)
**Location:** `modules/crm/crm-confirm-send.js:approveAndSend`
end-of-flow toast (line 247-249).

**Description:** After this SPEC's QA, the toast read "נשלחו
1, 1 נכשלו" — but the underlying `crm_message_log` row was
status=`rejected`, not `failed`. The toast aggregates `failed`
+ `rejected` because `r.value.ok === false` returns the same
shape for both ("phone_not_allowed" → ok=false; make_webhook_500
→ ok=false). The history UI shows the categories correctly
because it reads message_log directly; the toast does not.

**Suggested fix:** In approveAndSend, also count rejected
specifically by checking `r.value.error === 'phone_not_allowed'`
(or read `r.value.ok=false` cases and split). Then the toast
becomes "נשלחו 1 · 1 נדחו" instead of "1 נכשלו" when nothing
truly failed. ~5 lines.

**Not urgent:** the run-history view is the authoritative one
for triage.
