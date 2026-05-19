# REVIEW — M4_AUTO_PROMOTE_GOVERNANCE

**Reviewed by:** opticup-reviewer.
**Date:** 2026-05-19.
**Verdict:** 🟢 APPROVED.

---

## Iron Rule audit

| Rule | Status | Notes |
|------|--------|-------|
| 7 (no push main) | ✅ | develop only. |
| 12 (file size) | ✅ | crm-rule-editor.js: 349 lines (cap 350). |
| 21 (no orphans, no duplicates) | ✅ | New `PROMOTE_TARGETS` constant = `TIER2_FILTERS` (intentional alias, not duplicate data). Trigger function name unchanged (CREATE OR REPLACE), so no orphan. |
| 22 (defense-in-depth on writes) | ✅ | Trigger preserves explicit `tenant_id = NEW.tenant_id` filter on UPDATE crm_leads. RPC `update_lead_status_with_origin` (referenced for reuse) already does same. |
| 23 (no secrets) | ✅ | None added. |
| 31 (integrity gate) | ⏳ | Will run on commit. Expected ✅. |
| 32 (destructive ops gate) | ✅ | SPEC §4 declares 8 destructive ops. Migration + UI edit + 4 retro docs + Brief + verification archive. |
| 33 (M4 config demo-first) | ✅ | Migration applies to demo tenant only. Prizma data untouched. |
| 34 (UI SPECs need Chrome MCP) | ✅ | This SPEC touches `modules/crm/crm-rule-editor.js`. FOREMAN_REVIEW.md will mention Chrome MCP + 01/02 screenshots + DOM probe trace. Pre-commit `ui-spec-verification.mjs` will validate. |
| 35 (Campaign Overseer authority) | ✅ | M4_INFRASTRUCTURE_CONTRACT.md §2.5 documents the new `auto_promote_lead_status` field. Mission 14 will catch any Prizma Campaign Overseer edit that ignores it. |

---

## Code review observations

### O-1 — Trigger function is structurally clean

The new `promote_lead_on_message_sent` reads 4 short-circuits in order:
1. `status <> 'sent'` → return early.
2. `OLD.status = 'sent'` → return early (no double-fire on already-sent rows).
3. `lead_id IS NULL OR run_id IS NULL` → return early.
4. Lookup rule's action_config → if NULL (rule deleted) → return early.
5. `skip_auto_promote: true` → return early (back-compat).
6. `auto_promote_lead_status` null/empty → return early.
7. Otherwise: `set_config + UPDATE`.

Linear short-circuit chain, no nested branches. Safety constraint `WHERE status='waiting'` preserved verbatim.

### O-2 — Migration's per-recipient_type default is the right granularity

Daniel asked: "default per recipient_type, Daniel rejects per-rule". The migration sets defaults in 2 broad UPDATEs (one for each cohort: no-promote vs. promote-to-invited), then 1 targeted UPDATE for the ייפתח מחר row's override. That's 3 UPDATE statements covering 14 rows — minimal SQL, easy to audit.

The per-rule decision matrix in SPEC §2 Layer 3 makes the choices transparent. Daniel can override any single row post-SPEC by editing through the UI (now that the toggle exists).

### O-3 — Iron Rule 12 line-count discipline correctly forced compression

365 → 349 in 2 passes. Compression was lossless (no behavior change; just collapsed `if/else` chains and removed blank lines). The compressed form is still readable. Iron Rule 12's enforcement worked exactly as designed.

### O-4 — Layer 3 self-loop guard mechanism reused cleanly

The SCE row produced by the lead-status UPDATE carries `originated_by_rule_id` because the trigger function calls `PERFORM set_config('m4.originated_by_rule_id', ...)` BEFORE the UPDATE — same pattern as `update_lead_status_with_origin` RPC from M4_DUAL_PATH_CLEAN_FIX. Verified end-to-end in Test B (lead-SCE origin_rule = b53f6ea5).

This means a future rule with `auto_promote_lead_status: 'invited'` AND `trigger_event: 'status_change' AND status='invited'` would NOT self-loop — engine.ts filters out the rule with matching `_origin_rule_id`. Architectural safety holds.

### Nitpick (N-1) — Test A had a stray rejected email log row

FINDINGS F-4 documents the 1 rejected email log in Test A's window. Pre-existing rule-config noise (different rule firing on the same SCE produced a doomed template). Not blocking; not introduced by this SPEC.

### Nitpick (N-2) — Prizma operator behavior change pre-promote

FINDINGS F-6: Prizma rules retain pre-SPEC action_config. Until Daniel runs the config promote, all Prizma rules' `auto_promote_lead_status` is absent → trigger treats as null → no promotion. This is a NET BEHAVIOR CHANGE on Prizma (previously: eager promotion; now: no promotion until field is set).

The 2 ייפתח מחר rules on Prizma still carry `skip_auto_promote: true`, so they explicitly opt out anyway (no change). The other 12 Prizma rules now NO-promote — which matches the principle "explicit opt-in" but does change observable behavior.

**Daniel must know:** the promote-config script run is a load-bearing follow-up. Until then, Prizma leads will stop auto-promoting. If that's a problem for an event tomorrow, Daniel either runs the promote OR manually edits the Prizma rules via the UI (now that the toggle exists).

Documented in FOREMAN_REVIEW.md §"main branch" handoff.

---

## Verification reviewed independently

- 14/14 demo rules verified to have explicit `auto_promote_lead_status` (SQL reproduces).
- Test A: lead status STILL 'waiting' after ייפתח מחר fired. ✅
- Test B: lead status → 'invited'. SCE row carries origin_rule UUID. ✅
- Smoke 7/7 PASS.

Independent reviewer arrives at the same conclusion: APPROVED.

---

## Permission to close

✅ APPROVED. Foreman closure may proceed with the Chrome MCP evidence references required by Iron Rule 34.
