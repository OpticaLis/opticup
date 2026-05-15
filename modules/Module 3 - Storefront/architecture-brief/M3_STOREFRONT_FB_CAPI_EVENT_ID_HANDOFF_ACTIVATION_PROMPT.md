# M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF — Activation Prompt

Paste the block below into a fresh Claude Code chat to run the Full-Auto Pipeline end-to-end.

**Important:** This SPEC targets the **sibling repo** `opticalis/opticup-storefront`. Code changes land there. ERP-side changes are limited to OPEN_TASKS / MASTER_ROADMAP / memory file updates.

---

```
Run the Full-Auto Pipeline for M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF.

Brief: modules/Module 3 - Storefront/architecture-brief/M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF_BRIEF.md

SPEC location (ERP repo per CLAUDE.md §7 phase-label ownership):
modules/Module 3 - Storefront/docs/specs/M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF/SPEC.md

CODE CHANGES LAND IN SIBLING REPO: opticalis/opticup-storefront, branch develop.
ERP REPO IS READ-ONLY for this SPEC except for closeout doc updates (OPEN_TASKS / MASTER_ROADMAP / memory / M4 SPEC FOREMAN_REVIEW addendum).

Load opticup-strategic (Foreman) first to author the SPEC. Then chain to opticup-executor, opticup-reviewer, opticup-localhost-tester, and back to opticup-strategic (Foreman closure with FOREMAN_REVIEW.md + 4 skill improvement proposals).

MODEL RECOMMENDATION:
- Foreman: Opus.
- Executor: Sonnet (claude-sonnet-4-20250514). Mechanical TypeScript/Astro edits across 2 forms + thank-you-page; cheaper + faster.
- Reviewer + Localhost-Tester: default model.
- Foreman closure: Opus.

KEY CONSTRAINTS FROM BRIEF:
- Per Iron Rule 32: Destructive Operations declared = 0. All changes additive.
- Two forms in scope: supersale (HE/EN/RU) + NotifyMe.astro. If pre-flight finds a 3rd lead-creating form → STOP and escalate.
- UUID v4 via crypto.randomUUID() (D1).
- Hand-off via URL param `?fbe=<uuid>` (D2 — chosen over sessionStorage for robustness).
- Pixel firing: fbq('track', 'Lead', {}, {eventID: uuid}) — 4th arg eventID (D3).
- Graceful degradation: when no UUID, pixel fires as today without eventID (D5). Zero regression.
- ERP `lead-intake` EF v28 is already forward-compatible — no coordinated cutover needed (D6).
- Storefront repo Iron Rules 24-30 apply (RTL, mobile-first, Views/RPCs only, etc.).
- Storefront-side branch model: develop only; main is Daniel-only merge after QA (per memory `feedback_storefront_branch_model.md`).

PRE-FLIGHT REQUIRED:
- Enumerate ALL lead-creating forms in opticup-storefront. Confirm only 2 exist (supersale + NotifyMe). If more found → STOP and escalate.
- Verify `crypto.randomUUID()` is available given storefront's browserslist config.
- Inspect storefront's current pixel firing implementation (driven by storefront_config.analytics.pixel_events config). Confirm the hand-off can wire into that single firing path. If a hardcoded fbq call exists elsewhere → STOP and escalate.

STOP TRIGGERS (over and above Brief §8):
- ERP `crm_leads.fb_event_id` NOT populated after a demo test submission (wiring bug).
- Meta Test Events validation shows 2 events instead of 1 dedup'd event.
- Storefront PR rejected by branch protection (must work in develop only).
- Iron Rules 24-30 violated.

VERIFICATION GATES:
- Storefront smoke must remain GREEN.
- Demo E2E test on opticup-storefront-demo.vercel.app/supersale/: form submit → ERP `crm_leads.fb_event_id` populated → `crm_capi_dispatch_queue` row matches → `fb_pixel_fired_at` set after pixel fires on thank-you page.
- Network panel evidence captured: POST body has `fb_event_id`; pixel call has `eid=<uuid>` parameter.
- Meta Test Events validation: ONE dedup'd event, not two.

POST-SPEC DELIVERABLE:
- OPEN_TASKS.md: mark P2.1 as 🟢 fully closed, with note: "End-to-end Meta dispatch contingent on Daniel populating Prizma `tenants.fb_capi_token`."
- MASTER_ROADMAP §3: update P2.1 row.
- Memory file `project_fb_capi_p21_state.md`: update to reflect storefront completion.
- M4 SPEC FOREMAN_REVIEW.md addendum: note that downstream SPEC completed.

When done, surface a Hebrew one-line status to Daniel.
```

---

*End of Activation Prompt. The Brief contains the full Locked Decisions (D1-D7), Success Criteria (1-15), Stop-Triggers, Rollback Plan, and Commit Plan.*
