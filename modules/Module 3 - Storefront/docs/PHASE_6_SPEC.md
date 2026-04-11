# Phase 6 — i18n AI Translation

> **Module:** 3 — Storefront
> **Repos:** opticup (ERP — Edge Function + UI) AND opticup-storefront (display)
> **Execution mode:** AUTONOMOUS
> **Depends on:** Phase 5 complete (ai_content table, Edge Functions, blog_posts table)
> **Created:** March 2026

---

## Objective

Translate all Hebrew content (product descriptions, SEO meta, alt text, blog posts, UI labels) to English and Russian using Claude AI with a curated optical glossary. Translations stored in existing `ai_content` table (language column). Learning from corrections.

**Success = every product with Hebrew AI content automatically gets EN+RU translations. Blog posts translatable. Glossary-based consistency. ERP review UI with side-by-side editing.**

---

## Context & Business Decisions

### What Gets Translated
| Content type | Source | Target languages | Method |
|-------------|--------|-----------------|--------|
| Product descriptions | ai_content (lang='he') | en, ru | Auto on creation |
| SEO title | ai_content (lang='he') | en, ru | Auto on creation |
| SEO description | ai_content (lang='he') | en, ru | Auto on creation |
| Alt text | ai_content (lang='he') | en, ru | Auto on creation |
| Blog posts | blog_posts (lang='he') | en, ru | Manual trigger in ERP |
| UI labels | i18n JSON files | Already done (Phase 1) | Static |

### Translation Flow
1. Hebrew content created (Phase 5) → triggers auto-translation to EN+RU
2. Translations saved to `ai_content` with `language = 'en'` / `language = 'ru'`
3. Status = 'auto' until reviewed
4. Tenant reviews in ERP → corrects → correction saved for learning
5. Glossary terms enforced in every translation

### Glossary
- Curated list of optical terms with canonical translations
- Included in every Claude translation prompt
- Grows from corrections (tenant adds terms)
- Per-tenant + shared defaults

---

## Autonomous Execution Plan

### Step 0 — Backup

```powershell
$ts = Get-Date -Format "yyyy-MM-dd_HH-mm"
$backupDir = "C:\Users\User\opticup\modules\Module 3 - Storefront\backups\${ts}_pre-phase6"
New-Item -ItemType Directory -Force -Path $backupDir
robocopy "C:\Users\User\opticup-storefront" "$backupDir\opticup-storefront" /E /XD node_modules .git dist .vercel /XF .env
robocopy "C:\Users\User\opticup" "$backupDir\opticup-erp" /E /XD node_modules .git /XF .env
```

---

### Step 1 — Database: Glossary + Corrections Tables

**Repo:** opticup-storefront
**Files to create:** `sql/016-phase6-translation.sql`

**⛔ Check if tables exist first.**

```sql
-- Phase 6: Translation glossary + corrections

-- 1. translation_glossary — curated optical terms
CREATE TABLE IF NOT EXISTS translation_glossary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  lang TEXT NOT NULL CHECK (lang IN ('en', 'ru')),
  term_he TEXT NOT NULL,
  term_translated TEXT NOT NULL,
  context TEXT DEFAULT 'general',
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'learned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(tenant_id, lang, term_he)
);

ALTER TABLE translation_glossary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "glossary_tenant_isolation" ON translation_glossary
  FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

-- 2. translation_corrections — learning from tenant edits
CREATE TABLE IF NOT EXISTS translation_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  ai_content_id UUID NOT NULL REFERENCES ai_content(id),
  lang TEXT NOT NULL CHECK (lang IN ('en', 'ru')),
  original_translation TEXT NOT NULL,
  corrected_translation TEXT NOT NULL,
  brand_id UUID REFERENCES brands(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE translation_corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "translation_corrections_tenant_isolation" ON translation_corrections
  FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_glossary_tenant_lang ON translation_glossary(tenant_id, lang) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_translation_corrections_brand ON translation_corrections(tenant_id, lang, brand_id) WHERE is_deleted = false;
```

**Verify:**
- [ ] SQL file created
- [ ] tenant_id + RLS on both tables
- [ ] UNIQUE includes tenant_id

---

### Step 2 — Seed Glossary (40-50 Optical Terms)

**Repo:** opticup-storefront
**Files to create:** `sql/017-seed-glossary.sql`

**⛔ Uses Prizma tenant_id. Script must resolve it dynamically.**

```sql
-- Seed optical glossary for Prizma tenant
-- Run after 016-phase6-translation.sql

DO $$
DECLARE
  v_tid UUID;
BEGIN
  SELECT id INTO v_tid FROM tenants WHERE slug = 'prizma';
  IF v_tid IS NULL THEN RAISE EXCEPTION 'Prizma tenant not found'; END IF;

  -- ═══ סוגי עדשות (Lens Types) ═══
  INSERT INTO translation_glossary (tenant_id, lang, term_he, term_translated, context) VALUES
  (v_tid, 'en', 'עדשות מולטיפוקל', 'Multifocal Lenses', 'lens_type'),
  (v_tid, 'ru', 'עדשות מולטיפוקל', 'Мультифокальные линзы', 'lens_type'),
  (v_tid, 'en', 'עדשות פרוגרסיביות', 'Progressive Lenses', 'lens_type'),
  (v_tid, 'ru', 'עדשות פרוגרסיביות', 'Прогрессивные линзы', 'lens_type'),
  (v_tid, 'en', 'עדשות חד-מוקדיות', 'Single Vision Lenses', 'lens_type'),
  (v_tid, 'ru', 'עדשות חד-מוקדיות', 'Однофокальные линзы', 'lens_type'),
  (v_tid, 'en', 'עדשות דו-מוקדיות', 'Bifocal Lenses', 'lens_type'),
  (v_tid, 'ru', 'עדשות דו-מוקדיות', 'Бифокальные линзы', 'lens_type'),
  (v_tid, 'en', 'עדשות פוטוכרומיות', 'Photochromic Lenses', 'lens_type'),
  (v_tid, 'ru', 'עדשות פוטוכרומיות', 'Фотохромные линзы', 'lens_type'),
  (v_tid, 'en', 'עדשות מעבר', 'Transition Lenses', 'lens_type'),
  (v_tid, 'ru', 'עדשות מעבר', 'Линзы-хамелеоны', 'lens_type'),
  (v_tid, 'en', 'עדשות בלו-קאט', 'Blue Light Blocking Lenses', 'lens_type'),
  (v_tid, 'ru', 'עדשות בלו-קאט', 'Линзы с защитой от синего света', 'lens_type'),
  (v_tid, 'en', 'עדשות מגע', 'Contact Lenses', 'lens_type'),
  (v_tid, 'ru', 'עדשות מגע', 'Контактные линзы', 'lens_type'),

  -- ═══ חומרי מסגרת (Frame Materials) ═══
  (v_tid, 'en', 'אצטט', 'Acetate', 'material'),
  (v_tid, 'ru', 'אצטט', 'Ацетат', 'material'),
  (v_tid, 'en', 'טיטניום', 'Titanium', 'material'),
  (v_tid, 'ru', 'טיטניום', 'Титан', 'material'),
  (v_tid, 'en', 'מתכת', 'Metal', 'material'),
  (v_tid, 'ru', 'מתכת', 'Металл', 'material'),
  (v_tid, 'en', 'פלסטיק', 'Plastic', 'material'),
  (v_tid, 'ru', 'פלסטיק', 'Пластик', 'material'),
  (v_tid, 'en', 'קרן שור', 'Horn', 'material'),
  (v_tid, 'ru', 'קרן שור', 'Рог', 'material'),

  -- ═══ סוגי משקפיים (Eyewear Types) ═══
  (v_tid, 'en', 'משקפי ראייה', 'Prescription Glasses', 'eyewear_type'),
  (v_tid, 'ru', 'משקפי ראייה', 'Очки для зрения', 'eyewear_type'),
  (v_tid, 'en', 'משקפי שמש', 'Sunglasses', 'eyewear_type'),
  (v_tid, 'ru', 'משקפי שמש', 'Солнцезащитные очки', 'eyewear_type'),
  (v_tid, 'en', 'משקפי מולטיפוקל', 'Multifocal Glasses', 'eyewear_type'),
  (v_tid, 'ru', 'משקפי מולטיפוקל', 'Мультифокальные очки', 'eyewear_type'),
  (v_tid, 'en', 'משקפי קריאה', 'Reading Glasses', 'eyewear_type'),
  (v_tid, 'ru', 'משקפי קריאה', 'Очки для чтения', 'eyewear_type'),
  (v_tid, 'en', 'משקפי מגן', 'Safety Glasses', 'eyewear_type'),
  (v_tid, 'ru', 'משקפי מגן', 'Защитные очки', 'eyewear_type'),
  (v_tid, 'en', 'משקפי ספורט', 'Sports Glasses', 'eyewear_type'),
  (v_tid, 'ru', 'משקפי ספורט', 'Спортивные очки', 'eyewear_type'),

  -- ═══ חלקי משקפיים (Eyewear Parts) ═══
  (v_tid, 'en', 'זרוע', 'Temple', 'part'),
  (v_tid, 'ru', 'זרוע', 'Заушник', 'part'),
  (v_tid, 'en', 'גשר', 'Bridge', 'part'),
  (v_tid, 'ru', 'גשר', 'Мост', 'part'),
  (v_tid, 'en', 'אף-פד', 'Nose Pad', 'part'),
  (v_tid, 'ru', 'אף-פד', 'Носоупор', 'part'),
  (v_tid, 'en', 'ציר', 'Hinge', 'part'),
  (v_tid, 'ru', 'ציר', 'Шарнир', 'part'),
  (v_tid, 'en', 'עדשה', 'Lens', 'part'),
  (v_tid, 'ru', 'עדשה', 'Линза', 'part'),
  (v_tid, 'en', 'מסגרת', 'Frame', 'part'),
  (v_tid, 'ru', 'מסגרת', 'Оправа', 'part'),

  -- ═══ מונחי בדיקת ראייה (Eye Exam Terms) ═══
  (v_tid, 'en', 'בדיקת ראייה', 'Eye Examination', 'exam'),
  (v_tid, 'ru', 'בדיקת ראייה', 'Проверка зрения', 'exam'),
  (v_tid, 'en', 'מרשם משקפיים', 'Glasses Prescription', 'exam'),
  (v_tid, 'ru', 'מרשם משקפיים', 'Рецепт на очки', 'exam'),
  (v_tid, 'en', 'קוצר ראייה', 'Myopia (Nearsightedness)', 'exam'),
  (v_tid, 'ru', 'קוצר ראייה', 'Близорукость (миопия)', 'exam'),
  (v_tid, 'en', 'רוחק ראייה', 'Hyperopia (Farsightedness)', 'exam'),
  (v_tid, 'ru', 'רוחק ראייה', 'Дальнозоркость (гиперметропия)', 'exam'),
  (v_tid, 'en', 'אסטיגמציה', 'Astigmatism', 'exam'),
  (v_tid, 'ru', 'אסטיגמציה', 'Астигматизм', 'exam'),

  -- ═══ מונחים שיווקיים (Marketing Terms) ═══
  (v_tid, 'en', 'קולקציה חדשה', 'New Collection', 'marketing'),
  (v_tid, 'ru', 'קולקציה חדשה', 'Новая коллекция', 'marketing'),
  (v_tid, 'en', 'מהדורה מוגבלת', 'Limited Edition', 'marketing'),
  (v_tid, 'ru', 'מהדורה מוגבלת', 'Ограниченная серия', 'marketing'),
  (v_tid, 'en', 'יוקרתי', 'Luxury', 'marketing'),
  (v_tid, 'ru', 'יוקרתי', 'Премиальный', 'marketing'),
  (v_tid, 'en', 'קלאסי', 'Classic', 'marketing'),
  (v_tid, 'ru', 'קלאסי', 'Классический', 'marketing'),
  (v_tid, 'en', 'אלגנטי', 'Elegant', 'marketing'),
  (v_tid, 'ru', 'אלגנטי', 'Элегантный', 'marketing'),

  -- ═══ מונחי שירות (Service Terms) ═══
  (v_tid, 'en', 'התאמה אישית', 'Custom Fitting', 'service'),
  (v_tid, 'ru', 'התאמה אישית', 'Индивидуальная подгонка', 'service'),
  (v_tid, 'en', 'אחריות', 'Warranty', 'service'),
  (v_tid, 'ru', 'אחריות', 'Гарантия', 'service'),
  (v_tid, 'en', 'תיקון משקפיים', 'Glasses Repair', 'service'),
  (v_tid, 'ru', 'תיקון משקפיים', 'Ремонт очков', 'service'),
  (v_tid, 'en', 'תיאום בדיקת ראייה', 'Book an Eye Exam', 'service'),
  (v_tid, 'ru', 'תיאום בדיקת ראייה', 'Записаться на проверку зрения', 'service'),
  (v_tid, 'en', 'משלוח חינם', 'Free Shipping', 'service'),
  (v_tid, 'ru', 'משלוח חינם', 'Бесплатная доставка', 'service'),
  (v_tid, 'en', 'החזרה חינם', 'Free Returns', 'service'),
  (v_tid, 'ru', 'החזרה חינם', 'Бесплатный возврат', 'service')

  ON CONFLICT (tenant_id, lang, term_he) DO NOTHING;

END $$;
```

**Verify:**
- [ ] SQL file created
- [ ] 90 rows (45 terms × 2 languages)
- [ ] ON CONFLICT prevents duplicates
- [ ] Categories cover all requested areas

---

### Step 3 — Edge Function: Translate Content

**Repo:** opticup
**Files to create:** `supabase/functions/translate-content/index.ts`

**Endpoint:** `POST /functions/v1/translate-content`

**Request:**
```json
{
  "tenant_id": "uuid",
  "ai_content_id": "uuid",
  "source_content": "תיאור מוצר בעברית...",
  "source_lang": "he",
  "target_lang": "en",
  "content_type": "description",
  "entity_type": "product",
  "entity_id": "uuid",
  "glossary": [
    {"term_he": "עדשות מולטיפוקל", "term_translated": "Multifocal Lenses"},
    {"term_he": "אצטט", "term_translated": "Acetate"}
  ],
  "corrections": [
    {"original": "...", "corrected": "..."}
  ]
}
```

**Claude prompt:**
```
You are a professional translator for an Israeli optical store website.
Translate the following Hebrew text to {target_lang}.

CRITICAL RULES:
1. Use these exact translations for optical terms (glossary):
{glossary_terms}

2. Maintain the same tone and style as the original.
3. Keep brand names and model numbers in their original form (e.g., "Balenciaga BB0126S").
4. For Russian: use formal "вы" form.
5. For English: use American English spelling.

{if corrections exist}
The store owner has corrected previous translations. Learn from these:
{corrections}
{/if}

Text to translate:
{source_content}
```

**Response:** Translated text saved to `ai_content` with correct language.

**Implementation:**
- Fetch glossary for target language from `translation_glossary`
- Fetch recent corrections for this brand/language from `translation_corrections`
- Call Claude API
- Save result to `ai_content` (same entity_type, entity_id, content_type, different language)
- Deploy with `--no-verify-jwt`

**Verify:**
- [ ] Edge Function created
- [ ] Glossary included in prompt
- [ ] Corrections included when available
- [ ] Translation saved to ai_content with correct language
- [ ] Brand names preserved in translation

---

### Step 4 — Auto-Translate on Content Creation

**Repo:** opticup
**Modify:** `supabase/functions/generate-ai-content/index.ts`

**What to do:**
After generating Hebrew content, automatically call translate-content for EN and RU.

**Flow:**
```
1. Generate Hebrew content (existing)
2. Save Hebrew to ai_content (existing)
3. NEW: Call translate-content for 'en'
4. NEW: Call translate-content for 'ru'
5. All 3 languages saved
```

**Implementation:** After saving Hebrew content, make internal fetch calls to translate-content Edge Function for each target language.

**Error handling:** If translation fails, Hebrew content is still saved. Translation failure logged but doesn't block.

**Verify:**
- [ ] Hebrew content generates (existing behavior preserved)
- [ ] EN translation auto-generated
- [ ] RU translation auto-generated
- [ ] Translation failure doesn't break Hebrew save

---

### Step 5 — ERP: Translation Review Tab

**Repo:** opticup
**Modify:** `storefront-content.html` + `modules/storefront/storefront-content.js`

**What to do:**
Add a "תרגומים" tab to the existing content management page.

**Tab UI:**
```
[תוכן מוצרים] [תרגומים] 
```

**Translations tab layout:**
```
┌─────────────────────────────────────────────────────────┐
│  תרגומים                                                │
├─────────────────────────────────────────────────────────┤
│  [סינון: שפה ▼ EN/RU] [סטטוס ▼ auto/edited/approved]  │
│  [סינון: מותג ▼]                                        │
├─────────────────────────────────────────────────────────┤
│  מותג │ דגם │ סוג │ עברית │ EN │ RU │ סטטוס            │
│  Bal. │ BB  │ desc│ ✅    │ 🔄 │ 🔄 │ auto             │
│  Ray  │ RB  │ desc│ ✅    │ ✅ │ ✏️ │ edited           │
├─────────────────────────────────────────────────────────┤
```

**Click on row → side-by-side edit popup:**
```
┌─────────────────────────────────────────────────────────┐
│  Balenciaga BB0126S — תרגום לאנגלית              [✕]   │
├──────────────────────┬──────────────────────────────────┤
│  עברית (מקור)        │  English (תרגום)                 │
│  ┌────────────────┐  │  ┌──────────────────────────┐   │
│  │ תיאור בעברית   │  │  │ English description      │   │
│  │ (read-only)    │  │  │ (editable)               │   │
│  └────────────────┘  │  └──────────────────────────┘   │
├──────────────────────┴──────────────────────────────────┤
│  [תרגם מחדש 🤖] [שמור ✅] [אשר ✓]                     │
└─────────────────────────────────────────────────────────┘
```

**Save behavior:**
- If text changed: save correction to `translation_corrections` + update `ai_content`
- "אשר" button: sets status to 'approved'
- "תרגם מחדש": calls translate-content Edge Function

**Verify:**
- [ ] Translations tab shows all translations
- [ ] Side-by-side edit works
- [ ] Save stores correction for learning
- [ ] Approve sets status
- [ ] Re-translate calls Edge Function

---

### Step 6 — ERP: Glossary Management

**Repo:** opticup
**Files to create:** Add glossary section to `storefront-settings.html` or create `storefront-glossary.html`

**UI:**
```
┌─────────────────────────────────────────────────┐
│  מילון מונחים אופטי                              │
├─────────────────────────────────────────────────┤
│  [+ הוסף מונח]  [שפה: EN ▼ / RU ▼]             │
├─────────────────────────────────────────────────┤
│  עברית │ תרגום │ קטגוריה │ מקור │ פעולות        │
│  אצטט │ Acetate│ material│ manual│ [✏️][🗑️]    │
│  ציר  │ Hinge │ part    │ manual│ [✏️][🗑️]    │
│  ...  │ ...   │ ...     │learned│ [✏️][🗑️]    │
└─────────────────────────────────────────────────┘
```

**Features:**
- View all glossary terms per language
- Add new term (Hebrew + translation + category)
- Edit existing term
- Delete (soft delete)
- Filter by category, source (manual/learned)

**Verify:**
- [ ] Glossary list loads
- [ ] Add term saves to DB
- [ ] Edit works
- [ ] Delete = soft delete
- [ ] Both EN and RU views work

---

### Step 7 — Storefront: Display Translated Content

**Repo:** opticup-storefront
**Modify:** Product pages, blog pages

**What to do:**
When displaying in EN or RU locale, use translated content from `ai_content`:

**Product pages (`/en/...` or `/ru/...`):**
- Query `v_storefront_products` — already has `ai_description`, `ai_seo_title`, `ai_seo_description` for Hebrew
- Need to also query `ai_content` for `language = 'en'` or `'ru'`
- Fallback: if no translation, show Hebrew content

**Blog posts:**
- Blog posts in `blog_posts` table already have `lang` column
- New AI-translated blog posts get their own row with `lang = 'en'` / `'ru'`
- Blog index per language already works (Phase 3B/5B)

**Implementation approach:**
Add a helper function in `products.ts`:
```typescript
export async function getProductTranslation(
  productId: string, 
  lang: string, 
  tenantId: string
): Promise<{description?: string, seoTitle?: string, seoDescription?: string} | null> {
  if (lang === 'he') return null; // Hebrew is in the view
  const { data } = await supabase
    .from('ai_content')
    .select('content_type, content')
    .eq('entity_id', productId)
    .eq('entity_type', 'product')
    .eq('language', lang)
    .eq('is_deleted', false);
  // Map to object
}
```

**Verify:**
- [ ] EN product pages show English description (if available)
- [ ] RU product pages show Russian description (if available)
- [ ] Fallback to Hebrew if no translation
- [ ] SEO meta tags in correct language

---

### Step 8 — Bulk Translate Existing Content

**Repo:** opticup
**Modify:** `modules/storefront/storefront-content.js`

**What to do:**
Add "תרגם הכל" button to translations tab.

**Behavior:**
- Finds all Hebrew content without EN/RU translations
- Batch translates (10 at a time, 2-second delay)
- Progress bar (same pattern as bulk generate in Phase 5A)
- Resume capability (skips already translated)

**Verify:**
- [ ] Bulk translate starts and shows progress
- [ ] Batches with delay
- [ ] Skips existing translations
- [ ] Stop button works

---

### Step 9 — Update Documentation

**Both repos:**
- SESSION_CONTEXT.md
- CHANGELOG.md
- CLAUDE.md (new tables, Edge Function, glossary)
- ROADMAP.md → Phase 6: "✅"

---

## Quality Gate

| Check | Pass condition | Fail action |
|-------|---------------|-------------|
| Build succeeds | Zero errors | ⛔ STOP |
| Edge Function deploys | translate-content works | ⛔ STOP |
| Translation generates | Test 1 product HE→EN | ⛔ STOP |
| Glossary terms used | Check translation output | ⚠️ Continue |
| Translations tab | Shows in ERP | ⛔ STOP |
| Glossary management | CRUD works | ⛔ STOP |
| EN product page | Shows translation | ⛔ STOP |
| Images still load | Regression | ⛔ STOP |
| All pages 200 | curl check | ⛔ STOP |

---

## Completion Checklist

- [ ] Backup exists
- [ ] SQL 016 (glossary + corrections tables)
- [ ] SQL 017 (glossary seed — 45 terms × 2 languages)
- [ ] Edge Function translate-content deployed
- [ ] Auto-translate on content creation (generate-ai-content updated)
- [ ] ERP translations tab with side-by-side review
- [ ] ERP glossary management page
- [ ] Storefront shows translated content on EN/RU pages
- [ ] Bulk translate with progress bar
- [ ] Documentation updated
- [ ] Committed to `develop`, tagged `v6.0-phase6-i18n-translation`
