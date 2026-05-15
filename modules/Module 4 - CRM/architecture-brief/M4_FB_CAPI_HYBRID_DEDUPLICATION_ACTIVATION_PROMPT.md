# M4_FB_CAPI_HYBRID_DEDUPLICATION — Activation Prompt

Paste the block below into a fresh Claude Code chat to run the Full-Auto Pipeline end-to-end.

---

```
Run the Full-Auto Pipeline for M4_FB_CAPI_HYBRID_DEDUPLICATION.

Brief: modules/Module 4 - CRM/architecture-brief/M4_FB_CAPI_HYBRID_DEDUPLICATION_BRIEF.md

Load opticup-strategic (Foreman) first to author the SPEC at:
modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_HYBRID_DEDUPLICATION/SPEC.md

Then chain to opticup-executor, opticup-reviewer, opticup-localhost-tester, and back to opticup-strategic (Foreman closure with FOREMAN_REVIEW.md + 4 skill improvement proposals).

MODEL RECOMMENDATION (per STOREFRONT_PUBLIC_DATA_LAYER session lesson):
- Foreman (SPEC authoring): Opus.
- Executor (heavy EF + SQL + security tokens): Sonnet (claude-sonnet-4-20250514). Mechanical work; lower content-filter false-positive rate on security-vocabulary phases; cheaper.
- Reviewer + Localhost-Tester: default model.
- Foreman closure: Opus.

KEY CONSTRAINTS FROM BRIEF:
- Lead events ONLY in v1. Purchase events deferred to follow-up SPEC.
- Hybrid Pixel + CAPI with shared event_id (UUID generated at storefront submit, stored on crm_leads.fb_event_id, used by both browser pixel on thank-you-page AND server-side EF).
- Queue + pg_cron consumer pattern (mirrors crm_message_queue + dispatch-queue). NOT direct EF invocation from DB trigger.
- New EF `fb-capi-dispatch` (verify_jwt=false, Origin-allowlisted — same posture as lead-intake + submit-lead).
- Advanced matching: em (sha256 email) + ph (sha256 E.164 phone) + cookies (_fbp + _fbc).
- Iron Rule 32: Destructive Ops declared = 1 (retire Make scenario 8542928 at SPEC end).
- tenants.fb_capi_token — Prizma populated, demo sandbox-or-skip per D7.
- D5: pixel validation gap reporting is a queue-status side-effect, NOT a separate dashboard SPEC. Substrate only.
- D6: token stays in tenants.fb_capi_token (existing column). No new secrets table.

STOP TRIGGERS (over and above Brief §8):
- If storefront-repo changes are needed, halt and escalate: the storefront sibling repo (opticalis/opticup-storefront) requires its own PR per its CLAUDE.md.
- If Meta Test Events check returns dedup failure (2 events counted not 1), halt and escalate.
- If MCP cannot retire scenario 8542928 (delete or archive), halt and escalate.

DEMO TENANT POLICY:
- Daniel may supply a sandbox CAPI token at SPEC dispatch time. If not supplied → demo's CAPI dispatch is a no-op with status='skipped_no_token'. Log + continue.

VERIFICATION GATES:
- Smoke 7/7 must remain GREEN.
- Iron Rule 31 (integrity gate) and Iron Rule 32 (destructive ops gate) must pass at every commit boundary.
- End-to-end test on demo: form submit → crm_leads row with fb_event_id → queue row → cron tick → EF invoked → Meta Test Events shows dedup'd event.
- Pre-merge validation: all 14 success criteria GREEN before SPEC close.

POST-SPEC FOLLOW-UPS (do NOT execute here, just queue in OPEN_TASKS):
- M4_FB_CAPI_PURCHASE_EVENTS — after 7-day Lead stability (≥ 200 dispatched events validated against Meta Events Manager).
- P2.2 reduced scope: one-page dashboard query for pixel validation gap (substrate ships here, dashboard later).

When done, surface a Hebrew one-line status to Daniel.
```

---

*End of Activation Prompt. The Brief contains the full Locked Decisions (D1-D7), Success Criteria (1-14), Stop-Triggers, Rollback Plan, and Commit Plan.*
