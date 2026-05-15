# Waitlist Flow Investigation + Test-Lead Cleanup — Brief

**Brief version:** v1
**Date:** 2026-05-13 (late night, after Overnight Harvest)
**Author:** Architect (`opticup-architect`)
**Hand-off to:** Full Auto Pipeline (single Claude Code chat, ~1-1.5 hours)
**Model preference:** Sonnet (mostly investigation + 1 row UPDATE + docs — Opus not needed)
**Owning module:** Module 4 — CRM
**Mode:** Mostly READ-ONLY investigation + ONE single-row UPDATE on Prizma (Daniel-approved) + close M4_DEAD_WAITLIST_SLUG_CLEANUP SPEC with revised verdict.

---

## 1. Purpose

The Overnight Audit Harvest run flagged SPEC #3 (M4_DEAD_WAITLIST_SLUG_CLEANUP) for escalation: the audit claimed 0 leads carry `status='waitlist'` on Prizma, but reality has 1 lead — a test lead Daniel himself created.

When this escalation reached Daniel, a deeper question surfaced: **the `waitlist` status was never dead.** Per Daniel's product intent, when a lead registers for a full event, the lead's `crm_leads.status` should automatically transition to `'waitlist'` on the Tier 2 board ("רשומים"). If 0 leads carry the status today despite past events (#22, #23) reaching/exceeding capacity, the conclusion is NOT "the status is dead and can be removed" — the conclusion is **"the automatic-transition flow is broken or never implemented."**

This Brief does three things:

1. **Move the test lead** from `status='waitlist'` to `status='waiting'` on Prizma (Daniel-explicitly-approved single UPDATE).
2. **Close SPEC M4_DEAD_WAITLIST_SLUG_CLEANUP with REVISED verdict** — DO NOT soft-delete the `waitlist` slug from `crm_statuses`. Keep it available.
3. **Investigate** the actual capacity-reached → waitlist flow: is it implemented? where? if broken, what's the failure mode? Produce a report.

Daniel's directive (verbatim, 2026-05-13): "אם הפלואו שתיארתי לא קיים אנחנו נתקן את זה" — meaning a fix SPEC may follow this investigation. But this Brief's deliverable is the investigation report ONLY. No fix is in scope here.

---

## 2. Daniel's Locked Decisions

| # | Topic | Decision |
|---|---|---|
| 1 | Move the test lead waitlist→waiting on Prizma? | YES, Daniel-approved single-row UPDATE. |
| 2 | Soft-delete the `waitlist` slug from `crm_statuses`? | **NO. Do NOT remove. Keep it available regardless of current usage.** |
| 3 | Investigate the capacity-reached → waitlist transition flow? | YES, produce a report. |
| 4 | Author a fix SPEC from this investigation? | NO in this Brief. Decision after Daniel reads the report. |

---

## 3. Scope

### 3.1 Test-lead cleanup (1 single-row UPDATE on Prizma)

Locate the 1 Prizma lead currently at `status='waitlist'`:
```
SELECT id, full_name, phone, email, status, created_at
FROM crm_leads
WHERE tenant_id = (SELECT id FROM tenants WHERE slug='prizma')
  AND status = 'waitlist'
  AND is_deleted = false;
```

Confirm with the Brief that this is the test lead (it will likely be Daniel's name or one of the whitelisted test phones). Then:
```
UPDATE crm_leads
SET status = 'waiting', updated_at = now()
WHERE id = '<the one row id>'
  AND tenant_id = (SELECT id FROM tenants WHERE slug='prizma')
  AND status = 'waitlist';
```

Exactly ONE row affected. Verify post-UPDATE that count of `waitlist` on Prizma is 0. The `waitlist` slug ROW in `crm_statuses` is NOT touched — only this lead's `status` value.

This is the ONLY Prizma write in this Brief. Everything else is read-only.

### 3.2 Close SPEC M4_DEAD_WAITLIST_SLUG_CLEANUP with revised verdict

The SPEC was escalated mid-Overnight-Harvest with file `modules/Module 4 - CRM/escalations/2026-05-13_2350Z_OVERNIGHT_BLOCKER_M4_DEAD_WAITLIST_SLUG_CLEANUP.md` open. Close it cleanly:

- Write FOREMAN_REVIEW.md (or close the existing SPEC folder) with verdict 🟡 CLOSED-WITH-REVISED-SCOPE.
- The revised scope: test lead moved (§3.1), `waitlist` slug INTENTIONALLY RETAINED, follow-up investigation queued (§3.3).
- Update the escalation file to status=RESOLVED with link to the investigation report this Brief produces.

### 3.3 Waitlist-flow investigation

Investigate concretely: when a lead registers for a full event, does the system automatically transition `crm_leads.status` to `'waitlist'`?

Investigate in this order:

**(a) Code search:**
- `grep -rn "waitlist" modules/crm/ supabase/functions/` — every reference to the literal string.
- `grep -rn "waitlist" supabase/migrations/` — historical migrations that ever touched the status.
- Specifically inspect `event-register` EF, `register_lead_to_event` RPC, automation rules in `crm_automation_rules` table.

**(b) DB search:**
```
SELECT proname, prosrc FROM pg_proc
WHERE pronamespace='public'::regnamespace
  AND prosrc ILIKE '%waitlist%';
```
Lists every SQL function body that mentions the slug.

```
SELECT id, slug, trigger_event, conditions, actions, is_active
FROM crm_automation_rules
WHERE conditions::text ILIKE '%waitlist%' OR actions::text ILIKE '%waitlist%';
```
Lists every automation rule that touches it.

**(c) Historical evidence:**
Check `crm_message_log` and `activity_log` (or whatever audit table M4 uses) for any past lead that EVER carried `status='waitlist'`. If zero historical evidence, the flow has never fired in production.

**(d) Capacity-reached check:**
Check what the system DOES today when a lead registers for a full event:
- Read the `event-register` EF source.
- Read `register_lead_to_event` RPC body.
- Walk the code path: lead clicks `%registration_url%` → token resolved → event capacity checked → ??? → DB write → status assignment.
- What's the actual current behavior when an event is at `max_capacity`? Does the registration fail? Does the lead get a different status? Does the attendee row get a special status but the lead's main board status stay unchanged?

**(e) Cross-reference Daniel's intent:**
Daniel's product intent: when capacity is reached, the lead's `crm_leads.status` on the main Tier 2 board changes to `'waitlist'`. The attendee row may also exist with a status of its own. **The relevant signal is the LEAD's status, not the attendee row's status.**

Produce a report at:

`modules/Module 4 - CRM/docs/audits/WAITLIST_FLOW_INVESTIGATION_2026_05_13.md`

Structure:
```
# Waitlist Flow — Investigation Report

## 1. Executive Summary (≤200 words)
   - Is the flow implemented? Yes / No / Partial
   - If partial: where it works, where it breaks
   - Recommendation: fix-and-restore (build the missing piece) OR redesign

## 2. Evidence
   - Code references found (file path + line)
   - DB function bodies that mention waitlist
   - Automation rules that touch waitlist
   - Historical lead-status records (any past `status='waitlist'` lead anywhere in audit trail?)

## 3. Current behavior — actual capacity-reached flow
   - Trace the code path step-by-step
   - What status DOES get assigned to the lead when capacity is reached?
   - What status gets assigned to the attendee row?

## 4. Gap analysis vs Daniel's intent
   - What's missing for `lead.status='waitlist'` to fire on capacity-reached?
   - 3 reasonable options for closing the gap, with pros/cons each

## 5. Recommendation
   - One concrete fix path, with reasoning

## 6. Out-of-scope notes
   - Anything that surfaced during investigation that isn't waitlist-flow-related but worth flagging
```

---

## 4. Safety Envelope

### 4.1 Safety tag
First action: create annotated tag at HEAD of develop.
```
git tag -a pre-waitlist-investigation-2026-05-13 -m "Pre-waitlist-investigation baseline"
git push origin pre-waitlist-investigation-2026-05-13
```

### 4.2 Prizma write — narrow scope
- ONLY the single-row UPDATE in §3.1.
- Pre-UPDATE: confirm exactly 1 matching row.
- Post-UPDATE: confirm exactly 1 row affected + post-state count of `waitlist` on Prizma is 0.
- If pre-UPDATE returns more than 1 row → STOP, escalate. The test lead premise was wrong.
- If post-UPDATE row count is not exactly 1 → STOP, escalate.

### 4.3 No DDL
- This Brief authorizes ZERO DDL. No ALTER, CREATE, DROP. The investigation is SELECT-only against `pg_proc`, `crm_automation_rules`, `crm_message_log`, etc.

### 4.4 No merges to main
- Everything on develop.

### 4.5 Commit budget
- Estimated 3-5 commits: 1 UPDATE migration (single-row, Prizma) + 1 SPEC retro close + 1 escalation-file resolution + 1 investigation report. Cap at 6.

### 4.6 Escalation
- If §3.1 returns unexpected (multiple rows, or wrong row), STOP, escalate.
- If §3.3 surfaces evidence that the flow exists but is silently broken in a way that's CURRENTLY harming production (e.g., events going to capacity but no leads getting flagged), STOP at the report step, surface the finding clearly in the Executive Summary, do not attempt a fix.

---

## 5. Pipeline Selection

Standard Full Auto Pipeline:
- `opticup-strategic` (Foreman) authors the close of SPEC #3 + the investigation SPEC.
- `opticup-executor` does the §3.1 UPDATE + the §3.2 SPEC close + the §3.3 investigation grunt work.
- `opticup-reviewer` audits the migration (1 row, narrow scope).
- `opticup-localhost-tester` confirms the UPDATE didn't break anything (smoke 7/7).
- `opticup-strategic` (Foreman-Review) closes everything.

Sonnet model. Investigation + 1 row UPDATE + docs — no need for Opus.

---

## 6. Communication

English status updates between phases. ONE concise English summary at the end pointing Daniel to:
- The investigation report file path.
- The verdict (flow implemented / not / partial).
- A clear recommendation about whether to author a fix SPEC next.

---

*End of Brief. Activation prompt at `WAITLIST_FLOW_INVESTIGATION_ACTIVATION_PROMPT.md`.*
