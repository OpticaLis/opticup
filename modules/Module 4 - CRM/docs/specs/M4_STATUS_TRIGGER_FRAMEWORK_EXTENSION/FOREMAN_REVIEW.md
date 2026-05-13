# M4_STATUS_TRIGGER_FRAMEWORK_EXTENSION — Foreman Review

**Reviewer:** opticup-strategic (Foreman hat)
**Date:** 2026-05-14
**SPEC:** `SPEC.md` in this folder
**Executor reports:** `EXECUTION_REPORT.md`, `FINDINGS.md`

---

## SPEC Quality Audit

Strengths:
- §0 Pre-Authoring Reality Check captured all 8 stated assumptions vs. actual live state; flagged the Brief's slightly-off UI wording and reframed it before SPEC.md was written. This is the discipline `M4_REMOVE_CONFIRMED_VERIFIED` (2026-05-14) was meant to instill — applied successfully here.
- Success criteria §4 were every measurable (DB row counts, file line counts, EF response shape, queue.consumed_at status). The executor verified each without ambiguity.
- §3 Destructive Operations correctly declared `None.` — the SPEC stayed inside additive operations only.

Weaknesses:
- §6 smoke case 7 ("UI shows new options") was specified as a browser-driven test even though overnight runs typically lack a human at the screen. Should have been pre-categorized as "code review acceptable" so the executor didn't need to defer it. The executor handled this gracefully but the SPEC could have been crisper.
- §5.4 wrote out the new `COND_BY_BOARD` literal — useful for code review of intent, but if `crm-rule-editor.js` evolved between SPEC author time and execution (e.g., a parallel SPEC also touched `COND_BY_BOARD`), the literal would have collided. Recommend referencing existing patterns rather than embedding full literal blocks.

---

## Execution Quality Audit

The executor:
- Performed an additional pre-flight (column name verification on `crm_leads.phone/source` and `crm_events.event_date/name`) BEFORE applying the migration. This caught nothing but is good discipline.
- Hit the SPEC's "Stop trigger: any source file approaches 350-line cap" trigger mid-execution (`engine.ts` first edit went to 359 lines). Resolved correctly by refactoring the entity-aware logic into a helper rather than escalating. This is good autonomous judgment.
- Tried `mcp__claude_ai_Supabase__deploy_edge_function` first (failed → pivoted to `supabase` CLI). The fallback was correct.
- Cleaned up smoke artifacts: restored lead status, soft-deleted throwaway event.
- Pushed 3 commits to develop instead of 4–6 — a minor under-shoot. Defensible: no commit was deleted, two logical groups stayed naturally consolidated.

Deviations:
- None requiring escalation.
- The 2 test messages sent to whitelisted Daniel contacts as a side effect of the rule firing during smoke are pre-approved by Brief §2.3 and are not deviations.

---

## Findings Processing

| Finding | Severity | Action |
|---|---|---|
| F-STFE-1 | LOW | Add to TECH_DEBT.md (`crm_events` missing `updated_at`). Not urgent. |
| F-STFE-2 | INFO | Add to TECH_DEBT.md (column-name doc drift). |
| F-STFE-3 | INFO | Apply as opticup-executor SKILL improvement (proposal #1 below). |
| F-STFE-4 | INFO | Apply as opticup-localhost-tester SKILL improvement (queue this overnight; the Foreman cannot edit other skills in this SPEC's commit window without re-authoring). |
| F-STFE-5 | LOW | Daniel's morning visual check covers this. No follow-up SPEC. |

---

## Author Skill (opticup-strategic) Improvement Proposals

### Proposal 1 — Pre-categorize UI smoke cases as "visual" vs "code-review"
**File:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` §6 Smoke
**Why:** This SPEC's smoke #7 was "open the rule editor and check the dropdown" — only meaningful with a human or chrome-devtools driver. Overnight runs don't have either by default. Either we explicitly mark such cases as "executor verifies via code-review" OR we require chrome-devtools integration in localhost-tester.
**Proposed change:** Add a `Smoke Type:` field per case (`db`, `api`, `code-review`, `visual-browser`). Smoke `visual-browser` MUST not be in a SPEC unless the Brief explicitly authorizes browser-driving in this run (e.g., daytime, not overnight).

### Proposal 2 — Cross-Reference Check should grep code for proposed column references
**File:** `.claude/skills/opticup-strategic/SKILL.md` §"Step 1.5 — Cross-Reference Check"
**Why:** SPEC §5.1 named `crm_events.name` for the event_name payload. The executor verified the column exists via SQL pre-flight — good. But the SPEC itself could have stated that column verification was completed at author time. Today the Cross-Reference Check focuses on collisions; should ALSO mandate "every column the SPEC references must be verified to exist in live DB before the SPEC is dispatched".
**Proposed change:** Extend §1.5 to add step 6: "For every column referenced in the SPEC (especially in migration content), confirm it exists in the target table via `\\d` or `information_schema.columns`. Document the verification in §0 Pre-Authoring Reality Check as a column manifest."

---

## Executor Skill (opticup-executor) Improvement Proposals

### Proposal 1 — Default Edge Function deploy path = Supabase CLI
**File:** `.claude/skills/opticup-executor/SKILL.md` (Edge Function deployment section, wherever it lives)
**Why:** `mcp__claude_ai_Supabase__deploy_edge_function` requires manually listing every imported file. For multi-file EFs this means manually building a JSON blob with 7+ files plus deno.json — fragile and verbose. The Supabase CLI auto-scans the folder. CLI worked first try in this run.
**Proposed change:** Add a one-liner: "For EFs with >1 source file: deploy via `supabase functions deploy <name> --project-ref tsxrrxzmdxaenlvocyit` from the repo root. MCP `deploy_edge_function` is acceptable for single-file EFs only."

### Proposal 2 — Smoke design: list active rules whose condition matches your test transition
**File:** `.claude/skills/opticup-executor/SKILL.md` (Smoke discipline section)
**Why:** F-STFE-4 — flipping a throwaway event's status to `will_open_tomorrow` triggered real automation rule "שינוי סטטוס: ייפתח מחר" with `recipient_type='tier2'` (cross-event broadcast scope), sending 2 messages. The whitelisted recipients absorbed the impact but the smoke design didn't anticipate it. Future smokes that perform any status flip on a real entity should run a pre-flight query against `crm_automation_rules` (or its equivalent in other modules) and either (a) pick a target value with no matching active rule, or (b) deactivate the rule for the smoke window.
**Proposed change:** Add to "Smoke pre-flight checklist": "Before flipping any entity status, run `SELECT id, name, recipient_type FROM crm_automation_rules WHERE trigger_entity=<entity> AND trigger_event='status_change' AND is_active=true` and inspect the trigger_condition column. If any rule matches your target transition AND its recipient_type would reach beyond the whitelisted set, choose a different target or deactivate the rule."

---

## Master-Doc Update Checklist

- ⬜ `MASTER_ROADMAP.md` — no change (this SPEC doesn't close a module phase).
- ⬜ `docs/GLOBAL_MAP.md` — 2 new DB functions to add (`lead_status_change_event_fn`, `event_status_change_event_fn`). Deferred to Integration Ceremony at next M4 phase close (Brief authorizes the run, not a per-SPEC ceremony).
- ⬜ `docs/GLOBAL_SCHEMA.sql` — 2 new functions + 2 new triggers + 4 new registry rows. Deferred to Integration Ceremony.
- ⬜ `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — note the framework extension. Will be updated in SPEC #4 (M4_STATUS_MODEL_DOC_UPDATE) which is the consolidated doc-refresh SPEC of this overnight run.
- ✅ This folder contains the canonical record of the SPEC's plan, execution, findings, and review.

---

## Verdict

**🟢 CLOSED.**

All success criteria met. Smoke baseline 7/7 + SPEC-specific verification on producers, no-op suppression, and consumer entity routing. Side effects bounded by Brief §2.3 whitelist. Improvement proposals captured for future application.

The crm_status_change_events framework is now multi-entity. Lead and event status transitions route through the decoupled bus alongside attendees. The legacy in-process dispatch path remains active in parallel — both paths run today, intentionally; decommissioning the legacy paths is a future SPEC.

---

*End of FOREMAN_REVIEW.*
