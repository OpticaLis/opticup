# READY-FOR-MAIN-MERGE — PRIZMA_CRM_BUGFIX_BACKPORT

**Prepared:** 2026-05-12 by Full-Auto Pipeline
**Pre-write tag:** `pre-backport-prizma-event-invite-fix` (annotated on `bccbc1a1a264fa9c126176e96d532d18c0e9495d`)
**Verdict:** 🟢 Clean — see `ARCHITECT_REVIEW_CHECKPOINT.md`

This file gives Daniel everything needed to merge the SPEC to `main` via a GitHub PR. **Only Daniel can authorize the merge** (Iron Rule from CLAUDE.md §9, working rule #7).

---

## PR Title

```
fix(crm): backport event-invite waitlist fix to Prizma
```

## PR Body

```markdown
## Summary

Backport of the data-only fix shipped to demo on 2026-05-11 (E2E audit
SPEC `M4_DEMO_E2E_FULL_AUDIT`) — applied here to Prizma's production
tenant.

Two rows in `crm_automation_rules` had `recipient_type='cross_event_active_waitlist'`
plus a `post_action_attendee_upsert={status:'invited'}` key, causing:
1. The `event_invite_waiting_list` template to be sent to the wrong
   audience (any active waitlist/invited attendees on parallel events,
   not the intended main-board `crm_leads.status='waitlist'` audience).
2. Every recipient was auto-attached as `invited` to the newly-opened
   event, pre-empting capacity.

The fix rewrites `action_config` on those 2 rows to:
- `recipient_type='leads_by_status'`
- `recipient_status_filter=['waitlist']`
- removes the `post_action_attendee_upsert` key entirely.

After the fix, the rules' `action_config` md5s match demo's post-fix
md5s byte-for-byte (same shape across tenants).

## Changes

- **Data-only:** 2 single-row UPDATEs on `crm_automation_rules`
  (Prizma tenant_id only, rules `d2585fc4-…` + `c25feaf7-…`).
- **No code changes**: `automation-engine` EF, frontend, schema all
  untouched.
- **No new files** in `js/`, `supabase/functions/`, or `modules/<code>`.
- **SPEC folder added:** `modules/Module 4 - CRM/docs/specs/PRIZMA_CRM_BUGFIX_BACKPORT/`
  with SPEC, DIAGNOSIS, TEST_REPORT, ROLLBACK_SQL, ARCHITECT_REVIEW_CHECKPOINT,
  EXECUTION_REPORT, FINDINGS, FOREMAN_REVIEW.

## Verification done before merge

- 16 Prizma automation rules pre/post: 14 untouched (aggregate md5
  unchanged), 2 target rules now byte-identical to demo's post-fix
  shape.
- Demo's 2 fixed rules (`a06be5d8-…`, `ee0a6f24-…`) unchanged (post-
  E2E-audit md5s preserved).
- EF `automation-engine` `mode='evaluate'` invoked twice on Prizma
  (triggers `registration_open` + `invite_waiting_list`) — produced 0
  outbound messages, 0 attendee inserts, 0 queue inserts. The fixed
  rules produced 0 plan_items (correct: Prizma has 0 waitlist-status
  leads currently).
- Side-effect tables on Prizma unchanged: `crm_message_log` 396→396,
  `crm_message_queue` 0→0, `crm_event_attendees` 219→219.
- `npm run verify:integrity` exit 0.
- `npm run smoke` 7/7 PASS.

## Rollback

Pre-write annotated git tag exists: `pre-backport-prizma-event-invite-fix`.
DB-level rollback SQL is captured verbatim in
`modules/Module 4 - CRM/docs/specs/PRIZMA_CRM_BUGFIX_BACKPORT/ROLLBACK_SQL.md`.

## Test plan

- [ ] Daniel reviews `ARCHITECT_REVIEW_CHECKPOINT.md`
- [ ] Daniel merges via GitHub dashboard (squash or merge)
- [ ] Daniel observes the next time a Prizma event flips to
      `registration_open` that NO auto-attaches happen
```

## Compare / PR URL

```
https://github.com/opticalis/opticup/compare/main...develop?expand=1
```

(Title + body above can be pasted directly into the PR creation form.)

---

## What NOT to do

- ❌ Do not push develop → main via `git push origin main` from CLI. Use the GitHub PR/merge UI only.
- ❌ Do not amend or rewrite the SPEC commits after they ship to develop. Add follow-up commits if anything needs adjusting.
- ❌ Do not skip the PR review step — the diff is small but the data semantics matter (Prizma is production).

---

*End of READY-FOR-MAIN-MERGE.*
