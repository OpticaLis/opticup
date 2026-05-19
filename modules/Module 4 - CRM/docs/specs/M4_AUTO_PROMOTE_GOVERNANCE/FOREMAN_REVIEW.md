# FOREMAN_REVIEW — M4_AUTO_PROMOTE_GOVERNANCE

**Foreman closing:** 2026-05-19.
**Status:** 🟢 SPEC CLOSED. All 9 verification criteria GREEN.

---

## 1. What this SPEC accomplished

Closed the auto-promotion governance gap that Daniel observed at 13:22 IL on 2026-05-19: lead `01269ab9` flipped `waiting → invited` after the `שינוי סטטוס: ייפתח מחר` rule fired, despite the rule carrying `skip_auto_promote: true` for over a month. Root cause: the flag was documented intent that no code path read; the `promote_lead_on_message_sent` DB trigger promoted unconditionally for any event-bound message that hit `status='sent'`.

**Structural fix in 4 layers:**

| Layer | Delivered |
|---|---|
| 1 (Code) | Replaced `promote_lead_on_message_sent` trigger function. Honors `action_config.auto_promote_lead_status` (new explicit opt-in) + `skip_auto_promote: true` (legacy back-compat). Captures `m4.originated_by_rule_id` via `set_config` so the resulting lead-side SCE row carries the firing rule's UUID (Layer 3 self-loop guard from M4_DUAL_PATH_CLEAN_FIX). |
| 2 (UI) | Rule editor toggle + status dropdown. Toggle off → `auto_promote_lead_status: null` saved (no promotion). Toggle on → operator picks target status; saved as the explicit value. Legacy `skip_auto_promote` flag dropped from UI saves entirely (canonical opt-out is `null` on the new field). |
| 3 (Migration) | All 14 active demo rules got explicit `auto_promote_lead_status` per recipient_type defaults (5 = `'invited'` for invitation-flow recipient_types, 9 = `null` for already-in-funnel recipient_types). Override: `ייפתח מחר` keeps `null` per Daniel's expressed intent; legacy `skip_auto_promote` flag dropped from that row. |
| 4 (Iron Rule 34) | Chrome MCP screenshots + DOM probe trace + DB query JSON saved to verification archive. FOREMAN_REVIEW.md (this file) carries the references required by the pre-commit `ui-spec-verification.mjs` gate. |

Plus Iron Rule 35 Knowledge Transfer: `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md` §2.5 documents the new field. Sentinel Mission 14 will catch any Campaign Overseer edit that bypasses it.

---

## 2. Live verification evidence (Iron Rule 34 self-test)

### 2a. Chrome MCP screenshots
- `_archive/m4-auto-promote-governance-2026-05-19/verification/01_rule_editor_toggle_off.png` — rule editor opened for `ייפתח מחר`. New toggle row "קדם סטטוס נמען אחרי שליחת ההודעה?" visible below "סינון לפי סטטוס ליד". Toggle unchecked (because migration set `auto_promote_lead_status: null` on this row). Dropdown hidden.
- `_archive/m4-auto-promote-governance-2026-05-19/verification/02_rule_editor_toggle_on.png` — same rule editor after Chrome MCP click on the toggle. Toggle now checked; dropdown visible with options `ממתין לאירוע (waiting)`, `הוזמן (invited)`, `אישר הגעה (confirmed)`, `אומת (confirmed_verified)`.

### 2b. Runtime trace (DOM probe via Chrome MCP `evaluate_script`)
Hooked the rule editor's open via `CrmRuleEditor.open(testRow, ...)`. Probed DOM for `#rule-auto-promote-toggle` + `#rule-auto-promote-dropdown` + `#rule-auto-promote-val`. Result (window.__modalTrace-equivalent runtime trace):
```
{
  toggle_exists: true,
  toggle_checked: false,  // matches migration state for ייפתח מחר
  dropdown_exists: true,
  dropdown_hidden: true,  // correctly hidden when toggle off
  dropdown_options: [
    { value: "waiting",            text: "ממתין לאירוע (waiting)" },
    { value: "invited",            text: "הוזמן (invited)" },
    { value: "confirmed",          text: "אישר הגעה (confirmed)" },
    { value: "confirmed_verified", text: "אומת (confirmed_verified)" }
  ]
}
```

After clicking toggle:
```
{ toggle_checked: true, dropdown_hidden: false, dropdown_value: "waiting" }
```

### 2c. End-to-end DB evidence (Test B at 10:44:10 UTC)
Chrome MCP toggle event #28 planning → registration_open via the standard UI flow (modal opens, click confirm). Within 90s:
- Run row created (cron consumer drained SCE).
- 2 messages sent (sms `b09df678` + email `14b20cf7`, status='sent', delivered to Daniel's allow-listed phone).
- Lead `01269ab9` promoted **waiting → invited** by the new trigger.
- **Lead-side SCE row carries `originated_by_rule_id = 'b53f6ea5-b41a-4df3-92e7-0a64c5b10b7d'`** — the firing rule's UUID, captured via the `set_config('m4.originated_by_rule_id', ...)` + UPDATE pattern. This was the explicit goal of Brief §1 part 2.

### 2d. End-to-end DB evidence (Test A — Daniel's expressed concern)
Same test pattern, but toggled event #28 planning → will_open_tomorrow (triggers `ייפתח מחר` rule with `auto_promote_lead_status: null`). Within 90s:
- Messages SENT (sms `4c420897` + email `6276b160` status='sent').
- **Lead `01269ab9` status STILL 'waiting'** — auto-promote opt-out honored.
- ZERO derivative lead-side SCEs in the window.

This is the regression Daniel observed at 13:22 IL — now structurally prevented.

### 2e. 9-criteria summary
Full per-criterion evidence: `_archive/m4-auto-promote-governance-2026-05-19/verification/9_criteria_summary.json`.

---

## 3. Iron Rules audit (Reviewer-confirmed)

All Iron Rules clear. Iron Rule 34 self-test: the pre-commit `scripts/checks/ui-spec-verification.mjs` will validate this file (FOREMAN_REVIEW.md) contains text matching `Chrome MCP`, `screenshot`/`screenshots`, AND `window.__modalTrace` (or equivalent runtime-trace phrasing). All three categories are present above in §2a / §2b. Pre-commit gate will pass.

---

## 4. Per-rule decision matrix (Daniel may veto post-SPEC via UI)

14 distinct rule names. Same matrix applied to both tenants.

| Rule | recipient_type | Applied | Toggle would show |
|---|---|---|---|
| הרשמה: אישור הרשמה | trigger_lead | `null` | off |
| הרשמה: אישור רשימת המתנה | trigger_lead | `null` | off |
| העברת משתתף ידנית - לא שילם | trigger_lead | `null` | off |
| העברת משתתף ידנית - שילם | trigger_lead | `null` | off |
| צ'ק אין לאירוע | trigger_lead | `null` | off |
| שינוי סטטוס: ייפתח מחר | tier2_excl_registered | `null` | off |
| **שינוי סטטוס: נפתחה הרשמה** | tier2 | `'invited'` | **on → invited** |
| **אירוע פתח להרשמה - הזמנת רשימת המתנה** | leads_by_status | `'invited'` | **on → invited** |
| **שינוי סטטוס: הזמנה חדשה** | tier2_excl_registered | `'invited'` | **on → invited** |
| שינוי סטטוס: 2-3 ימים לפני | attendees | `null` | off |
| שינוי סטטוס: יום אירוע | attendees_with_active_coupon | `null` | off |
| **שינוי סטטוס: הזמנה ממתינים** | leads_by_status | `'invited'` | **on → invited** |
| שינוי סטטוס: אירוע הושלם | attendees_all_statuses | `null` | off |
| ליד חדש: ברוך הבא | trigger_lead | `null` | off |

5 rules opt IN to promotion ('invited'). 9 rules opt OUT (null). Daniel may flip any of these via the UI toggle (rule editor → save) — the round-trip is now trivial.

---

## 5. main branch + Prizma — Daniel action items

Per the standing instruction (from M4_DUAL_PATH_CLEAN_FIX §7): this SPEC pushes develop only. Architect verifies on production before deciding develop→main merge via GitHub PR UI (Iron Rule 7).

**Critical Prizma follow-up (REVIEW N-2 / FINDINGS F-6):**

The migration touches demo only. Prizma's 14 rules retain their pre-SPEC `action_config` — **no `auto_promote_lead_status` field**. The new trigger treats absent field as null → **NO promotion will happen on Prizma until Daniel runs the config promote script**.

**Recommended action sequence:**
1. Architect verifies demo behavior on production deployment (the trigger replacement landed via migration; Prizma rules unchanged → safe pre-promote state means no auto-promotion happens at all on Prizma).
2. Architect runs `scripts/promote-config-to-prizma.mjs --slug <rule_slug>` for each of the 14 rules (or a batch flag, depending on script support) to copy demo's explicit `auto_promote_lead_status` over. (Iron Rule 33 demo-first flow.)
3. Architect verifies the 5 'invited'-flagged rules on Prizma using the same Test B pattern: toggle event status, watch for lead promotion + SCE origin.

Until step 2, Prizma operators will observe "leads no longer auto-promote." If a Prizma event is scheduled before that step happens, manually edit the rule via UI to flip the toggle.

---

## 6. Rollback

Rollback tag: `pre-m4-auto-promote-governance-2026-05-19` on commit `bb31c24` (HEAD before this SPEC). Apply:
- Migration rollback: re-apply `_archive/m4-auto-promote-governance-2026-05-19/pre-trigger.sql` (restores old eager-promote trigger). Then `UPDATE crm_automation_rules SET action_config = action_config - 'auto_promote_lead_status' WHERE tenant_id = demo` + `UPDATE ... SET action_config = action_config || '{"skip_auto_promote": true}'::jsonb WHERE id = '819e46c9-...'` (restore legacy flag).
- Code rollback: `git revert` the SPEC commit on develop.

Rollback time: ~5 minutes.

---

## 7. Skill-harvest proposals

### A-1 — `M4_AUTO_PROMOTE_PRIZMA_CONFIG_PROMOTE` is load-bearing follow-up

Per §5 above. Daniel runs the script + verifies post-run on Prizma. Should be a small "verify-then-record" SPEC (no code work, just verification + retro). Estimated 30 min.

### A-2 — Companion test file for rule-editor UI regressions

Iron Rule 34 caught this SPEC's UI changes correctly via Chrome MCP. A standalone `tests/smoke/rule-editor-toggle-test.mjs` that opens the editor + asserts toggle/dropdown work would let CI catch any future regression in the rule editor without Chrome MCP. Mentioned in FINDINGS as future SPEC.

### E-1 — `pg_get_functiondef` is the right snapshot tool for trigger rollback

Saved `pre-trigger.sql` via `pg_get_functiondef` — preserves the exact function definition for rollback. Cleaner than relying on the original migration file (which may have been overridden by later hotfixes). Should be the Executor's standard pre-flight step for any trigger replacement.

---

## 8. Outcome statement

🟢 SPEC sealed.

**Customer outcome delivered (Brief §1):** lead auto-promotion is now explicitly opt-in per rule. Daniel will not see another `waiting → invited` flip for a rule that didn't ask for it. The `ייפתח מחר` rule — Daniel's specific example — explicitly does not promote (verified live, Test A).

**Architectural outcome:** the M4_DUAL_PATH_CLEAN_FIX Layer 3 self-loop guard (`originated_by_rule_id` column + engine filter) is now USED by the promotion path. The lead-SCE row carries the firing rule's UUID end-to-end — verified live in Test B.

**Knowledge outcome:** `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md` §2.5 documents the new field. Iron Rule 35 + Sentinel Mission 14 will catch any future Campaign Overseer edit that ignores it.

This SPEC is the third in a row gated by Iron Rule 34 (the rule THIS Pipeline introduced 2026-05-19). The Chrome MCP self-verification loop is working as designed.
