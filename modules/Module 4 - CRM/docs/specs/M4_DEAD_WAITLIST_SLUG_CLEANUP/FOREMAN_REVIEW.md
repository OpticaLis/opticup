# FOREMAN_REVIEW — M4_DEAD_WAITLIST_SLUG_CLEANUP

**Verdict:** 🟡 **CLOSED-WITH-REVISED-SCOPE**
**Closed:** 2026-05-13
**Closer:** Full Auto Pipeline (Sonnet) per `WAITLIST_FLOW_INVESTIGATION_BRIEF.md`
**Safety tag:** `pre-waitlist-investigation-2026-05-13` → `b27b74f`
**Replaces:** Original audit recommendation in `M4_DEEP_AUDIT_2026_05_13.md` §3.2.1 + `M4_OVERNIGHT_AUDIT_HARVEST_BRIEF.md` §4.3.
**Escalation file:** `modules/Module 4 - CRM/escalations/2026-05-13_2350Z_OVERNIGHT_BLOCKER_M4_DEAD_WAITLIST_SLUG_CLEANUP.md` (marked RESOLVED in the same commit batch).

---

## 1. Original SPEC intent

The Overnight Audit Harvest brief §4.3 prescribed: confirm zero leads carry `status='waitlist'` on demo and Prizma; if confirmed dead → soft-delete the `waitlist` row from `crm_statuses` (`is_active=false`). Pure config cleanup.

Pre-flight on 2026-05-13 night found 1 Prizma lead with `status='waitlist'` — a Daniel test row, not a real lead. The original SPEC's premise ("the slug is dead") was technically true (no organic leads) but its conclusion ("therefore remove it") was wrong. The escalation halted SPEC #3 pending Daniel's morning decision.

## 2. Why the original SPEC was wrong

Daniel surfaced the deeper truth (chat 2026-05-13): **`waitlist` is NOT a dead slug — it's the TARGET of an automatic capacity-reached → waitlist flow that was designed in `M4_LEAD_STATUS_WAITLIST_SYNC` (SPEC dated 2026-04-28, executed).** The fact that 0 leads carry the status today is a SYMPTOM of the flow never having fired in production — not evidence that the slug is dead.

Daniel's directive (verbatim 2026-05-13): "שלא ימחק את הסטטוס בשום אופן" — do NOT delete the slug under any circumstance.

## 3. Revised scope (what this SPEC's run actually delivered)

| # | Action | Result |
|---|--------|--------|
| 1 | Move the 1 Prizma test lead from `status='waitlist'` to `status='waiting'` | ✅ Single-row UPDATE on `crm_leads.id=23a96795-ae7e-4cc6-8a8b-786b58b55491`. Pre-flight: 1 matching row. Post-state: Prizma `waitlist` count = 0. |
| 2 | RETAIN the `waitlist` row in `crm_statuses` on BOTH tenants | ✅ Untouched. `is_active=true` on demo + Prizma. |
| 3 | Investigate the capacity-reached → waitlist flow (READ-ONLY) | ✅ Report at `modules/Module 4 - CRM/docs/audits/WAITLIST_FLOW_INVESTIGATION_2026_05_13.md`. |
| 4 | Author a follow-up fix SPEC | ❌ NOT in scope of this Brief. Daniel decides after reading the investigation report. |

## 4. Investigation summary (verdict only — full detail in the audit report)

**Flow status: 🟢 IMPLEMENTED but has NEVER fired in production.**

The capacity-reached → `lead.status='waitlist'` flow is end-to-end wired (`sync_lead_status_from_attendee` RPC, `register_lead_to_event` capacity-hit branch, EF callers, automation rules, leads-board UI). But:

- The sync RPC was deployed in migration `20260429122708` (2026-04-29), AFTER the only historical capacity-hit event "אירוע המותגים מרץ 2026" (2026-03-27).
- The sync's "most-recent-active-attendee wins" rule absorbs the waitlist signal whenever a lead also has a registered/attended row elsewhere.
- No event has actually hit cap with a FRESH lead (no other active attendees) since 2026-04-29.

**Recommendation for the follow-up SPEC:** Combine Option A (priority CASE in sync RPC — waitlist > registered) with Option C (event-completion trigger that re-runs sync). Authored slug: `M4_WAITLIST_SYNC_PRIORITY_FIX`. Daniel approves or defers based on report.

## 5. Iron Rule compliance for this run

| Rule | Check | Status |
|------|-------|--------|
| 1 | Atomic quantity changes — N/A | ✅ |
| 14 | tenant_id on every table — N/A (no DDL) | ✅ |
| 15 | RLS on every table — N/A (no DDL) | ✅ |
| 22 | Defense-in-depth on writes — the §3.1 UPDATE included `WHERE id=... AND tenant_id=... AND status='waitlist'` (3 narrow filters) | ✅ |
| 31 | Integrity gate — to be run before commits | (run at commit time) |
| 32 | Destructive Operations Gate — Brief authorized ONE single-row UPDATE (`crm_leads` row). No DDL, no DROP, no TRUNCATE. | ✅ |

## 6. Skill improvements harvested

Two concrete proposals for `opticup-strategic` (the skill that would have authored the original SPEC #3):

1. **"Dead config" diagnostics MUST include a check for the inverse case — the value is the TARGET of an unfired flow, not a dead slug.** Before any "this config value is dead, remove it" SPEC, run a code-search for the value as a destination/target (`sync_*`, `*_to_*`, mapping CASE branches in pg_proc). If found → STOP and investigate why the flow hasn't fired. Add this to `opticup-strategic` SKILL.md as a pre-SPEC checklist for any "cleanup unused config" SPEC.

2. **Audit findings of the form "0 leads have status X" MUST distinguish "never assigned" from "assigned-then-cleared".** The audit's premise treated 0-count as proof of deadness. A better diagnostic is `activity_log WHERE details ILIKE '%X%'` — if there are NO historical `to:X` events at all, the value has never been organically populated and the question becomes "should it be populated?" not "should it be removed?". Add this to the M4 audit playbook + the Sentinel's Mission 4 (technical debt) heuristics.

## 7. Files touched (cap: 6 commits, Brief §4.5)

| File | Action |
|------|--------|
| `modules/Module 4 - CRM/docs/audits/WAITLIST_FLOW_INVESTIGATION_2026_05_13.md` | NEW — investigation report |
| `modules/Module 4 - CRM/docs/specs/M4_DEAD_WAITLIST_SLUG_CLEANUP/FOREMAN_REVIEW.md` | NEW — this file |
| `modules/Module 4 - CRM/escalations/2026-05-13_2350Z_OVERNIGHT_BLOCKER_M4_DEAD_WAITLIST_SLUG_CLEANUP.md` | UPDATED — status RESOLVED, link to investigation report |
| Live DB | 1 row UPDATE (`crm_leads.id=23a96795...` status `waitlist`→`waiting`) — no migration file required (Brief authorized direct execution as the only Prizma write) |

Commit budget: 3 commits expected (investigation report + SPEC close + escalation resolution). The §3.1 UPDATE was executed directly on the live DB per Brief §3.1 (not via a migration file — this is one-row data hygiene, not schema change).

---

*End of FOREMAN_REVIEW. Daniel: decision-point is whether to author `M4_WAITLIST_SYNC_PRIORITY_FIX` next. Investigation report is the input.*
