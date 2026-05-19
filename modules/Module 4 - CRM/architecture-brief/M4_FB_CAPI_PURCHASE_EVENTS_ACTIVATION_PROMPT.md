# M4_FB_CAPI_PURCHASE_EVENTS — Activation Prompt

Paste the block below into a fresh Claude Code chat.

---

```
Run the Full-Auto Pipeline for M4_FB_CAPI_PURCHASE_EVENTS.

Brief: modules/Module 4 - CRM/architecture-brief/M4_FB_CAPI_PURCHASE_EVENTS_BRIEF.md

SPEC location:
modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_PURCHASE_EVENTS/SPEC.md

MANDATORY PRE-FLIGHT READING (before Foreman authors SPEC):
1. The Brief above — read in FULL, including §4 Cross-Module Safety Audit.
2. roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md — Iron Rule 35 boundaries.
3. modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_HYBRID_DEDUPLICATION/SPEC.md — P2.1 substrate reference (existing event flow + Meta API headers).
4. modules/Module 4 - CRM/docs/db-schema.sql — confirm `crm_event_attendees.purchase_amount` + `payment_status` columns + status vocabulary.
5. supabase/functions/fb-capi-dispatch/index.ts — existing EF you're modifying.
6. docs/FB_CAPI.md — current canonical reference (you'll extend it).

MANDATORY PRE-FLIGHT DB PROBES:
- Verify `crm_event_attendees.purchase_amount` exists. Type should be numeric/integer. If not found → STOP.
- Verify `crm_statuses` has rows for tenant=prizma with `key` IN ('attended', 'purchased'). If statuses use different keys (e.g., 'attended_paid' or 'הגיע') → STOP and escalate (need Daniel's status mapping).
- Verify `crm_capi_dispatch_queue` current schema — confirm NO `event_type` column exists (Iron Rule 21 — we don't create duplicates).
- Verify existing triggers on `crm_event_attendees` — list them. If there's already a CAPI-related trigger → STOP.

Load opticup-strategic (Foreman) first to author the SPEC. Then chain to opticup-executor, opticup-reviewer, opticup-localhost-tester, and back to opticup-strategic (Foreman closure).

MODEL RECOMMENDATION:
- Foreman: Opus.
- Executor: Sonnet (claude-sonnet-4-20250514). DB migration + EF + small JS. Mechanical work, security-vocab-light.
- Reviewer + Localhost-Tester: default.
- Foreman closure: Opus.

KEY CONSTRAINTS FROM BRIEF:
- Per Iron Rule 32: Destructive Operations declared = 0 (additive migration only — new column, new constraint, new triggers).
- Cross-Module Safety Audit §4 is BINDING. NO touch on §4.2 tables, §4.4 EFs, §4.6 triggers.
- Per Iron Rule 35: NO new template placeholder, NO new automation rule action_type, NO new trigger type slug.
- Per Iron Rule 18: new unique constraint `(tenant_id, lead_id, event_type)` MUST be tenant-scoped (it is).
- Per Iron Rule 21: existing `(tenant_id, lead_id)` unique constraint REPLACED by new tighter `(tenant_id, lead_id, event_type)`. Drop the old in the same migration. Document explicitly.
- Per Iron Rule 22: EF `.eq('tenant_id', ...)` defense-in-depth on all DB calls.
- D1: DB triggers, not application code. Dual-path bug from last week's M4 incident teaches: DON'T add a parallel application call.
- D5: purchase_amount = 0 OR NULL → DO NOT send Purchase event.
- D6: event_id derived per (lead_id, event_type) — stable hash; same dedup approach as P2.1 Lead.
- D7: NO historical backfill. Forward-only.
- D8: NO storefront browser-pixel work in this SPEC.

STOP TRIGGERS (over and above Brief §8):
- Pre-flight probe finds different status vocabulary than Brief assumed.
- Migration would fail because old unique constraint can't be dropped (data conflict).
- EF deploy returns InternalServerErrorException (OPEN-021 fallback to CLI as documented).
- Demo E2E test Meta Test Events shows wrong event_name or missing custom_data.value.
- Iron Rule 31 integrity gate fails.
- Smoke regresses.

VERIFICATION GATES:
- Smoke 7/7 PASS.
- Demo E2E: 3 attendees, one per new event type, all reach Meta Test Events successfully.
- Idempotency: re-flipping status to same value does NOT enqueue a duplicate.
- Reviewer confirms §4 Cross-Module Safety Audit holds — zero touches outside Brief's authorized list.

POST-SPEC DELIVERABLES:
- New migration file in supabase/migrations/.
- Modified supabase/functions/fb-capi-dispatch/index.ts.
- Modified docs/FB_CAPI.md.
- Optionally modified modules/crm/crm-pixel-gap-tile.js (small extension to show counts per event_type).
- Modified roles/site-overseer/knowledge-build/funnel-q3/M4_PIXEL_VALIDATION_GAP_QUERY.md (reflect multi-event-type queries).
- FOREMAN_REVIEW.md.

POST-SPEC MEMORY UPDATE:
- Update project_fb_capi_p21_state.md — mark Purchase events live + note Meta now receives full funnel.

When done, surface a Hebrew one-line status to Daniel.
```

---

*End of Activation Prompt. The Brief contains the full Cross-Module Safety Audit (§4), Locked Decisions (D1-D8), Success Criteria (1-12), Stop-Triggers, and Rollback Plan.*
