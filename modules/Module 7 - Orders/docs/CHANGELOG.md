# Module 7 — Orders · Changelog

> Build phase opened 2026-05-23 with M7_SCHEMA Phase A+B sealed.

---

## 2026-05-23 — Phase A+B Schema closed 🟢

**SPEC:** `M7_SCHEMA` (closed 🟢). Overnight Full-Auto Pipeline chain Half 1 of M7+M8 chain.

- **4 tables:** orders (17 cols), sub_orders (45 cols multi-state flags via Pattern §5.1), sub_order_items (14 cols), order_general_discounts (12 cols).
- **9 enums** for state-machines + bounded property sets.
- **6 RPCs + 1 trigger fn** — re-uses M5 `allocate_tenant_number(_, 'order')` + M1 `decrement_inventory`/`increment_inventory` direct (Brief §4.3).
- **7 views** for cross-module surfaces.
- **Status aggregation trigger** (Pattern P21 — first instance in project) — orders.status auto-computes from child sub_orders.
- **Smoke 9/9 PASS** on demo + 0 Prizma writes.
- Sealed under `docs/specs/M7_SCHEMA/` (7 artifacts).
- Iron Rules in sharp focus: 1, 11, 14, 15, 16, 18, 19, 22, 32 — all conformed.

Commits land at chain-close — see `git log --oneline --grep='m7'`.

---

## 2026-05-11 — Center-column redesign (3 variants)

**SPEC:** `M7_CENTER_REDESIGN_V7_VARIANTS` (closed 🟢)

- New file: `architecture-brief/M7_CENTER_REDESIGN_V7_VARIANTS.html` — 3 layout variants (A / B / C) of the order-screen center column. All 9 v6 data regions preserved in each variant. Daniel-locked action-bar (2×2 type-picker right + scan/catalog left + divider) is identical across the three. Architect's recommendation: Variant A.
- First-ever Module 7 docs/ population: `SESSION_CONTEXT.md`, `MODULE_MAP.md`, `CHANGELOG.md` stubs.
- Pipeline: Foreman → Executor → Reviewer → Localhost-Tester (N/A — static mockup) → Foreman-review (Full-Auto single chat).

Files unchanged this run: `M7_ORDERS_FULL_MOCKUP_V6.html`, `M7_ORDERS_CENTER_COLUMN_VARIANTS.html` (Destructive Operations envelope: None).

---

## 2026-05-11 — V7 locked (Variant A canonical)

**SPEC:** `M7_CLOSURE_V7_VARIANT_A` (closed 🟢)

- Daniel selected Variant A from the 2026-05-11 3-variant exploration (`M7_CENTER_REDESIGN_V7_VARIANTS.html`). Variant A = two-pane work surface (wide right pane: items + lenses + CTA; narrow left pane: prescription + pricing) + sticky tools strip at bottom (so-print + so-msg). The only layout from the 3 candidates that kept all 9 v6 data regions visible simultaneously.
- New canonical file: `architecture-brief/M7_ORDERS_FULL_MOCKUP_V7.html` (Variant A only, standalone — no tabs, no banner, no script).
- Archived to `_archive/m7-sketches-v6-prior/`:
  - `M7_ORDERS_FULL_MOCKUP_V6.html` (v6 baseline, superseded)
  - `M7_CENTER_REDESIGN_V7_VARIANTS.html` (3-variant comparison file, decision history)
  - `M7_ORDERS_CENTER_COLUMN_VARIANTS.html` (earlier rejected center-column attempt)
- `M7_ORDERS_BRIEF.md` updated with Canonical Sketch header pointing to V7.
- DECISIONS_LOG cross-module entry 18 + M7 sub-table entry 10 + full M7.md section recorded.
- Pipeline: Foreman → Executor → Foreman-review (Localhost-Tester skipped per SPEC §10 — no runtime, doc-only).
- Destructive Operations envelope: 3 `git mv` renames (rename-only, no deletes).
