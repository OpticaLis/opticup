# ACTIVATION PROMPT — P5_V2_REBUILD_RUNG1_PLUMBING

> **Paste the block below into a fresh Claude Code session to launch the executor on this Rung.**
> **Audience:** opticup-executor (Bounded Autonomy mode).
> **Expected runtime:** 60–90 minutes including QA.
> **Pre-flight ask Daniel:** the `payment_links["50"]` URL string for the demo tenant (one short URL).

---

You are opticup-executor for Module 4 — CRM. Execute SPEC P5_V2_REBUILD_RUNG1_PLUMBING under Bounded Autonomy.

**SPEC:** `modules/Module 4 - CRM/go-live/specs/P5_V2_REBUILD_RUNG1_PLUMBING/SPEC.md`

**Context (read before starting):**
- Parent SPEC: `modules/Module 4 - CRM/go-live/specs/P5_V2_TEMPLATE_REBUILD/SPEC.md` (the multi-rung umbrella).
- The 22 V2 message bodies you'll load are LOCKED in `campaigns/supersale/MESSAGES_V2/`. Do NOT edit any of them.
- Copy rationale: `roles/campaign-overseer/COPY_DECISIONS_LOG.md` (read-only — do NOT re-litigate copy).
- Variable-wiring checklist: `campaigns/supersale/MESSAGES_V2/NEW_SYSTEM_VARIABLES_REQUIRED.md`.

**Critical Daniel directive (Pattern P12):** when `tenants.payment_links[<fee>]` is missing for a template that references `%payment_url_<fee>%`, the send MUST fail loudly. No fallback URL, no silent substitution. "עדיף לא לשלוח מאשר לשלוח שבור."

**Pre-flight blocker:** before running criterion #11 (seed `payment_links["50"]`), confirm with Daniel the exact URL string to use for demo. Do NOT proceed with a placeholder URL.

**Phones:** all test sends use `+972537889878`, `+972503348349`, or `+972507168471`. Any other phone in any test = STOP IMMEDIATELY.

**Out of scope (do NOT touch in this Rung):**
- `crm_automation_rules` — that's Rung 2.
- `register_lead_to_event` RPC — that's Rung 3.
- The 22 V2 file copy — LOCKED.
- Production tenant (Prizma) — demo only.

**Deliverables at close:**
1. All 23 success criteria pass.
2. EXECUTION_REPORT.md in this folder with: pre-state baseline, per-criterion verify result, final commit hashes, any deviations.
3. FINDINGS.md if you discovered anything beyond the SPEC scope worth a future SPEC.
4. Clean repo, develop branch, integrity gate passing.

Start by reading SPEC.md in full, then run your standard Step 1 pre-flight (CLAUDE.md First Action protocol + Step 1.5 cross-reference check + STATE_SNAPSHOT capture). Report progress at the natural seams in §9 Commit Plan.
