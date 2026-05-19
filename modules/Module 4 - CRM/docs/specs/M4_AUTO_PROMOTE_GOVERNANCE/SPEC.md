# SPEC — M4_AUTO_PROMOTE_GOVERNANCE

**Authored by:** opticup-strategic (Foreman role).
**Date:** 2026-05-19.
**Brief:** `modules/Module 4 - CRM/architecture-brief/M4_AUTO_PROMOTE_GOVERNANCE_BRIEF.md`.
**Pipeline mode:** Full-Auto with mandatory Chrome MCP live verification (per Iron Rule 34 added 2026-05-19).
**Priority:** P0 — production lead state silently mutates without operator opt-in.
**Tenants:** demo only for migration; Prizma read-only (promote via Iron Rule 33 script after Daniel approves).

---

## 0. Strategic Intent

Lead status auto-promotion (`waiting → invited` after a successful event-bound message send) currently fires UNCONDITIONALLY via the `promote_lead_on_message_sent` trigger on `crm_message_queue` status flip to 'sent'. The trigger doesn't know which rule fired and doesn't honor the `skip_auto_promote: true` flag that lives in `action_config` for `שינוי סטטוס: ייפתח מחר`. Daniel observed lead `01269ab9` flip `waiting → invited` for that rule despite the documented opt-out.

Two structural fixes:
1. **Make promotion explicit per rule** — `action_config.auto_promote_lead_status: <status>` opt-in.
2. **Expose the control in the UI** — toggle + dropdown in the rule editor.

Plus a migration that retroactively sets the field on every active rule (no rule remains ambiguous), and a Chrome MCP-verified close per Iron Rule 34.

---

## 1. Pre-flight (executed 2026-05-19T10:32–10:33Z)

| Check | Result |
|---|---|
| develop HEAD | `bb31c24` (M4_DUAL_PATH_CLEAN_FIX_2026_05_19 closed last commit) |
| Smoke 7/7 | ✅ PASS |
| Pipeline lock | ✅ claimed `2026-05-19T10-32-44-343Z_M4_AUTO_PROMOTE_GOVERNANCE_pid-54432-b0eaeb65.lock` |
| Crons (15s) | ✅ `consume_status_change_events` jobid=13 active; `dispatch_queue` jobid=12 active |
| Working tree | Pre-existing unstaged: `docs/guardian/GUARDIAN_ALERTS.md` + `M4_DUAL_PATH_DEPRECATION_PHASE_1_ACTIVATION_PROMPT.md`. Untracked Briefs include this SPEC's Brief. Leaving the unstaged alone. |

### Rule audit baseline (28 rules total: 14 demo + 14 Prizma)

Same 14 rules per tenant after `M4_CONFIG_PARITY_RUN_1` sync. Today's `action_config` flag state (all 28 rows):
- `auto_promote_lead_status` key present: **0/28** → today's "absent = silent auto-promote".
- `skip_auto_promote: true` present: **2/28** (both `שינוי סטטוס: ייפתח מחר` rules; flag is documented intent but NOT honored by code).
- `post_action_status_update` present: **2/28** (both `שינוי סטטוס: אירוע הושלם` → `'waiting'`).
- `post_action_attendee_upsert` present: **2/28** (both `שינוי סטטוס: הזמנה חדשה`).

---

## 2. Implementation — 4 layers

### Layer 1 — Replace `promote_lead_on_message_sent` trigger (honor flag, capture origin)

The current trigger (defined in `supabase/migrations/20260515094000_hotfix3_s1_5_carry_rpcs_block_a_and_revokes.sql`, source extracted via `pg_get_functiondef`):
```
IF NEW.lead_id IS NULL OR NEW.event_id IS NULL THEN RETURN NEW; END IF;
UPDATE crm_leads SET status='invited', updated_at=NOW()
WHERE id=NEW.lead_id AND tenant_id=NEW.tenant_id AND status='waiting';
```

**Replacement logic:**
1. Look up `crm_automation_runs.rule_id` from `NEW.run_id`.
2. Fetch the rule's `action_config`.
3. If `skip_auto_promote: true` → no promotion (back-compat with documented intent).
4. If `auto_promote_lead_status` is null/empty → no promotion (new safe default — opt-in).
5. Else: `PERFORM set_config('m4.originated_by_rule_id', rule_id::text, true)` then UPDATE crm_leads.status. The `update_lead_status_with_origin` RPC pattern from M4_DUAL_PATH_CLEAN_FIX inspires this — the trigger uses raw set_config + UPDATE since it's already inside one transaction.
6. Preserve the `WHERE status='waiting'` safety constraint (never downgrade an already-invited lead).
7. Add a `IF NEW.run_id IS NULL THEN RETURN NEW; END IF` short-circuit since rules without a run_id can't be looked up. (event_id removed from the gate — the rule's recipient_type already determined event-context.)

### Layer 2 — Rule editor UI (toggle + status dropdown)

In `modules/crm/crm-rule-editor.js`:
- Add `autoPromoteLeadStatus` to state, read from `cfg.auto_promote_lead_status` in `_stateFromRow`, write to `actionConfig.auto_promote_lead_status` in `_buildSaveData` (delete key when null/empty).
- Add a checkbox + dropdown row below `#rule-tier2-filter`. Checkbox label: "קדם סטטוס נמען אחרי שליחת ההודעה?". When checked, show dropdown of Tier-2 lead statuses (waiting, invited, confirmed, confirmed_verified). Default selection: `invited` for new rules where checkbox is checked.
- Refresh summary to include the promotion intent (e.g., "ולאחר השליחה, הסטטוס יקודם ל-invited").
- Iron Rule 12: current file 343 lines. New code ≤7 net lines via comment compression to stay ≤350.

### Layer 3 — Per-rule explicit migration (demo first, Iron Rule 33)

UPDATE every active rule on demo with explicit `auto_promote_lead_status`. Defaults per recipient_type:

| recipient_type | Default | Reasoning |
|---|---|---|
| `trigger_lead` | `null` | Already in funnel (registration confirmations, lead intake, check-ins, move notifications) |
| `attendees` / `attendees_with_active_coupon` / `attendees_all_statuses` | `null` | Already registered to the event |
| `tier2` | `'invited'` | "Open for registration" invitation — promotion is the point |
| `tier2_excl_registered` | `'invited'` | Same — except `ייפתח מחר` rule keeps `null` (skip_auto_promote=true documented intent) |
| `leads_by_status` | `'invited'` | Explicit waitlist invitation flow |

**Per-rule decision matrix (14 distinct rule names, applied identically to both tenants):**

| Rule name | recipient_type | Default applied | Notes |
|---|---|---|---|
| הרשמה: אישור הרשמה | trigger_lead | `null` | Confirmation; lead already attendee |
| הרשמה: אישור רשימת המתנה | trigger_lead | `null` | Same |
| העברת משתתף ידנית - לא שילם | trigger_lead | `null` | Move notification |
| העברת משתתף ידנית - שילם | trigger_lead | `null` | Same |
| צ'ק אין לאירוע | trigger_lead | `null` | Check-in confirmation |
| **שינוי סטטוס: ייפתח מחר** | tier2_excl_registered | `null` | **Daniel's expressed intent. skip_auto_promote=true documented in the row; this SPEC also drops that legacy flag from the row in favor of the explicit `null` for `auto_promote_lead_status`.** |
| **שינוי סטטוס: נפתחה הרשמה** | tier2 | `'invited'` | The invitation flow — promote on send |
| **אירוע פתח להרשמה - הזמנת רשימת המתנה** | leads_by_status | `'invited'` | Explicit waitlist invite |
| **שינוי סטטוס: הזמנה חדשה** | tier2_excl_registered | `'invited'` | "New invitations" — promote |
| שינוי סטטוס: 2-3 ימים לפני | attendees | `null` | Reminder; already registered |
| שינוי סטטוס: יום אירוע | attendees_with_active_coupon | `null` | Day-of reminder |
| **שינוי סטטוס: הזמנה ממתינים** | leads_by_status | `'invited'` | Explicit waitlist invite |
| שינוי סטטוס: אירוע הושלם | attendees_all_statuses | `null` | Has `post_action_status_update='waiting'` separately; not in scope for auto-promote |
| ליד חדש: ברוך הבא | trigger_lead | `null` | Initial welcome |

Of the 14 rule names, 5 receive `'invited'`, 9 receive `null`. Same applies to Prizma's 14 rules (identical set after sync).

Migration: applied to demo via apply_migration; Prizma update is OUT OF SCOPE for this SPEC — gated by Iron Rule 33 (`scripts/promote-config-to-prizma.mjs`) which Daniel triggers manually.

### Layer 4 — Iron Rule 34 verification (Chrome MCP screenshots)

Chrome MCP scenarios (live verification per Iron Rule 34, which THIS Pipeline introduced 2026-05-19):
1. Open rule editor for `ייפתח מחר` → toggle visible, unchecked. Screenshot.
2. Edit a tier2 rule → toggle checked + dropdown shows status options. Screenshot.
3. Save with toggle unchecked → DB `action_config` has `auto_promote_lead_status: null` (key absent).
4. Save with toggle checked + status='invited' → DB has the value.
5. Toggle event #28 `planning → will_open_tomorrow` → wait 60s → lead status REMAINS waiting (no promotion).
6. Toggle event #28 `planning → registration_open` → wait 60s → lead status `waiting → invited`, SCE row has `originated_by_rule_id` populated.

---

## 3. Steps

1. Pre-flight ✅ (§1).
2. Author this SPEC.
3. Write + apply migration covering Layer 1 trigger replacement + Layer 3 per-rule explicit defaults on demo.
4. Edit `modules/crm/crm-rule-editor.js` for Layer 2 UI (≤350 lines target).
5. Smoke 7/7 PASS.
6. Chrome MCP live verification scenarios 1-6.
7. Update `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md` per Iron Rule 35.
8. Write retro docs (EXECUTION_REPORT + FINDINGS + REVIEW + FOREMAN_REVIEW). **FOREMAN_REVIEW.md MUST contain Chrome MCP / screenshot / window.__modalTrace references per Iron Rule 34** — the `scripts/checks/ui-spec-verification.mjs` pre-commit gate validates this at commit time.
9. Single commit + push develop. NO main merge. NO Prizma data writes (migration touches demo only; Prizma promotion is Daniel's manual step via Iron Rule 33 script).

---

## 4. Destructive Operations

Declared per Iron Rule 32 (gate scans this section):

### Migration DDL/DML
1. `CREATE OR REPLACE FUNCTION promote_lead_on_message_sent()` — replaces existing function logic. Same name, same trigger, same signature — preserves dependency graph.
2. `UPDATE crm_automation_rules SET action_config = action_config || jsonb_build_object('auto_promote_lead_status', <value>) WHERE id = <each demo rule id>` — 14 demo rules. Per the §2 Layer 3 matrix.
3. `UPDATE crm_automation_rules SET action_config = action_config - 'skip_auto_promote' WHERE id IN (<2 demo rule ids with skip flag>)` — drop the legacy flag since `auto_promote_lead_status` now expresses the same intent explicitly. Keeps the row free of stale documentation-only fields.

### Code/files
4. Edit `modules/crm/crm-rule-editor.js` — Layer 2 UI additions.
5. New `supabase/migrations/20260519110000_m4_auto_promote_governance.sql`.
6. New `modules/Module 4 - CRM/docs/specs/M4_AUTO_PROMOTE_GOVERNANCE/{SPEC,EXECUTION_REPORT,FINDINGS,REVIEW,FOREMAN_REVIEW}.md`.
7. Edit `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md` — add `auto_promote_lead_status` to the action_config contract (Iron Rule 35).
8. New `_archive/m4-auto-promote-governance-2026-05-19/verification/` — Chrome MCP screenshots + DB query JSON + console traces.

NO writes to Prizma row data. NO direct edits to Prizma config rows (Iron Rule 33 — Daniel's manual promote step runs `scripts/promote-config-to-prizma.mjs` post-SPEC after he reviews demo).

NO EF code change required — the trigger handles all logic in SQL; the EF's existing `dispatchPlanDirect` writes queue rows that the trigger then operates on.

---

## 5. Verification Plan (Brief §3 — 9 criteria)

| # | Criterion | Method |
|---|---|---|
| 1 | New `action_config.auto_promote_lead_status` field added; old `skip_auto_promote` honored | SQL probe of trigger function + manual test on demo |
| 2 | UI rule editor has toggle + dropdown | Chrome MCP screenshot of rule editor |
| 3 | All active demo rules have explicit `auto_promote_lead_status` set | SQL query: `SELECT count(*) FROM crm_automation_rules WHERE is_active AND tenant_id=demo AND NOT (action_config ? 'auto_promote_lead_status')` → 0 |
| 4 | `ייפתח מחר` rule triggered → lead status unchanged | Chrome MCP toggle event #28 planning→will_open_tomorrow + DB query |
| 5 | `הזמנה חדשה` rule (has post_action_attendee_upsert) → behavior preserved | Chrome MCP toggle + verify attendee upserted |
| 6 | When promotion happens, `originated_by_rule_id` populated in SCE | DB query: lead-side SCE row's origin_rule_id == the firing rule's id |
| 7 | Chrome MCP screenshots: rule editor toggle + post-save state | Saved to `_archive/m4-auto-promote-governance-2026-05-19/verification/` |
| 8 | Smoke 7/7 PASS | `node tests/smoke/baseline.test.mjs` |
| 9 | Iron Rules 12/21/23/31/32/34/35 enforced | Pre-commit hook output |

---

## 6. Rollback

If verification fails:
- Migration rollback: re-apply the prior `promote_lead_on_message_sent` function from `pg_get_functiondef` snapshot stored in `_archive/m4-auto-promote-governance-2026-05-19/pre-trigger.sql`; `UPDATE crm_automation_rules SET action_config = action_config - 'auto_promote_lead_status' WHERE tenant_id = demo`. Also: `UPDATE crm_automation_rules SET action_config = action_config || '{"skip_auto_promote": true}'::jsonb WHERE id IN (<the 2 will_open_tomorrow rules>)` to restore the legacy flag.
- Code rollback: `git revert` the SPEC commit on develop.

Rollback tag at SPEC start: `pre-m4-auto-promote-governance-2026-05-19` on commit `bb31c24`.

---

## 7. Out of Scope

- Prizma data updates — Daniel runs `scripts/promote-config-to-prizma.mjs` manually after reviewing demo.
- Removing or refactoring `post_action_status_update` and `post_action_attendee_upsert` — those are separate, intentional, rule-driven side effects with their own design (Layer 3 self-loop guard governs the former).
- New trigger types or recipient types — Architect-only (Iron Rule 35).

---

*End of SPEC. Execution begins now.*
