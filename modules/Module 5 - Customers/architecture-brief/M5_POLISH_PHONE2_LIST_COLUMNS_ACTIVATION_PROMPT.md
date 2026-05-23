# Activation Prompt — M5 Polish: Secondary Phone + Configurable List Columns

> Paste into a Claude Code session (Chrome MCP + localhost required).
> Brief: `modules/Module 5 - Customers/architecture-brief/M5_POLISH_PHONE2_LIST_COLUMNS_BRIEF.md`

---

```
Two small M5 improvements from Daniel's live review of the now-styled card + list: (A) add a second phone field to the card (the mockup already shows "טלפון-עבודה" but the data layer has one phone); (B) make the customer-list columns configurable per tenant (each tenant chooses/swaps which fields show as columns — city/source/id_number/last-exam/last-order/etc.). SaaS-clean. Demo only. No Prizma writes. No merge to main. Closes through the new Visual-Fidelity Gate (embedded screenshots).

Brief: modules/Module 5 - Customers/architecture-brief/M5_POLISH_PHONE2_LIST_COLUMNS_BRIEF.md

Activate `opticup-strategic` → author SPEC at modules/Module 5 - Customers/docs/specs/M5_POLISH_PHONE2_LIST_COLUMNS/SPEC.md → execute. Read the Brief end-to-end FIRST. Pre-flight: confirm the customers table has no secondary-phone column yet; confirm the per-tenant config storage mechanism to reuse (tenant_settings or existing config table — Iron Rule 21, do not invent a parallel one); confirm what columns the list view already supplies.

ITEM A — secondary phone on the card:
- Additive migration: ALTER TABLE customers ADD COLUMN phone_secondary (name per convention) + add to FIELD_MAP + expose in the card's read views (v_customer_full / v_customer_for_exam as needed). ## Destructive Operations: None.
- Render on the card contact block as a second field labeled per the mockup ("טלפון-עבודה"), editable in edit-mode with the SAME PIN-gating as the existing phone. Empty = "—".
- It's a universal field (not tenant-config) — just add it.

ITEM B — configurable list columns (per tenant, Pattern P19):
- Add a column-picker UI on the list ("עמודות" button) to choose which columns are visible + ideally order — add/remove/swap.
- Persist the choice PER TENANT (reuse the existing per-tenant config table — confirm in pre-flight; Iron Rule 21 + 14/15/22 tenant_id). Reload → choice retained.
- Available columns split in two groups:
  * Available now (data exists): name, phone, secondary-phone (Item A), email, city, id_number, source/מקור, lifecycle_stage, customer_number, created_at.
  * Future (data not built): last-exam-date (M6), last-order-date (M7), club-tier (M13), age — design them INTO the picker now but show disabled/"coming soon" (reuse the existing showComingSoon discipline); they light up automatically when their module ships, no rebuild.
- Default column set for a new tenant = sensible minimal set per the mockup; tenant customizes from there.

CLOSURE — Visual-Fidelity Gate (blocking, Iron Rule 34):
  (1) Card: live screenshot showing the 2nd phone field rendered + editable, region-compared to M5_CUSTOMER_CARD_MOCKUP.html, embedded in TEST_REPORT + FOREMAN_REVIEW.
  (2) List: live screenshot showing the column picker working — add a column (e.g. city) → appears; a future column (e.g. last-exam) → disabled/"coming soon"; region-compared to mockup, embedded.
  (3) DB evidence: editing secondary phone persists to the new column; column choice persists per tenant across reload.
  (4) Architect reviews the embedded screenshots before 🟢 (Architect-relay rule). 
  Comparison table required in BOTH TEST_REPORT + FOREMAN_REVIEW; bare screenshot without the table = invalid (the gate you just installed).

CLOSE: opticup-reviewer → REVIEW.md; Foreman → FOREMAN_REVIEW.md. Update M5 SESSION_CONTEXT + CHANGELOG + db-schema + FIELD_MAP + GLOBAL_MAP/GLOBAL_SCHEMA additive. 
Demo only. No Prizma writes. No merge to main. SELECTIVE git add by explicit filename — NOT git add . / commit -a. Integrity gate clean. Stop on deviation.

Return ONE Hebrew status line + screenshot paths:
  "M5 ליטוש [🟢]: טלפון-שני בכרטיס (תואם מוקאפ) + בורר-עמודות מתכוונן פר-tenant ברשימה (עמודות-עתיד 'בקרוב' עד M6/M7/M13). אומת דרך שער-הנאמנות — צילומים מצורפים. תעבור עליהם."
```

---

## Pre-flight checklist for Daniel

- [ ] Claude Code + Chrome MCP + localhost runnable
- [ ] Branch = develop
- [ ] After it finishes: the report embeds card + list screenshots — Architect reviews, then you

---

*End of activation prompt. 2nd phone + per-tenant configurable list columns. Closes via the Visual-Fidelity Gate.*
