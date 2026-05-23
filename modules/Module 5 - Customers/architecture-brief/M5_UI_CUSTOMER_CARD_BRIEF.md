# Brief — M5 Phase D — Customer Card UI (5 tabs)

> **Author:** opticup-architect (Cowork) · **Date:** 2026-05-23
> **Activation Prompt:** `M5_UI_CUSTOMER_CARD_ACTIVATION_PROMPT.md` (sibling — paste THAT into Claude Code).
> **Type:** UI SPEC, Daniel-in-loop. **First UI built on the M5-M9 schema spine.**
> **Inputs:**
> - Mockup (canonical target): `modules/Module 5 - Customers/architecture-brief/M5_CUSTOMER_CARD_MOCKUP.html` (766 lines, 5 tabs, Hybrid+Navy tokens)
> - Schema (deployed 🟢): M5 SESSION_CONTEXT.md + `docs/specs/M5_SCHEMA/` + `docs/db-schema.sql`
> - ROADMAP slot: `MODULE_5_ROADMAP.md` Phase D → SPEC folder `docs/specs/M5_UI_CUSTOMER_CARD/`

---

## 0. One-paragraph summary

The M5 schema spine is built and verified (7 tables, 5 RPCs, 7 views, smoke 9/9, cross-contract with M6 5/5). The customer-card mockup is sealed. This SPEC builds the **first real screen** on the spine: the customer card with 5 tabs, wired to the already-deployed views + RPCs, matching the mockup at high fidelity. Because it is the first UI on this spine, it sets the pattern every later M5-M9 screen will copy — so it must be clean, not quick. Closure REQUIRES Chrome-MCP evidence per Iron Rule 34. Demo tenant only. No Prizma writes. No merge to main.

## 1. Why this screen first

Every other M5-M9 screen (customer list, order screen, checkout, lab KDS) either links to or embeds the customer card. It is the keystone screen. Building it first means: (a) the ERP-shell integration pattern for the new spine is proven once, (b) the view→render and RPC→action wiring conventions are established for the executor to copy, (c) the first Chrome-MCP UI-QA loop on this spine runs on a screen we have a pixel-target mockup for.

## 2. Scope IN

- **One new ERP page** for the customer card, integrated into the existing ERP shell (vanilla JS + sidebar + `shared.js` helper layer — same architecture as `crm.html` / `inventory.html`; NO build step). Page registers in the ERP routing/nav per the existing convention. Decide page name with the executor per FILE_STRUCTURE conventions (e.g. `customer.html` or a customers entrypoint) — follow the existing root-page pattern; respect Iron Rule 6 (index.html stays root) + §0.5 Root Discipline (a new root .html is an Application Entrypoint, allowed, but confirm against root-allowlist.json and update both §0.5 + the JSON if a new entrypoint is added).
- **5 tabs**, exactly as the mockup defines them (read the mockup for the canonical tab set, order, and per-tab layout — do not invent tabs):
  - render each tab from the correct deployed view (see §3 contract table).
  - tab-3 (prescriptions) consumes the **M6-owned** `v_customer_prescriptions_summary` + the "+ מרשם חדש" button calls the **M6-owned** `create_prescription_draft(p_tenant_id, p_customer_id, p_kind)`.
- **Actions wired to the deployed RPCs** (read-then-call through `shared.js` helpers per Iron Rule 7 — never `sb.from()` directly): edit display preferences (`update_customer_display_preferences`), assign-to-household (`assign_to_household`), merge (`merge_customers`), and the Iron-Rule-32-guarded delete (`delete_last_unused_customer`) where the mockup exposes them. Only wire actions the mockup actually shows.
- **customer_number display composite** per Brief §12 (`tenant_code` + branch `short_code` + lpad customer_number). NOTE the open width caveat (F-F-1 in the M5-M8 strategic review: variable width per tenant). For THIS screen: render via the deployed `v_customer_for_*` computed column as-is; do NOT try to fix the width here — that's a separate data backfill. If the displayed value looks wrong on demo, flag it, don't patch it.
- **Security & sanitization** (Iron Rule 8): no `innerHTML` with user data — `escapeHtml()` / `textContent`. PIN-gated actions go through the existing `pin-auth` flow / `pin-modal.js`.
- **RTL + Hebrew-first**, tokens from the mockup's Hybrid+Navy palette (already canonical). Mobile: the card is staff-desktop-primary, but don't break narrow widths.
- **T-constants + FIELD_MAP** (Iron Rule 5): the schema review noted `shared-field-map.js` has no M5 entries yet — this UI SPEC is the point where they get added for the customer-card fields it renders.

## 3. Contract table — what each surface reads/calls (all deployed 🟢)

| Surface | Type | Owner | Used by the card for |
|---|---|---|---|
| `v_customer_full` | View | M5 | header + demographics + lifecycle + aggregations |
| `v_customer_for_messaging` | View | M5 | contact/consent display |
| `v_customer_prescriptions_summary` | View | **M6** | tab-3 prescriptions list |
| `create_prescription_draft(tenant, customer, kind)` | RPC | **M6** | tab-3 "+ מרשם חדש" button |
| `update_customer_display_preferences` | RPC | M5 | preferences action |
| `assign_to_household` | RPC | M5 | household action |
| `merge_customers` | RPC | M5 | merge action |
| `delete_last_unused_customer` | RPC | M5 | Iron-Rule-32 delete (double-PIN) |
| `allocate_tenant_number` | RPC | M5 | (only if create-flow is in scope — see §4) |

The executor MUST verify each view/RPC signature against live Supabase before wiring (probe first), since the card breaks silently if a column name drifted from the mockup's assumption.

## 4. Scope OUT (do NOT build here)

- **Customer LIST + create-mode** — that's Phase E, a separate SPEC. This SPEC is the CARD (viewing/editing an existing customer), not the list or the create wizard. (If the card can only be reached via a list that doesn't exist yet, wire a minimal dev entry — e.g. open card by customer_id via URL param — and document it; do NOT build the full list.)
- **OpticPlus / leads migration data** — Phase C, separate. The card renders whatever demo customers exist (11 + the migrated demo leads).
- **customer_number width fix / short_code backfill** — separate data write (F-F-1).
- **Anything in M6/M7/M8/M9 UI** — only the M5 card. tab-3 CONSUMES M6 contracts but does not build the M6 prescription editor.
- **Merge to main.**

## 5. Closure gate — Iron Rule 34 (mandatory, non-negotiable)

This SPEC does NOT close 🟢 without ALL of:
1. **Chrome-MCP screenshot(s)** of the card in working state on demo — each of the 5 tabs rendered against live demo data.
2. **Runtime trace** (`window.__modalTrace` or equivalent) showing the expected events fire in order for at least one wired action (e.g. open "+ מרשם חדש" → create_prescription_draft fires → tab-3 refreshes).
3. **DB-query evidence** that the runtime action produced the expected DB write (e.g. a new draft prescription row for the demo customer).
4. **Side-by-side mockup-vs-live** fidelity check (the mockup is the pixel target; material drift is a finding, not a pass). Per memory `feedback_no_polish_by_validation`: if the executor finds the screen "already meets criteria" without shipping real wiring code, that's an escalation, not a silent 🟢.

SQL-only verification is necessary but NOT sufficient (Iron Rule 34). No screenshots + trace + DB evidence → not closed.

## 6. Constraints

- Branch develop. Demo tenant only (`8d8cfa7e-...`, PIN 12345). No Prizma writes. No merge to main.
- Iron Rules in focus: 5 (FIELD_MAP), 6 (index.html root), 7 (API abstraction via shared.js), 8 (sanitization + PIN), 9 (no hardcoded business values — tenant name/logo/etc from config), 12 (file size ≤300/350 — split the page JS by responsibility, don't dump one giant file), 21 (no orphans/duplicates — reuse shared-ui.js / search-select.js / pin-modal.js, don't reinvent), 22 (defense-in-depth tenant_id on reads), 34 (Chrome closure).
- §0.5 Root Discipline: if a new root .html entrypoint is added, update both §0.5 and `scripts/checks/root-allowlist.json`.
- Integrity gate clean before every commit; selective git add by filename; backups per Working Rule 9.9 if >5 files / >100-line refactor.
- This is Daniel-in-loop: the run may pause for Daniel at genuine UI/UX judgment points (which the mockup doesn't settle). Real ambiguity → escalate, don't guess.

## 7. What Daniel has at the end

A working M5 customer card on demo — 5 tabs, wired to the live spine, matching the mockup, with Chrome-MCP evidence attached to FOREMAN_REVIEW. The render+action wiring pattern is now established for every later M5-M9 screen to copy. Then: Phase E (customer list + create-mode) becomes the natural next UI SPEC.

---

*End of Brief. First UI on the M5-M9 spine. Demo only. Chrome-MCP closure mandatory. No merge to main.*
