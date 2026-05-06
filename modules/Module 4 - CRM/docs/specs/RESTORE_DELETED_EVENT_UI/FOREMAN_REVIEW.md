# FOREMAN_REVIEW — RESTORE_DELETED_EVENT_UI

> **Location:** `modules/Module 4 - CRM/docs/specs/RESTORE_DELETED_EVENT_UI/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Foreman hat)
> **Written on:** 2026-05-06 (BACKFILL — SPEC closed 2026-05-04; retroactive review per M4_CLOSURE)
> **Reviewed:** SPEC.md (2026-05-04 Approach-B rewrite) + EXECUTION_REPORT.md + FINDINGS.md (2 findings, both INFO)
> **Commit range:** `30ce5b1..7df4586` (1 backend migration + 1 frontend + retrospective)

---

## 1. SPEC Quality Audit

**Verdict: 🟢 EXCELLENT.**

### What the SPEC got right
- **Approach-B scope correction caught pre-execution.** The original SPEC assumed `crm_event_attendees.updated_at` exists for timestamp-based scoping; live `information_schema.columns` check confirmed only `created_at` + `is_deleted` exist. SPEC was rewritten to capture explicit `attendee_ids` in audit-row details. This is a textbook example of "Reproduce-The-Bug-First" working as designed — caught a schema-feasibility issue before any code shipped.
- **§3 has 25 numbered measurable success criteria** — most numerous of any M4 SPEC.
- **§5 has 7 specific stop triggers** including idempotency + pre-v2 backward-compat + cascade-restore-by-ID-list failure paths.
- **§3.6 explicit backward-compat branch** — pre-v2 delete logs handled gracefully (event-only restore + `pre_v2_log_event_only` note).
- **Cross-reference sweep documented in §2** with live `pg_proc` query results, schema introspection, and Q1-Q4 Daniel-decision history.

### What the SPEC got wrong
- Minor: SPEC §3.10 said "in actions column or end-of-row" — there is no dedicated actions column. Executor inlined the שחזר button in the rightmost detail TD. A quick UI-layout check at SPEC author time would have specified this exactly.
- Minor: return-payload field types (`source_log_id` as text vs uuid) were inferable but not literal. Executor chose `::text` to match `entity_id`'s actual type. Worth a project-level convention note.

### What the SPEC got missing
- No project-level convention statement that "all log/event id fields in returns are text-cast for JSON-friendliness." Executor §5 surfaced this as a micro-decision worth codifying.

### Severity rollup
- 0 issues that broke execution
- 2 minor under-specifications resolved by executor with sensible defaults
- 2 actionable improvements

---

## 2. Execution Quality Audit

**Verdict: 🟢 EXCELLENT — 9.3/10 self-assessed; my independent assessment matches.**

### Adherence
- All 25 numbered success criteria met or substituted-with-sensible-default.
- Iron Rule 14 (tenant_id on every UPDATE): both RPCs filter every UPDATE by `p_tenant_id`. Verified.
- Iron Rule 22 (defense in depth): Every UPDATE in both RPCs filters by tenant_id even though SECURITY DEFINER means RLS isn't auto-applied. activity_log INSERT also includes `tenant_id` explicitly.
- DELETE_EMPTY_EVENT F1 lesson actively applied: new module's header comment explicitly notes "no client-side ActivityLog.write — RPC is canonical."
- 2-commit chain (`7f8117a` backend + `7df4586` frontend) + retrospective.

### Deviations
None. The "deviation" header in EXECUTION_REPORT §3 ended up reading "None." — fully clean.

### Real-time decisions (§4 of EXECUTION_REPORT)
1. **Inline שחזר button in rightmost TD instead of new actions column.** Avoided altering the table colspan + expanded-row layout. ✓ Correct trade-off.
2. **Conditional `note` field merge (only present when pre-v2 path triggers).** Avoided littering fresh-delete restores with a null `note`. ✓
3. **Used existing demo event for round-trip, restored immediately.** Avoided polluting demo with ephemeral test rows. ✓
4. **Idempotency verified structurally** (post-restore state + invalid_log_id branch reachable) instead of re-running the RPC. ✓ Defensible.

### Spot-check verifications I ran
- `git log 30ce5b1..7df4586 --oneline` → 2 commits, hashes match. ✓
- `pg_get_functiondef('public.restore_event_from_log(uuid,uuid)')` → SECURITY DEFINER, search_path=public, every UPDATE filtered by `p_tenant_id`. ✓
- `pg_get_functiondef('public.soft_delete_event_if_empty(uuid,uuid)')` (v2) → captures `attendee_ids` array_agg before cascade UPDATE. ✓
- `wc -l modules/crm/crm-event-restore.js` → 38 (well under cap). ✓
- `wc -l modules/crm/crm-activity-log.js` → 316 (over 300 soft target, under 350 hard cap — accepted as warning). ✓

---

## 3. Findings Disposition

| Code | Severity | Description | Foreman decision | Rationale |
|------|----------|-------------|------------------|-----------|
| M4-INFO-RESTORE-01 | INFO | Pre-v2 audit rows can only restore the event, not its attendees | **DISMISS** | Already documented in SPEC §3.6/§3.24/§12. Data-recovery for pre-v2 logs is out of scope; one-off SQL fixes if ever needed. No follow-up. |
| M4-INFO-RESTORE-02 | INFO | `restore_event_from_log` returns `event_not_found` when the event was hard-deleted later (admin SQL) | **DISMISS** | Future-proof safety net. Unreachable in production today (no admin SQL has hard-deleted events). Branch is correct. |

**No findings re-opened the SPEC.** Both findings are by-design and properly documented.

---

## 4. Master Doc Update Checklist

| File | Touched in this SPEC range? | Status |
|------|----------------------------|--------|
| `MASTER_ROADMAP.md` | No | ✅ Correctly skipped |
| `docs/GLOBAL_MAP.md` | No — new RPC deferred to M4 closure ceremony | ✅ Verified retroactively in M4_CLOSURE commit 6 |
| `docs/GLOBAL_SCHEMA.sql` | No — RPC schema deferred to M4 closure | ✅ Verified retroactively in M4_CLOSURE commit 7 |
| `modules/Module 4 - CRM/docs/MODULE_MAP.md` | No — deferred per protocol | ✅ Verified retroactively in M4_CLOSURE commit 5 |
| `modules/Module 4 - CRM/docs/CHANGELOG.md` | No — deferred | ✅ Verified retroactively in M4_CLOSURE commit 5 |
| `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` | Yes — updated post-merge | ✅ |

**Master-doc state at SPEC close: aligned. Deferrals tracked + closed in M4_CLOSURE_AND_INTEGRATION_CEREMONY.**

---

## 5. Author-Skill Improvement Proposals (opticup-strategic)

### Proposal 1 — Schema-feasibility check in Step 1.5 (column-existence + nullability)

**Where:** `.claude/skills/opticup-strategic/SKILL.md` §"Step 1.5 — Cross-Reference Check (MANDATORY)"

**Change:** Add bullet 6: *"For every column the SPEC asserts behavior on (e.g. 'use updated_at for scoping', 'check is_deleted_at IS NOT NULL', 'JOIN on actor_id'), confirm by SQL: `SELECT column_name, is_nullable, data_type FROM information_schema.columns WHERE table_name=<t> AND column_name=<c>`. If the column does not exist or has unexpected nullability, the SPEC's approach is structurally infeasible — re-author with an alternative approach (e.g., capture the data in JSONB, add the column via migration). The original RESTORE_DELETED_EVENT_UI SPEC assumed `updated_at` and was rewritten to Approach B mid-authoring."*

**Rationale:** The Approach-B scope correction in this SPEC was caught pre-execution because the Foreman did a manual schema-feasibility check. Codifying it prevents the next column-from-memory assumption.

**Source:** §1 "What the SPEC got right" — Approach-B rewrite was the success story; codifying the pattern locks in the lesson.

### Proposal 2 — Project-level "Return-payload conventions" cheat sheet

**Where:** new file `.claude/skills/opticup-strategic/references/RETURN_PAYLOAD_CONVENTIONS.md` (or append to `docs/CONVENTIONS.md`)

**Change:** Document the project's RPC-return conventions:
> *"All UUID-typed log/event/lead/attendee id fields in RPC return payloads are TEXT-cast for JSON-friendliness (`event_id::text`, `source_log_id::text`). Successful responses return `{success: true, ...}`; errors return `{success: false, error: '<machine_code>', ...}`. The error code is short_snake_case, never user-facing — the caller maps it to a Hebrew Toast string."*

**Rationale:** Executor §5 noted: "expected payload shape (`source_log_id` as text vs uuid in the return) was inferable but not literal. A one-line note saying [...] would have removed the micro-decision." Codifying once removes 1 micro-decision per future RPC SPEC.

**Source:** EXECUTION_REPORT §5 bullet 2.

---

## 6. Executor-Skill Improvement Proposals (opticup-executor)

The executor proposed 2 of its own (EXECUTION_REPORT §8). Both endorsed.

### Proposal 1 (executor-suggested) — Tenant-filter comprehensiveness grep
**Where:** `.claude/skills/opticup-executor/SKILL.md` §"DB Pre-Flight Check"
**Change:** Add bullet 8: for new RPCs with `p_tenant_id`, grep every `FROM/UPDATE/INSERT INTO public.<t>` line in the migration file and confirm tenant scoping.
**Endorsed:** Yes. Pre-commit hook's rule-14/15 scans only DDL; SECURITY DEFINER function bodies need a separate check. The grep is a 5-second self-audit.

### Proposal 2 (executor-suggested) — Lessons in §11 are active constraints
**Where:** `.claude/skills/opticup-executor/SKILL.md` §"SPEC Execution Protocol" Step 1
**Change:** Add sub-bullet: cross-check §11 lessons against §3/§4 — STOP if a SPEC body contradicts a documented prior lesson.
**Endorsed:** Yes. This SPEC's §11 explicitly cited DELETE_EMPTY_EVENT F1 (no client-side audit-write); execution honored it but only because the executor read §11 carefully.

---

## 7. Verdict

🟢 **CLOSED.**

**Closed:**
- RESTORE_DELETED_EVENT_UI SPEC complete; REC-010 (Daniel feature request) shipped end-to-end. Round-trip verified on demo (delete → audit row with attendee_ids → restore → both event + attendees `is_deleted=false` → restore audit row).
- 2 commits on `develop` (`7f8117a` backend + `7df4586` frontend). Already merged to main per Daniel.
- This review is RETROSPECTIVE — no rework needed.

**No follow-ups.** Both findings are by-design. The 4 skill-improvement proposals will be applied to strategic + executor SKILL files in a future maintenance commit. The Approach-B-rewrite pattern is the most valuable lesson — it deserves codification as a Step 1.5 schema-feasibility check (Author Proposal 1).

*End of FOREMAN_REVIEW.*
