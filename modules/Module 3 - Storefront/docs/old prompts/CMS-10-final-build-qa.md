# CMS-10: Custom Block + Bug Fixes + Comprehensive QA — Overnight Autonomous Run

> **Prompt for Claude Code — Autonomous Execution (Overnight)**
> **Module:** 3 — Storefront
> **Phase:** CMS-10 (Final Build + QA)
> **Repos:** BOTH — `opticalis/opticup` (ERP) + `opticalis/opticup-storefront` (Storefront)
> **Branch:** `develop`

---

## Context

CMS-1 through CMS-9 built a complete CMS with 18 block types, Studio editor, AI prompt editing, SEO scoring, product picker, Google reviews, templates, and more. This is the FINAL phase before the CMS is production-ready.

**This prompt does THREE things:**
1. **BUILD** — Add `custom` block type (HTML+CSS) + popup lead forms + fix missing features
2. **FIX** — All known bugs from testing
3. **QA** — Comprehensive automated testing of everything

**This is an overnight run. Be thorough. Fix everything. Test everything.**

---

## Pre-Flight

```
1. Both repos on develop, git pull:
   cd C:\Users\User\opticup && git pull origin develop
   cd C:\Users\User\opticup-storefront && git pull origin develop
2. Read CLAUDE.md (BOTH repos — critical!)
3. Read SESSION_CONTEXT.md (both repos)
4. Verify dev servers can run:
   cd C:\Users\User\opticup-storefront && npm run build
   (must pass before starting any work)
```

Confirm: `"Both repos pulled. CLAUDE.md read. Build passes. Ready for overnight run."`

---

## PHASE 1: BUILD — New Features

---

### Build 1 — Custom Block Type (#19: `custom`)

**What:** A block that renders raw HTML + inline CSS. For building complex pages like SuperSale, multifocal-guide, lab — pages that need custom design beyond standard blocks.

**Repo:** opticup-storefront

#### 1a. Add type definition

**File:** `src/lib/blocks/types.ts`

Add:
```typescript
interface CustomData {
  html: string;                     // HTML + inline <style> tags
  youtube_bg?: string;              // YouTube video ID for background
  image_bg?: string;                // Background image URL
  overlay?: number;                 // Dark overlay opacity 0-1
}
```

Add `CustomBlock` to the Block union type.

#### 1b. Add to registry

**File:** `src/lib/blocks/registry.ts`

Add `'custom'` to BLOCK_TYPES array.

#### 1c. Create component

**File:** `src/components/blocks/CustomBlock.astro`

```astro
---
interface Props {
  data: {
    html: string;
    youtube_bg?: string;
    image_bg?: string;
    overlay?: number;
  };
  lang?: string;
}

const { data, lang = 'he' } = Astro.props;
const { html, youtube_bg, image_bg, overlay } = data;
const hasBackground = youtube_bg || image_bg;
---

<div class="custom-block relative" dir={lang === 'he' ? 'rtl' : 'ltr'}>
  {/* YouTube video background */}
  {youtube_bg && (
    <div class="absolute inset-0 overflow-hidden z-0">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${youtube_bg}?autoplay=1&mute=1&loop=1&controls=0&showinfo=0&playlist=${youtube_bg}`}
        class="absolute w-full h-full object-cover pointer-events-none"
        style="top: 50%; left: 50%; transform: translate(-50%, -50%); min-width: 100%; min-height: 100%;"
        allow="autoplay; encrypted-media"
        loading="lazy"
      />
    </div>
  )}

  {/* Image background */}
  {image_bg && !youtube_bg && (
    <div class="absolute inset-0 z-0">
      <img src={image_bg} alt="" class="w-full h-full object-cover" loading="lazy" />
    </div>
  )}

  {/* Dark overlay */}
  {hasBackground && overlay && overlay > 0 && (
    <div class="absolute inset-0 z-[1]" style={`background: rgba(0,0,0,${overlay})`} />
  )}

  {/* Content — renders raw HTML safely */}
  <div class="relative z-[2]" set:html={html} />
</div>
```

**IMPORTANT:** `set:html` in Astro renders raw HTML. This is intentional — super_admin only.

#### 1d. Add to BlockRenderer

**File:** `src/components/blocks/BlockRenderer.astro`

Add import + conditional for CustomBlock.

**NOTE:** The custom block should NOT be wrapped in BlockWrapper's standard padding/max-width if it has its own layout. Check: if block type is 'custom', pass max_width='full' and padding='py-0' to BlockWrapper unless the block's settings override it. The custom block's HTML controls its own layout.

#### 1e. Verify
- [ ] `npm run build` passes
- [ ] Create a test: add a custom block to a page in DB with simple HTML, verify it renders

---

### Build 2 — Custom Block in Studio (ERP)

**Repo:** opticup (ERP)

#### 2a. Add schema

**File:** `modules/storefront/studio-block-schemas.js`

```javascript
custom: {
  label: 'בלוק מותאם אישית (HTML+CSS)',
  icon: '🎨',
  fields: [
    { key: 'html', label: 'קוד HTML + CSS', type: 'code', rows: 20, 
      placeholder: '<style>\n  .my-section { background: #000; color: #fff; padding: 4rem 2rem; }\n</style>\n<div class="my-section">\n  <h1>כותרת</h1>\n  <p>תוכן</p>\n</div>' },
    { key: 'youtube_bg', label: 'וידאו YouTube ברקע (ID)', type: 'text', placeholder: 'vHvX4zVcCls' },
    { key: 'image_bg', label: 'תמונת רקע (URL)', type: 'image' },
    { key: 'overlay', label: 'שכבה כהה (0-1)', type: 'range', min: 0, max: 1, step: 0.05, default: 0 },
  ]
}
```

#### 2b. Add `code` field type to form renderer

**File:** `modules/storefront/studio-form-renderer.js`

Add a new field type `code`:
- Renders as `<textarea>` with monospace font, dark background, light text
- Line numbers (optional — CSS counter-based or just styled textarea)
- Larger default height (20 rows)
- Syntax highlighting NOT required — just a good monospace textarea

#### 2c. Add "🤖 כתוב עם AI" button inside custom block editor

When editing a custom block, add a button below the code textarea:
- Click → opens a prompt input: "תאר מה אתה רוצה לבנות..."
- Sends current HTML + prompt to cms-ai-edit Edge Function with mode='custom'
- AI returns updated HTML+CSS
- Shows diff → approve/cancel
- This reuses the existing AI prompt infrastructure

#### 2d. Update AI Edge Function for custom mode

**File:** `supabase/functions/cms-ai-edit/index.ts`

Add `mode: 'custom'` handling:

```typescript
if (mode === 'custom') {
  systemPrompt = `You are a web developer building custom HTML+CSS sections for Optic Up, an Israeli optical store website.
You receive the current HTML+CSS code of a custom block and a user instruction in Hebrew.
Return ONLY the updated HTML+CSS code. No markdown backticks, no explanation outside the code.
Include <style> tags for CSS within the HTML.

Design rules:
- Direction: RTL (Hebrew text)
- Font: Rubik (already loaded globally via Google Fonts)
- Colors: primarily white, black, gold (#D4A853). Avoid blue.
- Mobile responsive: use @media (max-width: 768px) for mobile styles
- Use class names prefixed with the block context to avoid collisions (e.g., .supersale-hero, .multi-grid)
- Clean, modern, professional design
- All text in Hebrew unless specified otherwise`;

  userMessage = mode_data.prompt;
  if (mode_data.current_html) {
    userMessage = `Current code:\n${mode_data.current_html}\n\nInstruction: ${mode_data.prompt}`;
  }
}
```

#### 2e. Permissions

**File:** `modules/storefront/studio-permissions.js`

Add `custom` to the locked blocks list for tenant_admin. Only super_admin can create/edit custom blocks.

#### 2f. Verify
- [ ] Custom block appears in "add block" dialog
- [ ] Code editor renders properly (monospace, dark bg)
- [ ] AI writing works for custom blocks
- [ ] Saved HTML renders on storefront

---

### Build 3 — CTA Popup with Lead Form

**Repo:** opticup-storefront

Currently CTA blocks link to a URL. Add option for CTA to open a **popup lead form** instead.

#### 3a. Update CTA type

**File:** `src/lib/blocks/types.ts`

Add to CtaData:
```typescript
interface CtaData {
  // ... existing fields ...
  action?: 'link' | 'popup_form';        // Default: 'link'
  popup_form_title?: string;
  popup_form_fields?: Array<{
    name: string;
    label: string;
    type: 'text' | 'tel' | 'email' | 'textarea';
    required?: boolean;
  }>;
  popup_submit_text?: string;
  popup_success_message?: string;
  popup_webhook_url?: string;
}
```

#### 3b. Update CtaBlock component

**File:** `src/components/blocks/CtaBlock.astro`

If `data.action === 'popup_form'`:
- Button click opens a modal/popup (not navigates to URL)
- Popup contains the lead form fields
- Form submits to `/api/leads/submit` with UTM data
- Show success message after submit
- Close popup

Use a simple HTML dialog element or a div overlay. Client-side JS for open/close/submit.

#### 3c. Update CTA schema in Studio

**File:** `modules/storefront/studio-block-schemas.js`

Add to cta schema:
```javascript
{ key: 'action', label: 'פעולה', type: 'select', options: [
  { value: 'link', label: 'קישור לעמוד' },
  { value: 'popup_form', label: 'פתח טופס לידים (popup)' }
], default: 'link' },
{ key: 'popup_form_title', label: 'כותרת טופס', type: 'text', showIf: 'popup_form' },
{ key: 'popup_form_fields', label: 'שדות טופס', type: 'items', showIf: 'popup_form', itemFields: [
  { key: 'name', label: 'שם שדה', type: 'text', required: true },
  { key: 'label', label: 'תווית', type: 'text', required: true },
  { key: 'type', label: 'סוג', type: 'select', options: [
    { value: 'text', label: 'טקסט' }, { value: 'tel', label: 'טלפון' },
    { value: 'email', label: 'אימייל' }, { value: 'textarea', label: 'טקסט ארוך' }
  ]},
  { key: 'required', label: 'חובה', type: 'toggle' }
]},
{ key: 'popup_submit_text', label: 'טקסט כפתור שליחה', type: 'text', showIf: 'popup_form', default: 'שליחה' },
{ key: 'popup_success_message', label: 'הודעת הצלחה', type: 'text', showIf: 'popup_form', default: 'תודה! ניצור קשר בקרוב' },
{ key: 'popup_webhook_url', label: 'Webhook URL', type: 'url', showIf: 'popup_form' },
```

---

### Build 4 — Block Template for Custom Block

Add custom block templates to `storefront_block_templates`:

**Repo:** opticup-storefront
**File:** Add to `sql/035-campaign-toolkit.sql` or create new SQL file

```sql
INSERT INTO storefront_block_templates (name, description, category, block_type, block_data, block_settings, icon, sort_order) VALUES
(
  'בלוק HTML מותאם — ריק',
  'בלוק ריק לכתיבת HTML + CSS מותאם אישית',
  'layout', 'custom',
  '{"html":"<style>\n  .custom-section {\n    padding: 3rem 2rem;\n    text-align: center;\n  }\n</style>\n<div class=\"custom-section\">\n  <h2>כותרת</h2>\n  <p>תוכן מותאם אישית</p>\n</div>"}'::jsonb,
  '{"max_width":"full","padding":"py-0"}'::jsonb, '🎨', 200
),
(
  'Hero מותאם עם רקע וידאו',
  'Hero section עם וידאו YouTube ברקע + HTML מותאם',
  'layout', 'custom',
  '{"html":"<style>\n  .custom-hero {\n    min-height: 80vh;\n    display: flex;\n    flex-direction: column;\n    align-items: center;\n    justify-content: center;\n    color: white;\n    text-align: center;\n    padding: 2rem;\n  }\n  .custom-hero h1 {\n    font-size: 3rem;\n    font-weight: 700;\n    margin-bottom: 1rem;\n  }\n  .custom-hero p {\n    font-size: 1.3rem;\n    opacity: 0.9;\n    margin-bottom: 2rem;\n  }\n  .custom-hero .btn {\n    background: #D4A853;\n    color: black;\n    padding: 1rem 2.5rem;\n    border-radius: 9999px;\n    font-weight: 600;\n    font-size: 1.1rem;\n    text-decoration: none;\n    display: inline-block;\n  }\n  @media (max-width: 768px) {\n    .custom-hero h1 { font-size: 2rem; }\n    .custom-hero p { font-size: 1rem; }\n  }\n</style>\n<div class=\"custom-hero\">\n  <h1>כותרת הקמפיין</h1>\n  <p>תיאור קצר ומושך</p>\n  <a href=\"#form\" class=\"btn\">הירשמו לאירוע</a>\n</div>","youtube_bg":"","overlay":0.8}'::jsonb,
  '{"max_width":"full","padding":"py-0"}'::jsonb, '🎬', 201
),
(
  'רשת מוצרים מותאמת — 4 עמודות',
  'גריד מוצרים עם עיצוב מותאם — תמונות, שמות, מחירים',
  'products', 'custom',
  '{"html":"<style>\n  .custom-products {\n    display: grid;\n    grid-template-columns: repeat(4, 1fr);\n    gap: 1.5rem;\n    padding: 2rem;\n    max-width: 1200px;\n    margin: 0 auto;\n  }\n  .custom-products .product-card {\n    background: white;\n    border-radius: 12px;\n    overflow: hidden;\n    box-shadow: 0 2px 8px rgba(0,0,0,0.1);\n    text-align: center;\n    padding: 1rem;\n  }\n  .custom-products .product-card img {\n    width: 100%;\n    height: 200px;\n    object-fit: contain;\n    background: white;\n  }\n  .custom-products .product-card h3 {\n    font-size: 1rem;\n    margin: 0.5rem 0;\n  }\n  .custom-products .price-original {\n    color: red;\n    text-decoration: line-through;\n    font-size: 0.9rem;\n  }\n  .custom-products .price-sale {\n    font-size: 1.2rem;\n    font-weight: 700;\n  }\n  @media (max-width: 768px) {\n    .custom-products { grid-template-columns: repeat(2, 1fr); gap: 1rem; padding: 1rem; }\n  }\n</style>\n<div class=\"custom-products\">\n  <!-- הוסף כרטיסי מוצרים כאן -->\n  <div class=\"product-card\">\n    <img src=\"/api/image/...\" alt=\"מוצר\" />\n    <h3>BRAND MODEL</h3>\n    <span class=\"price-original\">₪1,250</span>\n    <span class=\"price-sale\">₪790</span>\n  </div>\n</div>"}'::jsonb,
  '{"max_width":"full","padding":"py-0"}'::jsonb, '▦', 202
)
ON CONFLICT (name) DO NOTHING;
```

---

### ★ CHECKPOINT — BUILD

```bash
cd C:\Users\User\opticup-storefront
git add -A
git commit -m "CMS-10 build: custom block type, CTA popup form, custom templates"
git push origin develop

cd C:\Users\User\opticup
git add -A
git commit -m "CMS-10 build: custom block schema, code editor, AI custom mode, CTA popup"
git push origin develop
```

---

## PHASE 2: FIX — Known Bugs

Fix ALL of these. Test each fix.

---

### Fix 1 — Gold color is orange

**Repo:** opticup-storefront
**Problem:** CTA buttons and elements show Tailwind's `amber-600` (#D97706 = orange) instead of gold (#D4A853).
**Fix:** 
- Search ALL block components for `amber-600`, `bg-amber-600`, `text-amber-600`
- Replace with the correct gold color: `#D4A853`
- Use inline style `style="background-color: #D4A853"` or add a custom Tailwind color in `tailwind.config.mjs`:
  ```javascript
  theme: { extend: { colors: { gold: '#D4A853' } } }
  ```
  Then use `bg-gold`, `text-gold` etc.
- Check: HeroBlock CTA, CtaBlock, BannerBlock, StickyBarBlock, any element using "gold"
**Verify:** Open any page with gold elements → color is warm gold, NOT orange.

---

### Fix 2 — Product card image gallery arrows don't work

**Repo:** opticup-storefront
**File:** `src/components/blocks/ProductsBlock.astro` or `src/components/ProductCard.astro`
**Problem:** Arrow buttons (◀ ▶) on product cards don't scroll images. The scrollbar is visible instead of being hidden.
**Fix:**
- Arrows need client-side JS: click → scroll container by one image width
- Hide scrollbar: `overflow-x: auto; scrollbar-width: none; -ms-overflow-style: none; &::-webkit-scrollbar { display: none; }`
- Arrows should be absolutely positioned on left/right of image container
- On mobile: arrows hidden, swipe works via scroll-snap
- Dot indicators below should update when scrolling
**Verify:** Open page with products → click arrows → images change → no scrollbar visible.

---

### Fix 3 — Studio page list layout broken

**Repo:** opticup (ERP)
**File:** `css/studio.css`, `modules/storefront/studio-pages.js`
**Problem:** Page list items overlap, text is cut off, SEO badges overlap with other elements.
**Fix:**
- Each page item needs proper height and padding
- SEO score badge: position on the left side, not overlapping title
- Slug text: truncate with ellipsis if too long
- Last edited time: smaller font, below slug
- Action buttons (📋 ⚙️): aligned, not overlapping
- Test with long page names and long slugs
**Verify:** Page list is clean, readable, no overlapping elements.

---

### Fix 4 — Studio templates show JSON instead of friendly UI

**Repo:** opticup (ERP)
**File:** `modules/storefront/studio-templates.js`, `storefront-studio.html`
**Problem:** Clicking edit on a template shows raw JSON editor instead of block editor.
**Fix:**
- Template editing should show the same block list UI as page editing
- Each block in template: type badge + summary + edit button
- Edit block → same form as page block editing
- "צור עמוד מתבנית" flow: click template → enter title + slug → page created with template blocks → redirected to page editor
- Templates list should show: name, description, block count, page_type — NO JSON visible
**Verify:** Templates tab looks professional. No JSON visible. Create page from template works.

---

### Fix 5 — "ניהול בלוג" link goes to wrong page

**Repo:** opticup (ERP)
**File:** `storefront-studio.html`
**Problem:** Blog management link points to wrong destination.
**Fix:** 
- Find the blog link in Studio HTML
- Check what blog management pages exist: search for files with "blog" or "content" in the ERP
- Point the link to the correct blog management page
- If the correct page is `storefront-content.html`, verify it manages blog posts
**Verify:** Click "ניהול בלוג" → opens blog management page.

---

### Fix 6 — Place ID save doesn't persist

**Repo:** opticup (ERP)
**File:** `modules/storefront/studio-reviews.js`
**Problem:** Saving Google Place ID in the Studio modal doesn't actually write to storefront_config.
**Fix:**
- Check the `rvSavePlaceId` function
- It should UPDATE storefront_config SET google_place_id = value WHERE tenant_id = current
- Debug: add console.log before and after the DB call
- Check that the Supabase client has permission to update storefront_config
**Verify:** Enter Place ID → save → refresh page → click "סנכרן" → reviews load (don't show Place ID modal again).

---

### Fix 7 — Delete block doesn't work for unsaved blocks

**Repo:** opticup (ERP)
**File:** `modules/storefront/studio-editor.js`
**Problem:** Delete button (🗑) doesn't work on newly added blocks that haven't been saved.
**Fix:**
- Check event listener attachment for dynamically created delete buttons
- Likely need event delegation: listen on parent container, not individual buttons
- Test: add block → delete immediately (before save) → should work
**Verify:** Add block → delete → block removed from list.

---

### Fix 8 — Preview opens Vercel instead of localhost

**Repo:** opticup (ERP)
**File:** `modules/storefront/studio-editor.js`
**Problem:** Preview button opens `opticup-storefront.vercel.app` which has old code (develop not merged to main).
**Fix:** 
- Preview should detect if running locally (localhost:3000) and open localhost:4321 instead
- Logic: if `window.location.hostname === 'localhost'`, preview URL = `http://localhost:4321/{slug}?t={tenant}`
- Otherwise: use Vercel URL
**Verify:** Click Preview → opens localhost:4321 with correct page.

---

### Fix 9 — Spacing between blocks too tight

**Repo:** opticup-storefront
**File:** `src/components/blocks/BlockWrapper.astro`
**Problem:** Some blocks are too close together, especially trust_badges after hero.
**Fix:**
- Default padding should be `py-12 md:py-16` (already set, but verify)
- Add margin between sections: `mb-0` by default, but blocks should have visual separation
- Check if sticky_bar, divider, and custom blocks correctly opt out of padding when needed
- Trust badges: should have top padding to separate from hero
**Verify:** Scroll through a campaign page → blocks have comfortable spacing.

---

### Fix 10 — Storefront meta tags from CMS pages

**Repo:** opticup-storefront
**File:** `src/layouts/BaseLayout.astro`, `src/pages/[...slug].astro`
**Problem:** Verify that CMS pages render correct meta tags from DB.
**Fix (if needed):**
- `<title>` should use `page.meta_title || page.title`
- `<meta name="description">` should use `page.meta_description`
- `<meta property="og:title">` and `og:description` should match
- `<link rel="canonical">` should have correct URL
**Verify:** View page source on a CMS page → meta tags present and correct.

---

### ★ CHECKPOINT — FIXES

```bash
cd C:\Users\User\opticup-storefront
git add -A
git commit -m "CMS-10 fixes: gold color, image gallery, spacing, meta tags"
git push origin develop

cd C:\Users\User\opticup
git add -A
git commit -m "CMS-10 fixes: Studio layout, templates UI, blog link, Place ID save, delete block, preview URL"
git push origin develop
```

---

## PHASE 3: COMPREHENSIVE QA

**Run automated checks on everything. Document ALL findings.**

---

### QA 1 — Build verification

```bash
cd C:\Users\User\opticup-storefront
npm run build
```

Must pass with ZERO errors. If there are errors, fix them before continuing.

---

### QA 2 — All 19 block types render

Start dev server:
```bash
cd C:\Users\User\opticup-storefront
npm run dev
```

For each block type, verify it renders without errors. Use the existing pages in DB or create test blocks:

| # | Block | Test URL / Method | Check |
|---|-------|-------------------|-------|
| 1 | hero | Homepage (/) | Video bg, overlay, title, CTA |
| 2 | text | /terms/ or /about/ | Markdown renders, title shows |
| 3 | gallery | Any page with gallery | Grid/slider, images load |
| 4 | video | Homepage (shorts section) | YouTube embeds, shorts layout |
| 5 | products | Homepage or /טסט/ | Cards render, images load |
| 6 | cta | Multiple pages | Button renders, link works |
| 7 | lead_form | /צרו-קשר/ or /טסט/ | Form renders, fields show |
| 8 | faq | /שאלות-ותשובות/ or /טסט/ | Accordion opens/closes |
| 9 | contact | /צרו-קשר/ | Map, info, form |
| 10 | banner | Campaign pages | Image, text, CTA |
| 11 | columns | Homepage | 4-icon row, image+text |
| 12 | steps | Homepage | Numbered steps |
| 13 | brands | Homepage | Logo carousel |
| 14 | blog_carousel | Homepage | Blog posts load |
| 15 | reviews | Any page with reviews block | Stars, text, author |
| 16 | sticky_bar | /טסט/ | Fixed position, dismiss works |
| 17 | trust_badges | /טסט/ | Badge row, icons |
| 18 | divider | Any page | Line renders |
| 19 | custom | Test page | HTML renders |

**For each block:** Open browser (use curl or Puppeteer if available), check:
- Renders without crash
- No console errors
- Content displays (not empty)

Document: `[PASS]` or `[FAIL: reason]` for each.

---

### QA 3 — Route verification

Test ALL these URLs return correct responses:

```bash
# CMS pages (200 expected)
curl -s -o /dev/null -w "%{http_code}" "http://localhost:4321/?t=prizma"
curl -s -o /dev/null -w "%{http_code}" "http://localhost:4321/about/?t=prizma"
curl -s -o /dev/null -w "%{http_code}" "http://localhost:4321/terms/?t=prizma"
curl -s -o /dev/null -w "%{http_code}" "http://localhost:4321/privacy/?t=prizma"
curl -s -o /dev/null -w "%{http_code}" "http://localhost:4321/accessibility/?t=prizma"
curl -s -o /dev/null -w "%{http_code}" "http://localhost:4321/deal/?t=prizma"
curl -s -o /dev/null -w "%{http_code}" "http://localhost:4321/lab/?t=prizma"
curl -s -o /dev/null -w "%{http_code}" "http://localhost:4321/multifocal-guide/?t=prizma"
curl -s -o /dev/null -w "%{http_code}" "http://localhost:4321/supersale/?t=prizma"
curl -s -o /dev/null -w "%{http_code}" "http://localhost:4321/צרו-קשר/?t=prizma"
curl -s -o /dev/null -w "%{http_code}" "http://localhost:4321/שאלות-ותשובות/?t=prizma"
curl -s -o /dev/null -w "%{http_code}" "http://localhost:4321/משלוחים-והחזרות/?t=prizma"
curl -s -o /dev/null -w "%{http_code}" "http://localhost:4321/טסט/?t=prizma"

# Non-CMS pages (200 expected)
curl -s -o /dev/null -w "%{http_code}" "http://localhost:4321/products/?t=prizma"
curl -s -o /dev/null -w "%{http_code}" "http://localhost:4321/brands/?t=prizma"
curl -s -o /dev/null -w "%{http_code}" "http://localhost:4321/search?t=prizma&q=ray"

# i18n fallback (200 expected — falls back to Hebrew)
curl -s -o /dev/null -w "%{http_code}" "http://localhost:4321/en/about/?t=prizma"
curl -s -o /dev/null -w "%{http_code}" "http://localhost:4321/ru/about/?t=prizma"

# 404 expected
curl -s -o /dev/null -w "%{http_code}" "http://localhost:4321/nonexistent-page/?t=prizma"
```

All 200s should be 200. The 404 should be 404 (not 500 or crash).

Document results.

---

### QA 4 — Lead form end-to-end

1. Find a page with lead_form block
2. Use curl or browser to submit a test lead:
```bash
curl -X POST http://localhost:4321/api/leads/submit \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "PRIZMA_TENANT_ID",
    "name": "טסט QA",
    "phone": "0501234567",
    "email": "test@test.com",
    "page_slug": "/טסט/",
    "utm_source": "qa_test",
    "utm_campaign": "cms10_qa"
  }'
```
(Get the actual tenant ID from DB first)

3. Check: lead appears in `cms_leads` table
4. Check: UTM fields saved

Document: `[PASS]` or `[FAIL: reason]`

---

### QA 5 — Mobile responsive check

For key pages, check that content doesn't overflow horizontally on mobile viewport (375px):

```bash
# Check for horizontal overflow indicators
# Each page should not have elements wider than viewport
```

Pages to check:
- Homepage
- /טסט/ (campaign test page)
- /products/
- /terms/
- /about/

Use `curl` to fetch HTML and check for extremely wide fixed-width elements, or note this as manual check.

---

### QA 6 — SuperSale Reproduction Test

**THIS IS THE CRITICAL TEST.**

Verify that a campaign page like SuperSale can be built entirely through the CMS.

**Check the existing /טסט/ page (built via AI prompt):**
1. Does it have: sticky bar top? ✅/❌
2. Does it have: hero with dark background? ✅/❌
3. Does it have: trust badges row? ✅/❌
4. Does it have: product grid (4 cols desktop, 2 mobile)? ✅/❌
5. Does it have: banner section? ✅/❌
6. Does it have: FAQ? ✅/❌
7. Does it have: lead form? ✅/❌
8. Does it have: sticky bar bottom? ✅/❌

**For each element that's missing or broken, try to fix it by:**
1. Checking the block data in the page
2. Fixing the component if it doesn't render correctly
3. Adding missing blocks if needed

**Compare visually (if Puppeteer available):**
Take screenshot of /טסט/ at 1440px width and 375px width.

Document: what works, what doesn't, what was fixed.

---

### QA 7 — Studio functionality check

Open `http://localhost:3000/storefront-studio.html?t=prizma` and verify:

1. **Page list:** All pages load with titles, slugs, SEO scores
2. **Block editor:** Click a page → blocks list shows
3. **Edit block:** Click ✎ → form opens → edit → save modal → save
4. **Add block:** Click "+ הוסף בלוק" → templates show → add → appears in list
5. **Delete block:** Add a block → delete it → gone
6. **Reorder:** Move block up/down → order changes
7. **Save:** Click save → data persists → refresh → still there
8. **Rollback:** Make change → save → rollback → previous version restored
9. **AI prompt:** Type instruction → AI responds → diff shows → approve
10. **SEO score:** Shows on page, updates when meta changes
11. **Components tab:** Can create CTA component
12. **Leads tab:** Dashboard loads (may be empty)
13. **Reviews tab:** Shows synced Google reviews
14. **Templates tab:** Lists templates with friendly UI (NOT JSON)
15. **Keyboard shortcuts:** Ctrl+S saves

Document each: `[PASS]` or `[FAIL: reason]`

---

### QA 8 — Console errors

Open browser DevTools console on:
1. `http://localhost:4321/?t=prizma` (storefront homepage)
2. `http://localhost:4321/טסט/?t=prizma` (test campaign page)
3. `http://localhost:3000/storefront-studio.html?t=prizma` (Studio)

Document any JavaScript errors (ignore warnings about favicon.ico and multiple GoTrueClient instances — those are known and harmless).

---

## PHASE 4: DOCUMENTATION + FINAL COMMIT

---

### Doc 1 — Update CLAUDE.md (storefront repo)

Add/update:
```markdown
## CMS — Complete Feature List

### Block Types (19 total):
1. hero — Full-width hero with video/image background
2. text — Markdown text content
3. gallery — Image grid or slider
4. video — YouTube embeds (standard + Shorts)
5. products — Product grid/carousel from catalog (auto or manual selection)
6. cta — Call-to-action button (link or popup lead form)
7. lead_form — Contact/lead form with webhook
8. faq — Accordion Q&A
9. contact — Contact info + map + form
10. banner — Promotional banner
11. columns — Multi-column layout
12. steps — Numbered process steps
13. brands — Brand logo carousel
14. blog_carousel — Recent blog posts
15. reviews — Google reviews carousel
16. sticky_bar — Fixed top/bottom bar
17. trust_badges — Trust/guarantee icons row
18. divider — Visual separator
19. custom — Raw HTML+CSS (super_admin only)

### Custom Block (Type #19):
- Renders raw HTML + inline CSS
- Optional: YouTube video background, image background, overlay
- AI writing: "כתוב עם AI" button generates HTML+CSS from Hebrew prompt
- Super admin only — tenant_admin cannot create/edit
- Use for: complex campaign pages, custom layouts beyond standard blocks
```

### Doc 2 — Update CLAUDE.md (ERP repo)

Add CMS-10 documentation with custom block schema, code editor field type, CTA popup form.

### Doc 3 — Update SESSION_CONTEXT.md

```markdown
## CMS Status: COMPLETE
All phases done (CMS-1 through CMS-10).
19 block types, Studio editor, AI editing, SEO scoring, product picker, Google reviews, 
custom HTML blocks, popup lead forms, campaign templates.
Next: Design phase (WordPress visual parity) → DNS switch.
```

---

### ★ FINAL CHECKPOINT

```bash
cd C:\Users\User\opticup-storefront
git add -A
git commit -m "CMS-10 complete: custom block, bug fixes, comprehensive QA passed"
git push origin develop

cd C:\Users\User\opticup
git add -A
git commit -m "CMS-10 complete: custom block Studio, bug fixes, QA verified"
git push origin develop
```

---

### QA Report

**Create a file:** `C:\Users\User\opticup\modules\Module 3 - Storefront\docs\CMS-QA-REPORT.md`

Include:
- All QA results (PASS/FAIL for each check)
- List of bugs found and fixed
- List of remaining issues (if any)
- Screenshots if Puppeteer was used
- Recommendations for next phase

---

## Autonomous Rules

- Checkpoint after each PHASE (Build, Fix, QA)
- BLOCKED after 3 failed attempts → document issue, move to next item
- DECISION_NEEDED → choose simpler option, document reasoning
- Do NOT run SQL — if new SQL needed, save as file
- Do NOT deploy Edge Functions — note what needs deploying
- Golden View Reference: images subquery from CLAUDE.md — copy exactly
- File size limits: JS ≤ 350, CSS ≤ 250
- All text Hebrew, RTL
- Fix bugs BEFORE running QA (Phase 2 before Phase 3)
- If a test fails in QA, try to fix it, then re-test
- Be thorough — this is the final QA before production

---

## What Daniel Does After This Run

1. Read QA Report
2. Run any new SQL files
3. Deploy Edge Functions if updated:
   ```powershell
   cd C:\Users\User\opticup
   supabase functions deploy cms-ai-edit --no-verify-jwt
   ```
4. Manual visual review of:
   - Homepage
   - Campaign test page (/טסט/)
   - Studio UI
5. If QA passed → CMS is complete → move to design phase

---

## On Completion

Move this prompt file:
**From:** `C:\Users\User\opticup\modules\Module 3 - Storefront\docs\current prompt\CMS-10-final-build-qa.md`
**To:** `C:\Users\User\opticup\modules\Module 3 - Storefront\docs\old prompts\CMS-10-final-build-qa.md`
