# Demo Data Map — M1 Final Completion (Updated 2026-05-17 continuation)

**Tenant:** demo (`8d8cfa7e-ef58-49af-9702-a862d459cccb`, slug=`demo`)
**Login URL:** `http://localhost:3000/inventory.html?t=demo`
**Generated:** 2026-05-17 continuation session, Phase 5 close

---

## NEW THIS SESSION (Phase 5 Hoya + Zeiss seed)

### Global Catalog (owner_tenant_id IS NULL, product_type='glasses', is_published=true)

#### Hoya — 4 NEW designs + 20 variants (LV-000033..LV-000052)
| Design | display_ids | Variants |
|---|---|---|
| Hoya Hilux EYAS BLC (single_vision, polycarbonate) | LV-000033..LV-000037 | 5 |
| Hoya Lifestyle V+ (progressive, CR-39) | LV-000038..LV-000042 | 5 |
| Hoya Sync III (office, CR-39) | LV-000043..LV-000047 | 5 |
| Hoya Eyenavi Wild Life (progressive sport, polycarbonate) | LV-000048..LV-000052 | 5 |

#### Zeiss — 4 NEW designs + 20 variants (LV-000053..LV-000072)
| Design | display_ids | Variants |
|---|---|---|
| Zeiss DriveSafe (single_vision, CR-39) | LV-000053..LV-000057 | 5 |
| Zeiss Progressive Individual 2 (progressive, CR-39) | LV-000058..LV-000062 | 5 |
| Zeiss SmartLife Single (single_vision, CR-39) | LV-000063..LV-000067 | 5 |
| Zeiss Officelens Plus (office, CR-39) | LV-000068..LV-000072 | 5 |

### Demo-side rows

- **40 supplier_catalog_offering** — Hoya → SHALDAG supplier; Zeiss → Steuer supplier. Wholesale ₪180/₪250/₪350/₪470 per index 1.5/1.6/1.67/1.74.
- **40 tenant_active_offerings** — all activated at **Smoke Loc A** (`e6f26ba3-4893-4001-9c55-bb88662d5370`).
- **40 pricing_overlay** — per-variant `negotiated` overlay, fixed_amount = wholesale × 1.7 ILS, status='active'.
- **40 tenant_lens_stock** — random qty 0-15 per variant, reorder_threshold=5, reorder_qty=10.

### Demo POs (PO-300003 / PO-300004 / PO-300005)

| PO# | Supplier | Status | Lines | Notes |
|---|---|---|---|---|
| PO-300003 | SHALDAG (Hoya) | sent | 3 | Awaiting delivery |
| PO-300004 | Steuer (Zeiss) | partial | 4 | 3/6 + 2/4 + 5/5 + 0/3 received |
| PO-300005 | SHALDAG (Hoya) | fully_received | 3 | Receipt RCP-300003 with 3 stock_lots |

### New cloned-to-private variant

- Variant `62d1c1f5-33cb-4398-a09f-0ce4d452ba6c` (display_id `PRV-b942dd83`) — cloned from Hoya Hilux LV-000033 (e8a90e8b...). owner_tenant_id=demo, is_published=false, lifecycle_status=draft.
  - **Known UX gap (Finding F-1):** the clone created the variant row but it's not visible in the private sub-tab UI because its `design_id` still points to the global Hoya Hilux design. UI's brand list query filters by `owner_tenant_id=demo` so the cloned variant has no surfaced parent. Daniel can verify via SQL or wait for the follow-up SPEC.

---

## PRESERVED FROM LAST NIGHT (Phase 1 / Phase 1-FIX)

### 3 private brands seeded via real Add-Brand prompt flow

| ID | Name | owner_tenant_id |
|---|---|---|
| `bac58d89-7283-4b66-9f05-d1eafd526a7b` | אופטיקה אורית — אביזרים | demo |
| `2506ca1d-c98e-400c-abd9-85c903a8dd0d` | אופטיקה אורית — עדשות | demo |
| `25c8dccc-5136-4e24-9f3b-d03b8a674591` | אופטיקה אורית — עדשות מגע | demo |

All `is_published=false`, `lifecycle_status='draft'`.

---

## PRESERVED FROM EARLIER (M1_CONTACT_LENSES_ACCESSORIES, 2026-05-16/17)

- 95 sample variants across 3 categories (30 lens + 40 CL + 25 accessory)
- 80 stock rows (lens + contact + accessory split)
- 6 sample POs (PO-200001..PO-300002 various statuses)
- 12 permission keys × 2 tenants (24 perm rows) + 60 role_permissions
- 16 brands across all 3 product types

---

## Manual Verification Quick-Links for Daniel

After logging in to http://localhost:3000/inventory.html?t=demo:

1. **Lens — Global catalog:** click sidebar "🔬 עדשות" → tab "📚 הקטלוג שלי" → sub-tab "🌐 מותגים גלובליים"
   - Should see 6 brands incl. Hoya + Zeiss
   - Click Hoya → 6 designs visible (4 new from tonight + 2 old)
   - Click Hoya Hilux EYAS BLC → 5 variants (LV-000033..037)
2. **Lens — Private catalog:** same path → sub-tab "📖 הקטלוג שלי" (private)
   - Should see 3 brands: 3 from last night's seed
3. **Contact-lenses — Global:** sidebar "👁 עדשות מגע" → tab "📚 הקטלוג שלי" → Global
   - 5 brands (Acuvue/Alcon/Bausch+Lomb/Ciba/CooperVision)
4. **Accessories — Global:** sidebar "🎒 אביזרים" → tab "📚 הקטלוג שלי" → Global
   - 5 brands (Crizal/Persol/Rayban/Warby/Zeiss-Accessories)
5. **Stock + POs:** sidebar "🔬 עדשות" → tab "מלאי" — see stock from Hoya PO-300005 receipt (LV-000033/036/037 with qty 3/4/2)
6. **Active POs:** tab "הזמנות פעילות" — see PO-300003 (sent) + PO-300004 (partial) + PO-300005 (fully received) + the 2 pre-existing

---

## Prizma untouched (verified 3 times)

`lens_brand`, `lens_design`, `lens_variant`, `supplier_catalog_offering`, `tenant_active_offerings`, `pricing_overlay`, `tenant_lens_stock`, `purchase_order`, `purchase_receipt`, `stock_lot` — ALL show 0 rows for Prizma tenant after each commit boundary.

---

*End of DEMO_DATA_MAP_UPDATED. Daniel: log in to demo and verify via the quick-links above.*
