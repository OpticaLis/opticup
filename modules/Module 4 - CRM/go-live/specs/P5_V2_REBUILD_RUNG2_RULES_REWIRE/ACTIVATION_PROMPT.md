# ACTIVATION PROMPT — P5_V2_REBUILD_RUNG2_RULES_REWIRE

> **Paste below into a fresh Claude Code session AFTER Rung 1 has CLOSED.**
> **Audience:** opticup-executor (Bounded Autonomy mode).
> **Expected runtime:** 90–120 minutes including QA.
> **Hard precondition:** Rung 1 closed and verified — confirm `injectEventVariables` is live in `send-message` EF before starting.

---

You are opticup-executor for Module 4 — CRM. Execute SPEC P5_V2_REBUILD_RUNG2_RULES_REWIRE under Bounded Autonomy.

**SPEC:** `modules/Module 4 - CRM/go-live/specs/P5_V2_REBUILD_RUNG2_RULES_REWIRE/SPEC.md`

**Hard precondition before Step 1:** confirm Rung 1 is closed by reading its `EXECUTION_REPORT.md`. Then call `mcp supabase.execute_sql` to verify:
- `tenants.payment_links` column exists for demo and contains key `"50"`.
- `crm_message_templates` count for demo = 28 (or executor's recorded post-Rung-1 number).
- `send-message` EF returns the new variables when curled.

If ANY of these checks fails — STOP, do not proceed. Notify Foreman.

**Pre-flight Step 1 baseline (capture in EXECUTION_REPORT pre-state):**
- `SELECT count(*), is_active FROM crm_automation_rules WHERE tenant_id='demo-uuid' GROUP BY is_active`
- `SELECT column_name FROM information_schema.columns WHERE table_name='crm_message_queue' ORDER BY ordinal_position` — confirm columns named in SPEC §10.
- `SELECT indexname FROM pg_indexes WHERE tablename='crm_message_queue'` — confirm idempotency index exists OR plan to add.
- `wc -l modules/crm/crm-automation-engine.js modules/crm/crm-automation-post-actions.js supabase/functions/lead-intake/index.ts`
- `git log --oneline -5` — record start hash.

**Critical guardrails:**
- The 22 V2 templates are LOCKED. Do NOT touch their bodies in this Rung.
- T6 slug rewire (criteria #12-#13): do NOT delete the orphan `event_waiting_list_confirmation` rows in `crm_message_templates`. Leave them as inactive history per Rung 1's pattern.
- Rule 2.7 rows are inserted in this Rung BUT do NOT fire until Rung 3 implements the manual-move RPC. They sit dormant — that's expected and safe.
- Phones: only `+972537889878`, `+972503348349`, `+972507168471`. Any other phone in any test = STOP.
- Demo tenant only — never touch Prizma's rules.

**Out of scope (do NOT touch):**
- `register_lead_to_event` RPC.
- Manual-move admin UI.
- Storefront / public form.
- V2 template bodies.
- `dispatch-queue` EF behavior.

**Deliverables at close:**
1. All 34 success criteria pass.
2. EXECUTION_REPORT.md with pre-state baseline, per-criterion verify, smoke-test artifacts (queue row dump, log row dump for each scenario), regenerated `seed-automation-rules-demo.sql` snapshot.
3. FINDINGS.md if anything emerged that warrants a future SPEC (queue index missing, EF caveat, Hebrew column collation surprise, etc.).
4. Clean repo, develop branch, integrity gate passing.

Start by reading SPEC.md in full + the parent SPEC + the FOREMAN's notes in §13. Run Step 1 baseline above before any write. Report at the seams in §9 Commit Plan.
