# M5_POLISH_PHONE2_LIST_COLUMNS — Code Review

> **Reviewer:** opticup-reviewer · **Date:** 2026-05-23

## Iron Rule Compliance

✅ **All hard rules satisfied.**

| Rule | Verdict | Spot-check |
|---|---|---|
| 5 (FIELD_MAP) | ✅ | `'טלפון-עבודה':'phone_secondary'` added to customers FIELD_MAP. |
| 7 (DB via helpers) | ✅ | grep `sb\.from` in new code → 0 hits. DB.select / DB.rpc throughout. |
| 8 (sanitize) | ✅ | escapeHtml on every dynamic interpolation in customer-list-columns.js + customer-list.js renderCell. |
| 12 (file size) | ✅ | customer-list-columns.js 158L; customer-list.js 328L (under 350 hard cap). |
| 14/15/22 | ✅ | tenant_settings.tenant_id NOT NULL + canonical 2-policy RLS (M5_SCHEMA). RPC enforces p_tenant_id. |
| 21 (no orphans, no duplicates) | ✅ | REUSED tenant_settings + update_customer_display_preferences (M5_SCHEMA-deployed). No new config table. ONE picker handler — not scattered. |
| 31 | ✅ | exit 0 at every commit. |
| 32 (destructive) | ✅ | Declared additive: ADD COLUMN + view recreate + 1 DML write reverted at smoke close. NO DROP. |
| 34 (Visual-Fidelity Gate) | ✅ | Step 0 + Step 1 + Step 2 tables embedded in TEST_REPORT + FOREMAN_REVIEW. Screenshots delivered via SendUserFile. |
| Selective git add | ✅ | NO `-a`. Explicit-filename throughout. |

## Security & SaaS

✅ **No new security issues.**
- `tenant_settings` row created/updated via the existing JWT-Block-A-protected RPC — cross-tenant isolation guaranteed.
- `phone_secondary` reads go through `v_customer_full` which uses `security_invoker=on` + base-table RLS.
- No new auth surface; PIN-gating on phone_secondary edit symmetric with `phone`.
- The column picker shows aspirational future columns DISABLED — clicking them fires `showComingSoon` (no data leak; no behavior).

## Code Quality

1. **Reuse discipline strong** — `tenant_settings.customer_list_preferences` was BUILT in M5_SCHEMA for exactly this purpose. The RPC was also already deployed. This SPEC plugs into existing infrastructure rather than inventing new config (Iron Rule 21 ✓).

2. **Data-driven row rendering** — switched customer-list.js from hardcoded grid cells to a `renderCell(renderKey, row)` switch driven by `state.activeColumns`. CSS uses `--cust-col-count` custom prop to auto-size `grid-template-columns`. Clean.

3. **Foundation-first future columns** — the 4 coming-soon entries (last_exam_date / last_order_date / club_tier / age) are pre-wired in the column registry + the coming-soon REGISTRY. When M6/M7/M13 ship, simply flipping `wired: true` + adding a renderCell branch lights them up. No rebuild.

4. **View migration handled correctly under Postgres constraint** — F-POL-1 + F-POL-2 caught Postgres' CREATE-OR-REPLACE-VIEW column-position rule. Resolved with 2-migration split. Documented for future SPECs (P-EXEC-8).

5. **PIN-gating symmetric** — phone_secondary inherits `pinGated: true` from FIELDS_CONTACT, same path as `phone`. No new permission key. 

6. **Modal CSS scoped** — `.cust-colpick-*` selectors all namespaced to the customers page (live within `.cust-page` scope). No global CSS pollution.

## Findings

5 findings in FINDINGS.md. All INFO-level. 4 resolved or test-only. 1 PARTIAL-RESOLUTION (F-CARD-CONTACT-SCHEMA shrunk: row 2 closed).

## Recommendations

#### Priority fixes (before close)
None.

#### Nice-to-have (defer)
- Column drag-reorder UX (the picker shows checkboxes; column order = registry order + saved-array order. Drag-to-reorder is a future polish).
- Column-width persistence (could add to customer_list_preferences alongside list_columns).
- Per-user override on top of per-tenant default (future — per-user prefs deferred per M5_SCHEMA Out-of-Scope).

## Verdict

🟢 **PASS — proceed to Foreman closure.**

Both items delivered cleanly. Visual-Fidelity Gate satisfied per the gate this team just installed. Iron Rules clean. Per-tenant SaaS contract honored end-to-end.
