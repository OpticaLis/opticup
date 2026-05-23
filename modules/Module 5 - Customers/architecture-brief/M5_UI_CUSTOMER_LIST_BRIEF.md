# Brief — M5 Phase E — Customer List + Create-Mode UI

> **Author:** opticup-architect (Cowork) · **Date:** 2026-05-23
> **Activation Prompt:** `M5_UI_CUSTOMER_LIST_ACTIVATION_PROMPT.md` (sibling — paste THAT into Claude Code).
> **Type:** UI SPEC, Daniel-in-loop. **Completes M5's screen layer** (last UI phase; Phase C historical import is cutover-time, deferred).
> **Inputs:**
> - Mockup (canonical target): `modules/Module 5 - Customers/architecture-brief/M5_CUSTOMERS_LIST_MOCKUPS.html` (832 lines)
> - Built sibling to extend: `customers.html` entrypoint + `modules/customers/*.js` (the card, closed 🟢) — REUSE its patterns
> - Schema (deployed 🟢): M5 SESSION_CONTEXT.md + `docs/specs/M5_SCHEMA/`
> - ROADMAP slot: `MODULE_5_ROADMAP.md` Phase E → SPEC folder `docs/specs/M5_UI_CUSTOMER_LIST/`

---

## 0. One-paragraph summary

The customer card (Phase D) is closed 🟢 — the second-half of M5's UI is the **customer list** (browse/search/filter all customers) plus **create-mode** (add a new customer). Both attach to the existing `customers.html` entrypoint and reuse every pattern the card already established (shared.js wiring, escapeHtml, PIN flow, coming-soon handler, Hybrid+Navy tokens, Chrome-MCP closure). Wired to the deployed `create_customer` RPC (which already has the dedup logic). Demo only, no Prizma writes, no merge to main. When this closes, **M5's screens are complete** and M6 (prescriptions UI) is the natural next module.

## 1. Why this finishes M5

M5 Phase D gave the card (view/edit ONE customer). Phase E gives the two missing entry surfaces: the **list** (how staff find a customer) and **create-mode** (how a new customer is born). With both, a staff member can: search → open card → edit, OR create new → land on card. That's the complete customer-management loop. Phase C (importing 5,028 historical customers) is a cutover-time data load, explicitly deferred per Daniel (2026-05-23: "screens first, migrate customers after") — NOT part of this SPEC.

## 2. Scope IN

- **Customer LIST** on the existing `customers.html` entrypoint (a list view + the existing card view coexisting — decide routing with the executor: e.g. `customers.html?t=demo` = list, `?customer_id=<uuid>` = card; reuse the entrypoint, don't create a second page unless the mockup clearly demands it):
  - render the list from the correct deployed view (probe live for the right list-feeding view — likely `v_customer_full` or a list-shaped view; confirm before wiring).
  - search + filter per the mockup (name / phone / customer-number; whatever filters the mockup defines — do not invent filters).
  - phone-search must handle partial + leading-zero correctly (known project gotcha — see memory; verify the deployed view/RPC supports it, flag if not).
  - row click → opens the card (the Phase D screen) for that customer.
  - pagination/large-list behavior per mockup (demo has ~19 active customers + 1,296 migrated lead-customers on Prizma — the list must not choke; respect the POST-4 pagination note).
- **Create-mode** (add new customer):
  - a create form/flow per the mockup, wired to the deployed `create_customer` RPC (which already does dedup §4.7 + customer_number allocation).
  - on dedup-hit (phone matches existing): surface the existing customer per the mockup's intended UX (don't silently create a duplicate — the RPC guards it; the UI must handle the guarded response gracefully).
  - on success → land on the new customer's card.
  - PIN-gate per the existing flow where the mockup/role-model requires it.
- **Reuse the card's established patterns** (Iron Rule 21 — no reinvention): same shared.js helper layer, same `escapeHtml`/`textContent`, same `showComingSoon()` + `COMING_SOON_LABEL` + `COMING_SOON_REGISTRY` for any deferred CTA, same Hybrid+Navy tokens, same file-split discipline (≤300/350 lines per JS file, one responsibility), same FIELD_MAP additions for any new fields the list/create render.
- **RTL + Hebrew-first**, mobile-aware.

## 3. Contract table — what list + create use (probe live before wiring)

| Surface | Type | Owner | Used for |
|---|---|---|---|
| (list-feeding view — confirm: `v_customer_full` or a list view) | View | M5 | the list rows + search/filter |
| `create_customer` | RPC | M5 | create-mode (incl. dedup + number allocation) |
| `allocate_tenant_number` | RPC | M5 | (called internally by create_customer — don't call directly) |
| existing card (`modules/customers/customer-card.js`) | page | M5 | row-click + post-create destination |

The executor MUST probe the live view/RPC signatures before wiring (the card SPEC's pre-flight caught real drift — same discipline here).

## 4. Scope OUT (do NOT build here)

- **OpticPlus 5,028-customer historical import** — Phase C, cutover-time, deferred. The list renders whatever demo customers exist.
- **Any change to the card itself** — the card is closed 🟢; only ADD list + create around it. If the list reveals a card bug, flag it, don't fix it here.
- **Merge/household/delete actions** — those live on the card (Phase D), already wired. Don't duplicate them in the list unless the mockup explicitly puts a bulk action there (it likely doesn't).
- **Customer LOCK feature / see-deleted mode** — documented future wants, not this SPEC.
- **Any M6/M7/M8/M9 UI.** Merge to main.

## 5. Closure gate — Iron Rule 34 (mandatory)

Phase E closes 🟢 only with:
1. **Chrome-MCP screenshots** of the list (with search/filter active) + the create-mode flow, against live demo data.
2. **Runtime trace** for the create flow: create_customer fires → returns → lands on the new card; AND a dedup-hit trace (create with an existing phone → guarded response handled).
3. **DB-query evidence** the create produced a real new customer row (and the dedup-hit did NOT create a duplicate).
4. **Side-by-side mockup-vs-live** fidelity (mockup is the pixel target; material drift = finding, not pass — memory `feedback_no_polish_by_validation`).

Use the capture technique that worked in the card closure (per-tab/viewport JPEGs, not full-page PNG — avoids the timeout). SQL-only is necessary but not sufficient.

## 6. Constraints

- Branch develop. Demo tenant only (`8d8cfa7e-...`, PIN 12345). No Prizma writes. No merge to main.
- Iron Rules in focus: 5 (FIELD_MAP), 7 (shared.js abstraction), 8 (sanitization + PIN), 9 (no hardcoded business values), 11 (create_customer's number allocation is atomic — don't bypass), 12 (file size), 21 (reuse the card's components + the existing entrypoint — no orphans), 22 (defense-in-depth tenant_id on reads), 34 (Chrome closure).
- §0.5 Root Discipline: reusing `customers.html` = no new root entrypoint expected; if one is somehow needed, update §0.5 + root-allowlist.json.
- Integrity gate clean before each commit; selective git add by filename; backup per Working Rule 9.9 if trigger fires.
- Continue in the SAME Claude Code session if context is healthy (the card session knows the entrypoint + patterns) — fresh session only if budget is low (Claude Code ~1M tokens).
- Daniel-in-loop: pause on genuine UI/UX judgment the mockup doesn't settle. Real ambiguity → escalate.

## 7. What Daniel has at the end

The complete M5 customer-management loop on demo: search/browse the list → open a card → edit, or create a new customer (dedup-safe) → land on the card. **M5's screen layer is done.** Phase C (historical import) waits for cutover. Next module: M6 (prescriptions UI), which lights up the card's tab-3 + Vision tab.

---

*End of Brief. Completes M5's UI. Demo only. Chrome-MCP closure. Historical import deferred to cutover.*
