# M4 Auto-Promote Governance — Explicit Lead Status Promotion Control

**Status:** Brief. Full-Auto Pipeline. Daniel approved.
**Authored by:** Architect (Cowork, 2026-05-19 ~13:30 IL).
**Priority:** P0 — production behavior is silently mutating customer/lead state without operator control.

---

## 1. The problem (verified by DB evidence)

When an event status changes (e.g. `planning → will_open_tomorrow`), the rule `שינוי סטטוס: ייפתח מחר` fires and sends messages to leads with status `waiting` or `invited`. The rule's `action_config` includes `skip_auto_promote: true` — the original author's explicit intent NOT to promote lead status. **But the lead status still flips from `waiting` to `invited` 32 seconds after the event change.**

Two root issues:

1. **The `skip_auto_promote` flag is not honored** anywhere in the code path. It's a documented intent that no code reads. Either it was never implemented, or a recent refactor removed the check.
2. **There is no UI control** in the rule editor for "should this rule promote recipient lead status, and to what status?" The flag lives only in `action_config` jsonb — invisible to the Campaign Overseer or any operator using the UI.

Evidence captured 13:22:35 IL: lead `01269ab9` flipped `waiting → invited`, `originated_by_rule_id IS NULL` — so we can't even trace which code path did it. The new column from M4_DUAL_PATH_CLEAN_FIX (`originated_by_rule_id`) isn't populated when this code path runs — another gap.

---

## 2. The fix — 3 layers

### Layer 1 — Code (honor the flag, populate originated_by_rule_id)

Find the code that promotes lead status after a rule fires (likely in `automation-engine/prepare-plan.ts` or a post-action handler). Make it:
- Read `action_config.auto_promote_lead_status` (string or null) — if null/absent, no promotion happens.
- If set: perform the promotion via the existing `update_lead_status_with_origin` RPC so `originated_by_rule_id` is captured.
- Honor the existing `skip_auto_promote: true` for backwards-compat: treat it as equivalent to `auto_promote_lead_status: null`.

### Layer 2 — UI (toggle + status picker in rule editor)

In the rule editor modal (the one in Daniel's screenshot), add a new row below "סינון לפי סטטוס ליד":

```
☐ קדם סטטוס נמען אחרי שליחת ההודעה?
    [dropdown of statuses, shown only if checked]
```

The dropdown lists available lead statuses for the tenant (from `crm_statuses`). Daniel/Campaign Overseer picks explicitly: "אחרי שליחה, שנה לסטטוס X". If unchecked → `auto_promote_lead_status: null` saved.

### Layer 3 — Safe defaults for existing rules

Audit all active rules on demo + Prizma. For each:
- If `recipient_type` is `tier2_excl_registered` or `leads_by_status` → these are sends to leads who haven't fully committed; promotion may be desired (e.g. invite → invited). Per-rule Daniel decision.
- If `recipient_type` is `trigger_lead` or `attendees_*` → these are sends to people already in the funnel; default NO promotion.
- Foreman writes a migration that explicitly sets `auto_promote_lead_status` per rule, based on Daniel's per-rule choice OR a documented default. NO rule remains ambiguous.

Daniel sees the proposed defaults before the migration runs.

### Layer 4 — Iron Rule 34 verification (per the rule we added today)

Chrome MCP test scenarios:
- Open rule editor, create a new rule with toggle unchecked → save → verify DB has `auto_promote_lead_status: null`.
- Toggle checked + pick status → save → verify DB has correct value.
- Trigger the rule on demo → verify lead status changes as configured (or doesn't).
- Trigger `ייפתח מחר` rule → verify lead status does NOT change (matches Daniel's expressed intent).

---

## 3. Verification Criteria

1. New `action_config.auto_promote_lead_status` field added; old `skip_auto_promote` honored for back-compat.
2. UI rule editor has a toggle + dropdown.
3. All active rules have explicit `auto_promote_lead_status` set (none ambiguous).
4. `ייפתח מחר` rule triggered → lead status unchanged.
5. `הזמנה חדשה` rule (which has `post_action_attendee_upsert`) → behavior preserved.
6. When promotion happens, `originated_by_rule_id` populated in SCE.
7. Chrome MCP screenshots: rule editor toggle + post-save state.
8. Smoke 7/7 PASS.
9. Iron Rules 12/21/23/31/32/34/35 enforced.

---

## 4. Destructive Operations

- Code edits in `automation-engine` + `modules/crm/crm-rule-editor.js`.
- Single migration: UPDATE `action_config` on existing rules to add explicit `auto_promote_lead_status`. Demo first, Prizma via promote-config-to-prizma per Iron Rule 33.
- No table schema changes (the field lives in existing jsonb).
- NO writes to Prizma row data outside the promote script.

---

## 5. Knowledge transfer (per Iron Rule 35)

Update `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md`:
- Add `auto_promote_lead_status` to the action_config contract.
- Document the UI toggle.
- Note: any rule the Campaign Overseer authors that should NOT promote → leave toggle off. If it SHOULD promote → set explicitly. No more hidden promotion.

---

## 6. Estimated wall-clock

3-4 hours. Mostly UI work + per-rule decision matrix.

