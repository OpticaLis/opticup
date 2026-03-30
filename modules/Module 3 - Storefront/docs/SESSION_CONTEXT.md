# Module 3 — Storefront — ERP-Side Session Context

## Current Phase: Phase 4 — Catalog/Shop + WhatsApp + Bulk Ops (4A + 4B)
## Status: ✅ Complete
## Date: 2026-03-30

---

## Phase 4A — Catalog/Shop + WhatsApp + Booking (Storefront repo)

| Step | Status | Description | Commit (storefront) |
|------|--------|-------------|---------------------|
| 0 | ✅ | Backup: 2026-03-30_pre-phase4a | — |
| 1 | ✅ | SQL 006: storefront_mode cols, storefront_leads, config cols | `b8d9ec9` |
| 2 | ✅ | SQL 007: v_storefront_products v3 with resolved_mode | `b8d9ec9` |
| 3 | ✅ | SQL 008: submit_storefront_lead RPC | `b8d9ec9` |
| 4 | ✅ | Updated product types + tenant config | `4edf1b7` |
| 5 | ✅ | WhatsAppButton.astro component | `4edf1b7` |
| 6 | ✅ | NotifyMe.astro component | `4edf1b7` |
| 7 | ✅ | BookingButton.astro component | `4edf1b7` |
| 8 | ✅ | Mode-aware product detail + card pages | `d1e706d` |
| 9 | ✅ | Documentation + quality gate | `d90f866` |

## Phase 4B — Bulk Operations (ERP repo)

| Step | Status | Description | Commit (ERP) |
|------|--------|-------------|--------------|
| 0 | ✅ | Backup: 2026-03-30_pre-phase4b | — |
| 1 | ✅ | storefront-settings.html + JS | `15d048f` |
| 2 | ✅ | storefront-brands.html + JS | `15d048f` |
| 3 | ✅ | storefront-products.html + JS (bulk select) | `15d048f` |
| 4 | ✅ | Navigation link in index.html | `15d048f` |
| 5 | ✅ | Documentation (CLAUDE.md, SESSION_CONTEXT) | — |

---

## ⚠️ SQL Migrations NOT RUN

Daniel must run these in Supabase Dashboard SQL Editor before testing:
1. `opticup-storefront/sql/006-phase4a-storefront-modes.sql` — columns + leads table
2. `opticup-storefront/sql/007-v-storefront-products-v3.sql` — updated view with resolved_mode
3. `opticup-storefront/sql/008-rpc-storefront-leads.sql` — RPC for NotifyMe form

**Run in this order. 007 depends on 006. 008 depends on 006.**

---

## Key Architecture

### Display Mode Resolution
```
Product override (inventory.storefront_mode_override)
  ↓ if null
Brand default (brands.storefront_mode)
  ↓ if null
Fallback: 'catalog'
```

### Modes
| Mode | Price | WhatsApp | Notes |
|------|-------|----------|-------|
| catalog | Hidden | Primary CTA | Default for all products |
| shop | Shown | Secondary CTA | Shows sell_price + discount |
| hidden | — | — | Excluded from view entirely |

### New ERP Pages
- `/storefront-settings.html` — WhatsApp number, booking URL, notification method
- `/storefront-brands.html` — Brand mode selector (catalog/shop/hidden per brand)
- `/storefront-products.html` — Product override manager with bulk select

---

## What's Next

1. Daniel runs SQL migrations (006, 007, 008) in Supabase Dashboard
2. Daniel tests storefront + ERP pages
3. Merge develop → main (both repos)
4. Phase 5 planning
