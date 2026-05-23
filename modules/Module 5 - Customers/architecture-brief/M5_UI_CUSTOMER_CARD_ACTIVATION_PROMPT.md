# Activation Prompt — M5 Phase D — Customer Card UI (5 tabs)

> Paste the block below into a FRESH Claude Code chat. UI SPEC, Daniel-in-loop, Chrome-MCP closure.
> Brief: `modules/Module 5 - Customers/architecture-brief/M5_UI_CUSTOMER_CARD_BRIEF.md`
> Run on a machine with Chrome MCP + a localhost ERP (Iron Rule 34 needs the screen rendered).

---

```
M5 Phase D — Customer Card UI (5 tabs). The FIRST screen built on the M5-M9 schema spine. Build against the deployed schema + the sealed 766-line mockup, demo-tenant only, Chrome-MCP closure mandatory (Iron Rule 34). No Prizma writes. No merge to main.

Brief: modules/Module 5 - Customers/architecture-brief/M5_UI_CUSTOMER_CARD_BRIEF.md

Activate the `opticup-strategic` skill (authors the SPEC, dispatches `opticup-executor` to build, `opticup-reviewer` to review, then Foreman-reviews). Read the Brief end-to-end FIRST, then:
- The mockup (pixel target): modules/Module 5 - Customers/architecture-brief/M5_CUSTOMER_CARD_MOCKUP.html
- M5 schema state: modules/Module 5 - Customers/docs/SESSION_CONTEXT.md + docs/db-schema.sql + docs/specs/M5_SCHEMA/
- ERP shell pattern to match: crm.html / inventory.html + js/shared.js, shared-ui.js, search-select.js, pin-modal.js, shared-field-map.js
- ROADMAP slot: MODULE_5_ROADMAP.md Phase D

Author SPEC at: modules/Module 5 - Customers/docs/specs/M5_UI_CUSTOMER_CARD/SPEC.md

Pre-flight (pin as §0 baseline): probe live Supabase and confirm the exact column lists / signatures of every surface the card consumes BEFORE wiring (the card breaks silently on a drifted column):
  v_customer_full, v_customer_for_messaging, v_customer_prescriptions_summary (M6-owned),
  create_prescription_draft, update_customer_display_preferences, assign_to_household,
  merge_customers, delete_last_unused_customer.
Confirm the 5 tabs + per-tab layout from the mockup (do NOT invent tabs). Confirm whether a new root .html entrypoint is needed and check scripts/checks/root-allowlist.json.

Build (scope per Brief §2-§3):
- One ERP page integrated into the existing shell (vanilla JS, no build step), 5 tabs rendered from the deployed views, actions wired to the deployed RPCs THROUGH shared.js helpers (Iron Rule 7 — never sb.from() directly).
- tab-3 prescriptions = v_customer_prescriptions_summary + "+ מרשם חדש" → create_prescription_draft (both M6-owned).
- escapeHtml/textContent only (Iron Rule 8); PIN-gated actions via existing pin flow.
- T-constants + FIELD_MAP entries for the rendered fields (Iron Rule 5 — shared-field-map.js has no M5 entries yet).
- Hybrid+Navy tokens + RTL from the mockup. File size ≤300/350 — split page JS by responsibility (Iron Rule 12). Reuse shared-ui/search-select/pin-modal (Iron Rule 21).
- If a new root entrypoint is added → update CLAUDE.md §0.5 + root-allowlist.json (Root Discipline).

OUT of scope (HARD): customer LIST + create-mode (Phase E, separate SPEC — if the card needs an entry, wire a minimal open-by-customer_id URL param and document it, do NOT build the list); OpticPlus/leads migration; customer_number width / short_code backfill (render the deployed composite as-is, flag if wrong, don't patch); any M6/M7/M8/M9 UI; merge to main.

CLOSURE GATE — Iron Rule 34, non-negotiable. Does NOT close 🟢 without:
  (1) Chrome-MCP screenshots of all 5 tabs against live demo data,
  (2) runtime trace (window.__modalTrace or equiv) for ≥1 wired action in correct event order,
  (3) DB-query evidence the action produced the expected demo write,
  (4) side-by-side mockup-vs-live fidelity check.
SQL-only is necessary but NOT sufficient. Per memory feedback_no_polish_by_validation: "already meets criteria" without shipping real wiring code = escalation, not silent 🟢.

CLOSE: opticup-reviewer → REVIEW.md; opticup-strategic Foreman → FOREMAN_REVIEW.md (with the Chrome evidence attached). Update M5 SESSION_CONTEXT + CHANGELOG + MODULE_MAP + ROADMAP (Phase D ⬜→✅). GLOBAL_MAP merged additive. Integrity gate clean; selective git add; backups per Working Rule 9.9.

Branch: develop. Demo tenant 8d8cfa7e-ef58-49af-9702-a862d459cccb (PIN 12345). No Prizma writes. No merge to main.

This is Daniel-in-loop: pause for Daniel at genuine UI/UX judgment points the mockup doesn't settle. Stop on deviation, not on success. On escalation: write modules/Module 5 - Customers/escalations/{ISO_TS}_{topic}.md + one Hebrew line + halt.

Return ONE Hebrew status line at close:
  "כרטיס-לקוח M5 [🟢/🟡/🔴]: 5 טאבים מחווטים לסכמה החיה, ראיות Chrome MCP מצורפות. Phase E (רשימה+יצירה) = הספק הבא. דו"ח בתיקיית הספק."
```

---

## Pre-flight checklist for Daniel

- [ ] Running in Claude Code, on a machine with Chrome MCP available (Iron Rule 34 needs a rendered screen)
- [ ] Localhost ERP runnable (start-local.ps1) so the card renders for Chrome-MCP QA
- [ ] Branch = develop, repo = opticalis/opticup
- [ ] Supabase MCP connected, demo tenant reachable
- [ ] No competing Claude Code session on this repo (pipeline lock)

---

## Expected timing

- Pre-flight probes + SPEC authoring: ~1 hour
- Page build + 5-tab wiring + actions: ~3-4 hours
- Chrome-MCP QA loop (5 tabs + 1 action trace + DB evidence + fidelity): ~1-1.5 hours
- Review + Foreman + docs: ~1 hour

**Total: ~6-7 hours.** May pause mid-run for Daniel on UI/UX judgment points.

---

*End of activation prompt. First UI on the spine. Demo only. Chrome-MCP closure mandatory.*
