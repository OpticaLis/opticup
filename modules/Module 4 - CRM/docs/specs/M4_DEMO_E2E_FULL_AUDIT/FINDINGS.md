# FINDINGS — M4_DEMO_E2E_FULL_AUDIT

**Run:** 2026-05-11 Full-Auto Pipeline overnight
**SPEC:** `modules/Module 4 - CRM/docs/specs/M4_DEMO_E2E_FULL_AUDIT/`

3-bucket classification per Brief §5:
- 🟢 = Fixed in this Pipeline (confident)
- 🟡 = Fixed but uncertain — Daniel review
- 🔴 = Not Fixed — needs Architect
- ℹ️ = Documentation observation, no fix applied

---

## F1 🟢 — Bug §3 audience + auto-attach on event_invite_waiting_list rules

**Status:** Fixed in this Pipeline (Commit `f6245b1` audit trail; DB writes 19:49:50 UTC).
**Severity:** HIGH (customer-facing — phantom attendees preempt capacity, real registrants get bumped to waitlist).
**Scope:** Demo tenant, 2 rule rows (`a06be5d8` + `ee0a6f24`).
**Evidence:** `FIX_VERIFICATION.md`.
**Rollback:** `PRE_FIX_RULE_SNAPSHOT.json` contains the 2 pre-fix `action_config` payloads.

The bug had two intertwined parts:

1. **Wrong audience** (Bug §3.1) — recipient_type was `cross_event_active_waitlist` (filter on `crm_event_attendees.status` on OTHER events). Daniel's intent per Brief §3 was filter on `crm_leads.status='waitlist'` on the main board. Fix: change to `recipient_type='leads_by_status'` with `recipient_status_filter=['waitlist']`. The `leads_by_status` resolver already existed in both browser and EF code paths — no code change required.

2. **Auto-attach side-effect** (Bug §3.2) — both rules had `post_action_attendee_upsert: {status:'invited'}` which triggered `attendeeUpsert()` in `supabase/functions/automation-engine/post-actions.ts:43-79` to UPSERT each recipient into the new event's `crm_event_attendees` table with status='invited'. This phantom-attached recipients before they had any chance to actually register, preempting capacity. Fix: remove the `post_action_attendee_upsert` config from both rules (gate is `if (!cfg || !cfg.status) return;` — removing the key skips the upsert entirely).

Rule `82aac348` (`event_invite_new`) intentionally retained its auto-attach — that's the legitimate "new invitation" flow (Rule 2.2 per code comments in `post-actions.ts:41`).

---

## F2 ℹ️ — 6 inactive QA test rules cluttering crm_automation_rules

**Status:** No fix applied. Daniel-decide cleanup.
**Severity:** LOW (inactive — they don't fire).
**Rows:**

| id | name |
|---|---|
| `3046b351` | QA TEST RULE — qa_redesign_test |
| `b8aae579` | qa_round1_test_rule_events |
| `24f5124a` | qa_redesign_test_rule_events |
| `3954cafd` | qa_round1_test_rule_incoming |
| `3244f354` | qa_round1_test_rule_tier2 |
| `aeaa1679` | qa_round1_test_rule_attendees |

All have `is_active=false`. Recommendation: hard-delete these 6 rules + their associated test templates (`qa_redesign_test_*`, `qa_round1_test_template_*`) in a small follow-up SPEC. The Pipeline didn't delete them autonomously because Brief §2 forbids DELETE on pre-test demo data, and these were created by earlier QA runs.

---

## F3 ℹ️ — Rule `7b5929d6` "שינוי סטטוס: אירוע הושלם" uses misleading action_type

**Status:** No fix applied. Pattern review recommended.
**Severity:** LOW (works correctly, but design is confusing).
**Row:** `7b5929d6-c2a4-41a2-9b40-f43fe29e74d9` "שינוי סטטוס: אירוע הושלם" (event_completed trigger).

The rule has `action_type='send_message'` but:
- `channels: []` (empty array)
- `template_slug: null`
- `post_action_status_update: 'waiting'`

So the "send_message" action sends nothing. Its purpose is purely to fire the `post_action_status_update`: reset all `crm_leads.status` to `'waiting'` when an event completes (so attendees become eligible for the next event's "ready for invitation" flow).

Recommendation: refactor the rule schema so a rule can have action_type='update_lead_status' (or similar) as a first-class action, without the misleading send_message wrapper. Or, document this pattern explicitly in the automation rule schema docs. Defer to a Module 4 hygiene SPEC.

---

## F4 ℹ️ — Pre-existing phantom row on event `95ff8ba7` (Daniel's screenshot reference)

**Status:** No fix applied. Daniel-decide soft-delete.
**Severity:** LOW (test artifact, demo only).

Event `95ff8ba7` "אירוע טסט 5" has attendee `278114b7-0632-4bfa-bef8-df0cf6bccd15` ("P55 Daniel Secondary" / +972503348349 / `status='invited'`) created at 2026-05-11 19:19:12 — BEFORE this Pipeline ran. This is the phantom Daniel captured in the screenshot that triggered the audit. Brief §2 forbids hard-deleting pre-test demo data. Recommendation: Daniel may soft-delete this row in the morning if desired, OR leave it as a permanent reference of the pre-fix state for documentation purposes.

There is also attendee `81d7142a` (דניאל טסט / status='waiting_list') on the same event — Daniel's later real-registration attempt that got bumped to waitlist because the phantom slot was already taken.

---

## Items checked, no finding

- Phone duplicates on active demo leads: **0** (✓)
- Orphan attendees (no matching lead): **0** (✓)
- Orphan attendees (no matching event): **0** (✓)
- Leads with invalid tenant_id: **0** (✓)
- Activity_log `NULL entity_id` entries: **243 — all legitimate** (237 page-view audits + 5 image bg-removal + 1 bulk-status-change; none are orphans)
- Templates referenced by active rules but missing: **0** (the false-positive `missing_active_template_slugs` list returned earlier is because rules reference base slugs while templates store fully-qualified `{base}_{channel}_{language}` slugs — the EF correctly resolves via prefix)
- Prizma rows: **bit-identical** (MD5 hash preserved, all counts identical, max(crm_leads.updated_at) unchanged at 2026-05-11 16:27:12)

---

## Deferred (UI-required, out of this Pipeline's scope)

See `AUDIT_REPORT.md` §3 for the full list of 14 deferred scenarios (Block A1-A4, A7, B3-B4, B7-B8, C2-C3, D1-D4, E1-E5, F1-F6 portion). Recommend a follow-up Pipeline once the local stack is started, using `scripts/start-local.ps1` + Chrome MCP for end-to-end UI flow coverage.
