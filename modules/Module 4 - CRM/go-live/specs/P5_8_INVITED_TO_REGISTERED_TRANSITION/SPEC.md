# SPEC — P5_8_INVITED_TO_REGISTERED_TRANSITION

> **Module:** Module 4 — CRM
> **Location:** `modules/Module 4 - CRM/go-live/specs/P5_8_INVITED_TO_REGISTERED_TRANSITION/`
> **Authored by:** opticup-strategic (Foreman) — 2026-04-29
> **Status:** READY FOR DANIEL REVIEW — **CUTOVER-BLOCKING**, must land before 2026-05-03 morning.
> **Estimated effort:** 1.5–2.5h (1 RPC migration, 1 trigger migration, 1 EF amendment, retest Flow 4).
> **Origin:** Discovered 2026-04-29 during QA Flow 4. T5 dispatch (`dispatchFreshLead`, Rule 2.1, added 2026-04-28) upserts `crm_event_attendees` with `status='invited'` BEFORE the customer reaches the registration form. The storefront form's POST → `register_lead_to_event` RPC then rejects with `error: 'already_registered'` because the RPC's existing-attendee branch treats any `is_deleted=false` row as registered, regardless of `status`. Customers who receive T5 cannot complete registration. Daniel verified ground truth: attendee row was created 426 ms after T5 SMS dispatch, by Rule 2.1, in the canary's own run — not leftover state.

---

## 1. Goal

Restore end-to-end customer registration for SuperSale T5 invitees by (A) teaching `register_lead_to_event` RPC to promote `invited → registered`, (B) cascading attendee soft-deletes when a lead is soft-deleted (closes orphan-attendee class of bug + 2 known orphans), and (C) landing T5-recipient leads in Tier 2 (`status='invited'`) immediately — matching the attendee row's `status='invited'` from the same dispatch and putting them in the broadcast pool for future T4 events.

---

## 2. Background & Motivation

### The bug, in one sentence

Two correct-in-isolation pieces of code (Rule 2.1 attendee pre-creation in `dispatchFreshLead` + the pre-existing `register_lead_to_event` RPC) were never reconciled, so the form path is dead for every T5 recipient.

### Code evidence

**`supabase/functions/lead-intake/dispatch.ts:144-163`** — `dispatchFreshLead` upserts attendee with `status='invited'` whenever T5 fires. Added 2026-04-28 as Rule 2.1.

```ts
await db.from("crm_event_attendees").upsert(
  { tenant_id, event_id, lead_id, status: "invited" },
  { onConflict: "tenant_id,lead_id,event_id", ignoreDuplicates: false },
);
```

**`register_lead_to_event` RPC** (verified live on Prizma 2026-04-29) — existing-attendee branch:

```sql
IF FOUND THEN
  IF v_existing.is_deleted = false THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_registered', 'attendee_id', v_existing.id);
  ELSE
    -- soft-deleted revival path
```

Any non-deleted row, regardless of `status`, is treated as already-registered. The RPC was written before Rule 2.1 existed.

### Verified state on Prizma at SPEC-author time (2026-04-29 11:41Z)

| Lead | id | status | is_deleted |
|---|---|---|---|
| T5 Canary Post-Shorten | `a262bc0e-26aa-4a2d-a401-16e4998f382e` | `new` | false |
| QA Flow 3 (soft-deleted) | `6af8dfda-...` | `new` | true |
| 5 more soft-deleted ancestors (24h QA churn) | various | various | true |

| Attendee in V4 Edge volume | id | lead | status | is_deleted | created_at |
|---|---|---|---|---|---|
| (active, blocking the form) | `ce1e02a9-...` | a262bc0e (active) | `invited` | **false** | 11:41:21.726 |
| (orphan, blocking capacity slot) | `f314d1f7-...` | 6af8dfda (deleted) | `invited` | **false** | 10:03:21.380 |
| (orphan, blocking capacity slot) | `1b4a4f13-...` | d60e061e (deleted) | `confirmed` | **false** | 08:12:50.135 |

### Why each fix is in scope

- **Fix A (RPC)** — direct cause of the form-blocked symptom. Without it, T5 → form is permanently broken.
- **Fix B (cascade soft-delete)** — orphan attendees pollute capacity counts in `register_lead_to_event`'s capacity-check (counts every `is_deleted=false` row including those whose lead is soft-deleted). On a 50-cap event, even 2 orphans silently steal seats. Surfaced naturally during this investigation; bundle now since it touches the same lifecycle.
- **Fix C (lead status on T5)** — a lead receiving T5 has an active relationship; leaving `status='new'` parks them in "לידים נכנסים" (Tier 1) where T4 broadcasts won't find them. Promote to `invited` (Tier 2; semantically matches the attendee row created in the same dispatch + future T4 broadcasts include `invited` leads). Daniel-requested behavior change.

### Out of scope (deferred per Daniel)

- `registration_method='form'` misattribution on dispatchFreshLead-created attendees (the upsert writes the table default; should be `'lead_intake'` or similar). Cosmetic data-quality issue, not cutover-blocking.

---

## 3. Success Criteria (Measurable)

### Fix A — RPC accepts invited→registered

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| A1 | `register_lead_to_event` RPC's existing-attendee branch promotes `invited → registered` (or `→ waiting_list` at cap) for `is_deleted=false` rows | new branch present | `pg_get_functiondef` |
| A2 | The promote path applies the **same capacity check** as the fresh-INSERT path. If at cap → status becomes `waiting_list`. Below cap → `registered`. | exact branch logic | code review + DB test |
| A3 | The promote path UPDATEs the existing row (does NOT INSERT a new one — would 23505 on the unique constraint). | row count unchanged | DB test |
| A4 | The promote path calls `sync_lead_status_from_attendee` (matches existing fresh-INSERT behavior) | RPC invocation present | code review |
| A5 | All other non-deleted statuses (`registered`, `waiting_list`, `confirmed`, `attended`, `purchased`, `cancelled` returning, etc.) keep the current `already_registered` rejection — no behavior change for those. | 5 status values tested → all return success=false | DB test |
| A6 | Soft-deleted-revival path (`v_existing.is_deleted = true`) is unchanged — still UPDATEs to `registered` regardless of capacity. | path identical | diff |
| A7 | Live RPC on Prizma + demo successfully promotes the canary attendee `ce1e02a9-...` from `invited` to `registered` when `register_lead_to_event` is called | `result.status='registered'`, attendee row updated, no new row created | SQL audit + EXPLAIN |

### Fix B — Cascade attendee soft-delete

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| B1 | Mechanism: Postgres trigger on `crm_leads` AFTER UPDATE, fires when `OLD.is_deleted=false AND NEW.is_deleted=true` (idempotent — only the false→true transition triggers, not subsequent updates of an already-soft-deleted lead). | trigger definition matches | `pg_get_triggerdef` |
| B2 | Trigger function bulk-updates `crm_event_attendees` to `is_deleted=true` for all rows where `lead_id = NEW.id AND tenant_id = NEW.tenant_id AND is_deleted = false`. | UPDATE statement present + scoped | code review |
| B3 | Trigger sets `is_deleted=true` only — does NOT change `status` (preserve audit trail of what state the row was in when its lead was deleted). | no status change | code review |
| B4 | Trigger is tenant-scoped (`tenant_id = NEW.tenant_id` in WHERE) — defense-in-depth even though `lead_id` would suffice | both columns in WHERE | code review |
| B5 | Backfill: the 2 known orphans (`f314d1f7-...`, `1b4a4f13-...`) are `is_deleted=true` post-deploy. | both rows show `is_deleted=true` | SQL: `SELECT id,is_deleted FROM crm_event_attendees WHERE id IN ('f314d1f7-5498-444c-ace5-bf251c1b2f4d','1b4a4f13-66e3-4311-985f-54a95e3b4e83')` |
| B6 | Backfill: zero-orphans audit on Prizma + demo. Query: `SELECT count(*) FROM crm_event_attendees a JOIN crm_leads l ON l.id=a.lead_id WHERE l.is_deleted=true AND a.is_deleted=false` returns 0 on both tenants. | 0 rows on both | SQL audit |
| B7 | Trigger does NOT fire when a lead UPDATE leaves `is_deleted` unchanged (idempotency stress test: `UPDATE crm_leads SET full_name='X' WHERE id=already_deleted_lead` does not re-touch attendees). | attendees `updated_at` unchanged | SQL test |

### Fix C — Lead status='waiting' on T5 path

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| C1 | `dispatchFreshLead` (in `supabase/functions/lead-intake/dispatch.ts`) sets `crm_leads.status='invited'` AFTER successfully sending T5 + upserting attendee. | UPDATE statement present | code review |
| C2 | The status update is scoped to the lead just inserted (`id = leadId AND tenant_id = tenantId`) | both columns in WHERE | code review |
| C3 | Status update happens ONLY on the T5 branch (active event found). T1 branch (no active event) leaves `status='new'` untouched. | branch separation | code review |
| C4 | Status update is best-effort: errors log but do not fail the EF response (matches the pattern in `dispatchIntakeMessages` — the lead is already persisted; downstream failures shouldn't 500 the form). | try/catch, no throw | code review |
| C5 | After Flow 4 retest end-to-end, the canary lead's status reads `confirmed` (registration complete) — proves the chain `new → invited (Fix C, matches attendee.status=invited) → confirmed (after register_lead_to_event promotes attendee to registered, then sync_lead_status_from_attendee maps registered→confirmed)` works. | `lead.status='confirmed'` post-test | SQL audit |
| C6 | The deactivated browser-engine rule "שינוי סטטוס ליד: ברוך הבא לרשומים" (which previously fired Modal #2 on confirmation) is still `is_active=false` on Prizma + demo after this SPEC ships. No new conflict. | rule remains deactivated | SQL: `SELECT id,name,is_active FROM crm_automation_rules WHERE name LIKE 'שינוי סטטוס%לרשומים%'` |

### Cross-cutting (after all 3 fixes ship)

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| X1 | Daniel reproduces Flow 4 on app.opticalis.co.il (Prizma develop): tap T5 link → form opens (no "כבר נרשמת") → submit → confirmation page → SMS+email arrive | manual UAT | Daniel reports |
| X2 | `event_registration_confirmation_sms_he` (one of the 6 templates shortened today) successfully delivered to +972537889878 — natural canary for that template | Daniel reports physical receipt | Daniel reports |
| X3 | Make scenario 9104395 execution status=1 for Flow 4 dispatches | Make MCP confirms | `mcp__claude_ai_Make__executions_list` |
| X4 | DLQ count on scenario 9104395 unchanged at 4 | Make MCP confirms | scenarios_get |
| X5 | Iron Rule 31 integrity gate passes before each commit and at session end | exit 0 | `npm run verify:integrity` |

---

## 4. Autonomy Envelope

**Executor MAY proceed without asking when:**
- Each fix's success criteria match expected values listed above.
- A migration's text differs from a verbatim suggestion in this SPEC but is functionally equivalent (e.g., variable naming inside the trigger function, comment wording).
- The 2-orphan backfill takes effect via the trigger fire on a manual UPDATE (idempotent path).

**Executor MUST stop and report when:**
- Any success criterion produces an unexpected result (e.g., trigger fires on wrong column, backfill audit returns >0 orphans, lead status doesn't reach 'confirmed' post-Flow-4).
- A new collision discovered in the cross-reference check (Rule 21).
- Fix C's status change conflicts with another piece of code that assumes `status='new'` for a freshly-intaken lead and which this SPEC's investigation didn't surface.
- Touching the `register_lead_to_event` RPC reveals a third caller path (e.g., manual CRM admin "register" button) that has different expectations from the form path.
- Make scenario behaves differently from Flow 3 canary (e.g., new DLQ entries appear for `event_registration_confirmation_sms_he`).

---

## 5. Stop-on-Deviation Triggers (beyond global rules)

In addition to the global stop triggers in CLAUDE.md §9:

- **CRITICAL — RPC change must not break existing callers.** The `register_lead_to_event` RPC has at least 2 known callers: `event-register` EF (form-submit path) and the CRM admin manual-register UI (search for `.rpc('register_lead_to_event'` in `modules/crm/`). Before deploying the new RPC, list every caller and verify each still gets the response shape it expects (`success`, `attendee_id`, `status`, optional `error`, optional `auto_moved`, optional `fee_mismatch`).
- **CRITICAL — capacity check correctness.** The promote branch must increment `v_current_count` correctly. The existing capacity check uses `WHERE status NOT IN ('cancelled','duplicate') AND is_deleted = false` — `invited` is NOT excluded, so the attendee row being promoted is ALREADY counted in `v_current_count`. The promote path must therefore NOT add 1 to that count when deciding `registered` vs `waiting_list`. A naive copy-paste of the fresh-INSERT capacity check would double-count and incorrectly route at-cap leads to waiting_list when they were already counted as occupying a slot via `invited`. **Spell this out in code comments.**
- **CRITICAL — trigger must not recurse.** The cascade trigger UPDATEs `crm_event_attendees`. There is no trigger on `crm_event_attendees` that touches `crm_leads`, so no recursion today. If a future SPEC adds one, this trigger must be reviewed.
- If the integrity gate fails between Fix A → B → C deploys, STOP. The compromised state is partial; resolve before continuing.

---

## 6. Rollback Plan

Each fix is independently reversible:

- **Fix A:** the RPC migration replaces the function body; rollback = re-deploy the prior body. Capture the prior `pg_get_functiondef` output as `EXECUTION_REPORT.md` evidence so we have it verbatim.
- **Fix B:** `DROP TRIGGER` + `DROP FUNCTION`. The 2-orphan backfill (a one-shot UPDATE) is logically irreversible (can't un-soft-delete an orphan and have it mean something — those leads are dead anyway), but the rollback of B doesn't require reversing the backfill.
- **Fix C:** revert the `dispatch.ts` block; redeploy lead-intake EF. No data migration needed (status changes are forward-only by EF logic; existing `waiting`-status leads stay where they are).

If Flow 4 fails after all 3 ship, isolate by partial rollback: revert C first (does Flow 4 still fail? if yes, the issue is in A or B), then A/B in turn.

---

## 7. Out of Scope (do NOT touch in this SPEC)

- `registration_method='form'` misattribution on dispatchFreshLead-created attendees (Daniel: defer).
- Browser-engine rule "שינוי סטטוס ליד: ברוך הבא לרשומים" — confirm it stays deactivated, do not re-enable or rewrite.
- Storefront form rewire (P5_7) — separate SPEC, separate cutover-blocking concern.
- The 6 SMS templates shortened earlier today (already shipped in commit `cc297af`).
- Heavy QA-induced soft-deleted lead churn (7 leads with phone +972537889878 in 24h). Cosmetic; clean up post-cutover if at all.
- Modal #2 / Confirmation Gate behavior — already deactivated, don't touch.
- Multi-tenant scaling of payment_links beyond the existing `{50: "https://prizmaoptic.short.gy/gmapy"}` shape (orthogonal SaaS work, not cutover-blocking).
- `event_registration_confirmation_sms_he` Rule 9 hardcoded values (`053-364-5404` phone, `הרצל 32, אשקלון` location) — flagged on the 6-template SHORTENING_PROPOSALS doc, deferred to post-cutover.

---

## 8. Expected Final State

After this SPEC closes:

**Code:**
- `supabase/functions/lead-intake/dispatch.ts` — `dispatchFreshLead` writes `lead.status='waiting'` on T5 path (Fix C).
- `supabase/migrations/{timestamp}_p5_8_register_lead_to_event_v2.sql` — new RPC body (Fix A).
- `supabase/migrations/{timestamp}_p5_8_cascade_attendee_soft_delete.sql` — trigger + function + 2-orphan backfill UPDATE (Fix B).

**DB (Prizma + demo):**
- `register_lead_to_event` RPC body matches new migration.
- Trigger `crm_leads_cascade_attendee_soft_delete_trg` exists and is enabled on `crm_leads`.
- Function `cascade_attendee_soft_delete()` exists.
- 0 orphan attendee rows on either tenant (B6 audit passes).
- `crm_automation_rules` "ברוך הבא לרשומים" still `is_active=false` on both.

**Behavior:**
- T5 dispatch sets `lead.status='waiting'` and creates `attendee.status='invited'` (no change to attendee creation).
- Form-submit POST → RPC → promotes `invited → registered` (or `waiting_list` if at cap, but that's existing behavior).
- Lead's status flows: `null → new (lead-intake INSERT) → waiting (Fix C) → invited (sync after attendee upsert) → confirmed (sync after registered)`.
- `event_registration_confirmation_sms_he` fires on form submit, delivers via Make, hits Daniel's phone.

**Docs:**
- `EXECUTION_REPORT.md` in this SPEC folder.
- `FINDINGS.md` if any side-issues surface during execution.
- This SPEC.md untouched.

---

## 9. Commit Plan

3 commits on develop, in order:

1. `feat(rpc): register_lead_to_event promotes invited→registered (Fix A)` — RPC migration only.
2. `feat(db): cascade attendee soft-delete on lead soft-delete (Fix B)` — trigger + function + backfill UPDATE in one migration.
3. `feat(crm): T5-recipient leads land in Tier 2 with status=waiting (Fix C)` — `dispatch.ts` amendment + EF re-deploy.

Why 3 commits, not 1: each fix is independently verifiable + rollback-safe. If a problem surfaces post-deploy, isolating the offender is faster with separate commits. SPEC retrospective lives in a 4th `chore(spec): close P5_8 with retrospective` commit per the Foreman protocol.

Each commit must:
- Pass `npm run verify:integrity` (Iron Rule 31).
- Pass pre-commit hooks (file-size, RLS, tenant_id, secrets).
- Have a self-contained subject line + body (the "why" of the change).

---

## 10. Test Plan

### Pre-deploy

1. RPC unit test (Supabase SQL): create a temp lead + temp event, INSERT attendee `status='invited'`, call RPC, assert `result.status='registered'` and the row was UPDATEd (not duplicated).
2. RPC at-cap test: same, but seed enough other attendees to fill capacity, then call RPC for the `invited` row; assert `result.status='waiting_list'`.
3. RPC unchanged-callers test: call RPC for `status='registered'` row → assert `error='already_registered'` (regression check).
4. Trigger test: soft-delete a lead with 2 attendee rows; assert both attendees `is_deleted=true` after the UPDATE.
5. Trigger idempotency test: UPDATE an already-soft-deleted lead's `full_name`; assert attendee `updated_at` unchanged.
6. Fix C test: call lead-intake EF with active event present; assert `crm_leads.status='waiting'` post-call.
7. Fix C T1 path: call lead-intake EF with no active event; assert `crm_leads.status='new'` (unchanged).

### Post-deploy (Daniel UAT)

8. Soft-delete the canary lead's existing attendee row (`ce1e02a9-...`) — DO NOT — actually, the new RPC should handle the existing invited row. Daniel taps T5 link, completes form, expects success.
9. Daniel verifies `event_registration_confirmation_sms_he` arrives on +972537889878 (the natural canary for that template).
10. SQL audit: lead a262bc0e `status='confirmed'`, attendee ce1e02a9 `status='registered'`.

### Backfill verification

11. `SELECT id,is_deleted FROM crm_event_attendees WHERE id IN ('f314d1f7-...', '1b4a4f13-...')` → both `is_deleted=true`.
12. `SELECT count(*) FROM crm_event_attendees a JOIN crm_leads l ON l.id=a.lead_id WHERE l.is_deleted=true AND a.is_deleted=false` returns 0 on both tenants.

---

## 11. Lessons Already Incorporated (Cross-Reference Check evidence)

**Rule 21 cross-reference sweep, completed 2026-04-29 against current Prizma schema + GLOBAL_MAP rev visible in repo:**

- `register_lead_to_event` — already exists; SPEC modifies in place (UPDATE, not duplicate).
- `cascade_attendee_soft_delete` — searched; not present. New trigger function name is unique.
- `crm_leads_cascade_attendee_soft_delete_trg` — searched; not present. New trigger name is unique.
- `move_attendee_between_events` — exists; SPEC does not touch it.
- `sync_lead_status_from_attendee` — exists; SPEC re-uses it from inside the new RPC promote branch (matches existing fresh-INSERT call).
- `dispatchFreshLead` — exists; SPEC modifies in place.
- New `crm_leads.status` value `'waiting'` — already in TIER2_STATUSES (`crm-automation-recipient-resolvers.js:24`), already in `sync_lead_status_from_attendee`'s mapping, already in `crm-helpers.js:91` allow-list. No new value introduced.
- `attendee.status='invited'` — already in `sync_lead_status_from_attendee` mapping (`'invited' → 'invited'`). Promote behavior in new RPC is consistent with that mapping when read at the lead-status level.

0 collisions / 8 hits resolved.

**Lessons from prior FOREMAN_REVIEWs in this module (3 most recent):**

Per opticup-strategic SKILL.md, the 3 most recent SPEC retros in `modules/Module 4 - CRM/go-live/specs/` were skimmed (P5_V2_TEMPLATE_REBUILD, P5_7_STOREFRONT_FORM_REWIRE, P5_5_PHONE_EMAIL_HARDENING — last is the immediate precedent). Lessons applied:

- **From P5_V2_TEMPLATE_REBUILD:** "Specify exact UPDATE-vs-INSERT semantics in DB-touching SPECs to avoid 23505 collisions." → §3 A3 + §5 CRITICAL note explicit.
- **From P5_7_STOREFRONT_FORM_REWIRE:** "Cross-repo cutover-blocking SPECs must enumerate every caller of a modified RPC/EF." → §5 CRITICAL note: "list every caller and verify each still gets the response shape it expects."
- **From P5_5_PHONE_EMAIL_HARDENING:** "Defense-in-depth at multiple layers (UI, EF, DB) catches what a single-layer fix misses." → Fix B trigger is DB-layer defense even though softDeleteLead in JS is the typical entry point.

**Open question for Daniel before execution (one item):**

- **Fix C status value: `waiting` vs `invited`.** Both are Tier 2; both are included in T4 broadcast targets (`TIER2_STATUSES`). `waiting` is what Daniel specified. `invited` would be more semantically precise (the lead WAS just invited to this specific event via T5) and matches `sync_lead_status_from_attendee`'s `invited→invited` mapping (so a subsequent attendee-status sync would be a no-op rather than a status flip). Keeping Daniel's explicit value `waiting` for the SPEC unless he wants to revisit. If `invited`, change C5's verify chain to `new → invited → confirmed` instead of `new → waiting → invited → confirmed`.

---

## 12. Sign-off

Awaiting Daniel's review. On green-light, executor proceeds end-to-end through Bounded Autonomy. Stop on first unexpected result.
