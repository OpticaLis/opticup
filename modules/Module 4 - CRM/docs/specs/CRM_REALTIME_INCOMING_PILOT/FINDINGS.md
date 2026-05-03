# FINDINGS — CRM_REALTIME_INCOMING_PILOT

> Findings discovered during execution that are NOT inside this SPEC's scope. One entry per finding. Severity: INFO / LOW / MEDIUM / HIGH / CRITICAL.
> Suggested next-action per entry: new SPEC stub / TECH_DEBT entry / dismiss.

---

## F1 — `crm_event_attendees` has REPLICA IDENTITY FULL but is NOT in `supabase_realtime` publication

- **Severity:** INFO (forward-looking observation, not a defect)
- **Location:** Supabase live DB — `pg_publication_tables` (read-only verification during this SPEC's execution)
- **Description:** While verifying this SPEC's migration, I noted that `crm_event_attendees` already has `REPLICA IDENTITY FULL` set (per `campaigns/supersale/migrations/001_crm_schema.sql` and the canonical schema docs), but it is NOT yet a member of the `supabase_realtime` publication. The replica-identity setting is a NO-OP without publication membership — it just means the table is "ready" for realtime if a future SPEC enables it. This is consistent with the project's plan to roll out CRM Realtime in phases (this SPEC's pilot covers `crm_leads` only; future SPECs will add `crm_event_attendees`, `crm_events`, etc.).
- **Suggested next action:** **Dismiss** as already-anticipated state. Future Realtime SPECs for events / attendees will follow this SPEC's pattern: enable publication membership in their migration, with the REPLICA IDENTITY FULL pre-existing requirement already satisfied. Recorded here so the next Foreman has a baseline.
- **Discovered during:** SPEC §10 #2 verification SQL — when I noticed `relreplident='f'` was already the case across multiple CRM tables but only `crm_leads` is in the publication post-migration.

---

## Cross-Reference Check evidence (Iron Rule 21, Step 1.5 — partial per RE-Z-1 carve-out)

This SPEC's DDL changes publication membership + REPLICA IDENTITY only. No new table / column / view / RPC / function NAMES introduced. Per the RE-Z-1 proposal in EXECUTION_REPORT §11, the name-collision grep (Step 1.5 #5) and field-reuse check (Step 1.5 #6) are vacuous and were skipped. Steps 1.5 #1–#4 (reading GLOBAL_SCHEMA / db-schema / DB_TABLES_REFERENCE / GLOBAL_MAP) were satisfied indirectly by the Foreman survey at SPEC authoring time.

For the JS edits: pre-flight greps confirmed in SPEC §11:
- `grep -rn "sb.channel(" js/ modules/crm/ shared/` BEFORE edit → 0 hits in modules/crm. New pattern.
- `grep -rn "function startRealtime\|function stopRealtime\|handleIncomingInsert\|handleIncomingUpdate\|flashIncomingRow"` BEFORE edit → 0 hits. All new function names.
- `grep -rn "_rtChannel\|_realtimeChannel"` BEFORE edit → 0 hits. New module-scope variable.

Result: 0 collisions. Rule 21 satisfied for both DDL (carve-out) and JS (full check).

---

## Reverse-callsite report (per Auto-Engine SE-2 inherited proposal — only when deletions are in scope)

**N/A** — this SPEC deletes no files, so the reverse-callsite proposal does not apply. Recorded explicitly so future audits see the proposal was considered, not skipped.
