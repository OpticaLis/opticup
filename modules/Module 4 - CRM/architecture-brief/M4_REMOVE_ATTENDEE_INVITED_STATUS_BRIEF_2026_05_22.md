# M4 Remove ATTENDEE-Level `invited` Status — Brief

> **Synthesized 2026-05-22 from Daniel's dispatch prompt.** Authored to canonical path.

## Goal
Remove the **ATTENDEE-level** `crm_event_attendees.status='invited'` status. Triggered by Daniel seeing the confusing "501 נרשמו / 167 הוזמנו" split on event #34 (the 100K verify headliner). The capacity bug was already fixed (`M4_INVITED_GHOST_ATTENDEE_FIX` excluded 'invited' from `v_crm_event_stats.total_registered` + `spots_remaining`), but the status still exists in the schema convention, writes from the automation post-action, displays on screens, and confuses operators.

## Critical distinction — two `invited` statuses

| | crm_event_attendees.status | crm_leads.status |
|---|---|---|
| Domain | per-event attendee state | per-tenant lead state |
| Semantic | "row exists on event but we haven't registered them yet" | "we sent them an invite SMS/email, awaiting their click-through" |
| Confusion | YES — Daniel wants this gone | NO — Daniel explicitly wants this kept |
| Action | **REMOVE** | **KEEP intact** |

## Phase 1 (this run) — DIAGNOSE ONLY
Map every reference. **No changes.** Output: file/RPC/view/constraint change list + data-migration proposal + STOP for Daniel's signoff.

## Phase 2 (after signoff, separate dispatch) — APPLY
Execute the agreed map. Demo-first. IR32 destructive ops declared. IR34 Chrome MCP verification.

## Rails for Phase 1
- Prizma READ-ONLY (no writes).
- Daniel's 10K manual-test leads (`M4_DANIEL_MANUAL_TEST_2026_05_21`) NEVER touched.
- 90K verify-leads (`M4_100K_VERIFY_2026_05_22`) NEVER deleted in Phase 1 — Daniel still considering teardown.
- Develop branch only.

## Destructive Operations (declared upfront per IR32 for both phases)

**Phase 1:** NONE — investigation + grep + SQL probes only.

**Phase 2 (after signoff):**
1. UPDATE `crm_automation_rules.action_config` on 2 rules (1 demo + 1 prizma) to drop `post_action_attendee_upsert.status='invited'`. **Note:** Prizma write — Daniel-authorized only.
2. UPDATE `crm_event_attendees.status` (or is_deleted) on existing 177 'invited' attendee rows (174 demo + 3 prizma) per the data-migration plan agreed in Phase 2.
3. JS edits removing 'invited' from attendee-status arrays where dead-code remains.
4. Optionally: ALTER VIEW `v_crm_event_stats` + UPDATE RPC bodies to remove now-dead 'invited' branches (or leave as harmless dead code).
5. NO Prizma destructive ops beyond the rule-config update.
