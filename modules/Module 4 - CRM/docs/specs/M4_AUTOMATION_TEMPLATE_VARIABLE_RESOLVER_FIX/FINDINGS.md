# FINDINGS — M4_AUTOMATION_TEMPLATE_VARIABLE_RESOLVER_FIX

## F-1 — Currency-symbol format choice (intentional behavior preservation)
**Severity:** INFO
**Status:** RESOLVED (documented + decided in SPEC.md §2.2)

Brief said `₪N` format. Investigation (M4_RESOLVER_GAP_VERIFICATION) found all 7 active Prizma templates already append `₪` AFTER the placeholder. Returning `₪50` would produce `₪50 ₪` double-symbol regression. Chose raw number format. Bypass: explicit Daniel-style decision documented in SPEC.

## F-2 — `crm_automation_runs.sent_count` still under-reports
**Severity:** LOW
**Status:** OPEN (separate SPEC needed)

Post-fix verification: run row `5163bd2d` shows `total_recipients=2, rejected_count=0, sent_count=0`. The 2 messages WERE sent (per `crm_message_log` rows status='sent'). But the run row's `sent_count` is 0 because AE writes the run row at end of evaluation (when items go to queue), not at end of dispatch (when send-message marks log row sent). This is the same Finding 1.5 from the original QA report — out of scope here, but now `total_recipients` is correct so the bug is narrower. Recommend `M4_AUTOMATION_RUNS_METRIC_AUDIT` (Priority 5 from QA).

## F-3 — Shape-B trigger_data legacy reliance dropped (graceful)
**Severity:** INFO
**Status:** RESOLVED (in this SPEC)

Pre-fix AE behavior: if `triggerData.event` was provided (browser path), AE used it directly without re-fetch. Post-fix: AE always re-fetches when eventId is provided. Extra DB query is negligible (single row by PK). Eliminates the failure mode where browser passed an incomplete `event` object and AE silently populated empty strings for missing columns.

## F-4 — Template body wording for currency redundancy
**Severity:** LOW (UX nit)
**Status:** OPEN

Templates like `דמי שריון %event_deposit_amount% ₪` work correctly now. A FUTURE polish SPEC could remove the trailing ` ₪` from templates and have the variable carry the symbol. That would centralize currency to one place (variable resolver) instead of N templates. But requires synchronized changes to ~7 template bodies + variable format. Not urgent.

## F-5 — Format-divergence carry-over (out of scope, observed)
**Severity:** LOW
**Status:** OPEN — observation only

Q4 of the verification investigation noted `event_date` format differs between AE (`dd.mm.yyyy` per `formatDate`) and SM (`dd/mm/yyyy` per inline). `event_time` similarly differs. Production traffic doesn't notice today because AE substitution wins (its values reach the queue body). But if templates ever rely on a specific format, the difference could matter. Recommend a SPEC to consolidate format helpers in `_shared/event-variables.ts` — same pattern as SPEC 3 just established.
