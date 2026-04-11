# Phase 5A — AI Content Engine + Product Content

> **Module:** 3 — Storefront
> **Repos:** opticup (ERP — Edge Function + UI) AND opticup-storefront (display)
> **Execution mode:** AUTONOMOUS
> **Depends on:** Phase 4 complete, Claude API key available in Supabase Edge Functions
> **Created:** March 2026

---

## Objective

Build the AI content engine that generates product descriptions, SEO meta tags, and image alt text. Includes ERP management UI for viewing, editing, and bulk-generating content.

**Language: Hebrew only.** Translation to EN/RU is Phase 6.

**Success = every product with images gets AI-generated description + SEO meta + alt text. ERP shows content management screen with filters and inline editing.**

---

## Context & Business Decisions

### AI Content Types (per product)
| Type | What AI generates | Stored as |
|------|-------------------|-----------|
| `description` | Marketing-professional product description with styling recommendation | ai_content row |
| `seo_title` | SEO-optimized page title (50-60 chars) | ai_content row |
| `seo_description` | SEO meta description (150-160 chars) | ai_content row |
| `alt_text` | Accessible image description (per image) | ai_content row |

### AI Input (per product)
- brand_name, model, color, size, product_type
- sell_price (if shop mode)
- Product image (Claude Vision — primary image)
- Previous corrections for this brand (learning)

### AI Output Tone
- Hebrew, שיווקי-מקצועי
- Include styling recommendation ("מושלם לפנים עגולות", "מתאים לסגנון קז'ואל")
- Learn from corrections — if tenant corrected a description, future descriptions for same brand adopt the corrected style

### Learning System
Simple: AI generates → tenant corrects in ERP → correction saved in `ai_content_corrections` → next generation for same brand includes corrections as examples in prompt.

No 3-stage system (learning/suggesting/auto). Just: generate → correct → improve.

### Bulk Generate
- Batch processing: 10-20 products per batch
- Progress bar in ERP UI
- Resume capability (skip products that already have content)
- Rate limiting to avoid Claude API throttling

---

## Autonomous Execution Plan

### ═══ ERP STEPS (opticup repo) ═══

### Step 0 — Backup

```powershell
$ts = Get-Date -Format "yyyy-MM-dd_HH-mm"
$backupDir = "C:\Users\User\opticup\modules\Module 3 - Storefront\backups\${ts}_pre-phase5a"
New-Item -ItemType Directory -Force -Path $backupDir
robocopy "C:\Users\User\opticup-storefront" "$backupDir\opticup-storefront" /E /XD node_modules .git dist .vercel /XF .env
robocopy "C:\Users\User\opticup" "$backupDir\opticup-erp" /E /XD node_modules .git /XF .env
```

---

### Step 1 — Database Changes (SQL files — DO NOT RUN)

**Repo:** opticup-storefront (save SQL to `sql/` folder)
**Files to create:** `sql/013-phase5a-ai-content.sql`

**⛔ Check if tables exist first:**
```sql
SELECT to_regclass('public.ai_content');
SELECT to_regclass('public.ai_content_corrections');
```

**SQL:**
```sql
-- Phase 5A: AI Content Engine

-- 1. ai_content — stores all AI-generated content
CREATE TABLE IF NOT EXISTS ai_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('product', 'blog', 'landing_page')),
  entity_id UUID NOT NULL,  -- references inventory.id, blog_posts.id, or landing page id
  content_type TEXT NOT NULL CHECK (content_type IN ('description', 'seo_title', 'seo_description', 'alt_text')),
  content TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'he',
  status TEXT NOT NULL DEFAULT 'auto' CHECK (status IN ('auto', 'edited', 'approved')),
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(tenant_id, entity_type, entity_id, content_type, language)
);

-- RLS
ALTER TABLE ai_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_content_tenant_isolation" ON ai_content
  FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

-- 2. ai_content_corrections — stores tenant edits for learning
CREATE TABLE IF NOT EXISTS ai_content_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  ai_content_id UUID NOT NULL REFERENCES ai_content(id),
  original_content TEXT NOT NULL,
  corrected_content TEXT NOT NULL,
  brand_id UUID REFERENCES brands(id),  -- for brand-level learning
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE ai_content_corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_content_corrections_tenant_isolation" ON ai_content_corrections
  FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_content_entity ON ai_content(tenant_id, entity_type, entity_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_ai_content_corrections_brand ON ai_content_corrections(tenant_id, brand_id) WHERE is_deleted = false;
```

**Verify:**
- [ ] SQL file created
- [ ] Tables have tenant_id + RLS
- [ ] UNIQUE constraint includes tenant_id
- [ ] Soft deletes (is_deleted)

---

### Step 2 — Edge Function: AI Content Generator

**Repo:** opticup (Edge Functions are in ERP repo)
**Files to create:** `supabase/functions/generate-ai-content/index.ts`

**What to do:**
Create an Edge Function that calls Claude API to generate product content.

**Endpoint:** `POST /functions/v1/generate-ai-content`

**Request body:**
```json
{
  "tenant_id": "uuid",
  "product_id": "uuid",
  "content_types": ["description", "seo_title", "seo_description", "alt_text"],
  "product_data": {
    "brand_name": "Balenciaga",
    "model": "BB0126S",
    "color": "002",
    "size": "56",
    "product_type": "sunglasses",
    "sell_price": 1200
  },
  "image_url": "https://tsxrrxzmdxaenlvocyit.supabase.co/storage/v1/...",
  "brand_corrections": [
    {"original": "...", "corrected": "..."}
  ]
}
```

**Claude API prompt structure:**
```
System: You are a professional Hebrew copywriter for an optical store website. 
You write marketing descriptions for eyewear products.
Style: Professional yet approachable, include styling recommendations.
Language: Hebrew only.

{if brand_corrections exist}
The store owner has previously corrected your descriptions for this brand. 
Learn from these corrections:
{corrections examples}
{/if}

Generate the following for this product:
1. Description (2-3 sentences, marketing tone, include styling recommendation)
2. SEO title (50-60 chars, include brand + model)
3. SEO meta description (150-160 chars)
4. Alt text for the product image (descriptive, accessible)

Product: {brand} {model}, Color: {color}, Size: {size}, Type: {product_type}
{if price} Price: ₪{price} {/if}
{if image} [image attached via Vision API] {/if}
```

**Response format:** JSON with all content types

**Implementation notes:**
- Use Claude Vision API if image_url provided (fetch image, send as base64)
- Use ANTHROPIC_API_KEY from Edge Function secrets
- Deploy with `--no-verify-jwt` (same as OCR Edge Function)
- Service role key for reading product images from private bucket
- Save results directly to ai_content table using service role

**Error handling:**
- Claude API rate limit → retry with exponential backoff (max 3 retries)
- Image fetch failure → generate without image (text-only)
- Partial failure → save what succeeded, mark what failed

**Verify:**
- [ ] Edge Function created
- [ ] Claude API call works with test data
- [ ] Results saved to ai_content table
- [ ] Image Vision works when image provided
- [ ] Corrections included in prompt when available
- [ ] Deploy: `supabase functions deploy generate-ai-content --no-verify-jwt`

---

### Step 3 — ERP: Content Management Page

**Repo:** opticup
**Files to create:** `storefront-content.html` + `modules/storefront/storefront-content.js`

**What to do:**
Create a content management page in ERP for viewing and editing AI-generated content.

**UI Layout:**
```
┌─────────────────────────────────────────────────┐
│  ניהול תוכן מוצרים                              │
├─────────────────────────────────────────────────┤
│  [סינון לפי מותג ▼] [סינון לפי סטטוס ▼]        │
│  [מתאריך ___] [עד תאריך ___]                    │
│  [חיפוש חופשי ___________] [🔍]                 │
│  [ייצר תוכן למוצרים חסרים] [ייצר מחדש לנבחרים] │
├─────────────────────────────────────────────────┤
│  ☐ │ תמונה │ מותג │ דגם │ ברקוד │ תיאור │ SEO │ │
│  ☐ │ 🖼️    │ Bal. │ BB │ 0004 │ ✅    │ ✅  │ │
│  ☐ │ 🖼️    │ Ray  │ RB │ 0005 │ ❌    │ ❌  │ │
│  ☐ │ 🖼️    │ Guc  │ GG │ 0006 │ ✏️    │ ✅  │ │
├─────────────────────────────────────────────────┤
│  הצג 50 לעמוד │ עמוד 1/14 │ ← →               │
└─────────────────────────────────────────────────┘
```

**Status indicators:**
- ✅ = AI content exists (auto or approved)
- ✏️ = edited by tenant
- ❌ = no content yet
- 🔄 = generating...

**Click on product row → opens popup/modal:**
```
┌───────────────────────────────────────┐
│  Balenciaga BB0126S (002)        [✕] │
├───────────────────────────────────────┤
│  תיאור מוצר:                          │
│  ┌─────────────────────────────────┐  │
│  │ AI generated text here...      │  │
│  │ [editable textarea]            │  │
│  └─────────────────────────────────┘  │
│                                       │
│  SEO Title:                           │
│  [____________________________]       │
│  50/60 chars                          │
│                                       │
│  SEO Description:                     │
│  [____________________________]       │
│  145/160 chars                        │
│                                       │
│  Alt Text:                            │
│  [____________________________]       │
│                                       │
│  [ייצר מחדש 🤖] [שמור ✅] [ביטול]   │
└───────────────────────────────────────┘
```

**Features:**
- Character count for SEO fields (with warning when over limit)
- "ייצר מחדש" button re-runs AI for this product
- Save stores edit as correction in ai_content_corrections AND updates ai_content
- Pagination (50 per page)
- Sort by: date added, brand, status

**Follow ERP patterns:** shared.js, Toast, Modal, existing CSS.

**Verify:**
- [ ] Page loads with product list
- [ ] Filters work (brand, status, date range, search)
- [ ] Click opens edit popup
- [ ] Save updates DB
- [ ] Character count shows for SEO fields

---

### Step 4 — Bulk Generate UI

**Repo:** opticup
**Modify:** `modules/storefront/storefront-content.js`

**What to do:**
Add bulk generate functionality to the content management page.

**Button: "ייצר תוכן למוצרים חסרים"**
- Finds all products without ai_content
- Processes in batches of 10
- Shows progress bar: "מייצר תוכן... 30/666 (5%)"
- Rate limit: 2-second delay between products (Claude API throttling)
- Resume: if interrupted, next click skips products that already have content
- Errors: logged but don't stop batch, shown in summary at end

**Button: "ייצר מחדש לנבחרים"**
- Uses checkbox selection from table
- Same batch processing but only for selected products
- Overwrites existing content (creates new version)

**Progress UI:**
```
┌───────────────────────────────────────┐
│  מייצר תוכן באמצעות AI...             │
│  ████████████░░░░░░░░░  156/666 (23%) │
│  מוצר נוכחי: Balenciaga BB0126S       │
│  הצלחות: 150 │ שגיאות: 6             │
│                                       │
│  [עצור ⏸]                             │
└───────────────────────────────────────┘
```

**Verify:**
- [ ] Bulk generate starts and shows progress
- [ ] Batches of 10 with delay
- [ ] Resume works (skips existing)
- [ ] Stop button works
- [ ] Error count shown

---

### Step 5 — Add Navigation Link

**Repo:** opticup
**Modify:** `index.html`

Add "ניהול תוכן" link under the storefront section, or add a sub-nav within storefront-settings.

**Verify:**
- [ ] Link visible in ERP navigation
- [ ] Navigates to storefront-content.html

---

### ═══ STOREFRONT STEPS (opticup-storefront repo) ═══

### Step 6 — Update View to Include AI Content

**Repo:** opticup-storefront
**Files to create:** `sql/014-v-storefront-products-v4.sql`

**⛔ GOLDEN VIEW RULE: Copy the EXACT images subquery from CLAUDE.md Golden View Reference. Do NOT rewrite it.**

**What to do:**
Update `v_storefront_products` to include AI-generated content fields.

Add to the view:
```sql
-- AI content (left join — products without content still show)
(SELECT content FROM ai_content 
  WHERE entity_type = 'product' AND entity_id = i.id 
  AND content_type = 'description' AND language = 'he'
  AND is_deleted = false
  ORDER BY version DESC LIMIT 1
) AS ai_description,
(SELECT content FROM ai_content 
  WHERE entity_type = 'product' AND entity_id = i.id 
  AND content_type = 'seo_title' AND language = 'he'
  AND is_deleted = false
  ORDER BY version DESC LIMIT 1
) AS ai_seo_title,
(SELECT content FROM ai_content 
  WHERE entity_type = 'product' AND entity_id = i.id 
  AND content_type = 'seo_description' AND language = 'he'
  AND is_deleted = false
  ORDER BY version DESC LIMIT 1
) AS ai_seo_description
```

**⛔ REGRESSION CHECK after creating this view:**
- [ ] Images still load (golden subquery intact)
- [ ] Products display (count > 0)
- [ ] resolved_mode still works
- [ ] All existing fields preserved

---

### Step 7 — Display AI Content on Product Pages

**Repo:** opticup-storefront
**Modify:** `src/pages/products/[barcode].astro`

**What to do:**
If `ai_description` exists, show it on the product detail page.
If `ai_seo_title` exists, use it as page `<title>`.
If `ai_seo_description` exists, use it as meta description.

**Fallback:** If no AI content, use current behavior (brand + model as title, no description).

**Verify:**
- [ ] Product with AI content shows description
- [ ] Product without AI content still works (no error)
- [ ] SEO title/description used when available
- [ ] Schema.org Product includes description when available

---

### Step 8 — Update Documentation

**Both repos:**
- SESSION_CONTEXT.md
- CHANGELOG.md
- CLAUDE.md (new Edge Function, new ERP page, new DB tables)
- ROADMAP.md → Phase 5: "5A ✅"

**Verify:**
- [ ] All docs updated
- [ ] Committed to develop

---

## Quality Gate

| Check | Pass condition | Fail action |
|-------|---------------|-------------|
| Build (storefront) | Zero errors | ⛔ STOP |
| Edge Function deploys | No errors | ⛔ STOP |
| AI generates content | Test with 1 product | ⛔ STOP |
| ERP content page loads | Shows products | ⛔ STOP |
| Edit popup works | Save updates DB | ⛔ STOP |
| Existing pages still 200 | curl check | ⛔ STOP |
| Images still load | Regression check | ⛔ STOP |

---

## Completion Checklist

- [ ] Backup exists
- [ ] SQL 013 created (ai_content + ai_content_corrections)
- [ ] Edge Function deployed and working
- [ ] ERP content management page with filters + edit popup
- [ ] Bulk generate with progress bar
- [ ] View updated with AI content columns
- [ ] Product pages display AI content
- [ ] Documentation updated
- [ ] Committed to `develop`, tagged `v5.0-phase5a-ai-content`
