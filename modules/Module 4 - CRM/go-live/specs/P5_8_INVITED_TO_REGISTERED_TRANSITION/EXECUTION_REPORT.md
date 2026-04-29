# EXECUTION_REPORT — P5_8_INVITED_TO_REGISTERED_TRANSITION

**Executor:** opticup-executor (Claude Opus 4.7, 1M ctx)
**Date:** 2026-04-29
**Status:** ✅ Code + DB shipped to develop. ⚠️ Lead-intake EF redeploy pending Daniel's CLI command (MCP deploy hit internal-server errors twice — handed off).
**Commits:** `72774d9` (Fix A), `008c7ea` (Fix B), `98dc5df` (Fix C source).

---

## 1. Summary

3 fixes shipped on develop in 3 separate commits per the SPEC's commit plan. RPC migration (Fix A) and trigger migration (Fix B) applied to both Prizma + demo via Supabase MCP `apply_migration`; both verified post-deploy. Fix C edits `dispatch.ts` and is committed but the lead-intake EF redeploy via Supabase MCP `deploy_edge_function` failed twice with `InternalServerErrorException`, so deploy was handed off to Daniel's local Supabase CLI. Daniel's Flow 4 UAT remains the live verification of all 3 fixes end-to-end.

---

## 2. What was done

### Fix A — RPC promote `invited → registered`
- Captured prior RPC body verbatim into `register_lead_to_event-pre-p5_8.sql` (rollback evidence).
- Wrote new RPC body into `register_lead_to_event-post-p5_8.sql` with the new `invited` branch + capacity-count exclusion (`id <> v_existing.id`).
- Applied via MCP `apply_migration` name `p5_8_register_lead_to_event_invited_promote` to project `tsxrrxzmdxaenlvocyit` — success.
- Post-deploy verification: function-body markers confirmed (`P5_8 Fix A: invited rows`, `IF v_existing.status = 'invited' THEN`, `id <> v_existing.id`).
- Caller compatibility verified pre-deploy via grep:
  - `supabase/functions/event-register/index.ts:268` (storefront form path) — return shape unchanged.
  - `modules/crm/crm-event-register.js:69` (CRM admin manual-register UI) — return shape unchanged.
- **Commit:** `72774d9`.

### Fix B — Cascade trigger + 2-orphan backfill
- Wrote `cascade_attendee_soft_delete.sql` containing the function, trigger, and backfill statements.
- Applied via MCP `apply_migration` name `p5_8_cascade_attendee_soft_delete` — success.
- Post-deploy verification:
  - B1: trigger `crm_leads_cascade_attendee_soft_delete_trg` exists, enabled (tgenabled='O').
  - B5: 2 known orphans now `is_deleted=true`, status preserved (`f314d1f7` status='invited', `1b4a4f13` status='confirmed').
  - B6: zero-orphans audit — 0 orphans on Prizma, 0 orphans on demo.
- **Commit:** `008c7ea`.

### Fix C — `dispatch.ts` amendment
- Edited `supabase/functions/lead-intake/dispatch.ts` `dispatchFreshLead` to add a best-effort `UPDATE crm_leads SET status='invited'` on the T5 branch only. Try/catch, no throw.
- Verified `'invited'` is a valid lead status: TIER2_STATUSES in `crm-helpers.js:92` + `crm_statuses` table on both tenants.
- Attempted MCP `deploy_edge_function` twice with full bundle (index.ts + dispatch.ts + deno.json) — both attempts failed with `InternalServerErrorException`. Second attempt with reduced payload also failed.
- Committed source-only and handed deploy off to Daniel's CLI.
- **Commit:** `98dc5df`.

### Pre-execution
- SPEC.md updated to use `'invited'` per Daniel's pre-execution decision (not `'waiting'`). Affected: §1 Goal, §2 Background Fix C bullet, §3 C1, §3 C5.

---

## 3. Deviations from SPEC

### Deviation 1 — Fix A success criterion A7 not run on canary attendee

**SPEC said:** "Live RPC on Prizma + demo successfully promotes the canary attendee `ce1e02a9-...` from `invited` to `registered` when `register_lead_to_event` is called."

**What I did:** Did NOT call the RPC against `ce1e02a9-...`. Calling it would have promoted the row, after which Daniel's Flow 4 UAT (success criterion X1) would hit `already_registered` because the canary attendee would already be `registered` instead of `invited` — defeating the UAT.

**Why this is OK:** the SPEC has an internal contradiction between A7 and X1: A7 wants me to do exactly what X1 wants Daniel to do via the form. Daniel's UAT is the higher-fidelity test (it exercises the storefront form → event-register EF → register_lead_to_event RPC → confirmation template chain). I preserved Daniel's UAT setup. Function-body markers (verified) confirm the new code is deployed.

**Risk:** if the new RPC has a runtime bug not caught by markers, Daniel will hit it during UAT instead of me catching it pre-handoff. Mitigation: the new branch is structurally simple (capacity check + UPDATE + RETURN); the new code paths are idempotent and reversible.

### Deviation 2 — Fix C MCP deploy failed; handed off to Daniel CLI

**SPEC said:** apply Fix C end-to-end, including EF redeploy.

**What happened:** `mcp__claude_ai_Supabase__deploy_edge_function` returned `InternalServerErrorException` twice. First attempt with full file bundle (index.ts + dispatch.ts + deno.json), second with reduced payload.

**What I did:** committed the source edit (so the change is durable in git + visible in code review) and surfaced this as a Daniel-side action (one CLI command). Logged in commit message + this report.

**Risk:** until Daniel runs the CLI deploy, T5 dispatches will land leads with `status='new'` instead of `'invited'`. This blocks Flow 4 UAT verification of C5 (the lead status chain) — but does NOT block Fix A and Fix B from working, and Daniel's UAT can still verify the form path is unblocked (the primary cutover-blocking issue).

---

## 4. Real-time decisions made

### Decision 1 — Capacity-count exclusion via `id <> v_existing.id`
The SPEC §5 critical note flagged the double-count gotcha but didn't prescribe the exact mitigation. I implemented it by re-running the capacity count with `WHERE id <> v_existing.id` in the promote branch — cleaner than off-by-one arithmetic on `v_current_count`. Documented the choice in the migration's comment block.

### Decision 2 — `v_promote_status` local variable
The new branch needed to compute the target status (`registered` vs `waiting_list`/`event_closed`) once and use it both in the UPDATE and the JSONB return. Introduced `v_promote_status text` to avoid duplicating the `CASE` expression. Minor stylistic choice; not in SPEC.

### Decision 3 — Bulk catch-all backfill statement
SPEC's B6 success criterion required zero-orphans on both tenants but didn't prescribe how to achieve it beyond the 2 named orphans. Added a bulk `UPDATE ... FROM crm_leads l ... WHERE l.is_deleted=true AND a.is_deleted=false` to the migration so any other orphans (we couldn't enumerate up-front) also get caught. Audited post-apply: 0 on each.

### Decision 4 — Skipping A7 destructive test (see Deviation 1)
Documented above.

### Decision 5 — Lower-fidelity Fix C verification
With the EF redeploy stuck, I cannot run a synthetic lead-intake call to verify C1 → C5 in isolation. Daniel's UAT will be the verification.

---

## 5. What would have helped me go faster

1. **A standardized way to deploy edge functions when MCP fails.** The deploy MCP failed with an unactionable internal error and there's no fallback documented in the executor skill. I improvised by committing source + handoff. Worth adding to the skill: "If MCP deploy fails twice, commit source + emit a clear handoff message with the exact CLI command. Do not block on retries."
2. **An RPC unit-test harness.** I wanted to run `register_lead_to_event` against a scratch lead+event to verify A1–A6 deterministically, but the only DB I have is shared with Daniel's UAT setup. A dedicated test schema or a "scratch tenant" for in-session smoke tests would have given me higher confidence than function-body-marker verification.
3. **A pg_get_triggerdef invocation that worked first try.** The first multi-statement query that mixed UNION-ALL with mismatched types (uuid vs name) failed; second attempt cast to ::text. Trivial but cost a round trip.

---

## 6. Self-assessment

| Criterion | Score (1–10) | Justification |
|---|---|---|
| (a) SPEC adherence | 8 | All 3 fixes shipped to spec; deviation 1 is a SPEC-internal contradiction I handled correctly; deviation 2 was an external tooling failure outside my control. |
| (b) Iron Rules | 10 | Integrity gate ran before each commit, all clear. Explicit `git add` per file, no wildcards. No main-branch touches. RLS unchanged. No secrets exposed. tenant_id present on all DB writes. |
| (c) Commit hygiene | 9 | 3 commits as planned; clear "why" in each subject + body; co-author trailer; no amends; no force-push. Minor: I would have squashed the SPEC-edit + Fix-A migration + Fix-A SQL files into one commit if writing fresh, but separating SPEC text from migrations is also defensible. |
| (d) Documentation currency | 8 | SPEC was updated pre-execution to reflect status='invited'. Pre/post SQL files in the SPEC folder. EXECUTION_REPORT writes in the same commit as the close-out. Did NOT update GLOBAL_MAP.md or GLOBAL_SCHEMA.sql for the new trigger function — that's an Integration Ceremony task and the SPEC didn't authorize it. Foreman should pick it up. |

---

## 7. Iron-Rule Self-Audit

| Rule | Touched? | Result |
|---|---|---|
| 1 — Atomic quantity changes | No | N/A |
| 2 — writeLog() | No | N/A — server-side EF/RPC, ActivityLog is browser-engine only |
| 3 — Soft delete only | YES (Fix B) | Trigger ONLY sets is_deleted=true; never DELETE; idempotent on the false→true edge |
| 5 — FIELD_MAP for new fields | No | No new fields; reused `crm_event_attendees.is_deleted` and `crm_leads.is_deleted` (existing) |
| 7 — DB via helpers | N/A | Server-side EF; helpers are browser-side |
| 8 — No innerHTML with user input | N/A | Server-side |
| 9 — No hardcoded business values | OK | Hebrew "ליד חדש לאירוע פעיל (T5)" RULE_NAMES already in dispatch.ts pre-this-SPEC; not introduced here. Rule 9 violations in `event_registration_confirmation_sms_he` template (053-364-5404, location) explicitly out-of-scope per SPEC §7 |
| 12 — File size <350 | OK | dispatch.ts now 176 lines (was 163, +13). Well under cap |
| 14 — tenant_id on every table | OK | No new tables. Trigger function scopes by `NEW.tenant_id` |
| 15 — RLS on every table | OK | No new tables |
| 18 — UNIQUE includes tenant_id | OK | No new uniques |
| 21 — No Orphans, No Duplicates | OK | Cross-Reference Check in SPEC §11 (8 hits, 0 collisions). New names verified absent before creation |
| 22 — Defense-in-depth on writes | OK | Trigger UPDATE includes both `lead_id` and `tenant_id` in WHERE; Fix C UPDATE includes both `id` and `tenant_id` |
| 23 — No secrets | OK | No new secrets. Existing legacy ANON_KEY in dispatch.ts unchanged (already present in repo per index.ts comment) |
| 31 — Integrity gate | OK | Ran before each of 3 commits, all clear |

---

## 8. Self-Improvement Mandate — 2 proposals to improve opticup-executor

### Proposal 1 — MCP-deploy fallback protocol

**Section to update:** `SKILL.md` § "Execution Loop" or a new § "Tooling Fallbacks".

**Change:** Add explicit fallback protocol for when an MCP tool fails with an internal error (vs. a permissions/validation error):
> "If an MCP tool call fails with `InternalServerErrorException` or similar opaque server error, retry once with a minimal payload. If still failing, do NOT loop — commit the underlying source change to git (so it's durable + reviewable), emit a clear handoff message naming the equivalent CLI/dashboard action, and proceed to the next SPEC step. Log the tool failure in `EXECUTION_REPORT.md` Deviations section. The integrity of the SPEC's git+DB state takes priority over completing every action through MCP."

**Rationale:** in this SPEC, the MCP `deploy_edge_function` failed twice with no actionable error. Retrying further would have wasted context. The current skill doesn't prescribe how to handle this — I improvised, but a documented fallback would let future executors handle it without inventing a strategy mid-stream.

### Proposal 2 — Scratch-tenant smoke-test pattern

**Section to update:** `SKILL.md` § "SQL Autonomy Levels" or new § "Pre-Handoff Smoke Tests".

**Change:** Add guidance:
> "For RPCs/triggers/EFs that have a destructive 'live test' criterion in the SPEC, prefer running the smoke test against a scratch tenant (UUID `00000000-0000-0000-0000-000000000099` reserved if not already used) seeded for the test, then teardown. This gives deterministic verification without disturbing real-tenant state. If no scratch tenant is available, document the deferral to user-UAT explicitly and verify deployment via function-body markers / catalog queries instead."

**Rationale:** SPEC §3 A7 wanted me to run the new RPC against the canary attendee for verification, but doing so would have broken Daniel's UAT setup. A scratch-tenant pattern would have let me run A7 deterministically + still preserve the UAT canary. I improvised verification via function-body markers; a documented pattern would generalize this.

---

## 9. Hand-off to Daniel

### Required: 1 CLI deploy

```bash
supabase functions deploy lead-intake --project-ref tsxrrxzmdxaenlvocyit
```

Run from any machine with the Supabase CLI configured (Daniel's Windows desktop, laptop, or Mac per CLAUDE.md §9). After deploy succeeds:
- New T5 dispatches will set `crm_leads.status='invited'` (Fix C live).
- Until then, Fix A + Fix B are live but Fix C is dormant — T5 still creates lead with `status='new'`.

### State right now (Prizma develop, ready for Daniel's Flow 4 UAT)

- **Lead** `a262bc0e-26aa-4a2d-a401-16e4998f382e` ("T5 Canary Post-Shorten") — `status='new'` (will become 'invited' once EF deploys + a fresh T5 fires; for now it's still 'new' from the earlier canary run).
- **Attendee** `ce1e02a9-8a08-46fc-8dcf-00cf0a013ca5` (in V4 Edge volume) — `status='invited'`, `is_deleted=false`. **This is the row Daniel's UAT will promote via the form.**
- **Event** "V4 Edge volume" — status=`registration_open`, max_capacity=50, current occupied count: 1 (just `ce1e02a9` after the orphan backfill).

### Daniel's Flow 4 UAT steps

1. Open the T5 SMS or T5 email on +972537889878 / `daniel@prizma-optic.co.il` from the canary run earlier today (commit `cc297af` SMS template).
2. Tap the registration link (short URL `https://prizma-optic.co.il/r/XXXXXXXX`).
3. Form should open WITHOUT "כבר נרשמת" rejection (Fix A live).
4. Submit the form.
5. Confirmation page should appear.
6. `event_registration_confirmation_sms_he` SMS should arrive on the phone — natural canary for one of the 6 templates shortened today.
7. Confirmation email should arrive.

### Expected post-UAT state (verifiable by SQL)

- `attendee.status` = `registered` (was `invited`)
- `lead.status` = `confirmed` (sync_lead_status_from_attendee maps registered → confirmed)
- `crm_message_log` contains 2 new rows (sms+email) for `event_registration_confirmation_sms_he` with `status='sent'`
- Make scenario 9104395 has 2 new executions with status=1
- DLQ count remains 4

### Side findings logged to FINDINGS.md

None for this SPEC.

---

## 10. Awaiting Foreman review

Awaiting Foreman review and Daniel UAT for Flow 4 retest.
