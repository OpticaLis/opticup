# PRE_MIGRATION_BEHAVIOR — MIGRATION_4_STOREFRONT_STUDIO

**Captured by:** opticup-executor (Full-Auto Pipeline)
**Date:** 2026-05-12
**Baseline commit:** `eace1b5`
**Purpose:** Document interactive behavior of all 4 in-scope HTML files BEFORE any token swaps. Used by Reviewer + Localhost-Tester to verify zero behavior change post-migration.

---

## 1. storefront-blog.html (377 lines, 21 scripts, 9 links, 159 DOM tags)

### Page purpose
ERP-side blog manager for the storefront. Create, edit, publish blog posts. AI-assisted content generation. Quill WYSIWYG editor.

### Top-level UI elements
- Storefront nav (links to settings/products/content/blog/glossary/studio)
- Page header with title + subtitle
- Toolbar: `+ פוסט חדש` (new post — `.btn-new` standard), `🤖 ייצר פוסט AI` (`.btn-ai` — **decorative indigo→violet gradient, target of Block A swap**)
- Posts list/grid with thumbnails + status pills
- Edit modal with Quill editor + AI controls
- AI generation modal: tabbed mode-switcher (`.btn-ai-mode` — active state is indigo/violet gradient, **target of Block A swap**) + generate button (`.btn-ai-generate` — gradient, **target of Block A swap**)

### Inline event handlers + behaviors
- `onclick="openNewPost()"`
- `onclick="openAIModal()"`
- `onclick="switchBlogAiMode('new'|'edit')"`
- `onclick="generateBlogAI()"`
- Quill WYSIWYG (CDN-loaded `quill.snow.css` + JS)
- Google SERP preview (uses literal Google brand hex: `#1a0dab`, `#006621`) — **OUT OF SCOPE per SPEC §0**

### Language-pill family (out of scope)
- `.lang-he` = `#3b82f6` (blue) — Hebrew
- `.lang-en` = `#22c55e` (green) — English
- `.lang-ru` = `#8b5cf6` (violet) — Russian
This is a category-marker family; one color per language. **NOT migrated per SPEC §0 D-OOS-1.**

### What MUST work after migration
- All 4 named functions execute
- AI buttons still have a visible primary-action background (Navy instead of indigo/violet gradient)
- AI-mode active state still visually distinguishable from inactive
- Quill editor still loads + accepts input
- Google SERP preview still renders with Google's literal blue/green
- Language pills (he/en/ru) still in their own colors
- All status pills still in their semantic colors

---

## 2. storefront-content.html (357 lines, 21 scripts, 9 links, 188 DOM tags)

### Page purpose
ERP-side translation + AI content manager. Shows storefront pages, their translation status (auto/manual), and progress for AI bulk-generation.

### Top-level UI elements
- Storefront nav
- Page header
- Content actions toolbar with `.btn-ai` (**target of Block A swap**)
- Content filters (select + input with `var(--primary)` focus border)
- Storefront-tabs (`.sf-tab.active` — uses `var(--g200)` border + `var(--primary)` text)
- Translation status badges:
  - `.trans-badge.auto` = info background (`#dbeafe`) + info text (`#1e40af`) — **semantic, OUT OF SCOPE**
- Progress bar:
  - `.progress-bar-track` = neutral gray fill track
  - `.progress-bar-fill` = indigo→violet 90deg gradient — **target of additional swap (not Block A — 90deg variant)**

### Inline event handlers + behaviors
- AI generation buttons
- Tab-switching
- Translation status filtering

### What MUST work after migration
- AI button still has visible primary-action background
- Progress bar fill still animates (transition: width .3s)
- Progress fill still visually distinct from neutral track background
- Translation badges (auto = blue info) still in semantic colors
- Tab active-state still uses `var(--primary)` text (which resolves to Slate 900 — unchanged by SPEC)

---

## 3. storefront-landing-content.html (150 lines, 20 scripts, 9 links, 83 DOM tags)

### Page purpose
ERP-side editor for landing-page content blocks. Edit content per landing-page; AI-assist for content fields.

### Top-level UI elements
- Storefront nav
- Landing-card list with content blocks + AI status indicator (`var(--g500)` text — neutral)
- Edit field with character count (`#dc2626` for "warn" — semantic danger)
- `.btn-ai` (**target of Block A swap**)
- Edit actions toolbar

### Inline event handlers + behaviors
- Field editing
- AI-content generation per field
- Save / cancel

### What MUST work after migration
- AI button still has visible primary-action background (Navy)
- Character-count warn state still uses semantic red (`#dc2626`)
- Edit fields still bind to model on change

---

## 4. storefront-studio.html (297 lines, 44 scripts, 11 links, 131 DOM tags)

### Page purpose
**Main storefront management page.** Tab-based: pages, leads, reviews, templates, shortcodes, media, translations. Also entry point to Landing-Page Wizard (special creation flow).

### Top-level UI elements
- Storefront nav (active tab marker on Studio)
- Page title "🎨 ניהול אתר — Studio"
- Refresh-button toolbar with **gold hover-border** (`onmouseover="this.style.borderColor='#c9a555'"`)
- Studio tabs (8 tabs incl. embedded Blog link)
- Pages tab content with two toolbar buttons:
  - `+ חדש` (`.btn btn-sm btn-primary` — standard)
  - `🎯 דף נחיתה` (`.btn btn-sm` with **inline gold gradient `linear-gradient(135deg, #c9a555, #e8da94)` + `color: #000`**) — **target of inline-style swap**
- Page view toggle (pages / brands / campaigns)
- Landing-Page Wizard (separate flow opened by `openLandingPageWizard()`):
  - `.lp-wizard-section input/select/textarea:focus` border + halo gold (`#c9a555` border + `rgba(201,165,85,.12)` shadow) — **target of additional swap**
  - `.lp-wizard-drop:hover, .dragover` gold border + gold-tint background (`#fefdf8`) — **target of additional swap**
  - `.lp-wizard-footer .btn-create` gold gradient with dark text — **target of additional swap, with WCAG-AA contrast fix (text → white)**
  - `.lp-wizard-footer .btn-cancel` neutral (gray border, light bg) — **OUT OF SCOPE**

### Inline event handlers + behaviors
- `onclick="refreshCurrentTab()"` + gold border on hover
- `onclick="switchStudioTab('pages'|'leads'|'reviews'|'templates'|'shortcodes'|'media'|'translations')"`
- `onclick="createPage()"`
- `onclick="openLandingPageWizard()"`
- `onclick="toggleBrandPagesView(false|true)"`
- `onclick="toggleCampaignsView()"`
- Wizard form bindings (drag/drop, file upload, text editor)
- Preview iframe to `https://opticup-storefront-demo.vercel.app` for live preview of CMS edits

### What MUST work after migration
- All 6+ tab switches activate the right tab
- "Refresh" button responds to hover (border color transition; Navy instead of gold)
- Wizard opens via `openLandingPageWizard()`
- Wizard form-control focus still has a colored ring (Navy halo at .12 alpha)
- Wizard drop-zone still shows hover/dragover state with Navy-soft background (`#e6f1fb`)
- Wizard "create" button still primary CTA (Navy bg, white text — improved contrast over previous gold-on-dark)
- Wizard "cancel" button unchanged (neutral)
- Preview iframe still loads `opticup-storefront-demo.vercel.app`

---

## 5. Cross-file behaviors NOT touched by migration

- All `<script>` tags (per Brief): zero JS modification.
- All `<link rel="stylesheet">` tags (per Brief): zero CSS-file modification, zero `<link>` ordering change.
- `var(--primary)` references in all 4 files: token resolves to `#0f172a` Slate 900 via `shared/css/variables.css` (already set by Daniel decision 2026-05-10). Migration does NOT touch the token.
- `var(--g50/g100/g200/g400/g500)` references: neutral grayscale tokens, all preserved.
- Hebrew RTL: `dir="rtl"` on `<html>` unchanged.
- Supabase client (`https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/...`) script tag unchanged.
- Google Font (`Heebo`) link unchanged.

---

*End of PRE_MIGRATION_BEHAVIOR. Reviewer + Localhost-Tester use this document as the contract that this SPEC must preserve.*
