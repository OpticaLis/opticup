# Product Mapping Report

Generated: 2026-03-30T05:47:00.495Z

## Stats

| Metric | Value |
|--------|-------|
| Total WP products (published) | 733 |
| Storefront visible products | 49 |
| Exact match → /products/[barcode]/ | 23 (3.1%) |
| Fuzzy match → /products/[barcode]/ | 5 (0.7%) |
| Brand redirect → /brands/[slug]/ | 663 (90.5%) |
| Wildcard → /products/ | 42 (5.7%) |
| **Match rate (exact+fuzzy)** | **3.8%** |
| **With specific destination** | **691 (94.3%)** |

## DECISION_NEEDED: Low Barcode Match Rate

Only 49 products are currently visible on the Astro storefront (only Saint Laurent brand has `default_sync` set).
Of 733 WP products, only 28 could be matched to specific barcodes.

**Resolution strategy:**
1. Products matched to barcodes get specific 301 redirects
2. Products with identified brand names redirect to `/brands/[brand-slug]/`
3. All remaining products caught by wildcard: `/product/:path*` → `/products/`
4. As more brands are enabled on the storefront, more specific redirects can be generated

**This is acceptable because:**
- Every WP product URL has a redirect destination (zero orphans)
- The wildcard ensures no 404s even for unknown products
- SEO value is preserved at the brand/catalog level
- Specific product redirects can be refined when inventory grows

## Quality Gate

- Match rate > 70%: FAIL — see DECISION_NEEDED above
- All products have redirect destination: PASS (wildcard covers unmatched)

## Brand Distribution

| Brand | Count |
|-------|-------|
| Cazal | 71 |
| Gucci | 39 |
| Prada | 38 |
| Saint Laurent | 36 |
| Dior | 29 |
| Etnia Barcelona | 28 |
| Swarovski | 25 |
| Gast | 24 |
| Dolce & Gabbana | 22 |
| Miu Miu | 22 |
| John Varvatos | 22 |
| Gotti | 21 |
| Fendi | 20 |
| Moscot | 20 |
| Tejesta | 16 |
| Kamemannen | 15 |
| Serengeti | 14 |
| Ray-Ban | 13 |
| Vintage | 12 |
| Genny | 12 |
| Milo | 12 |
| Hublot | 12 |
| Balenciaga | 11 |
| Bolle | 10 |
| Porsche Design | 10 |
| Celine | 10 |
| Mykita | 10 |
| Versace | 9 |
| Lool | 9 |
| Matsuda | 9 |
| Blackfin | 9 |
| Burberry | 8 |
| Jimmy Choo | 8 |
| RetroSuperFuture | 8 |
| Fred | 8 |
| Bottega Veneta | 7 |
| Tiffany & Co | 7 |
| Yohji Yamamoto | 7 |
| Henry Jullien | 7 |
| Talla | 7 |
| Montblanc | 5 |
| Valentino | 4 |
| Oakley | 3 |
| Masunaga | 2 |
| *(unidentified brand)* | 42 |

## Exact Matches (23)

- `/product/saint-laurent-sl736-2/` → `/products/0003127/`
- `/product/saint-laurent-sl736/` → `/products/0003140/`
- `/product/saint-laurent-sl402/` → `/products/0003241/`
- `/product/saint-laurent-sl553/` → `/products/0003126/`
- `/product/saint-laurent-sl467/` → `/products/0003190/`
- `/product/saint-laurent-sl551-2/` → `/products/0003128/`
- `/product/saint-laurent-sl28-2/` → `/products/sl0017/`
- `/product/saint-laurent-sl716/` → `/products/0003123/`
- `/product/saint-laurent-sl711/` → `/products/0002658/`
- `/product/saint-laurent-sl474/` → `/products/0001388/`
- `/product/saint-laurent-sl28/` → `/products/sl0017/`
- `/product/saint-laurent-sl551/` → `/products/0003128/`
- `/product/saint-laurent-sl549/` → `/products/sl0009/`
- `/product/saint-laurent-sl578/` → `/products/sl0089/`
- `/product/saint-laurent-sl584/` → `/products/sl0002/`
- `/product/saint-laurent-sl585/` → `/products/sl0004/`
- `/product/saint-laurent-sl472/` → `/products/sl0091/`
- `/product/saint-laurent-sl578-2/` → `/products/sl0089/`
- `/product/saint-laurent-sl578-3/` → `/products/sl0089/`
- `/product/saint-laurent-sl584-2/` → `/products/sl0002/`
- `/product/saint-laurent-sl386/` → `/products/sl0095/`
- `/product/saint-laurent-sl399/` → `/products/SL0070/`
- `/product/saint-laurent-sl514/` → `/products/sl0020/`

## Fuzzy Matches (5)

- `/product/saint-laurent-sl715/` → `/products/0004056/` (title: "SL715")
- `/product/saint-laurent-sl550/` → `/products/0003131/` (title: "SL550")
- `/product/saint-laurent-sl549-2/` → `/products/sl0009/` (title: "SL549 SLIM OPT")
- `/product/saint-laurent-sl744/` → `/products/SL0999/` (title: "SL744")
- `/product/saint-laurent-sl436-opt/` → `/products/sl0015/` (title: "SL436 OPT")

## Wildcard Fallbacks (sample, 42 total)

- `/product/9509-cazal/` → /products/ (title: "9509", slug: "9509-cazal")
- `/product/gg1600s/` → /products/ (title: "GG1600S", slug: "gg1600s")
- `/product/byte/` → /products/ (title: "BYTE", slug: "byte")
- `/product/etosha/` → /products/ (title: "Etosha", slug: "etosha")
- `/product/bb0090o/` → /products/ (title: "BB0090O", slug: "bb0090o")
- `/product/b1395-d/` → /products/ (title: "B1395-D", slug: "b1395-d")
- `/product/ciacer/` → /products/ (title: "Ciacer", slug: "ciacer")
- `/product/4242d/` → /products/ (title: "4242D", slug: "4242d")
- `/product/4242d-tiffanyco/` → /products/ (title: "4242D", slug: "4242d-tiffanyco")
- `/product/m3142/` → /products/ (title: "M3142", slug: "m3142")
- `/product/10103h/` → /products/ (title: "10103H", slug: "10103h")
- `/product/miltzen/` → /products/ (title: "Miltzen", slug: "miltzen")
- `/product/curtis/` → /products/ (title: "CURTIS", slug: "curtis")
- `/product/gusio/` → /products/ (title: "Gusto", slug: "gusio")
- `/product/crazy-monday/` → /products/ (title: "Crazy monday", slug: "crazy-monday")
- `/product/etnia-barcelon-sora/` → /products/ (title: "Sora", slug: "etnia-barcelon-sora")
- `/product/742/` → /products/ (title: "742", slug: "742")
- `/product/nexus/` → /products/ (title: "Nexus", slug: "nexus")
- `/product/po-03/` → /products/ (title: "PO-03", slug: "po-03")
- `/product/po-02/` → /products/ (title: "PO-02", slug: "po-02")
... and 22 more
