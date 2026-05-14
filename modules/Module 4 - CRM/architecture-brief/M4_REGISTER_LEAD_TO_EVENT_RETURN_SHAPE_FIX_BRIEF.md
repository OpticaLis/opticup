# M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX — Architecture Brief

**Type:** Small targeted bug-fix SPEC. Follow-up to FIND-1 from `M4_REGISTER_LEAD_TO_EVENT_RPC_MAP` (closed 2026-05-14, Phase 1 P1.4). Prerequisite to **Phase 1 P1.1** (UTM persistence) — fixing the return-shape bug first prevents P1.1 from having to work around it.

**Purpose:** Fix the `register_lead_to_event` RPC so it returns `'event_closed'` (or whatever the correct sentinel is per the existing return-shape contract) when a fresh insertion targets an event that is closed-and-full. Today it returns `'waiting_list'` in that path — caller code reads that as "user is on the waitlist" and may emit user-facing strings or messages that imply queued status when the truth is the event is closed.

**Why now:** FIND-1 was logged MEDIUM in `roles/site-overseer/knowledge-build/KNOWLEDGE_MAP.md` Layer 4 + the SPEC's FINDINGS.md. The bug does not break production today because the affected code path is rare in current usage. But P1.1 (UTM persistence) touches the same code paths and will sit on top of this RPC — if we change UTM persistence first and the return-shape bug remains, P1.1's tests will have to special-case it, and the workaround becomes load-bearing. Fix it cleanly now while it's isolated.

---

## 1. Scope

**In scope:**
1. Modify `register_lead_to_event` RPC body so the return-value contract matches caller expectations as documented in `STATE_TRANSITIONS.md` (from the P1.4 SPEC folder).
2. The specific path to fix is the one identified in FIND-1: fresh insertion targeting a closed-and-full event. Today returns `'waiting_list'`, should return `'event_closed'` (or the value the contract documents — Foreman reads `STATE_TRANSITIONS.md` to confirm canonical sentinel before authoring the SPEC).
3. Add or update a unit/smoke test that exercises this exact path on the demo tenant and asserts the correct return value.
4. Update `STATE_TRANSITIONS.md` (Layer 4 mappings in `roles/site-overseer/knowledge-build/KNOWLEDGE_MAP.md` if it duplicates the table) to mark the return-shape gap as RESOLVED.

**Out of scope:**
- Touchpoint logging (that's P1.1).
- Any other Finding from P1.4 (FIND-2 capacity logic, FIND-3 contract docs, etc. — separate SPECs).
- Refactoring the RPC's structure or rewriting any caller. This is a one-branch sentinel correction.
- Schema changes. Zero migrations needed.

---

## 2. Method

The executor should:

1. Read the canonical RPC body from `pg_proc` and confirm the bug still exists (it should — no one has touched it).
2. Identify the exact line/branch where the wrong sentinel is returned.
3. Author a minimal `CREATE OR REPLACE FUNCTION` migration that swaps the wrong sentinel for the right one. Same `SECURITY DEFINER`, same RLS pattern, same `SET search_path = 'public'` — only the return literal changes.
4. Apply the migration via `apply_migration` MCP — single commit, with the migration file committed to `migrations/` per project convention.
5. Verify on demo: create a closed-and-full test event, attempt fresh registration, confirm the RPC now returns `'event_closed'`.
6. Confirm Prizma is not touched: query Prizma audit log post-migration, verify zero writes against Prizma's `crm_event_attendees` or `crm_leads` from this SPEC's session.

---

## 3. Output

Standard SPEC-folder outputs at `modules/Module 4 - CRM/docs/specs/M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX/`:
1. `SPEC.md` (Foreman)
2. `MIGRATION.sql` (the actual migration applied)
3. `EXECUTION_REPORT.md` (Executor)
4. `FOREMAN_REVIEW.md` (Foreman closure)

Plus:
5. Updated mapping entry in `roles/site-overseer/knowledge-build/KNOWLEDGE_MAP.md` Layer 4 (FIND-1 marked RESOLVED with date + commit SHA).
6. P1.4's FINDINGS.md updated to mark FIND-1 as RESOLVED (cross-reference SPEC slug + commit SHA).

---

## 4. Destructive Operations

**Schema modification only — no destructive ops per Iron Rule 32 classification.**

- `CREATE OR REPLACE FUNCTION` — replaces an existing RPC body; not classified as destructive (no DROP, no schema removal, no policy removal).
- One migration file added (additive).
- Zero file deletes, zero git destructive ops, zero deploys to main.

If any deviation surfaces (e.g. the RPC body has shifted since P1.4 closure) → STOP, write escalation, do NOT proceed.

---

## 5. Success Criteria

| # | Criterion | Method |
|---|---|---|
| 1 | RPC body post-migration returns `'event_closed'` (or the canonical sentinel) on the fresh-insert-to-closed-full path | re-query `pg_proc` + integration test |
| 2 | All other return paths byte-identical to pre-migration body (line-diff on the function body) | `pg_get_functiondef` diff before/after |
| 3 | Demo tenant: create closed-full event + fresh registration attempt → response equals expected sentinel | integration test in SPEC folder |
| 4 | Prizma untouched: zero writes in this SPEC's session against Prizma's `crm_event_attendees` / `crm_leads` | audit log check |
| 5 | Smoke 7/7 PASS on demo before AND after migration | `npm run smoke` |
| 6 | Integrity gate exit 0 | `npm run verify:integrity` |
| 7 | P1.4 FINDINGS.md updated: FIND-1 → RESOLVED with commit SHA | grep file |
| 8 | KNOWLEDGE_MAP.md Layer 4 mapping updated to reflect new return value | grep file |

---

## 6. Notes

- This SPEC is intentionally tiny — 15-25 minutes of Foreman + Executor work via Full-Auto Pipeline. Do not let scope grow. If a related issue surfaces — log as Finding for a separate SPEC, do not fix in-flight.
- The mandatory backup step DOES apply (any RPC body change is a migration; `migrations/` is touched). Standard `backups/` folder under M4 with snapshot of current RPC body + the two doc files being updated.
- Bounded Autonomy: Foreman seals SPEC → Executor runs → Reviewer verifies criteria → Localhost-Tester confirms smoke 7/7 → Foreman closes with FOREMAN_REVIEW. No human-in-the-loop between phases.

End of Brief.
