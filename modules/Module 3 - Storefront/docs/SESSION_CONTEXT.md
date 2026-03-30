# Module 3 — Storefront — ERP-Side Session Context

## Current Phase: Phase 6 — i18n AI Translation
## Status: ✅ Complete (code done, pending SQL + Edge Function deploy)
## Date: 2026-03-30

---

## Phase 6 — i18n AI Translation ✅

| Step | Status | Description | Commit (ERP) |
|------|--------|-------------|--------------|
| 0 | ✅ | Backup | — |
| 1-2 | ✅ | SQL 016-017: glossary + corrections tables, seed data | `a57d8af` (storefront) |
| 3 | ✅ | Edge Function: translate-content | `a596c04` |
| 4 | ✅ | Auto-translate in generate-ai-content | `a596c04` |
| 5 | ✅ | Translations tab in storefront-content.html | `d070577` |
| 6 | ✅ | Glossary management page (storefront-glossary.html) | `d070577` |
| 7 | ✅ | Storefront EN/RU product pages | `dd91bf3` (storefront) |
| 8 | ✅ | Bulk translate (in translations tab) | `d070577` |
| 9 | ✅ | Documentation updated | `27b2436` |

---

## Phase 5 — AI Content Engine (5A + 5B + 5C) ✅

| Step | Status | Description | Commit (ERP) |
|------|--------|-------------|--------------|
| 5A | ✅ | generate-ai-content Edge Function + content manager | `6e39d9c` |
| 5B | ✅ | generate-blog-post Edge Function + blog editor | `e80dff0` |
| 5C | ✅ | generate-landing-content Edge Function + landing editor | `213dd50` |

---

## ⚠️ PENDING — Daniel Must Do

### Phase 6 SQL Migrations (Supabase Dashboard)
1. `opticup-storefront/sql/016-phase6-translation.sql` — translation_glossary + translation_corrections
2. `opticup-storefront/sql/017-seed-glossary.sql` — seed 45 optical terms × EN+RU

### Phase 6 Edge Function Deploy
```bash
supabase functions deploy translate-content --no-verify-jwt
supabase functions deploy generate-ai-content --no-verify-jwt  # updated with auto-translate
```

### Phase 5 SQL Migrations (if not already run)
1. `013-phase5a-ai-content.sql` — ai_content + ai_content_corrections tables
2. `014-v-storefront-products-v4.sql` — view v4 with AI columns
3. `015-blog-posts-table.sql` — blog_posts table + view
4. Then: `cd opticup-storefront && npx tsx scripts/seo/migrate-blog-to-db.ts`

### Phase 5 Edge Function Deploy (if not already done)
```bash
supabase functions deploy generate-ai-content --no-verify-jwt
supabase functions deploy generate-blog-post --no-verify-jwt
supabase functions deploy generate-landing-content --no-verify-jwt
```

### Phase 4A SQL (if not already run)
- `006-phase4a-storefront-modes.sql`
- `007-v-storefront-products-v3.sql`
- `008-rpc-storefront-leads.sql`

---

## Key Architecture

### New Edge Functions (Phase 6)
| Function | Purpose | Input | Output |
|----------|---------|-------|--------|
| translate-content | Hebrew → EN/RU translation | source_content, target_lang, glossary | Saved to ai_content |

### Translation System
1. Hebrew content generated (Phase 5) → auto-translate to EN+RU
2. Translations saved to `ai_content` with `language = 'en'` / `'ru'`
3. Glossary terms enforced in every translation prompt
4. Corrections saved to `translation_corrections` for learning
5. Bulk translate: processes all missing translations with progress bar

### New ERP Pages (Phase 6)
- `/storefront-glossary.html` — Translation glossary management (EN/RU)
- Translations tab added to `/storefront-content.html`

### New JS Modules (Phase 6)
- `modules/storefront/storefront-translations.js` — Translations tab logic
- `modules/storefront/storefront-glossary.js` — Glossary CRUD

### Storefront Navigation (7 tabs)
Settings → Brands → Products → AI Content → Blog → Landing Pages → Glossary

---

## What's Next

1. Daniel runs SQL migrations + deploys Edge Functions (Phase 5 + 6)
2. Daniel tests all features
3. Merge develop → main (both repos)
4. Phase 7+ TBD
