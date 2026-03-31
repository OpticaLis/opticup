# Module 3 — Storefront — ERP-Side Session Context

## Current Phase: CMS-10 — Final Build + QA
## Status: ✅ CMS COMPLETE
## Date: 2026-04-01

---

## CMS Status: COMPLETE

All phases done (CMS-1 through CMS-10).
19 block types, Studio editor, AI editing, SEO scoring, product picker, Google reviews,
custom HTML blocks, popup lead forms, campaign templates.

**Next:** Design phase (WordPress visual parity) then DNS switch.

---

## CMS-10 — Custom Block + Bug Fixes + QA ✅

| Step | Status | Description | Commit (ERP) | Commit (Storefront) |
|------|--------|-------------|--------------|---------------------|
| Build 1 | ✅ | Custom block type #19 (HTML+CSS) | — | `11f905f` |
| Build 2 | ✅ | Studio schema, code editor, AI custom mode | `97fe894` | — |
| Build 3 | ✅ | CTA popup lead form | `97fe894` | `11f905f` |
| Build 4 | ✅ | Custom block SQL templates | — | `11f905f` |
| Fix 1 | ✅ | Gold color (amber → #D4A853) across 12 files | — | `4ef4f6a` |
| Fix 2 | ✅ | Image gallery scrollbar-hide CSS | — | `4ef4f6a` |
| Fix 3 | ✅ | Studio page list layout CSS | `9f7a815` | — |
| Fix 4 | ✅ | Templates UI (block list instead of JSON) | `9f7a815` | — |
| Fix 5 | ✅ | Blog link (storefront-blog.html) | `9f7a815` | — |
| Fix 6 | ✅ | Place ID save (upsert) | `9f7a815` | — |
| Fix 7 | ✅ | Delete block already fixed (9dfd9fa) | — | — |
| Fix 8 | ✅ | Preview URL (localhost detection) | `9f7a815` | — |
| Fix 9-10 | ✅ | Spacing + meta tags verified OK | — | — |
| QA | ✅ | Full QA: build, 19 blocks, routes, meta, SuperSale test | — | — |

### Action Required
- Run SQL: `sql/036-custom-block-templates.sql`
- Deploy: `supabase functions deploy cms-ai-edit --no-verify-jwt`
- See full QA report: `modules/Module 3 - Storefront/docs/CMS-QA-REPORT.md`

---

## CMS-5 — AI Prompt Editing ✅

| Step | Status | Description | Commit (ERP) |
|------|--------|-------------|--------------|
| 1 | ✅ | Edge Function: supabase/functions/cms-ai-edit/index.ts | `e731da4` |
| 2 | ✅ | Deploy instructions saved | `e731da4` |
| 3 | ✅ | studio-ai-prompt.js — API calls, prompt bar, history, permission gating | `e731da4` |
| 4 | ✅ | storefront-studio.html — AI prompt bar + diff modal added | `e731da4` |
| 5 | ✅ | css/studio.css — AI prompt + diff styles | `e731da4` |
| 5b | ✅ | studio-ai-diff.js — diff view split for file size compliance | `e731da4` |
| 6 | ✅ | Permission gating (built into handleAiPrompt) | `e731da4` |
| 7 | ⬜ | Integration testing — requires Edge Function deploy | — |
| 8 | ✅ | Documentation (CLAUDE.md, MODULE_MAP, SESSION_CONTEXT) | final commit |

### Action Required
- Daniel must deploy Edge Function: see `modules/Module 3 - Storefront/docs/deploy-cms-ai-edit.md`
- Daniel must set `ANTHROPIC_API_KEY` as Supabase secret (if not already set)

### What's Next
- CMS-6: QA + design polish

---

## CMS-2 — Studio Block Editor ✅

| Step | Status | Description | Commit (ERP) |
|------|--------|-------------|--------------|
| 1 | ✅ | studio-block-schemas.js — 14 block schemas + settings | `a2208b1` |
| 2 | ✅ | studio-form-renderer.js — generic form builder | `a2208b1` |
| 3 | ✅ | studio-pages.js — page list + CRUD | `a2208b1` |
| 4 | ✅ | studio-editor.js — block editor, reorder, save, rollback | `fe6f3b4` |
| 5 | ✅ | storefront-studio.html — Studio page | `fe6f3b4` |
| 6 | ✅ | css/studio.css — editor styles | `fe6f3b4` |
| 7 | ✅ | Navigation link added to all storefront pages | final commit |
| 9 | ✅ | Documentation updated (CLAUDE.md + SESSION_CONTEXT.md) | final commit |

---

## Previous Phase: Phase 7 — White-Label + Analytics + Theme
## Previous Status: ✅ Complete (code done, pending SQL 018 deploy)
## Previous Date: 2026-03-30

---

## Phase 7 — White-Label + Analytics + Theme ✅

| Step | Status | Description | Commit (ERP) |
|------|--------|-------------|--------------|
| 0 | ✅ | Backup | — |
| 1-4 | ✅ | SQL 018, Partytown, analytics scripts, event tracking | `cbba53b` (storefront) |
| 5-6 | ✅ | Multi-domain tenant resolution, per-tenant homepage/favicon/OG | `e3a653d` (storefront) |
| 7 | ✅ | ERP analytics JSONB + branding settings UI | `5df7f7d` |
| 8 | ✅ | Documentation | `c05ce7c` (storefront) |

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

### Phase 7 SQL Migration (Supabase Dashboard)
1. `opticup-storefront/sql/018-phase7-white-label.sql` — analytics JSONB, custom_domain, hero/favicon/OG columns + v_storefront_config view update

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

### Analytics (Phase 7)
- `storefront_config.analytics` — JSONB column with all analytics IDs per tenant
- All scripts load via **Partytown** (Web Worker) for zero Lighthouse impact
- Events via `dataLayer.push`: view_product, whatsapp_click, notify_me, booking_click, search
- ERP settings: `storefront-settings.html` → analytics section saves as JSONB

### Tenant Resolution (Phase 7)
Resolution order: custom_domain → subdomain → ?t= → default
1. Custom domain: `v_storefront_config.custom_domain` → tenant_id
2. Subdomain: `[slug].opticalis.co.il`
3. Query param: `?t=slug`
4. Default: `PUBLIC_DEFAULT_TENANT` env var

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

### Storefront Navigation (7 tabs)
Settings → Brands → Products → AI Content → Blog → Landing Pages → Glossary

---

## What's Next

1. Daniel runs SQL migrations + deploys Edge Functions (Phase 5 + 6 + 7)
2. Daniel tests all features
3. Merge develop → main (both repos)
4. Phase 8+ TBD
