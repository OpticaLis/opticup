# M3_FUNNEL_PIXEL_BACKWIRE — Activation Prompt

Paste the block below into a fresh Claude Code chat to run the Full-Auto Pipeline end-to-end.

**Cross-repo SPEC:** ERP repo for new EF; sibling `opticup-storefront` for the POST call.

---

```
Run the Full-Auto Pipeline for M3_FUNNEL_PIXEL_BACKWIRE.

Brief: modules/Module 3 - Storefront/architecture-brief/M3_FUNNEL_PIXEL_BACKWIRE_BRIEF.md

SPEC location (ERP repo per CLAUDE.md §7 phase-label ownership):
modules/Module 3 - Storefront/docs/specs/M3_FUNNEL_PIXEL_BACKWIRE/SPEC.md

CODE CHANGES LAND IN BOTH REPOS:
- ERP (opticalis/opticup, develop): new EF supabase/functions/pixel-fired/index.ts + docs update.
- Storefront (opticalis/opticup-storefront, develop): POST call in thank-you-page templates (HE/EN/RU + multi variants) + docs.

Load opticup-strategic (Foreman) first to author the SPEC. Then chain to opticup-executor, opticup-reviewer, opticup-localhost-tester, and back to opticup-strategic (Foreman closure with FOREMAN_REVIEW.md + 4 skill improvement proposals + memory update for project_fb_capi_p21_state.md).

MODEL RECOMMENDATION:
- Foreman: Opus.
- Executor: Sonnet (claude-sonnet-4-20250514). Mechanical EF + tiny storefront edit.
- Reviewer + Localhost-Tester: default model.
- Foreman closure: Opus.

KEY CONSTRAINTS FROM BRIEF:
- Per Iron Rule 32: Destructive Operations declared = 0. All changes additive.
- EF `pixel-fired` ≤ 100 lines; if scope creeps → executor pre-flight problem.
- EF verify_jwt=false, Origin-allowlisted to same domains as lead-intake (pre-flight confirms canonical allowlist).
- POST body {event_id: UUID, tenant_id: UUID}. Validation + 400 on bad UUID + 403 on bad origin.
- UPDATE crm_leads SET fb_pixel_fired_at = NOW() WHERE fb_event_id = $1 AND tenant_id = $2 AND fb_pixel_fired_at IS NULL (D4 idempotent).
- Iron Rule 22 defense-in-depth: explicit .eq('tenant_id', ...) even though RLS enforces.
- Iron Rule 23: no secrets in EF code; service_role key from env.
- Storefront fetch(): keepalive: true (D2). Fire-and-forget (D3). No await, no error UI.
- If `fbe` URL param absent (graceful degradation), DO NOT POST.
- D6: NO crm_message_log row written. console.log only in EF.
- D7: if storefront PR blocked, ERP EF can ship alone — do NOT delay.

PRE-FLIGHT REQUIRED:
- Iron Rule 21: confirm no existing pixel-fire back-wire EF or RPC exists in this repo.
- Storefront repo: find existing tenant_id derivation on thank-you page (D5). If none → STOP and escalate.
- Storefront repo: enumerate all thank-you page variants (`/successfulsupersale/` HE/EN/RU + `/successfulmulti/`). If only some have pixel firing today → align scope.

STOP TRIGGERS (over and above Brief §8):
- Existing pixel-fire back-wire mechanism found (Rule 21 violation).
- Storefront thank-you page lacks derivable tenant_id.
- More than one thank-you-page firing path exists (legacy + new).
- POST fails E2E test against demo.
- Iron Rule 31 gate fails.
- Smoke regresses.

VERIFICATION GATES:
- Smoke 7/7 PASS both repos.
- Iron Rule 31 integrity gate passes.
- Iron Rule 32 destructive ops gate passes (zero declared, zero performed).
- Demo E2E: form submit → thank-you page → `crm_leads.fb_event_id` populated → `crm_leads.fb_pixel_fired_at` populated within 5s.
- Idempotency test: second POST with same event_id returns updated=0.

POST-SPEC DELIVERABLES:
- docs/FB_CAPI.md updated — back-wire marked IMPLEMENTED.
- roles/site-overseer/knowledge-build/funnel-q3/M4_PIXEL_VALIDATION_GAP_QUERY.md §4 updated — caveat banner removed from P2.2b dependency.
- Memory project_fb_capi_p21_state.md updated — back-wire shipped.
- OPEN_TASKS.md updated — P2.2 now unblocked for dashboard build (P2.2b SPEC stub: M4_PIXEL_VALIDATION_GAP_DASHBOARD).

When done, surface a Hebrew one-line status to Daniel.
```

---

*End of Activation Prompt. The Brief contains the full Locked Decisions (D1-D7), Success Criteria (1-15), Stop-Triggers, and Rollback Plan.*
