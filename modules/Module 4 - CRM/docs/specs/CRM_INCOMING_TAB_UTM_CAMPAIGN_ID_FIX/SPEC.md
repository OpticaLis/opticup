# SPEC — CRM_INCOMING_TAB_UTM_CAMPAIGN_ID_FIX

> **Module:** Module 4 — CRM
> **Authored:** 2026-05-03 (Daniel as Foreman, in-conversation directive during P5_7 F1 UAT)
> **Type:** Single-Rung surgical fix
> **Origin:** Surfaced during P5_7_STOREFRONT_FORM_REWIRE F1 retest — Daniel observed `utm_campaign_id` rendered as `—` in the lead-detail panel for the SuperSale UTM test row, despite the DB column being correctly populated. Root cause traced to `crm-incoming-tab.js:34`.

---

## 1. Goal

Add `utm_campaign_id` to the `.select()` on `crm-incoming-tab.js:34` so the cached lead object hydrated by the "לידים נכנסים" (incoming) tab carries the column. Without this, the lead-detail panel — which reads from the cached object — falls back to `—` and gives the false impression that the column is NULL when it is actually populated.

---

## 2. Background

P5_7 verification produced 4 test rows on prizma. The most recent two (`דניאל טסט 3`, `דניאל טסט 4`) were submitted from the SuperSale preview form with the recommended UTM URL `?Campaign_ID=p57_uat_test&...`. DB shows `utm_campaign_id = "p57_uat_test"` on both rows. CRM admin lead-detail UI shows the מזהה קמפיין (Campaign ID) field as `—`.

Cross-checked references:
- `v_crm_leads_with_tags` view exposes the `utm_campaign_id` column ✓ (verified in P5_7 §10 pre-flight via direct SQL).
- `crm-leads-tab.js:69` SELECT **includes** `utm_campaign_id` ✓.
- `crm-leads-detail.js:215` reads `lead.utm_campaign_id` correctly ✓.
- `crm-incoming-tab.js:34` SELECT **omits** `utm_campaign_id` ❌.

When a fresh-incoming lead is opened from the incoming tab, the cached object is the one produced by the incoming tab's SELECT. The detail panel reads from that cached object and finds `undefined`, rendering `—`. When the same lead is opened from the Tier-2 leads tab, the cached object includes `utm_campaign_id` and renders correctly.

This is purely a display bug — no DB data is missing or misaligned.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Verify |
|---|---|---|
| S1 | `crm-incoming-tab.js` line 34 SELECT contains the literal token `utm_campaign_id`, placed adjacent to the other UTM columns (after `utm_term`). | grep |
| S2 | Existing call sites in `crm-leads-tab.js`, `crm-leads-detail.js`, `crm-leads-actions.js` are NOT modified (strict scope per Daniel directive). | git diff list |
| S3 | After deploy + hard-refresh of the CRM admin, opening lead `5c3233b7-331a-4414-a80f-d2c7d166b241` (`דניאל טסט 3` row) shows `מזהה קמפיין: p57_uat_test` instead of `—` in the detail panel. | manual UAT (Daniel) |
| S4 | Iron Rule 31 integrity gate exit 0. | hook |
| S5 | Pre-commit hooks pass. | hook |

---

## 4. Autonomy Envelope

**Executor MAY without asking:**
- Edit `crm-incoming-tab.js:34` (single-line addition).
- Verify the change via grep + integrity gate.
- Commit + push.

**Executor MUST stop on:**
- Any other file appearing in the diff.
- Any pre-commit hook failure.
- Any test failure.

**Daniel does:**
- Hard-refresh CRM admin and verify S3 in browser.

---

## 5. Stop-on-Deviation Triggers

In addition to CLAUDE.md §9 globals:
- More than 1 file modified → STOP.
- Line count change ≠ 0 (single-line addition expected) → STOP.

---

## 6. Rollback Plan

`git revert <commit_hash>` of the single fix commit. Reversal is mechanical and preserves all surrounding context.

---

## 7. Out of Scope

- Auditing other tab SELECTs for similar omissions (logged as FINDING for follow-up if found).
- Adding utm_campaign_id rendering enhancements to the detail panel.
- Cross-tab cache invalidation (the bug is the SELECT itself, not the cache).

---

## 8. Expected Final State

After execution:
- `crm-incoming-tab.js:34` SELECT includes `utm_campaign_id`.
- Daniel hard-refreshes CRM admin and verifies the מזהה קמפיין row shows `p57_uat_test` for `דניאל טסט 3`.
- P5_7 F1 retest's apparent NULL display is resolved.

---

## 9. Commit Plan

- **Commit 1:** `fix(crm): add utm_campaign_id to incoming-tab SELECT — missing field caused empty Campaign_id in lead detail UI` (Daniel-specified message).
- **Commit 2 (close):** `chore(spec): close CRM_INCOMING_TAB_UTM_CAMPAIGN_ID_FIX with retrospective` — EXECUTION_REPORT.md + FINDINGS.md.

---

*End of SPEC. Single-Rung. Surgical fix.*
