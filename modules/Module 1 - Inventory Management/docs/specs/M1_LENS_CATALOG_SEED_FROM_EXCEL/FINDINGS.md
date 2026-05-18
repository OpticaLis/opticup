---
spec_id: M1_LENS_CATALOG_SEED_FROM_EXCEL
executor: opticup-executor
authored: 2026-05-18
verdict: ABORTED
---

# FINDINGS — M1_LENS_CATALOG_SEED_FROM_EXCEL

## F-1 — Excel mixes eyeglasses + contact lenses in one sheet (HIGH)

**Severity:** HIGH (data-quality issue blocks any clean seed of the lens catalog)

**What:** `tests/קטלוג-עדשות-18.5.26.xls` ("authoritative Prizma catalog", 2904 rows, 11 columns) intermixes:
- Eyeglasses lens variants (2827 rows with `eyeglasses_flag=1`)
- Contact lens variants (53 rows with `contact_lens_flag=1`)
- Duration-based contact-lens *categories* (`יומיות` = daily / `חודשיות` = monthly / `שנתיות` = annual) treated as if they were *brands*

The Excel column header `חברה` ("company/brand") contains both:
- Real eyeglass brands: `HOYA`, `Hoya`, `Color Flex`, `Core Line`, `Leica`, `RodenStock`/`רודנשטוק`, `אופטימייז`, `Zeiss/צייס`, `שמיר`
- Contact-lens **duration categories**: `יומיות`, `חודשיות`, `שנתיות` (NOT brands — these are wear-duration groupings, akin to "daily lenses" / "monthly lenses" / "yearly lenses")

**Why this broke SPEC B:** the parser canonicalized all `חברה` values as `lens_brand` rows, creating fake "brand" entities for the duration categories. Then the multi-supplier offering rows for those fake brands (multiple suppliers all stock "daily lenses") created the apparent M:N that conflicted with the `supplier_brand_distribution_active_unique` partial index.

**Real model:** glasses + contact lenses are separate product domains; contact lenses have a different catalog axis (brand × duration × power × … not brand × refractive_index × diameter × coating × tint).

**Proposal:** future seed SPEC must pre-process the Excel into two separate intermediate files (glasses-only + contact-lens-only) before any DB write. Contact lenses need their own design schema (probably contact_lens_design / contact_lens_variant tables — already exist per Module 1 — and a different ingest mapping).

**Why not fix in this SPEC:** the abort is correct — fixing the data model mid-execution would require schema design conversations + likely amendments to the contact-lens module. Out of scope for a "seed Prizma's lens catalog" SPEC. Daniel will dispatch a separate SPEC.

---

## F-2 — Health funds (קופות חולים) miscategorized as suppliers in Excel (HIGH)

**Severity:** HIGH (architectural confusion — wrong data model for the customer use-case)

**What:** Excel column `ספק` ("supplier") contains:
- Real supplier entities: `LEO`, `SHALDAG`, `Steuer`, `בדולח`, `לפידות`, `קופר ויז'ן`, `שמיר` (7)
- Health funds (Israeli national health insurance funds, called קופות חולים): `לאומית` (Leumit), `לאומית ילדים` (Leumit children's wing)

**Why this broke SPEC B:** health funds are NOT suppliers — they're **customers with negotiated bulk pricing agreements**. The Excel rows where `ספק=לאומית` represent variants where Leumit fund members get a special price; the actual physical supplier is still שמיר (the parent supplier listing the קופה as the "pricing distributor" for that subset). Modeling קופות as suppliers in `public.suppliers` is semantically wrong.

**Real model:** קופות חולים need a separate "customer pricing tier" or "pricing agreement" data model. Variants stock-managed by שמיר can have a "special price for Leumit members" attribute. The current schema has no such surface.

**Proposal:** future architecture review to introduce a `customer_pricing_agreement` (or similar) table that links (variant_id, customer_organization_id, tenant_id, price). Health funds get rows in `customer_organizations` (or similar), NOT `suppliers`.

**Why not fix in this SPEC:** out of scope; new data model needed.

---

## F-3 — Partial unique index `supplier_brand_distribution_active_unique` is CORRECT (MEDIUM, INFO)

**Severity:** MEDIUM (defensive — flags the index for preservation and explains why)

**What:** During the abort investigation, the partial unique index `(tenant_id, brand_id) WHERE status='active' AND is_deleted=false` was identified as a stop-trigger. It enforces **one active supplier-distribution per brand per tenant** — implying a "single canonical distributor for this brand at this tenant right now" semantic.

**Apparent conflict (which was actually a data issue, not a schema issue):** the Excel showed `יומיות` distributed by 4 suppliers, `שמיר` distributed by 3. This LOOKED like an M:N model that the schema's single-active assumption couldn't represent.

**Resolution:** the M:N was an Excel data-quality artifact (see F-1 and F-2). After mentally splitting the Excel into glasses + contact-lens + health-fund-pricing models, all "M:N" cases dissolve:
- "4 suppliers for `יומיות`" was actually "4 suppliers stocking 4 different contact-lens-daily brands" — the entity `יומיות` itself is not a brand
- "3 suppliers for `שמיר`" was actually "1 supplier (שמיר), with 2 health-fund pricing tiers (לאומית, לאומית ילדים)"

The schema is correct as designed.

**Proposal:** keep the partial unique index. DO NOT drop it in any future SPEC. If a real multi-distributor case ever arises (e.g., parallel-import suppliers for the same brand), the proper resolution is to use the `status` column to distinguish primary vs secondary (`active` vs `available`) — the partial index already accommodates this by only enforcing uniqueness for the `active` row.

**Why this finding matters:** this prevents a future "let's just drop the constraint to make data fit" anti-pattern. The data was wrong; the constraint correctly caught it.

---

**Total: 3 findings (2 HIGH, 1 MEDIUM/INFO).**
