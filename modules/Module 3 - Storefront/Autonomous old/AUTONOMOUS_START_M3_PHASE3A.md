# Optic Up — Module 3 Storefront — Phase 3A: SEO Data Prep, Product Mapping & Redirects

Context: Optic Up — multi-tenant SaaS optical store management.
Repo: OpticaLis/opticup-storefront (NOT opticup!)
Working directory: C:\Users\User\opticup-storefront
ERP repo (READ-ONLY): C:\Users\User\opticup
Machine: 🖥️ Windows

MODE: AUTONOMOUS — execute all steps without waiting for approval.

## ⛔ CRITICAL SAFETY RULES ⛔

1. Work ONLY in `C:\Users\User\opticup-storefront\`. NEVER modify files in `C:\Users\User\opticup\`.
2. ERP repo (`opticup`) is READ-ONLY — read SEO audit data from there, never write.
3. NEVER commit `.env` files to git.
4. NEVER run SQL against Supabase — this phase has ZERO database changes.
5. NEVER modify Astro pages/components/styles — this phase is DATA PREP ONLY.
6. All Supabase queries use Views only — `v_storefront_products`, `v_storefront_categories`, `v_storefront_brands`.
7. Before EVERY commit: `git status` must NOT show .env.
8. If unsure: document as DECISION_NEEDED, choose safer option, continue.
9. All scripts go in `scripts/seo/`. All generated output goes in `scripts/seo/output/`.

## FIRST — Read:

1. `cd C:/Users/User/opticup-storefront && git checkout develop && git pull origin develop`
2. Verify branch: `git branch` — must show `develop`
3. Read `CLAUDE.md` in repo root
4. Read `SESSION_CONTEXT.md` for current status
5. Read `PHASE_3A_SPEC.md` at `C:\Users\User\opticup\modules\Module 3 - Storefront\docs\PHASE_3A_SPEC.md`
6. Verify SEO audit data exists: `dir C:\Users\User\opticup\modules\"Module 3 - Storefront"\seo-audit\`
7. Verify blog data exists: `dir C:\Users\User\opticup\modules\"Module 3 - Storefront"\seo-audit\data\`

## THEN — Execute every step in PHASE_3A_SPEC.md sequentially (Steps 1-9).

FOR EACH STEP:
1. Read step requirements from PHASE_3A_SPEC.md
2. Implement
3. Run verification checklist for that step
4. Commit: `git add -A && git commit -m "Phase 3A Step N: [description]" && git push origin develop`
5. Update SESSION_CONTEXT.md

EVERY 3 STEPS: checkpoint — update SESSION_CONTEXT.md with progress, commit + push.

IF BLOCKED after 3 attempts: document error in SESSION_CONTEXT.md, skip step, continue.
IF DECISION NEEDED: document in SESSION_CONTEXT.md, choose simpler option, continue.

## KEY DATA LOCATIONS (READ-ONLY):

```
C:\Users\User\opticup\modules\Module 3 - Storefront\seo-audit\
├── url-inventory.json          ← All 1,024 WordPress URLs with metadata
├── url-inventory.md            ← Human-readable report
├── url-mapping-template.csv    ← Mapping template
└── data\
    ├── wp-posts-he.json        ← 58 Hebrew blog posts (full content)
    ├── wp-posts-en.json        ← 43 English blog posts (if exists)
    └── wp-posts-ru.json        ← 42 Russian blog posts (if exists)
```

## SCRIPTS TO CREATE (in opticup-storefront):

```
scripts/seo/
├── map-products.ts             ← Step 2: WP product → barcode matching
├── classify-pages.ts           ← Step 3: Page classification
├── classify-blog.ts            ← Step 4: Blog mapping with i18n
├── generate-tag-redirects.ts   ← Step 5: Tag → /products/ redirects
├── generate-category-redirects.ts ← Step 6: Category redirects
├── merge-redirects.ts          ← Step 7: Merge all → vercel.json
├── validate-migration.ts       ← Step 8: 100% coverage check
└── output/                     ← Generated data (created by scripts)
```

## WHEN ALL 9 STEPS DONE:

1. Run full Completion Checklist from PHASE_3A_SPEC.md
2. Final SESSION_CONTEXT.md update with:
   - Product mapping stats (matched/unmatched/brand-only)
   - Total redirect count in vercel.json
   - Migration validator results (coverage %)
   - Any DECISION_NEEDED or BLOCKED items for Daniel
3. Final CHANGELOG.md entry
4. Commit all: `git add -A && git commit -m "Phase 3A complete: SEO data prep & redirects" && git push origin develop`
5. Do NOT merge to main yet — Daniel will review mapping results first
6. Git tag: `git tag v3.0-phase3a-seo-data-prep && git push origin v3.0-phase3a-seo-data-prep`
7. Output summary: what was done, stats, issues, what's next (Phase 3B)

## ⚠️ IMPORTANT DIFFERENCES FROM PHASE 2:

- **No merge to main** — Daniel reviews product mapping results before merge
- **No Astro page changes** — this phase creates scripts and data only
- **No SQL changes** — zero database modifications
- **ERP repo is read-only** — except updating ROADMAP.md status (Phase 3: "3A ✅")
- **vercel.json IS modified** — redirect rules are added

Go.
