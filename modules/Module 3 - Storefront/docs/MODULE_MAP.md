# Module 3 — Storefront — Module Map

## Files

### seo-audit/scripts/

| File | Lines | Description |
|------|-------|-------------|
| `helpers.mjs` | 207 | Config, HTTP helpers (wpFetch, wcFetch), pagination, file I/O, SEO extraction, utilities |
| `crawl-wp-api.mjs` | 233 | CLI crawler — fetches WP posts/pages + WC products/categories/tags/attributes per language |
| `generate-report.mjs` | 230 | Reads crawled JSON, generates url-inventory.json, .md, and .csv |
| `package.json` | 16 | Node.js project config (type: module, deps: dotenv, node-fetch) |

### seo-audit/data/ (generated, not committed)

| File | Description |
|------|-------------|
| `wp-posts-{he\|en\|ru}.json` | WordPress posts per language |
| `wp-pages-{he\|en\|ru}.json` | WordPress pages per language |
| `wp-categories-he.json` | WordPress post categories (Hebrew) |
| `wp-tags-he.json` | WordPress post tags (Hebrew) |
| `wc-products.json` | WooCommerce products |
| `wc-categories.json` | WooCommerce product categories |
| `wc-tags.json` | WooCommerce product tags |
| `wc-attributes.json` | WooCommerce product attributes |
| `crawl-progress.json` | Crawl state tracker |

### seo-audit/ (generated output)

| File | Description |
|------|-------------|
| `url-inventory.json` | Full URL inventory with metadata |
| `url-inventory.md` | Human-readable URL report |
| `url-mapping-template.csv` | CSV for Daniel to map old→new URLs |

### docs/

| File | Description |
|------|-------------|
| `PHASE_0_SPEC.md` | Phase 0 specification |
| `SESSION_CONTEXT.md` | Current session status |
| `MODULE_MAP.md` | This file |
| `CHANGELOG.md` | Phase history |

## Function Registry

### helpers.mjs

| Function | Params | Description |
|----------|--------|-------------|
| `config` | (export) | Environment config object |
| `sleep(ms)` | ms: number | Promise-based delay |
| `stripHtml(html)` | html: string | Remove HTML tags |
| `countWords(html)` | html: string | Count words in HTML |
| `extractPath(urlOrObj)` | urlOrObj: string\|object | Extract pathname from URL |
| `classifyPageType(path, wpType)` | path, wpType: string | Classify URL into page type |
| `wpFetch(domain, endpoint, params)` | domain, endpoint, params | WordPress REST API GET with Basic Auth |
| `wcFetch(domain, endpoint, params)` | domain, endpoint, params | WooCommerce REST API GET with query auth |
| `fetchAllPages(fetchFn, domain, endpoint, params)` | fetchFn, domain, endpoint, params | Paginate through all pages |
| `saveJSON(path, data)` | path, data | Write JSON file |
| `loadJSON(path)` | path: string | Read JSON file |
| `saveProgress(path, data)` | path, data | Save progress with timestamp |
| `loadProgress(path)` | path: string | Load progress file |
| `extractSeo(item)` | item: object | Extract Yoast/RankMath SEO data |

### crawl-wp-api.mjs

| Function | Params | Description |
|----------|--------|-------------|
| `normalizeWpItem(item, wpType, lang)` | item, wpType, lang | Normalize WP post/page to standard format |
| `normalizeWcProduct(item)` | item: object | Normalize WC product to standard format |
| `normalizeWcCategory(item)` | item: object | Normalize WC category |
| `crawlWpSite(lang)` | lang: string | Crawl all WP content for a language |
| `crawlWooCommerce()` | (none) | Crawl all WC content |
| `main()` | (none) | CLI entry point |

### generate-report.mjs

| Function | Params | Description |
|----------|--------|-------------|
| `loadAllData()` | (none) | Load all data files from data/ |
| `buildUrlList(data)` | data: object | Merge all data into unified URL list |
| `generateInventoryJson(urls, data)` | urls, data | Generate url-inventory.json structure |
| `generateInventoryMd(inventory)` | inventory: object | Generate Markdown report |
| `generateCsv(urls)` | urls: array | Generate CSV with UTF-8 BOM |
| `main()` | (none) | Entry point |

### ERP — modules/storefront/ (CMS-5)

| File | Lines | Description |
|------|-------|-------------|
| `studio-ai-prompt.js` | 216 | AI prompt bar, API calls (aiEditPage, aiEditComponent), prompt history, permission gating |
| `studio-ai-diff.js` | 245 | AI diff view, block diff computation, apply/cancel, component AI editing |

### Supabase Edge Functions (CMS-5)

| File | Lines | Description |
|------|-------|-------------|
| `supabase/functions/cms-ai-edit/index.ts` | 163 | AI prompt editing — receives blocks/config + prompt, calls Claude API, returns updated JSON |

### studio-ai-prompt.js — Function Registry

| Function | Params | Description |
|----------|--------|-------------|
| `aiEditPage(blocks, prompt)` | blocks: array, prompt: string | Send AI edit request for page blocks |
| `aiEditComponent(config, prompt)` | config: object, prompt: string | Send AI edit request for component config |
| `renderAiPromptBar(containerId)` | containerId: string | Render AI prompt bar in editor area |
| `handleAiPrompt()` | (none) | Handle page AI prompt submission with permission gating |
| `mergeWithLockedBlocks(originalAll, aiEdited, lockedIds)` | arrays | Merge AI-edited blocks with locked blocks for tenant_admin |
| `showAiStatus(type, message)` | type: string, message: string | Show/hide AI status bar |
| `addToPromptHistory(pageId, prompt)` | pageId, prompt: string | Add prompt to in-memory history (max 5) |
| `showPromptHistoryDropdown(pageId)` | pageId: string | Toggle history dropdown |
| `fillPromptFromHistory(index, pageId)` | index: number, pageId: string | Fill prompt input from history |

### studio-ai-diff.js — Function Registry

| Function | Params | Description |
|----------|--------|-------------|
| `showAiDiffView(original, new, explanation, prompt)` | arrays, strings | Show diff modal for page blocks |
| `computeBlockDiff(original, updated)` | arrays | Compute added/removed/modified blocks |
| `diffBlockData(oldBlock, newBlock)` | objects | Diff data fields between two blocks |
| `renderDiffChange(change)` | change: object | Render single change card HTML |
| `applyAiChanges()` | (none) | Apply AI changes to editedBlocks |
| `closeDiffView()` | (none) | Close diff modal |
| `handleComponentAiPrompt(config, id)` | config: object, id: string | Handle component AI prompt |
| `showComponentDiffView(original, new, explanation, id)` | objects, strings | Show component diff view |
| `applyComponentAiChanges()` | (none) | Apply component AI changes and save |

## Database Changes
None — Phase 0 is read-only. CMS-5 adds no DB tables (uses existing storefront_pages/storefront_components).

## Dependencies
- `dotenv` ^16.4.7
- `node-fetch` ^3.3.2
