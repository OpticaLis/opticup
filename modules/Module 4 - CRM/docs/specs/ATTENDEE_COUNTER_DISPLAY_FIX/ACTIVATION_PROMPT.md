You are working in `C:\Users\User\opticup`. The user is Daniel.

**🔴 PRODUCTION DISCIPLINE — non-negotiable post-cutover:**
- Test on **demo tenant** only. Reading from prizma is fine; NO writes to prizma without explicit Daniel approval.
- This SPEC is purely display-layer — it should NEVER need to write to any DB table. If you find yourself wanting to write — STOP, escalate.

This SPEC fixes Bug 3 from the AUTOMATION_FLOW_BUGS_TRIPLE triage (2026-05-04). Per Supervisor decision (`../AUTOMATION_FLOW_BUGS_TRIPLE/SUPERVISOR_DECISION.md`): **separate SPEC, pure display-layer fix**.

## The bug

In the event-detail screen, the "נרשמו" (registered) counter in the stats grid (under "מעקב קופונים") AND in the "מסלול המרה" (conversion funnel) widget BOTH count attendees in ALL statuses, including `invited`, `new`, `waiting_list`, `cancelled`. This is misleading.

Example from Daniel's QA: an event with 1 attendee in `invited` and 1 in `new` shows "נרשמו 2" — but neither is actually registered.

## What "registered" should mean

`status IN ('registered', 'confirmed', 'attended')`.

Should NOT count: `invited`, `new`, `waiting_list`, `cancelled`, `no_show`.

## Two-stage. opticup-strategic authors. opticup-executor implements.

## Clean-repo discipline

- **Session start:** First Action Protocol. Working tree clean. Stash any WIP.
- **Session end:** `git status` clean. Pop stash AFTER push.

## What needs to happen

### Step 1 — Locate the counter logic

Likely candidates:
- `modules/crm/crm-events-detail.js` — main event-detail view.
- `modules/crm/crm-events-detail-charts.js` — the conversion funnel chart.
- Any helper / view that aggregates attendees by status.

`grep -rn` for the Hebrew string "נרשמו" or for `total_registered` / `count_registered` to find the call sites.

### Step 2 — Define the canonical "is registered" predicate

Look for an existing constant or helper. Check:
- `modules/crm/crm-helpers.js` for status group constants.
- The `crm_statuses` table for any "is_registered_equivalent" flag.
- The view `v_crm_lead_event_history` to see how `total_events_attended` is computed (it filters `status='attended'` per REC-011 — this is a reference point, not necessarily what we want here).

If a constant doesn't exist:
- Add a single constant (e.g., `var REGISTERED_STATUSES = ['registered', 'confirmed', 'attended']`) in `crm-helpers.js`.
- Export it on `window.CrmHelpers.REGISTERED_STATUSES`.
- Use it everywhere the counter is computed.

This is Iron Rule 21 — no orphan, no duplicate. One predicate, one source of truth.

### Step 3 — Apply the predicate everywhere

For each counter / funnel widget that currently counts ALL statuses:
- Replace the broad count with `count(status IN REGISTERED_STATUSES AND is_deleted=false)`.
- Ensure `is_deleted=false` is preserved (no regression on soft-deleted attendees).

### Iron Rules

- Rule 7 (helpers).
- Rule 12 (file-size — small change).
- Rule 21 (single predicate, no duplicates).
- Rule 22 (defense-in-depth — `is_deleted=false` filter preserved).
- Rule 31 (integrity gate).
- Rule 9 #7 (no merge to main).

### Acceptance criteria (manual QA on demo)

1. Open event #11 ("אירוע המותגים טסט") in demo. Currently shows 1 invited + 1 new. After fix: "נרשמו" shows **0** (neither is registered).
2. Open event #13 ("טסט 555") in demo. Currently shows 1 invited + 1 new. After fix: "נרשמו" shows **0**.
3. Take any event with at least 1 `confirmed` or `attended` attendee. After fix: "נרשמו" matches the count of `registered + confirmed + attended` only.
4. Conversion funnel widget ("מסלול המרה") matches the new counter (no divergence between the two displays).
5. Regression: stats for "אישרו" / "הגיעו" / "רכשו" / "הכנסות" / "דמי הזמנה" remain unchanged (they use their own predicates).

### Stop triggers

- Predicate constant exists somewhere unexpected and is being used differently elsewhere → halt + escalate (Iron Rule 21 conflict).
- Counter logic touches DB views or backend code unexpectedly → halt + escalate (out of scope).
- Any file requires changes outside the display layer → halt + escalate.

### Out of scope

- Changing the underlying status taxonomy.
- Adding new statuses.
- Touching `automation-engine` EF, recipient resolvers, or any non-display code.
- Modifying any DB view.
- Bugs 1 and 2 (separate SPEC `ATOMIC_CONFIRMATION_FLOW`).

## Stage 1 — opticup-strategic authors the SPEC

1. Switch to `opticup-strategic` skill.
2. Verify SPEC folder. Author SPEC.md transposing Steps 1–3 above into the standard schema.
3. Survey 3 most recent FOREMAN_REVIEW.md files for proposals.
4. Hand off to executor.

## Stage 2 — opticup-executor

1. Switch to `opticup-executor` skill.
2. First Action Protocol — clean repo + integrity gate.
3. Implement per SPEC.
4. Test on demo for all 5 acceptance criteria.
5. Single commit: `fix(crm): event "נרשמו" counter — count only registered/confirmed/attended statuses`. Push to develop.
6. Write `EXECUTION_REPORT.md` + `FINDINGS.md` per opticup-executor protocol.
7. End-of-session: clean repo.

## After completion

Daniel runs the 5 acceptance criteria on demo (or production after PR-merge). If all pass → PR-merge to main (Daniel-only). Foreman writes FOREMAN_REVIEW.md.

## References

- Supervisor decision (binding): `../AUTOMATION_FLOW_BUGS_TRIPLE/SUPERVISOR_DECISION.md`
- Sibling SPEC (bugs 1+2): `../ATOMIC_CONFIRMATION_FLOW/`
- Overseer recommendation: REC-018 in `roles/campaign-overseer/DECISIONS_LOG.md`
- Iron Rules: `CLAUDE.md` §4–§6
- Production discipline: auto-memory `feedback_production_discipline_post_cutover.md`
