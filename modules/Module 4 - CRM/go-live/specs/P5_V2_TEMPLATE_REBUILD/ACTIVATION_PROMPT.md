# ACTIVATION PROMPT — P5_V2_TEMPLATE_REBUILD

> **Purpose:** the prompt to paste into a fresh `opticup-strategic` (Foreman) chat to start work on this SPEC.
> **Audience:** Daniel (paste this into Claude Code), or directly to the Foreman.
> **Output expected:** Foreman reads SPEC.md, makes the 6 Foreman Decisions in §5, then authors per-Rung executor sub-SPECs as separate folders under this same `P5_V2_TEMPLATE_REBUILD/` (or sibling folders if Foreman prefers).

---

## Prompt to paste

```
You are opticup-strategic (the Foreman) for Optic Up Module 4 — CRM.

A pre-cutover SPEC has been routed to you for splitting + execution authoring.

LOCATION:
modules/Module 4 - CRM/go-live/specs/P5_V2_TEMPLATE_REBUILD/SPEC.md

CONTEXT:
The Campaign Overseer (Cowork session 2026-04-28) closed 9 V2 emails + 9 V2 SMS
templates as canon-compliant copy. The files are in
campaigns/supersale/MESSAGES_V2/. They are not yet in the database, and the
6 automation rules that fire them are not yet wired. M4 P7 cutover is
2026-05-03 (5 days away).

YOUR TASK:

1. Read these in order:
   - modules/Module 4 - CRM/go-live/specs/P5_V2_TEMPLATE_REBUILD/SPEC.md (the SPEC)
   - campaigns/supersale/MESSAGES_V2/NEW_SYSTEM_VARIABLES_REQUIRED.md (system wiring checklist)
   - __LAUNCH_PLAN_DRAFT__/campaign-overseer/COPY_DECISIONS_LOG.md (copy rationale; do NOT re-litigate)
   - modules/Module 4 - CRM/go-live/seed-templates-demo.sql (existing seed)
   - The 18 V2 files in campaigns/supersale/MESSAGES_V2/

2. Resolve the 6 Foreman Decisions in SPEC §5. For decision 4 (manual-move
   notification), surface to Daniel before authoring Rung 4 — do not assume.

3. Investigate `crm_automation_rules` table state (Decision #2). If it doesn't
   exist or has incompatible shape, plan that work into Rung 3.

4. Author per-Rung executor sub-SPECs (recommended split in SPEC §3 + §5):
   - P5_V2_REBUILD_RUNG1_SCHEMA
   - P5_V2_REBUILD_RUNG2_TEMPLATES
   - P5_V2_REBUILD_RUNG3_AUTOMATION
   - P5_V2_REBUILD_RUNG4_FEATURES (or defer post-cutover)

   Each sub-SPEC follows the standard folder-per-SPEC protocol with its own
   SPEC.md + activation prompt for the executor.

5. Sequence sub-SPECs so Rungs 1+2 land BEFORE 2026-05-03 cutover. Rungs 3+4
   may land same day or slot a day before depending on demo QA bandwidth.

6. After authoring each sub-SPEC, harvest 2 self-improvement proposals from
   this SPEC's gaps for your next FOREMAN_REVIEW (per opticup-strategic
   self-improvement mandate).

DO NOT:
- Re-litigate copy decisions. The 18 V2 files are LOCKED. If you find a copy
  issue, surface it to Daniel + Cowork Overseer; do NOT silently change copy.
- Migrate T10. It's explicitly excluded.
- Touch production. This work is demo-only until the M4 P7 cutover SPEC
  promotes it.
- Author all four Rungs as one giant SPEC. The Rungs have different risk
  profiles and the executor benefits from independent execution windows.

START by reading the SPEC at:
modules/Module 4 - CRM/go-live/specs/P5_V2_TEMPLATE_REBUILD/SPEC.md

When you're ready, report back with:
(a) your answers to the 6 Foreman Decisions,
(b) the planned sub-SPEC list with timeline,
(c) any blockers / open questions for Daniel.
```

---

*Activation prompt authored 2026-04-28 alongside SPEC.md. Paste into a fresh Claude Code session loaded with the opticup-strategic skill.*
