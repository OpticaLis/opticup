# Proposal — Fast-Path Registry Check in SPEC Authoring Protocol

**Origin:** D2 diagnostic task (Tier C.3, OVERNIGHT_BUNDLE_2026_05_14), per FUNNEL_ROADMAP.md Q10 decision (2026-05-14).
**Status:** PROPOSAL — not yet applied. Foreman reviews and folds into SKILL.md at next module close ceremony or when authoring the next CRM/automation SPEC.
**Target section of SKILL.md:** "SPEC Authoring Protocol" — pre-authoring checklist.

---

## What

Add one line to the SPEC-authoring pre-flight checklist (the bullet list executed before drafting §4 design): **"If the SPEC touches `crm_automation_rules`, `automation-engine`, `send-message`, `lead-intake`, `event-register`, or `quick-register` → read `roles/site-overseer/knowledge-build/KNOWLEDGE_MAP.md` §Layer 4 → Fast-Path Automation Registry FIRST. Identify which fast-path (if any) the SPEC touches and apply the 5-criterion decision rule + checklist documented there."**

## Why

On 2026-05-14 the Site Overseer discovered (via the 10-Q review) that 3 EFs bypass `crm_automation_rules` entirely (FP-1 `event_invite_new`, FP-2 `event_registration_confirmation`, FP-3 `event_coupon_delivery`). These fast-paths are intentional (Q10) but invisible to anyone who only reads `crm_automation_rules` SELECTs to "understand automations." Any future SPEC that adds, modifies, or migrates automation behavior risks: (a) duplicating a fast-path as a rule (double-fire), (b) refactoring a rule path while the fast-path remains and silently keeps firing, or (c) adding a 4th undocumented fast-path that future Site Overseer sessions have to rediscover.

## How (concrete change to SKILL.md)

Insert after the existing "Read GLOBAL_MAP + GLOBAL_SCHEMA" line in §SPEC Authoring Protocol:

> - **Fast-Path Registry check (automation/messaging SPECs only).** If the SPEC's file scope includes any of: `supabase/functions/{lead-intake,event-register,quick-register,send-message,automation-engine}/`, `modules/crm/crm-automation-engine.js`, `crm_automation_rules`, `crm_event_attendees`, `crm_lead_touchpoints` — open `roles/site-overseer/knowledge-build/KNOWLEDGE_MAP.md` and locate the "Fast-Path Automation Registry" subsection of Layer 4. If the SPEC adds / removes / modifies any fast-path, the SPEC must update the registry table in the same commit + document compliance with the 5-criterion decision rule in §4.

## Impact if applied

Prevents the "I refactored the automation engine and broke an EF I didn't know existed" class of regression. Adds <30 seconds of read overhead per qualifying SPEC. Zero impact on non-automation SPECs.
