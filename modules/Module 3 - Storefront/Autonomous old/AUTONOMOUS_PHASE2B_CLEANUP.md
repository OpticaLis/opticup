# Optic Up — Module 3 Storefront — Phase 2B: Complete Missing Features + Fix Docs

Context: Optic Up — multi-tenant SaaS optical store management.
Repo: OpticaLis/opticup-storefront
Working directory: C:\Users\User\opticup-storefront
Machine: 🖥️ Windows

MODE: AUTONOMOUS — execute all steps without waiting for approval.

## ⛔ CRITICAL SAFETY RULES ⛔

1. Work ONLY in `C:\Users\User\opticup-storefront\`. NEVER touch `C:\Users\User\opticup\`.
2. NEVER commit `.env` files to git.
3. NEVER run SQL against Supabase — save SQL to files only.
4. Before EVERY commit: verify `.env` NOT in `git status`.

## Background

Phases 1 and 2 were built without the full SPEC files. Several features were missed and documentation files (SESSION_CONTEXT, MODULE_MAP, CHANGELOG) may be missing or outdated. This session fixes docs and completes all missing items.

## FIRST

```bash
cd C:/Users/User/opticup-storefront
git pull origin main
```

Scan the entire repo to understand current state: what files exist, what pages are built, what components exist.

---

## Task 0 — Restore and update ALL documentation

**CRITICAL: Do this first before any code changes.**

Scan the full repo structure, then create/overwrite these 3 files with ACCURATE content reflecting what ACTUALLY exists right now:

### A) `SESSION_CONTEXT.md` (repo root)

Must include:
- Phase 1 step table (all ✅) with real commit hashes
- Phase 2 step table (all ✅) with real commit hashes
- Phase 2B status table (all ⬜ — will be filled as we go)
- Architecture section (Astro 6, Tailwind, Supabase, Vercel)
- Key Files table — list EVERY .astro, .ts, .css, .sql file that exists right now with description
- Decisions made in Phase 1 and 2
- What's Next section
- All commit hashes (get from `git log --oneline`)

### B) `docs/MODULE_MAP.md` (create `docs/` dir if missing)

Must include:
- Every file in src/ with line count and description
- Every file in sql/ with description
- Every component with its Props interface
- Every function exported from lib/*.ts with signature
- Get real line counts: `wc -l src/**/*.astro src/**/*.ts src/**/*.css sql/*.sql`

### C) `docs/CHANGELOG.md`

Must include:
- Phase 1 section: date, what was built, commits
- Phase 2 section: date, what was built, commits
- Phase 2B section: (will be updated at end)
- Get real commits: `git log --oneline`

**Verify:**
- [ ] SESSION_CONTEXT.md exists and reflects real state
- [ ] docs/MODULE_MAP.md exists and lists ALL files
- [ ] docs/CHANGELOG.md exists with Phase 1 + 2 history
- [ ] All commit hashes are REAL (from git log)

Commit: `git add -A && git commit -m "Phase 2B Task 0: Restore SESSION_CONTEXT + MODULE_MAP + CHANGELOG" && git push`

---

## Task 1 — Brands pages

Create two new pages:

**A) `src/pages/brands/index.astro`** — All brands page:
- Query `v_storefront_brands` View (or use getStorefrontBrands from products.ts)
- Grid of brand cards: brand name + product count
- Each card links to `/brands/[slug]/`
- Sorted alphabetically
- `export const prerender = false;`
- SEO title: "מותגים | אופטיקה פריזמה"
- Use BaseLayout with locale='he'

**B) `src/pages/brands/[slug].astro`** — Brand catalog page:
- `export const prerender = false;`
- Get brand by slug from `v_storefront_brands`
- Get all products for that brand using `getStorefrontProducts` with brand filter
- Show brand name as heading
- ProductCard grid of all brand products
- Breadcrumbs: ראשי > מותגים > [brand name]
- SEO title: "[brand name] | אופטיקה פריזמה"

**C) Create `src/components/BrandCard.astro`:**
- Props: `name: string`, `slug: string`, `productCount: number`, `locale: Locale`
- Card with brand name, product count, link to `/brands/[slug]/`
- Hover effect

**D) Add to products.ts** (if not already there):
- `getBrandBySlug(tenantId, slug)` function
- Ensure `getStorefrontBrands(tenantId)` exists

**Verify:**
- [ ] `/brands/` renders brand grid
- [ ] `/brands/[slug]/` renders products for that brand
- [ ] Build succeeds

Commit: `git add -A && git commit -m "Phase 2B Task 1: Brands pages (/brands/ + /brands/[slug]/)" && git push`

---

## Task 2 — Breadcrumbs component

Create `src/components/Breadcrumbs.astro`:

- Props: `items: Array<{ label: string; href?: string }>`, `locale: Locale`
- RTL-aware separator (◂ for RTL, ▸ for LTR)
- Last item is current page (no link, bold)
- Schema.org BreadcrumbList JSON-LD script tag

Add Breadcrumbs to these existing pages:
- `/products/[barcode].astro` — ראשי > מוצרים > [brand] [model]
- `/brands/[slug].astro` — ראשי > מותגים > [brand name]
- `/categories/index.astro` — ראשי > קטגוריות
- `/products/index.astro` — ראשי > מוצרים

**Verify:**
- [ ] Breadcrumbs render on all pages
- [ ] Schema.org JSON-LD present in page source
- [ ] RTL separator direction correct

Commit: `git add -A && git commit -m "Phase 2B Task 2: Breadcrumbs with Schema.org BreadcrumbList" && git push`

---

## Task 3 — GhostProduct overlay (out of stock)

Create `src/components/GhostProduct.astro`:

- Semi-transparent dark overlay
- Text: "המוצר אזל מהמלאי"
- Button: "עדכנו אותי כשיחזור" (UI only, no backend yet)

Add i18n keys to he.json, en.json, ru.json:
```json
"ghost": {
  "outOfStock": "המוצר אזל מהמלאי",
  "notifyMe": "עדכנו אותי כשיחזור"
}
```

Integrate into ProductCard.astro:
- If `product.quantity === 0`: show GhostProduct overlay, image gets opacity + grayscale

Integrate into product detail page:
- If quantity === 0: show out-of-stock banner

**Verify:**
- [ ] Ghost overlay works on product cards
- [ ] Product detail shows out-of-stock banner
- [ ] i18n keys added in all 3 languages

Commit: `git add -A && git commit -m "Phase 2B Task 3: GhostProduct overlay for out-of-stock" && git push`

---

## Task 4 — Schema.org Product markup

Add JSON-LD to `/products/[barcode].astro`:

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "[brand] [model]",
  "brand": { "@type": "Brand", "name": "[brand_name]" },
  "sku": "[barcode]",
  "image": "[first image URL]",
  "offers": {
    "@type": "Offer",
    "availability": "https://schema.org/InStock or OutOfStock",
    "priceCurrency": "ILS"
  }
}
```

Only include `price` if storefront_status = 'shop'.

**Verify:**
- [ ] JSON-LD in page source
- [ ] Valid JSON
- [ ] Availability matches stock

Commit: `git add -A && git commit -m "Phase 2B Task 4: Schema.org Product JSON-LD" && git push`

---

## Task 5 — Update Header navigation

Update `src/components/Header.astro`:

Ensure nav links:
- משקפי שמש → `/products/?category=משקפי+שמש`
- מסגרות ראייה → `/products/?category=מסגרות+ראייה`
- מותגים → `/brands/`
- עדשות מגע → `/products/?category=עדשות+מגע`
- בלוג → `/blog/` (placeholder)
- משקפי מולטיפוקל → `/products/?category=מולטיפוקל`

Same links in mobile menu.

**Verify:**
- [ ] Desktop + mobile nav have all links
- [ ] Links go to correct URLs

Commit: `git add -A && git commit -m "Phase 2B Task 5: Navigation links to real pages" && git push`

---

## Task 6 — Build test + final documentation update

1. `npm run build` — zero errors
2. Update SESSION_CONTEXT.md — Phase 2B all tasks ✅
3. Update docs/MODULE_MAP.md — add all new files from Phase 2B
4. Update docs/CHANGELOG.md — add Phase 2B section
5. Final commit:
   ```bash
   git add -A && git commit -m "Phase 2B complete: brands, breadcrumbs, ghost, schema, nav, docs" && git push
   ```
6. Tag:
   ```bash
   git tag v3.2b-phase2b-complete -m "Phase 2B: Brands, breadcrumbs, ghost overlay, Schema.org, nav, docs restored"
   git push origin v3.2b-phase2b-complete
   ```

**Verify:**
- [ ] Build passes
- [ ] All 7 tasks (0-6) ✅
- [ ] SESSION_CONTEXT fully up to date
- [ ] MODULE_MAP lists every file
- [ ] CHANGELOG has all phases
- [ ] `.env` not in git
- [ ] Tag created

---

## Output when done:

```
PHASE 2B COMPLETE — Missing Features + Docs
Tasks: 7/7 done (0-6)
Docs restored: SESSION_CONTEXT, MODULE_MAP, CHANGELOG
New pages: /brands/, /brands/[slug]/
New components: BrandCard, Breadcrumbs, GhostProduct
Enhanced: ProductCard (ghost), product detail (Schema.org), Header (nav)
Tag: v3.2b-phase2b-complete
Ready for Daniel review.
```
