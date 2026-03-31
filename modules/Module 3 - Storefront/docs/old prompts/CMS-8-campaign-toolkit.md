# CMS-8: Campaign Toolkit — SuperSale-Level Pages Without Code

> **Prompt for Claude Code — Autonomous Execution**
> **Module:** 3 — Storefront
> **Phase:** CMS-8
> **Repos:** BOTH — `opticalis/opticup` (ERP) + `opticalis/opticup-storefront` (Storefront)
> **Branch:** `develop`

---

## Context

Daniel needs to build campaign pages like SuperSale **by himself** through Studio — without code, faster and easier than WordPress. This phase adds every missing piece: enhanced product cards with image galleries and pricing, sticky bars, trust badges, and a massive library of block + page templates.

**Goal:** After this phase, Daniel opens Studio → picks a campaign page template → customizes content → publishes. Done. No Claude Code prompts needed.

---

## Pre-Flight

```
1. Both repos on develop, git pull
2. Read CLAUDE.md (both repos)
3. Open the current SuperSale page in the ASTRO storefront to understand what's already rendered:
   http://localhost:4321/supersale/?t=prizma
   Take note of every visual element on this page
4. Read the existing ProductCard.astro component to understand current product card structure
5. Read the existing ProductsBlock.astro to understand how products are fetched and rendered
```

Confirm: `"Both repos on develop. SuperSale page reviewed. ProductCard structure understood. Ready."`

---

## What This Phase Builds

### New Block Types (3):
1. **`sticky_bar`** — Top or bottom sticky bar with text + CTA + optional countdown
2. **`trust_badges`** — Row of guarantee/trust icons (like SuperSale guarantees section)
3. **`divider`** — Visual separator (line, space, or decorative)

### Enhanced Existing Blocks:
4. **Enhanced `products` block** — Product cards get: image carousel with arrows, price display (original strikethrough + sale price), custom badges/tags, configurable card style
5. **Enhanced `banner` block** — Support for gradient backgrounds, countdown timer, animated text
6. **Enhanced `hero` block** — Support for status text (e.g., "הרשמה פתוחה"), subtitle positioning

### Block Templates (25+):
7. Pre-configured blocks covering every campaign need

### Page Templates (8+):
8. Complete campaign pages ready to customize

### Studio Enhancements:
9. Updated schemas for all new/enhanced blocks
10. Better "add block" experience with visual template cards

---

## PART A — SQL

### File: `sql/035-campaign-toolkit.sql`

Save in storefront repo. Daniel runs manually.

```sql
-- ============================================================
-- SQL 035: Campaign toolkit enhancements
-- ============================================================

-- No new tables needed — we use existing:
-- storefront_pages, storefront_block_templates, storefront_templates

-- 1. Add sale price fields to inventory (if not exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory' AND column_name = 'original_price') THEN
    ALTER TABLE inventory ADD COLUMN original_price DECIMAL(10,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory' AND column_name = 'sale_label') THEN
    ALTER TABLE inventory ADD COLUMN sale_label TEXT;
  END IF;
END $$;

-- 2. Update v_admin_product_picker to include price fields
CREATE OR REPLACE VIEW v_admin_product_picker AS
SELECT 
  i.id,
  i.tenant_id,
  i.barcode,
  b.name AS brand_name,
  i.model,
  i.color,
  i.quantity,
  i.product_type,
  i.sell_price,
  i.sell_discount,
  i.original_price,
  i.sale_label,
  i.website_sync,
  COALESCE(
    (
      SELECT json_agg(
        '/api/image/' || img.storage_path
        ORDER BY img.sort_order, img.created_at
      )
      FROM inventory_images img
      WHERE img.inventory_id = i.id
    ),
    '[]'::json
  ) AS images
FROM inventory i
JOIN brands b ON i.brand_id = b.id
WHERE i.is_deleted = false;

GRANT SELECT ON v_admin_product_picker TO authenticated;

-- 3. Seed block templates for campaign toolkit
INSERT INTO storefront_block_templates (name, description, category, block_type, block_data, block_settings, icon, sort_order) VALUES

-- === STICKY BARS ===
(
  'Sticky Bar עליון — הודעה + כפתור',
  'פס עליון נצמד עם טקסט בצד ימין וכפתור בצד שמאל',
  'marketing', 'sticky_bar',
  '{"text":"🔥 מבצע מיוחד! הנחות על כל המסגרות","cta_text":"לצפייה במבצע","cta_url":"/supersale/","position":"top","bg_color":"black","text_color":"white","dismissible":true,"show_countdown":false}'::jsonb,
  '{}'::jsonb, '📌', 100
),
(
  'Sticky Bar עליון — ספירה לאחור',
  'פס עליון עם טקסט וספירה לאחור',
  'marketing', 'sticky_bar',
  '{"text":"המבצע מסתיים בעוד:","cta_text":"","cta_url":"","position":"top","bg_color":"gold","text_color":"black","dismissible":false,"show_countdown":true,"countdown_to":"2026-12-31T23:59:59"}'::jsonb,
  '{}'::jsonb, '⏰', 101
),
(
  'Sticky Bar תחתון — CTA קבוע',
  'פס תחתון נצמד עם כפתור הנעה לפעולה',
  'marketing', 'sticky_bar',
  '{"text":"מעוניינים? דברו איתנו","cta_text":"וואטסאפ","cta_url":"https://wa.me/","position":"bottom","bg_color":"gold","text_color":"black","dismissible":false,"show_countdown":false}'::jsonb,
  '{}'::jsonb, '⬇️', 102
),
(
  'Sticky Bar תחתון — שני צדדים',
  'פס תחתון עם טקסט מימין וכפתור משמאל',
  'marketing', 'sticky_bar',
  '{"text":"ההרשמה פתוחה!","cta_text":"הירשמו עכשיו","cta_url":"/צרו-קשר/","secondary_text":"מקומות אחרונים","position":"bottom","bg_color":"black","text_color":"white","dismissible":false}'::jsonb,
  '{}'::jsonb, '↔️', 103
),

-- === TRUST BADGES ===
(
  'תגי אמון — 4 ערבויות',
  '4 אייקוני ערבות בשורה: אחריות, החזרה, משלוח, מומחים',
  'marketing', 'trust_badges',
  '{"section_title":"למה לבחור בנו?","badges":[{"icon":"🛡️","title":"אחריות מלאה","text":"שנתיים אחריות"},{"icon":"↩️","title":"החזרה קלה","text":"עד 14 יום"},{"icon":"🚚","title":"משלוח חינם","text":"להזמנות מעל ₪300"},{"icon":"👨‍⚕️","title":"מומחים מוסמכים","text":"אופטומטריסטים מנוסים"}]}'::jsonb,
  '{}'::jsonb, '🛡️', 110
),
(
  'תגי אמון — 3 ערבויות (קומפקטי)',
  '3 אייקוני ערבות',
  'marketing', 'trust_badges',
  '{"badges":[{"icon":"✅","title":"אחריות מלאה","text":""},{"icon":"💰","title":"מחיר הוגן","text":""},{"icon":"⭐","title":"שירות 5 כוכבים","text":""}]}'::jsonb,
  '{"bg_color":"gray"}'::jsonb, '✅', 111
),

-- === PRODUCT GRIDS ===
(
  'רשת מוצרים — קמפיין (4×2)',
  'רשת 4 עמודות דסקטופ, 2 מובייל — עם תמונות מתחלפות ומחירים',
  'products', 'products',
  '{"section_title":"המוצרים במבצע","selected_products":[],"style":"grid","grid_columns_desktop":4,"grid_columns_mobile":2,"show_out_of_stock":true,"card_style":"campaign","show_price":true,"show_original_price":true,"show_image_gallery":true,"show_badges":true}'::jsonb,
  '{}'::jsonb, '🏷️', 120
),
(
  'רשת מוצרים — מינימלי (3 עמודות)',
  'רשת נקייה 3 עמודות, בלי מחירים — לקטלוג',
  'products', 'products',
  '{"section_title":"","selected_products":[],"style":"grid","grid_columns_desktop":3,"grid_columns_mobile":2,"show_price":false,"show_image_gallery":false,"card_style":"minimal"}'::jsonb,
  '{}'::jsonb, '📋', 121
),
(
  'קרוסלת מוצרים — עם מחירים',
  'קרוסלה אופקית עם מחיר מקורי ומחיר מבצע',
  'products', 'products',
  '{"section_title":"","filter":"bestsellers","limit":10,"style":"carousel","show_price":true,"show_original_price":true,"show_image_gallery":true,"card_style":"standard"}'::jsonb,
  '{}'::jsonb, '💰', 122
),
(
  'קרוסלת מוצרים — בחירה ידנית עם גלריה',
  'קרוסלה עם מוצרים שנבחרו ידנית, תמונות מתחלפות',
  'products', 'products',
  '{"section_title":"","selected_products":[],"style":"carousel","show_image_gallery":true,"show_price":true,"card_style":"standard"}'::jsonb,
  '{}'::jsonb, '🎯', 123
),

-- === HERO VARIANTS ===
(
  'Hero קמפיין — כהה עם סטטוס',
  'Hero דרמטי עם רקע כהה, כותרת גדולה, טקסט סטטוס, וכפתור CTA',
  'layout', 'hero',
  '{"youtube_id":"","overlay":0.85,"title":"שם הקמפיין","subtitle":"תיאור קצר ומושך","status_text":"ההרשמה פתוחה","cta_text":"הירשמו עכשיו","cta_url":"#form","cta_style":"gold"}'::jsonb,
  '{}'::jsonb, '🎬', 130
),
(
  'Hero עם תמונה — מינימלי',
  'Hero עם תמונת רקע סטטית, כותרת פשוטה',
  'layout', 'hero',
  '{"image":"","overlay":0.5,"title":"כותרת","subtitle":"","cta_text":"","cta_url":""}'::jsonb,
  '{}'::jsonb, '🖼️', 131
),

-- === BANNERS ===
(
  'באנר הנעה לפעולה — רקע שחור',
  'באנר מלא עם רקע שחור, כותרת בזהב, כפתור CTA',
  'marketing', 'banner',
  '{"title":"הצטרפו למבצע","text":"אל תפספסו — מקומות מוגבלים","cta_text":"הירשמו","cta_url":"#form","style":"full"}'::jsonb,
  '{"bg_color":"black"}'::jsonb, '🖤', 140
),
(
  'באנר עם ספירה לאחור',
  'באנר מלא עם טיימר ספירה לאחור',
  'marketing', 'banner',
  '{"title":"המבצע מסתיים בקרוב!","text":"","cta_text":"לפני שנגמר","cta_url":"/products/","style":"full","countdown_to":"2026-12-31T23:59:59"}'::jsonb,
  '{"bg_color":"gold"}'::jsonb, '⏰', 141
),
(
  'באנר — כרטיס מידע',
  'כרטיס עם מידע + כפתור — מתאים בין sections',
  'marketing', 'banner',
  '{"title":"","text":"מחפשים משקפיים? אנחנו כאן בשבילכם","cta_text":"צרו קשר","cta_url":"/צרו-קשר/","style":"card"}'::jsonb,
  '{}'::jsonb, '💳', 142
),

-- === CONTENT ===
(
  'מפריד — קו',
  'קו מפריד בין מקטעים',
  'layout', 'divider',
  '{"style":"line","color":"gold"}'::jsonb,
  '{"padding":"py-4"}'::jsonb, '➖', 150
),
(
  'מפריד — רווח',
  'רווח ריק בין מקטעים',
  'layout', 'divider',
  '{"style":"space","height":"60px"}'::jsonb,
  '{"padding":"py-0"}'::jsonb, '⬜', 151
),
(
  'שלבים — 4 שלבים עם אייקונים',
  '4 שלבים ממוספרים בשורה',
  'content', 'steps',
  '{"section_title":"איך זה עובד?","items":[{"number":1,"title":"בחרו","description":"בחרו דגם"},{"number":2,"title":"התאימו","description":"בדיקת ראייה"},{"number":3,"title":"הזמינו","description":"הזמנה מאובטחת"},{"number":4,"title":"קבלו","description":"משלוח עד הבית"}]}'::jsonb,
  '{}'::jsonb, '1️⃣', 152
),
(
  'מותגים — קרוסלת לוגואים',
  'קרוסלת לוגואים של מותגים',
  'content', 'brands',
  '{"section_title":"המותגים שלנו","style":"carousel"}'::jsonb,
  '{}'::jsonb, '🏪', 153
),
(
  'בלוג — 4 פוסטים אחרונים',
  'קרוסלת פוסטים מהבלוג',
  'content', 'blog_carousel',
  '{"section_title":"מהבלוג שלנו","limit":4,"style":"carousel","show_more_url":"/בלוג/"}'::jsonb,
  '{}'::jsonb, '📰', 154
),
(
  'צור קשר — טופס + מפה',
  'מקטע צור קשר עם טופס ומפה',
  'content', 'contact',
  '{"section_title":"בואו נדבר","show_map":true,"show_form":true,"phone":"","email":"","address":"","hours":""}'::jsonb,
  '{}'::jsonb, '📞', 155
)

ON CONFLICT (name) DO NOTHING;

-- 4. Seed page templates for campaigns
INSERT INTO storefront_templates (name, description, page_type, blocks) VALUES
(
  'סופר סייל — עמוד קמפיין מלא',
  'עמוד קמפיין מלא כמו SuperSale: sticky bar, hero, ערבויות, רשת מוצרים, FAQ, CTA, sticky bottom',
  'campaign',
  '[
    {"id":"sticky-top","type":"sticky_bar","data":{"text":"🔥 האירוע של השנה! הנחות ענק על מסגרות פרימיום","cta_text":"לצפייה","cta_url":"#products","position":"top","bg_color":"gold","text_color":"black","dismissible":true}},
    {"id":"hero-1","type":"hero","data":{"youtube_id":"","overlay":0.85,"title":"סופר סייל","subtitle":"מסגרות פרימיום במחירי חיסול","status_text":"ההרשמה פתוחה","cta_text":"הירשמו לאירוע","cta_url":"#form","cta_style":"gold"}},
    {"id":"trust-1","type":"trust_badges","data":{"badges":[{"icon":"🛡️","title":"אחריות מלאה","text":"שנתיים"},{"icon":"👓","title":"מותגי פרימיום","text":"מקוריים"},{"icon":"💰","title":"חיסכון","text":"עד 70%"},{"icon":"🏪","title":"מעבדה באתר","text":"הכנה מהירה"}]}},
    {"id":"products-1","type":"products","data":{"section_title":"המוצרים במבצע","selected_products":[],"style":"grid","grid_columns_desktop":4,"grid_columns_mobile":2,"show_price":true,"show_original_price":true,"show_image_gallery":true,"show_out_of_stock":true,"card_style":"campaign"},"settings":{"bg_color":"black"}},
    {"id":"banner-1","type":"banner","data":{"title":"למה כדאי להגיע?","text":"מבחר ענק של מסגרות פרימיום, ייעוץ אישי, ומחירים שלא חוזרים","cta_text":"","cta_url":"","style":"full"},"settings":{"bg_color":"gray"}},
    {"id":"faq-1","type":"faq","data":{"section_title":"שאלות נפוצות","items":[{"question":"מתי האירוע?","answer":"..."},{"question":"האם צריך להירשם מראש?","answer":"כן, ההרשמה חובה"},{"question":"מה המחירים?","answer":"..."},{"question":"האם יש אחריות?","answer":"כל המוצרים באחריות מלאה"}]}},
    {"id":"form-1","type":"lead_form","data":{"title":"הירשמו לאירוע","fields":[{"name":"name","label":"שם מלא","type":"text","required":true},{"name":"phone","label":"טלפון","type":"tel","required":true},{"name":"email","label":"אימייל","type":"email","required":false}],"submit_text":"שריינו מקום","success_message":"נרשמתם בהצלחה! ניצור קשר עם פרטים נוספים"}},
    {"id":"sticky-bottom","type":"sticky_bar","data":{"text":"מקומות מוגבלים!","cta_text":"הירשמו עכשיו","cta_url":"#form","position":"bottom","bg_color":"gold","text_color":"black","dismissible":false}}
  ]'::jsonb
),
(
  'אירוע מולטיפוקל',
  'עמוד אירוע מולטיפוקל: sticky bars, hero, ערבויות, מידע, טופס',
  'campaign',
  '[
    {"id":"sticky-top","type":"sticky_bar","data":{"text":"🎯 אירוע מולטיפוקל ייעודי — הנחות מיוחדות","cta_text":"פרטים","cta_url":"#info","position":"top","bg_color":"black","text_color":"white","dismissible":true}},
    {"id":"hero-1","type":"hero","data":{"youtube_id":"","overlay":0.8,"title":"אירוע מולטיפוקל","subtitle":"עדשות מולטיפוקל מתקדמות במחירים מיוחדים","status_text":"הרשמה פתוחה","cta_text":"הרשמה","cta_url":"#form","cta_style":"gold"}},
    {"id":"trust-1","type":"trust_badges","data":{"badges":[{"icon":"👁️","title":"בדיקת ראייה מקיפה","text":""},{"icon":"🔬","title":"מעבדה באתר","text":""},{"icon":"⭐","title":"מותגי עדשות מובילים","text":""},{"icon":"🤝","title":"ליווי אישי","text":""}]}},
    {"id":"text-1","type":"text","data":{"title":"מה מחכה לכם באירוע","body":"## עדשות מולטיפוקל מתקדמות\n\nבאירוע המולטיפוקל שלנו תוכלו להתנסות בעדשות המתקדמות ביותר מהמותגים המובילים בעולם.\n\n## למי מתאים?\n\nלכל מי שצריך משקפיים לקריאה ולמרחק — מולטיפוקל זה הפתרון המושלם.","alignment":"right"}},
    {"id":"faq-1","type":"faq","data":{"section_title":"שאלות נפוצות","items":[{"question":"מה זה עדשות מולטיפוקל?","answer":"עדשות שמאפשרות ראייה לכל המרחקים — קרוב, בינוני ורחוק — בזוג משקפיים אחד"},{"question":"כמה זמן ההסתגלות?","answer":"רוב הלקוחות מסתגלים תוך שבוע-שבועיים"}]}},
    {"id":"form-1","type":"lead_form","data":{"title":"הירשמו לאירוע","fields":[{"name":"name","label":"שם מלא","type":"text","required":true},{"name":"phone","label":"טלפון","type":"tel","required":true}],"submit_text":"שריינו מקום","success_message":"תודה! ניצור קשר לתיאום"}},
    {"id":"sticky-bottom","type":"sticky_bar","data":{"text":"מעוניינים? הרשמו עכשיו","cta_text":"הרשמה","cta_url":"#form","position":"bottom","bg_color":"gold","text_color":"black"}}
  ]'::jsonb
),
(
  'עמוד מותג — מלא',
  'עמוד מותג עם hero, אודות, מוצרים, ביקורות, CTA',
  'custom',
  '[
    {"id":"hero-1","type":"hero","data":{"image":"","overlay":0.5,"title":"שם המותג","subtitle":"","cta_text":"צרו קשר","cta_url":"/צרו-קשר/","cta_style":"gold"}},
    {"id":"text-1","type":"text","data":{"title":"אודות המותג","body":"ספרו על המותג כאן...","alignment":"right"}},
    {"id":"products-1","type":"products","data":{"section_title":"הדגמים שלנו","filter":"all","limit":8,"style":"grid","grid_columns_desktop":4,"grid_columns_mobile":2,"show_image_gallery":true}},
    {"id":"reviews-1","type":"reviews","data":{"section_title":"מה הלקוחות אומרים","style":"carousel","show_rating_summary":true}},
    {"id":"cta-1","type":"cta","data":{"text":"רוצים לראות עוד? בואו לחנות","url":"/צרו-קשר/","style":"gold"}}
  ]'::jsonb
),
(
  'עמוד Landing Page — ליד',
  'עמוד נחיתה ממוקד: hero, יתרונות, טופס, ערבויות',
  'campaign',
  '[
    {"id":"hero-1","type":"hero","data":{"youtube_id":"","overlay":0.8,"title":"כותרת מושכת","subtitle":"תיאור קצר","cta_text":"השאירו פרטים","cta_url":"#form","cta_style":"gold"}},
    {"id":"trust-1","type":"trust_badges","data":{"badges":[{"icon":"✅","title":"יתרון 1","text":""},{"icon":"✅","title":"יתרון 2","text":""},{"icon":"✅","title":"יתרון 3","text":""}]}},
    {"id":"text-1","type":"text","data":{"title":"","body":"טקסט שכנוע...","alignment":"right"}},
    {"id":"form-1","type":"lead_form","data":{"title":"השאירו פרטים ונחזור אליכם","fields":[{"name":"name","label":"שם","type":"text","required":true},{"name":"phone","label":"טלפון","type":"tel","required":true}],"submit_text":"שליחה","success_message":"תודה! ניצור קשר בהקדם"}}
  ]'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- 5. Verify
SELECT 'SQL 035 complete' AS result;
SELECT COUNT(*) AS block_templates FROM storefront_block_templates;
SELECT COUNT(*) AS page_templates FROM storefront_templates;
```

---

## PART B — New Block Types

### Type 16: `sticky_bar`

```typescript
interface StickyBarData {
  text: string;                      // Main text
  secondary_text?: string;           // Text on opposite side
  cta_text?: string;                 // Button text
  cta_url?: string;                  // Button URL
  position: 'top' | 'bottom';       // Where it sticks
  bg_color?: string;                 // 'black' | 'gold' | 'white' | custom hex
  text_color?: string;               // 'white' | 'black'
  dismissible?: boolean;             // Show X button to dismiss
  show_countdown?: boolean;          // Show countdown timer
  countdown_to?: string;             // ISO date for countdown
}
```

**Rendering rules:**
- `position: 'top'` → fixed top, below header (z-index 40)
- `position: 'bottom'` → fixed bottom (z-index 40)
- Layout: text on right, CTA on left (RTL) — or text right, secondary_text + CTA left
- Dismissible: X button, sets sessionStorage flag to hide
- Countdown: show days:hours:minutes:seconds, updates every second
- Mobile: stack text above CTA if needed
- **NOT inside BlockWrapper** — sticky bars render at page level, outside normal block flow

### Type 17: `trust_badges`

```typescript
interface TrustBadgesData {
  section_title?: string;
  badges: Array<{
    icon: string;                    // Emoji or image URL
    title: string;
    text?: string;                   // Optional subtitle
  }>;
  style?: 'row' | 'grid';           // Default: 'row'
}
```

**Rendering:** Horizontal row of badges, evenly spaced. Each: icon (large) + title (bold) + text (small). Mobile: 2-column grid. Clean, trust-building design.

### Type 18: `divider`

```typescript
interface DividerData {
  style: 'line' | 'space' | 'dots' | 'wave';
  color?: string;                    // For line: 'gold', 'gray', 'black'
  height?: string;                   // For space: '40px', '80px'
}
```

**Rendering:** Simple visual separator. Line = `<hr>` styled. Space = empty div with height. Minimal component.

---

## PART C — Enhanced Product Card

### Updated ProductsData (additions to CMS-7)

```typescript
interface ProductsData {
  // ... existing fields from CMS-7 ...
  
  // NEW: Card display options
  card_style?: 'standard' | 'campaign' | 'minimal';
  show_price?: boolean;              // Default: true
  show_original_price?: boolean;     // Show strikethrough price
  show_image_gallery?: boolean;      // Arrows to browse product images
  show_badges?: boolean;             // Show custom badges on cards
  default_badge_text?: string;       // e.g., "מבצע!" — applied to all products
  badge_bg_color?: string;           // Badge background: 'red', 'gold', 'black'
}
```

### Enhanced ProductCard rendering

The ProductCard component (or ProductsBlock) renders each product with:

```
┌─────────────────────────┐
│ [מבצע!]     [מוצר מומלץ]│  ← Badges (top corners)
│                         │
│    ◀  [product image] ▶ │  ← Image gallery with arrows (if show_image_gallery)
│        ● ○ ○ ○          │  ← Dots indicator (number of images)
│                         │
│  BRAND NAME             │  ← Brand
│  Model Name             │  ← Model
│                         │
│  ₪790  ₪1,250           │  ← Sale price (black, bold) + original (red, strikethrough)
│                         │
│  [CTA button]           │  ← WhatsApp or "פרטים נוספים"
└─────────────────────────┘
```

**Image gallery behavior:**
- Default: show ALL product images with left/right arrows
- If `show_image_gallery: false` → show only first image, no arrows
- Arrows: `◀ ▶` buttons on sides, semi-transparent bg
- Dots: small dots below image indicating current/total
- Touch swipe on mobile (use CSS scroll-snap)
- Images have `bg-white` container (transparent backgrounds)

**Price display:**
- `show_price: true` + `show_original_price: true` → show both: `₪790  ₪1,250` (sale bold black, original strikethrough red)
- `show_price: true` + `show_original_price: false` → show only current price
- `show_price: false` → no price at all (catalog mode)
- Prices come from: `sell_price` (current), `sell_discount` or `original_price` (original)

**Badge display:**
- `show_badges: true` → show `default_badge_text` on all products (top-left corner)
- Individual product badges can come from `sale_label` field in inventory
- Badge: small colored tag with text

**Card styles:**
- `standard` — current design, clean
- `campaign` — dark border, larger images, prominent pricing, badges
- `minimal` — no badges, no prices, just image + brand + model

---

## PART D — Enhanced Hero Block

### Updated HeroData

```typescript
interface HeroData {
  // ... existing fields ...
  
  // NEW:
  status_text?: string;              // e.g., "ההרשמה פתוחה" — shown as badge above title
  status_bg?: string;                // Badge color: 'gold', 'green', 'red'
  title_size?: 'normal' | 'large' | 'huge';  // Font size control
  subtitle_position?: 'below' | 'above';     // Subtitle above or below title
}
```

**Status text:** Renders as a small pill/badge above the title: `[ההרשמה פתוחה]` with colored background. Great for campaign status.

---

## PART E — Execution Steps

### Step 1 — Create SQL file

**Repo:** opticup-storefront
**Files to create:** `sql/035-campaign-toolkit.sql`

Copy SQL from PART A. DO NOT RUN.

---

### Step 2 — Create 3 new block components (Storefront)

**Repo:** opticup-storefront
**Files to create:**
- `src/components/blocks/StickyBarBlock.astro`
- `src/components/blocks/TrustBadgesBlock.astro`
- `src/components/blocks/DividerBlock.astro`

**Files to modify:**
- `src/lib/blocks/types.ts` — add 3 new interfaces + update union
- `src/lib/blocks/registry.ts` — add 3 types
- `src/components/blocks/BlockRenderer.astro` — add 3 imports + conditionals

**StickyBarBlock special rendering:**
- This block does NOT render inside BlockWrapper's `<section>` tag
- It renders as a `position: fixed` element at top or bottom
- Add CSS: `position: fixed; left: 0; right: 0; z-index: 40;`
- Top: `top: 0` (or below sticky header if exists)
- Bottom: `bottom: 0`
- Dismissible: client-side JS → set `sessionStorage.setItem('sticky_dismissed_' + blockId, 'true')`
- Countdown: client-side JS → `setInterval` updating every second
- **PageRenderer must handle sticky_bar differently** — render outside main flow, maybe at the end of the page

**Verify:**
- [ ] Build passes
- [ ] All 3 components render

---

### Step 3 — Enhance ProductsBlock with image gallery + pricing

**Repo:** opticup-storefront
**Files to modify:**
- `src/components/blocks/ProductsBlock.astro`
- `src/components/ProductCard.astro` (or create a new `CampaignProductCard.astro` if simpler)

**Image gallery in product card:**
- If product has multiple images AND `show_image_gallery: true`:
  - Show left/right arrow buttons over the image
  - Use CSS scroll-snap horizontal container for the images
  - Show dot indicators below
  - On mobile: swipeable
- If single image or `show_image_gallery: false`: show single image, no arrows

**Pricing:**
- Read `sell_price`, `sell_discount`, `original_price` from product data
- If `show_original_price` and product has `original_price` or `sell_discount`:
  - Show `sell_price` in bold black
  - Show original price in red with line-through
- If no original price data: show only `sell_price`

**Badges:**
- If `show_badges` and `default_badge_text`: show badge on every card
- If product has `sale_label`: show that instead of default

**Card styles:**
- `campaign`: border, larger image area, prominent price, dark accents
- `minimal`: no border, no price, no badge, clean
- `standard`: current design

**Verify:**
- [ ] Build passes
- [ ] Products render with correct card style
- [ ] Image gallery arrows work
- [ ] Prices display correctly

---

### Step 4 — Enhance HeroBlock with status text

**Repo:** opticup-storefront
**Files to modify:** `src/components/blocks/HeroBlock.astro`

Add:
- `status_text` → renders as pill badge above title
- `title_size` → controls CSS font size
- `subtitle_position` → above or below title

**Verify:**
- [ ] Build passes
- [ ] Status text shows as badge

---

### ★ CHECKPOINT 1

```bash
cd C:\Users\User\opticup-storefront
git add -A
git commit -m "CMS-8 step 1-4: sticky bar, trust badges, divider, enhanced products + hero"
git push origin develop
```

---

### Step 5 — Update Studio block schemas (ERP)

**Repo:** opticup (ERP)
**Files to modify:** `modules/storefront/studio-block-schemas.js`

Add schemas for 3 new block types + update products + hero schemas:

**sticky_bar schema:**
```javascript
sticky_bar: {
  label: 'Sticky Bar',
  icon: '📌',
  fields: [
    { key: 'text', label: 'טקסט', type: 'text', required: true },
    { key: 'secondary_text', label: 'טקסט משני (צד שמאל)', type: 'text' },
    { key: 'cta_text', label: 'טקסט כפתור', type: 'text' },
    { key: 'cta_url', label: 'קישור כפתור', type: 'url' },
    { key: 'position', label: 'מיקום', type: 'select', options: [
      { value: 'top', label: 'למעלה' }, { value: 'bottom', label: 'למטה' }
    ], default: 'top', required: true },
    { key: 'bg_color', label: 'צבע רקע', type: 'select', options: [
      { value: 'black', label: 'שחור' }, { value: 'gold', label: 'זהב' }, { value: 'white', label: 'לבן' }
    ], default: 'black' },
    { key: 'text_color', label: 'צבע טקסט', type: 'select', options: [
      { value: 'white', label: 'לבן' }, { value: 'black', label: 'שחור' }
    ], default: 'white' },
    { key: 'dismissible', label: 'ניתן לסגירה', type: 'toggle', default: true },
    { key: 'show_countdown', label: 'ספירה לאחור', type: 'toggle', default: false },
    { key: 'countdown_to', label: 'תאריך סיום (ISO)', type: 'text', placeholder: '2026-12-31T23:59:59' },
  ]
}
```

**trust_badges schema:**
```javascript
trust_badges: {
  label: 'תגי אמון',
  icon: '🛡️',
  fields: [
    { key: 'section_title', label: 'כותרת', type: 'text' },
    { key: 'style', label: 'סגנון', type: 'select', options: [
      { value: 'row', label: 'שורה' }, { value: 'grid', label: 'רשת' }
    ], default: 'row' },
    { key: 'badges', label: 'תגים', type: 'items', itemFields: [
      { key: 'icon', label: 'אייקון (emoji)', type: 'text', required: true },
      { key: 'title', label: 'כותרת', type: 'text', required: true },
      { key: 'text', label: 'טקסט משני', type: 'text' },
    ]},
  ]
}
```

**divider schema:**
```javascript
divider: {
  label: 'מפריד',
  icon: '➖',
  fields: [
    { key: 'style', label: 'סגנון', type: 'select', options: [
      { value: 'line', label: 'קו' }, { value: 'space', label: 'רווח' },
      { value: 'dots', label: 'נקודות' }, { value: 'wave', label: 'גל' }
    ], default: 'line' },
    { key: 'color', label: 'צבע (לקו)', type: 'select', options: [
      { value: 'gold', label: 'זהב' }, { value: 'gray', label: 'אפור' }, { value: 'black', label: 'שחור' }
    ], default: 'gold' },
    { key: 'height', label: 'גובה (לרווח)', type: 'text', placeholder: '60px', default: '60px' },
  ]
}
```

**Update products schema** — add new fields:
```javascript
// Add to products schema fields:
{ key: 'card_style', label: 'סגנון כרטיס', type: 'select', options: [
  { value: 'standard', label: 'רגיל' },
  { value: 'campaign', label: 'קמפיין (מחירים + תגים)' },
  { value: 'minimal', label: 'מינימלי (ללא מחירים)' },
], default: 'standard' },
{ key: 'show_price', label: 'הצג מחיר', type: 'toggle', default: true },
{ key: 'show_original_price', label: 'הצג מחיר מקורי (מחוק)', type: 'toggle', default: false },
{ key: 'show_image_gallery', label: 'גלריית תמונות (חצים)', type: 'toggle', default: false },
{ key: 'show_badges', label: 'הצג תגים', type: 'toggle', default: false },
{ key: 'default_badge_text', label: 'טקסט תג ברירת מחדל', type: 'text', placeholder: 'מבצע!' },
{ key: 'badge_bg_color', label: 'צבע תג', type: 'select', options: [
  { value: 'red', label: 'אדום' }, { value: 'gold', label: 'זהב' }, { value: 'black', label: 'שחור' }
], default: 'red' },
```

**Update hero schema** — add new fields:
```javascript
// Add to hero schema fields:
{ key: 'status_text', label: 'טקסט סטטוס (תג מעל הכותרת)', type: 'text', placeholder: 'ההרשמה פתוחה' },
{ key: 'status_bg', label: 'צבע תג סטטוס', type: 'select', options: [
  { value: 'gold', label: 'זהב' }, { value: 'green', label: 'ירוק' }, { value: 'red', label: 'אדום' }
], default: 'gold' },
{ key: 'title_size', label: 'גודל כותרת', type: 'select', options: [
  { value: 'normal', label: 'רגיל' }, { value: 'large', label: 'גדול' }, { value: 'huge', label: 'ענק' }
], default: 'normal' },
```

---

### Step 6 — Update AI prompt Edge Function

**Repo:** opticup (ERP)
**Files to modify:** `supabase/functions/cms-ai-edit/index.ts`

Add new block types to BLOCK_TYPE_REFERENCE:
```
16. sticky_bar: { text, secondary_text, cta_text, cta_url, position (top/bottom), bg_color, text_color, dismissible, show_countdown, countdown_to }
17. trust_badges: { section_title, badges: [{icon, title, text}], style (row/grid) }
18. divider: { style (line/space/dots/wave), color, height }
```

Update products and hero descriptions with new fields.

**Create note for Daniel:** Deploy this after changes:
```
supabase functions deploy cms-ai-edit --no-verify-jwt
```

---

### Step 7 — Update permissions for new block types

**Repo:** opticup (ERP)
**Files to modify:** `modules/storefront/studio-permissions.js`

Add new blocks to tenant_admin allowed types:
- `trust_badges` → ❌ locked (structure block)
- `sticky_bar` → ❌ locked (marketing — admin only)
- `divider` → ❌ locked (layout)

These are admin-only blocks. Tenant can see them but not edit.

---

### ★ CHECKPOINT 2

```bash
cd C:\Users\User\opticup
git add -A
git commit -m "CMS-8 step 5-7: updated schemas, AI reference, permissions"
git push origin develop
```

---

### Step 8 — Integration testing

1. Open Studio (`?t=prizma`) → click "הוסף בלוק"
   - Verify new templates appear: sticky bars, trust badges, product grids, etc.
   - Add a sticky_bar block (top) → save → check storefront
   - Add a trust_badges block → save → check storefront
   - Add a divider block → save → check storefront

2. Test enhanced products block:
   - Create products block with `card_style: campaign`
   - Enable `show_image_gallery`, `show_price`, `show_original_price`
   - Verify arrows work on product cards
   - Verify pricing display

3. Test hero with status_text:
   - Edit hero → add status_text "ההרשמה פתוחה"
   - Verify badge appears above title

4. Test page template:
   - Create new page from "סופר סייל — עמוד קמפיין מלא" template
   - Verify all blocks render
   - Edit some content → save → verify

5. Test AI prompt:
   - "תוסיף sticky bar למעלה עם הטקסט מבצע חורף"
   - "תוסיף תגי אמון עם 4 יתרונות"
   - Verify AI knows new block types

**Report findings.**

---

### Step 9 — Documentation

Update CLAUDE.md (both repos):
```markdown
## CMS-8: Campaign Toolkit

### New Block Types:
- sticky_bar (#16): Fixed top/bottom bar with text + CTA + countdown
- trust_badges (#17): Row of guarantee/trust icons
- divider (#18): Visual separator (line, space, dots, wave)

### Enhanced Blocks:
- products: card_style (standard/campaign/minimal), image gallery arrows, price display (original + sale), badges
- hero: status_text badge, title_size, subtitle_position

### Total Block Types: 18

### Block Templates: 25+ pre-configured blocks in storefront_block_templates
### Page Templates: 8+ complete pages in storefront_templates
```

---

### ★ FINAL CHECKPOINT

```bash
cd C:\Users\User\opticup
git add -A
git commit -m "CMS-8 complete: campaign toolkit, 18 block types, 25+ templates"
git push origin develop

cd C:\Users\User\opticup-storefront
git add -A
git commit -m "CMS-8 complete: sticky bar, trust badges, divider, enhanced products + hero"
git push origin develop
```

---

## Autonomous Rules

- Checkpoint every 3-4 steps
- BLOCKED after 3 failed attempts → document, skip
- Do NOT run SQL
- Do NOT deploy Edge Functions
- Golden View Reference: images subquery from CLAUDE.md — copy exactly
- File size limits: JS ≤ 350, CSS ≤ 250
- All text Hebrew, RTL
- Mobile-first responsive on all new components
- Test sticky bars on mobile — must not overlap content or be too large

---

## Completion Checklist

- [ ] SQL 035 saved
- [ ] StickyBarBlock.astro — top/bottom, dismissible, countdown
- [ ] TrustBadgesBlock.astro — badge row/grid
- [ ] DividerBlock.astro — line/space/dots/wave
- [ ] ProductsBlock enhanced — image gallery, pricing, badges, card styles
- [ ] HeroBlock enhanced — status text, title size
- [ ] Block types/registry/renderer updated (18 types total)
- [ ] Studio schemas updated for all new/enhanced blocks
- [ ] 25+ block templates seeded
- [ ] 8+ page templates seeded
- [ ] AI prompt reference updated
- [ ] Permissions updated
- [ ] Build passes (storefront)
- [ ] No console errors (Studio)
- [ ] CLAUDE.md updated

---

## What Daniel Does After

1. Run SQL 035 in Supabase
2. Deploy: `supabase functions deploy cms-ai-edit --no-verify-jwt`
3. Test: create a campaign page from "סופר סייל" template
4. Customize: change products, text, sticky bar text
5. Done — campaign page live without code

---

## On Completion

Move this prompt file:
**From:** `C:\Users\User\opticup\modules\Module 3 - Storefront\docs\current prompt\CMS-8-campaign-toolkit.md`
**To:** `C:\Users\User\opticup\modules\Module 3 - Storefront\docs\old prompts\CMS-8-campaign-toolkit.md`
