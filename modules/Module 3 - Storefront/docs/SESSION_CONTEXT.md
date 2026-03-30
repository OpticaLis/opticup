# Module 3 — Storefront — ERP-Side Session Context

## Current Phase: Phase 5 — AI Content Engine (5A + 5B + 5C)
## Status: ✅ Complete (code done, pending SQL + Edge Function deploy)
## Date: 2026-03-30

---

## Phase 5A — AI Content Engine + Product Content ✅

| Step | Status | Description | Commit (ERP) |
|------|--------|-------------|--------------|
| 2 | ✅ | Edge Function: generate-ai-content | `6e39d9c` |
| 3 | ✅ | storefront-content.html + JS (content manager) | `6e39d9c` |
| 4 | ✅ | Bulk generate UI with progress bar | `6e39d9c` |
| 5 | ✅ | Navigation links updated | `6e39d9c` |

## Phase 5B — Blog System Rebuild ✅

| Step | Status | Description | Commit (ERP) |
|------|--------|-------------|--------------|
| 4 | ✅ | Edge Function: generate-blog-post | `e80dff0` |
| 5 | ✅ | storefront-blog.html + JS (blog editor) | `e80dff0` |

## Phase 5C — Landing Page AI + Learning ✅

| Step | Status | Description | Commit (ERP) |
|------|--------|-------------|--------------|
| 1 | ✅ | Edge Function: generate-landing-content | `213dd50` |
| 3 | ✅ | storefront-landing-content.html + JS | `213dd50` |
| 4 | ✅ | Navigation updated on all 6 storefront pages | `213dd50` |

---

## ⚠️ PENDING — Daniel Must Do

### SQL Migrations (Supabase Dashboard SQL Editor)
1. `opticup-storefront/sql/013-phase5a-ai-content.sql` — ai_content + ai_content_corrections tables
2. `opticup-storefront/sql/014-v-storefront-products-v4.sql` — view v4 with AI content columns
3. `opticup-storefront/sql/015-blog-posts-table.sql` — blog_posts table + view
4. Then run: `cd opticup-storefront && npx tsx scripts/seo/migrate-blog-to-db.ts` (migrates 143 blog posts)

### Edge Function Deploy
```bash
supabase functions deploy generate-ai-content --no-verify-jwt
supabase functions deploy generate-blog-post --no-verify-jwt
supabase functions deploy generate-landing-content --no-verify-jwt
```

### Previous Phase SQL (if not already run)
- `006-phase4a-storefront-modes.sql`
- `007-v-storefront-products-v3.sql`
- `008-rpc-storefront-leads.sql`

---

## Key Architecture

### New Edge Functions (Phase 5)
| Function | Purpose | Input | Output |
|----------|---------|-------|--------|
| generate-ai-content | Product descriptions, SEO, alt text | product_data, image, corrections | Saved to ai_content |
| generate-blog-post | Blog post drafts from topic | topic, keywords, length | Saved to blog_posts |
| generate-landing-content | Landing page headlines, CTA | topic, tone, products | Saved to ai_content |

### Learning System
1. AI generates content → saved to `ai_content` (status: 'auto')
2. Tenant edits in ERP → updated in `ai_content` (status: 'edited')
3. Original + correction saved to `ai_content_corrections` (with brand_id)
4. Next generation for same brand → corrections included in Claude prompt as examples

### New ERP Pages (Phase 5)
- `/storefront-content.html` — Product AI content manager (descriptions, SEO, alt text)
- `/storefront-blog.html` — Blog editor (CRUD + AI generation)
- `/storefront-landing-content.html` — Landing page content editor

### Storefront Navigation (6 tabs)
Settings → Brands → Products → AI Content → Blog → Landing Pages

---

## What's Next

1. Daniel runs SQL migrations + deploys Edge Functions
2. Daniel tests all features
3. Merge develop → main (both repos)
4. Phase 6 — i18n AI Translation (EN/RU)
