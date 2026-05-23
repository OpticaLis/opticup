# Activation Prompt — M5 Phase E — Customer List + Create-Mode UI

> Paste the block below into a Claude Code session (same one as the card if context is healthy; fresh otherwise).
> Brief: `modules/Module 5 - Customers/architecture-brief/M5_UI_CUSTOMER_LIST_BRIEF.md`
> Needs Chrome MCP + localhost ERP (Iron Rule 34 closure).

---

```
M5 Phase E — Customer List + Create-Mode UI. Completes M5's screen layer (the card / Phase D is already 🟢). Build on the existing customers.html entrypoint, reuse every card pattern, demo-tenant only, Chrome-MCP closure mandatory (Iron Rule 34). No Prizma writes. No merge to main.

Brief: modules/Module 5 - Customers/architecture-brief/M5_UI_CUSTOMER_LIST_BRIEF.md

Activate the `opticup-strategic` skill (author the SPEC, dispatch executor, reviewer, then Foreman). Read the Brief end-to-end FIRST, then:
- Mockup (pixel target): modules/Module 5 - Customers/architecture-brief/M5_CUSTOMERS_LIST_MOCKUPS.html
- The built card to reuse + extend: customers.html + modules/customers/*.js (closed 🟢 — REUSE its shared.js wiring, escapeHtml, PIN flow, showComingSoon handler, Hybrid+Navy tokens, file-split discipline)
- M5 schema: modules/Module 5 - Customers/docs/SESSION_CONTEXT.md + docs/specs/M5_SCHEMA/
- ROADMAP slot: MODULE_5_ROADMAP.md Phase E

Author SPEC at: modules/Module 5 - Customers/docs/specs/M5_UI_CUSTOMER_LIST/SPEC.md

Pre-flight (pin as §0 baseline): probe live Supabase for the exact list-feeding view (v_customer_full or a list-shaped view — confirm) + create_customer RPC signature + its dedup behavior BEFORE wiring. Confirm phone-search supports partial + leading-zero (known project gotcha — flag if the deployed surface doesn't). Confirm the routing decision for customers.html (list vs card view by URL param). Confirm the mockup's filter/search set + create-form fields (do NOT invent).

Build (scope per Brief §2-§3):
- Customer LIST on customers.html: rows from the list view, search + filter per mockup (name/phone/customer-number), partial+leading-zero phone search, row-click → opens the existing card, pagination per mockup (Prizma has 1,296 lead-customers — must not choke; respect POST-4).
- Create-mode: form per mockup wired to create_customer RPC (it already does dedup §4.7 + number allocation). Dedup-hit → surface existing customer gracefully (no silent duplicate). Success → land on new card. PIN-gate where required.
- Reuse card patterns (Iron Rule 21): same shared.js layer, escapeHtml/textContent, ONE showComingSoon + COMING_SOON_LABEL + COMING_SOON_REGISTRY for any deferred CTA, Hybrid+Navy tokens, ≤300/350-line files, FIELD_MAP additions for new rendered fields.
- RTL + Hebrew-first, mobile-aware.

OUT of scope (HARD): OpticPlus 5,028-customer historical import (Phase C, cutover-time — list renders existing demo customers only); ANY change to the card itself (closed 🟢 — flag bugs, don't fix); merge/household/delete actions (live on the card already — don't duplicate unless mockup puts a bulk action in the list); customer-LOCK / see-deleted features (future wants); any M6/M7/M8/M9 UI; merge to main.

CLOSURE GATE (Iron Rule 34) — close 🟢 only with:
  (1) Chrome-MCP screenshots of the list (search/filter active) + create-mode flow vs live demo data,
  (2) runtime trace: create_customer fires → returns → lands on new card; AND a dedup-hit trace (existing phone → guarded, handled),
  (3) DB evidence: create made a real new row; dedup-hit made NO duplicate,
  (4) side-by-side mockup-vs-live fidelity.
Use the card-closure capture technique (viewport JPEGs, not full-page PNG — avoids the timeout). SQL-only is necessary but NOT sufficient. Per memory feedback_no_polish_by_validation: shipping UI with no real wiring = escalation, not silent 🟢.

CLOSE: opticup-reviewer → REVIEW.md; opticup-strategic Foreman → FOREMAN_REVIEW.md (Chrome evidence attached). Update M5 SESSION_CONTEXT + CHANGELOG + MODULE_MAP + ROADMAP (Phase E → ✅ 🟢) + tick PATH_TO_LIVE.md M5 Phase E box. GLOBAL_MAP merged additive. Integrity gate clean; selective git add; backups per Working Rule 9.9.

Branch: develop. Demo tenant 8d8cfa7e-ef58-49af-9702-a862d459cccb (PIN 12345). No Prizma writes. No merge to main. Daniel-in-loop: pause on genuine UI/UX judgment the mockup doesn't settle. Stop on deviation, not on success. On escalation: write modules/Module 5 - Customers/escalations/{ISO_TS}_{topic}.md + one Hebrew line + halt.

Return ONE Hebrew status line at close:
  "M5 Phase E [🟢/🟡/🔴]: רשימת-לקוחות + מצב-יצירה (dedup-safe) מחווטים, ראיות Chrome MCP. שכבת ה-UI של M5 הושלמה. M6 (מרשמים) = המודול הבא. דו"ח בתיקיית הספק."
```

---

## Pre-flight checklist for Daniel

- [ ] Chrome MCP available + localhost ERP runnable (closure needs the rendered screens)
- [ ] Branch = develop, repo = opticalis/opticup
- [ ] Supabase MCP connected, demo tenant reachable
- [ ] Same Claude Code session as the card if context is healthy (it knows the entrypoint + patterns)

---

## Expected timing

- Pre-flight probes + SPEC authoring: ~1 hour
- List build (search/filter/pagination/row-click) + create-mode + dedup handling: ~3-4 hours
- Chrome-MCP closure (list + create + dedup trace + DB evidence + fidelity): ~1-1.5 hours
- Review + Foreman + docs + PATH_TO_LIVE tick: ~1 hour

**Total: ~6-7 hours.** May pause for Daniel on UI/UX judgment points.

---

*End of activation prompt. Completes M5's UI. Demo only. Historical import deferred to cutover.*
