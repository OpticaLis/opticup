# Activation Prompt — M4_CAMPAIGNS_V2_METRICS_AND_DATERANGE

**Paste the block below into a fresh Claude Code session loaded with the `opticup-strategic` skill.**

---

```
You are the Foreman for Optic Up. Load the opticup-strategic skill if not already loaded, then perform a SPEC review.

CONTEXT
=======
The Campaign Overseer (a Tier-3 specialist agent that runs in Cowork) drafted a SPEC for v2 of the CRM Campaigns screen. It adds 5 missing data points (days running, ROAS, impressions/clicks/CTR, city/audience, date-range selector) on top of the M4_CAMPAIGNS_SCREEN that closed on 2026-04-26.

This is a RECOMMENDATION from the Overseer, not an executor-ready plan. Your job is to review, validate, refine, split into Rungs, and produce an executor-ready set of activation prompts.

SPEC LOCATION
=============
modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_V2_METRICS_AND_DATERANGE/SPEC.md

Read the SPEC fully before doing anything else.

WHAT YOU MUST DO
================
1. Read the SPEC end to end.
2. Read the closed predecessor SPEC at modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_SCREEN/SPEC.md to understand existing architecture.
3. Verify the SPEC's evidence claims against the current live state:
   - schema of crm_facebook_campaigns + crm_ad_spend (information_schema)
   - current line counts of modules/crm/crm-campaigns.js + crm-campaigns-detail.js + crm-unit-economics-modal.js
   - Make scenario 9126542 blueprint (read via MCP scenarios_get)
   - whether v_crm_campaign_performance is referenced in any active code (grep across modules/**/*.js + *.html + *.astro + supabase/functions/**/*.ts)
4. Resolve §5.7 Open Decision — choose Path X1 (parse city from name), X2 (pull adsets via separate API call), or X3 (defer city/audience to a separate post-cutover SPEC). The Overseer recommends X3. Confirm or override.
5. Validate §5.3 Path A (function vs materialized view) — confirm the function approach is correct given the live data volumes.
6. Verify §5.6 file-size assumption — if crm-campaigns.js is already ≥300 lines, plan the split BEFORE the executor starts.
7. SPLIT INTO RUNGS. Suggested split (override if you have a better one):
   - Rung 1: Schema additions (start_time/city/audience_label on crm_facebook_campaigns; impressions/clicks on crm_ad_spend) + function get_campaign_performance — pure DB.
   - Rung 2: Edge Function facebook-campaigns-sync expanded to accept new fields (additive) + Make scenario blueprint update (3 new fields in HTTP body).
   - Rung 3: UI — date-range selector + ROAS KPI card + 3 new table columns + drill-down updates.
   Each Rung gets its own activation prompt for the executor.
8. Write FOREMAN_REVIEW.md at modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_V2_METRICS_AND_DATERANGE/FOREMAN_REVIEW.md with:
   - Decision on §5.7 (X1/X2/X3 + reasoning)
   - Rung breakdown (which acceptance criteria from §6 belong to which Rung)
   - Any deltas you'd make to the SPEC (don't rewrite the SPEC; record the deltas in the review)
   - 2 concrete proposals for how the opticup-strategic skill itself should improve, harvested from this SPEC's authoring data (per opticup-strategic SKILL self-improvement mandate)
9. Write per-Rung activation prompts at:
   - modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_V2_METRICS_AND_DATERANGE/RUNG_1_ACTIVATION_PROMPT.md
   - .../RUNG_2_ACTIVATION_PROMPT.md
   - .../RUNG_3_ACTIVATION_PROMPT.md
   Each must be a fully self-contained prompt the executor can paste with zero extra context.

OPERATING RULES
===============
- Iron Rules 1-23 from CLAUDE.md apply.
- This is the ERP repo (opticalis/opticup), not the storefront.
- Pattern 19 (short responses, one question at a time) when reporting back to Daniel.
- Hebrew with Daniel; English in artifacts (FOREMAN_REVIEW.md, RUNG prompts).
- The cutover (Sat/Sun 2026-05-02 or 03) is imminent — Rung 1 + 2 may need to land before cutover; Rung 3 may defer post-cutover. Recommend the order.

WHEN COMPLETE
=============
Report to Daniel in Hebrew with:
- Confirmation FOREMAN_REVIEW.md is written.
- Summary of §5.7 decision.
- Rung breakdown (1-line per Rung: what it ships).
- Pre-cutover vs post-cutover recommendation per Rung.
- Three artifacts to paste next: RUNG_1_ACTIVATION_PROMPT.md, RUNG_2_, RUNG_3_.

Do NOT execute any of the Rungs yourself. Your job ends when the activation prompts are written and Daniel has read your review.
```

---

## How Daniel runs this

1. Open Claude Code on the Windows desktop, in `C:\Users\User\opticup`.
2. Ensure the `opticup-strategic` skill is loaded (`/skills` to verify).
3. Paste the entire fenced block above (between the triple-backticks) as a new message.
4. Strategic will read the SPEC, validate against live state, write FOREMAN_REVIEW.md + 3 RUNG prompts.
5. Daniel reviews FOREMAN_REVIEW.md, then triggers Rung 1 in a fresh Claude Code session with the `opticup-executor` skill loaded.
6. After Rung 1 closes, Rung 2; after Rung 2, Rung 3.
