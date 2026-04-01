# CMS-11: Visual Parity — Fix All Pages to Match Original

> **Prompt for Claude Code — Autonomous Execution (Overnight)**
> **Repos:** BOTH — `opticalis/opticup-storefront` (primary) + `opticalis/opticup` (ERP, minor)
> **Branch:** `develop`

---

## Context

The CMS migration (CMS-1 through CMS-10) converted all static Astro pages to dynamic blocks in Supabase. The CONTENT was migrated but the VISUAL DESIGN was lost — block components render generic layouts instead of the original custom designs.

**The `main` branch still has the ORIGINAL pages with correct design.** We need to compare `develop` (CMS) against `main` (original) and fix every difference.

**The Vercel deployment at `opticup-storefront.vercel.app` shows the `main` branch — this is the reference for how pages SHOULD look.**

---

## Pre-Flight

```
1. cd C:\Users\User\opticup-storefront && git branch (must be develop)
2. git pull origin develop
3. Read CLAUDE.md
4. CRITICAL: Fetch main branch for comparison:
   git fetch origin main
5. You can view any original file with:
   git show origin/main:src/pages/index.astro
   git show origin/main:src/components/HeroSection.astro
   etc.
6. npm run build (must pass)
7. npm run dev (start on any available port)
```

Confirm: `"On develop. Main fetched for comparison. Build passes. Dev server on port XXXX. Ready."`

---

## MASTER TASK: For Every Page, Compare develop vs main and Fix

### ⚠️ EXCEPTION: HOMEPAGE (/)
The homepage on develop currently looks BETTER than main. Do NOT revert it. Only fix the specific issues listed below (carousel arrows, YouTube IDs, title position, contact section). Keep everything else on the homepage as-is.

### Method for all OTHER pages:
1. Read the ORIGINAL file from main: `git show origin/main:src/pages/[path]`
2. Read the ORIGINAL components it uses: `git show origin/main:src/components/[name].astro`
3. Read the CURRENT blocks data from Supabase (or from sql/031-seed-pages.sql)
4. Compare: what's different visually?
5. Fix: either update the block component OR update the seed data in DB

**Two ways to fix:**
- **Component fix:** If a block TYPE renders wrong (e.g., columns block doesn't have the right layout) → fix the Astro component
- **Data fix:** If the block DATA is wrong (wrong text, wrong YouTube IDs, missing content) → create SQL UPDATE statements

**Save ALL SQL fixes in a single file: `sql/037-visual-parity-fixes.sql`**

---

## PAGE-BY-PAGE FIXES

### Page 1: Homepage (/)

**⚠️ IMPORTANT: The homepage currently looks GOOD. Do NOT revert it to main branch. Only fix the SPECIFIC issues listed below. Keep everything else as-is.**

**Reference main ONLY for:** extracting correct YouTube IDs, carousel arrow design, and contact section design. Do NOT replace the homepage layout or block structure.

**Specific issues to fix:**

#### 1a. "נעים מאוד, אופטיקה פריזמה" section
- **Original:** Title ABOVE the text on the LEFT side (RTL: text is right-aligned, image on right, text+title on left)
- **Current:** Title is centered above the whole section
- **Fix:** Update ColumnsBlock `image-text` layout — title should be part of the text column, not a standalone centered heading. Check original `src/components/AboutSection.astro` or equivalent from main.

#### 1b. Carousels missing arrows
- **Original:** Product carousel, brand carousel, blog carousel all have LEFT/RIGHT arrow buttons
- **Current:** Only scrollbar, no visible arrows
- **Fix:** Add arrow buttons to carousel implementations in: ProductsBlock, BrandsBlock, BlogCarouselBlock. Arrows should be:
  - Positioned absolutely on left/right edges of carousel
  - Semi-transparent background, visible on hover
  - Click scrolls by one item width
  - Hidden on mobile (swipe instead)
- **Reference:** Check how carousels work in main branch components

#### 1c. YouTube Shorts section
- **Problem 1:** Videos have dark background cards but NO actual video content showing — just placeholder text "שלב אחר שלב" with play button
- **Problem 2:** Wrong video IDs in the seed data
- **Fix:** 
  1. Check original homepage from main: `git show origin/main:src/pages/index.astro` — find the YouTube Shorts section and extract the correct video IDs
  2. Update VideoBlock shorts style to show actual YouTube thumbnails/embeds, not placeholder cards
  3. Videos should play INLINE when clicked (not redirect to YouTube). Use YouTube embed iframe with click-to-play.
  4. Add the dark card background behind each video like the original design

#### 1d. "בואו נדבר" section
- **Original:** This is part of the FOOTER area — gold background banner with "איך אפשר לעזור לך?" on the right, and a contact form card on the left. Not a standalone section.
- **Current:** Shows as a regular block, not matching the footer-integrated design
- **Fix:** Check original footer/contact section from main. The contact form + gold banner should match exactly.

#### 1e. Footer credit
- **Remove** "יצוב ובניית אתרים | ג'וני סטודיו" from the footer completely
- **File:** `src/components/Footer.astro`

---

### Page 2: Lab / מעבדת המסגורים (/lab/)

**Compare:** `git show origin/main:src/pages/lab/index.astro` (or similar path)

- The original page had custom design with specific sections, images, YouTube videos
- The CMS version lost this design
- **Fix:** Read the original page content from main. Update the blocks data in DB to match the original content exactly. If the block types can't represent the original design, use `custom` blocks with the original HTML+CSS.

**Create SQL UPDATE for this page in sql/037-visual-parity-fixes.sql**

---

### Page 3: Multifocal Guide (/multifocal-guide/)

**Compare:** `git show origin/main:src/pages/multifocal-guide/index.astro`

- Same issue as lab — custom design lost in CMS migration
- **Fix:** Same approach — read original, update blocks data or use custom blocks

**Create SQL UPDATE in sql/037-visual-parity-fixes.sql**

---

### Page 4: SuperSale (/supersale/)

**Compare:** `git show origin/main:src/pages/supersale/index.astro`

- This is the reference campaign page
- Compare original design against what CMS blocks produce
- Fix any differences

---

### Pages 5-16: All Other Pages

**For EVERY page in storefront_pages, compare content against main branch:**

Check these pages:
- /about/
- /צרו-קשר/
- /שאלות-ותשובות/
- /משלוחים-והחזרות/
- /terms/
- /deal/
- /privacy/
- /accessibility/
- /prizma-express-terms/
- /terms-branches/
- /supersale-takanon/
- /premiummultisale/

**For each:**
1. `git show origin/main:src/pages/[path]` — read original content
2. Compare against current blocks data
3. If content is different → create SQL UPDATE
4. If layout is different → fix component or use custom block

**Collect ALL SQL fixes in sql/037-visual-parity-fixes.sql**

---

### Footer — All Pages

**Compare:** `git show origin/main:src/components/Footer.astro`

**Known fixes:**
1. Remove "ג'וני סטודיו" credit line
2. "בואו נדבר" contact form integration with gold banner (check if this is in Footer or a separate component)
3. All footer links must point to correct CMS pages
4. Footer link text must match original

---

## COMPONENT FIXES

### Fix: Carousel Arrows (affects ProductsBlock, BrandsBlock, BlogCarouselBlock)

**Reference:** Check `origin/main` for how carousels were implemented. Look for:
- `git show origin/main:src/components/FeaturedProducts.astro`
- Any carousel/slider component from main

**Implement:** 
- Arrow buttons: `<button>` with `◀` / `▶` or SVG arrows
- Positioned: `absolute`, vertically centered, left: 0 / right: 0
- Style: semi-transparent bg (#000/50%), white arrow, rounded, hover effect
- Click handler: scroll container by one card width
- Hidden on mobile (screen < 768px)
- Show only if content overflows (more items than visible)

**Apply to:**
- ProductsBlock carousel mode
- BrandsBlock carousel mode  
- BlogCarouselBlock carousel mode

---

### Fix: VideoBlock Shorts Style

**Reference:** `git show origin/main:src/components/ProcessSection.astro` or YouTube section from main homepage

**Current problem:** Shows placeholder cards with text, not actual videos
**Fix:**
- Each short should show YouTube thumbnail or embedded player
- Click plays the video INLINE (not redirect to youtube.com)
- Dark card background behind each video
- Aspect ratio 9:16 for shorts
- On mobile: horizontal scroll

---

### Fix: YouTube Embed Inline Playback

**All YouTube embeds across the site:**
- Must play INLINE when clicked
- Never redirect to youtube.com
- Use iframe embed: `youtube-nocookie.com/embed/VIDEO_ID`
- For shorts: same approach but vertical aspect ratio

---

## EXECUTION ORDER

### Step 1 — Fetch main and analyze differences
```bash
git fetch origin main
```
For each page, read original from main and document differences.

### Step 2 — Fix Footer
- Remove ג'וני סטודיו credit
- Fix "בואו נדבר" integration
- Verify all footer links

### Step 3 — Fix carousel arrows (all carousel blocks)

### Step 4 — Fix VideoBlock (shorts, inline playback)

### Step 5 — Fix ColumnsBlock (image-text title position)

### Step 6 — Generate SQL fixes for page content
- Compare each page's blocks data against original content from main
- Extract correct YouTube IDs, text content, image URLs
- Create sql/037-visual-parity-fixes.sql with UPDATE statements for each page

### Step 7 — Fix Homepage SPECIFIC issues only (do NOT revert to main)
- Fix only: carousel arrows, YouTube IDs, video inline playback, "נעים מאוד" title position, "בואו נדבר" section
- Keep the current homepage layout and block structure as-is

### Step 8 — Fix Lab page

### Step 9 — Fix Multifocal Guide page

### Step 10 — Fix all remaining pages (compare each against main)

### Step 11 — Verify all pages render correctly
```bash
npm run build
npm run dev
# Check each page URL
```

### ★ CHECKPOINTS

After Step 5:
```bash
git add -A
git commit -m "CMS-11: footer fix, carousel arrows, video inline, columns layout"
git push origin develop
```

After Step 10:
```bash
git add -A  
git commit -m "CMS-11: all pages content matched to original"
git push origin develop
```

After Step 11:
```bash
git add -A
git commit -m "CMS-11: visual parity verified, all pages match original"
git push origin develop
```

---

## IMPORTANT RULES

- **main branch is the source of truth** for how pages should look
- **Do NOT modify main branch** — only read from it
- **Do NOT delete or modify** product pages (/products/), brand pages (/brands/), blog pages (/בלוג/), search, or API routes
- All SQL fixes go in ONE file: `sql/037-visual-parity-fixes.sql` — Daniel runs manually
- If a page design is too complex for standard blocks → use `custom` block with original HTML+CSS
- **Golden View Reference:** images subquery from CLAUDE.md — copy exactly if touching views
- File size limits: JS ≤ 350, CSS ≤ 250
- All content in Hebrew

---

## Completion Checklist

- [ ] Footer: ג'וני סטודיו removed
- [ ] Footer: "בואו נדבר" matches original design
- [ ] Footer: all links correct
- [ ] Carousels: arrows on products, brands, blog carousels
- [ ] VideoBlock: shorts show actual videos, play inline
- [ ] ColumnsBlock: image-text title position fixed
- [ ] Homepage: all sections match original
- [ ] Lab page: content matches original
- [ ] Multifocal guide: content matches original
- [ ] SuperSale: content matches original
- [ ] All legal pages: content matches original
- [ ] All other pages: content verified
- [ ] sql/037-visual-parity-fixes.sql created with all DB updates
- [ ] npm run build passes
- [ ] All pages return 200
- [ ] No console errors
- [ ] CLAUDE.md updated
- [ ] SESSION_CONTEXT.md updated

---

## On Completion

Create a report: `modules/Module 3 - Storefront/docs/CMS-11-PARITY-REPORT.md`

List:
- Every page checked
- What was different
- What was fixed
- What couldn't be fixed with blocks (needs custom block or design phase)

Move this prompt file:
**From:** `C:\Users\User\opticup\modules\Module 3 - Storefront\docs\current prompt\CMS-11-visual-parity.md`
**To:** `C:\Users\User\opticup\modules\Module 3 - Storefront\docs\old prompts\CMS-11-visual-parity.md`
