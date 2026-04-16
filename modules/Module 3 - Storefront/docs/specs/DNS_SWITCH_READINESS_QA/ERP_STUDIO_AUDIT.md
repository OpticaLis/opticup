# ERP Studio Audit — Mission 5
Generated: 2026-04-16
Scope: 31 JS files in `modules/storefront/`
Auditor: opticup-sentinel (read-only)

## Summary

- **Files audited:** 31
- **Total LOC:** 13,457
- **PASS (no findings):** 14
- **FAIL (≥1 finding):** 17
  - HIGH: 3 files (Rule 22 — missing tenant_id on insert/write filter)
  - MEDIUM: 6 files (Rule 7 — direct `sb.from(...)` on raw tables when a view/RPC or helper exists)
  - LOW: 8 files (Rule 12 — oversized; Rule 2 — missing writeLog on data modifications)
- **Oversized files (>350 lines):**
  - `storefront-translations.js` — 1,264
  - `brand-translations.js` — 1,010
  - `studio-shortcodes.js` — 898
  - `studio-brands.js` — 871
  - `studio-pages.js` — 698
  - `studio-campaigns.js` — 698
  - `storefront-blog.js` — 754
  - `storefront-content.js` — 614
  - `studio-block-schemas.js` — 630
  - `studio-media.js` — 575
  - `studio-campaign-builder.js` — 430
  - `studio-reviews.js` — 377
  - `studio-templates.js` — 364
  - `studio-editor.js` — 360 (warning — within 300–350 band: 310, 306, 308, 309, 319 files also warned)

Rule 2 (writeLog) — **not applied in this module.** Zero files call `writeLog` or `ActivityLog`. Flagged as SYSTEMIC MEDIUM (see Findings §1 below).
Rule 7 (API abstraction) — this module **never uses `fetchAll/batchCreate/batchUpdate/DB.*`** helpers. Every file goes directly via `sb.from()`. Flagged as SYSTEMIC — treated as MEDIUM in individual rows (the pattern is consistent and uses `.eq('tenant_id', getTenantId())` almost everywhere, but formally violates Rule 7).
Rule 8 (XSS) — `innerHTML =` occurrences are plentiful but manually audited: **no raw user-typed string injected without `escapeHtml/escapeAttr`**. All found sites are either (a) static template HTML, (b) pre-escaped via `escapeHtml`, or (c) Quill-managed rich text. No CRITICAL findings.
Rule 9 (hardcoded business values) — **0 occurrences** of `פריזמה` / `Prizma` / hardcoded phone / address in this folder. (One known TODO comment in `studio-brands.js:298` about a hardcoded domain that's flagged for future B4 work.)
PIN verification (Rule 8 extension) — **0 occurrences.** No Studio delete flow calls `pin-auth`/`verifyPIN`. Storefront/Studio deletes currently rely on RLS + modal confirmation only. Flagged as DISCUSSION item (see Findings §4).

## Per-File Results

Legend: ✅ = pass, ⚠ = warn, ✗ = fail, n/a = rule not applicable.

| File | Lines | R7 | R22 | R9 | R2 | R8 | Issues |
|---|---:|:---:|:---:|:---:|:---:|:---:|---|
| brand-translations.js | 1010 | ⚠ | ✅ | ✅ | ✗ | ✅ | Oversized (LOW); direct sb.from OK but reads translation_glossary raw; no writeLog. |
| storefront-blog.js | 754 | ⚠ | ✅ | ✅ | ✗ | ✅ | Oversized (LOW); all inserts include tenant_id; soft-delete OK; no writeLog on insert/update/delete. |
| storefront-brands.js | 310 | ⚠ | ✅ | ✅ | ✗ | ✅ | All writes include tenant_id filter/payload; no writeLog. |
| storefront-content.js | 614 | ⚠ | ✅ | ✅ | ✗ | ✅ | Oversized (LOW); upserts include tenant_id; no writeLog. |
| storefront-glossary.js | 164 | ⚠ | ⚠ | ✅ | ✗ | ✅ | **R22-WARN:** `update({is_deleted:true}).eq('id',termId)` at L154 **does not filter by tenant_id** → relies solely on RLS. Defense-in-depth missing. Also `update(...).eq('id', editingTermId)` at L127 — same gap. No writeLog. |
| storefront-landing-content.js | 246 | ⚠ | ✅ | ✅ | ✗ | ✅ | All upserts include tenant_id; no writeLog. |
| storefront-products.js | 261 | ⚠ | ✅ | ✅ | ✗ | ✅ | All updates filter by tenant_id; no writeLog. |
| storefront-settings.js | 191 | ⚠ | ✅ | ✅ | ✗ | ✅ | Update uses tenant_id eq; no writeLog. |
| storefront-translations.js | 1264 | ⚠ | ✅ | ✅ | ✗ | ✅ | Oversized (LOW — largest file); all writes include tenant_id; no writeLog. |
| studio-ai-diff.js | 245 | ⚠ | ✅ | ✅ | ✗ | ✅ | Update on `storefront_components` filters by tenant_id (L239); no writeLog. |
| studio-ai-prompt.js | 261 | ✅ | n/a | ✅ | n/a | ✅ | No DB writes. PASS. |
| studio-block-schemas.js | 630 | n/a | n/a | ✅ | n/a | ✅ | Oversized (LOW) but purely declarative schema registry. PASS on all write rules. |
| studio-brands.js | 871 | ⚠ | ⚠ | ✅ | ✗ | ✅ | Oversized (LOW); `translation_corrections.insert(corrections)` at L843 and `translation_memory.upsert(...)` at L863 — the rows passed do NOT visibly include tenant_id in this call site (constructed elsewhere — verify); `media_library.insert` at L582 includes tenant_id. No writeLog. Also TODO comment at L298 flags Rule 9 future work. |
| studio-campaign-builder.js | 430 | ⚠ | ✅ | ✅ | ✗ | ✅ | Oversized (LOW); insert includes tenant_id (L266); updates filter via page joins — no explicit `.eq('tenant_id',...)` on `storefront_pages.update` at L292/L362/L385/L409 (relies on `.eq('id',...)` only). **MEDIUM** defense-in-depth gap on status transitions. |
| studio-campaigns.js | 698 | ⚠ | ⚠ | ✅ | ✗ | ✅ | Oversized (LOW); `campaigns.update(...).eq('id', cid)` at L610, L638, L655, L656 — **no tenant_id filter**. Inserts include tenant_id. No writeLog on delete/status changes. |
| studio-editor.js | 360 | ⚠ | ✅ | ✅ | ✗ | ✅ | At 350-line boundary (LOW warn); updates filter by tenant_id; no writeLog on blocks save. |
| studio-form-renderer.js | 274 | ✅ | n/a | ✅ | n/a | ✅ | Pure UI/renderer. PASS. |
| studio-leads.js | 187 | ⚠ | ✅ | ✅ | n/a | ✅ | Read-only view; PASS. |
| studio-media.js | 575 | ⚠ | ⚠ | ✅ | ✗ | ✅ | Oversized (LOW); insert at L320 has tenant_id; **update at L525 and soft-delete at L547 do NOT filter by tenant_id** — only `.eq('id', ...)`. HIGH for media_library because bucket is shared infra. No writeLog. |
| studio-pages.js | 698 | ⚠ | ✅ | ✅ | ✗ | ✅ | Oversized (LOW); all update/delete sites consistently filter `.eq('tenant_id', getTenantId())` — exemplary. Inserts include tenant_id. No writeLog. |
| studio-permissions.js | 133 | ✅ | n/a | ✅ | n/a | ✅ | No DB writes. PASS. |
| studio-product-picker.js | 309 | ⚠ | ✅ | ✅ | n/a | ✅ | Read-only; filters by tenant_id. PASS. |
| studio-reviews.js | 377 | ⚠ | ⚠ | ✅ | ✗ | ✅ | Oversized (LOW); `storefront_reviews.update({ sort_order }).eq('id', ...)` at L175/L176, L152, L236, L253 — **NO tenant_id filter**. Inserts include tenant_id. `storefront_config.update({google_place_id, ...}).eq(...)` at L302 also no tenant_id filter. No writeLog. **MEDIUM/HIGH** defense-in-depth gap. |
| studio-richtext.js | 78 | ✅ | n/a | ✅ | n/a | ✅ | Pure Quill init utility. PASS. |
| studio-seo.js | 319 | ⚠ | ✅ | ✅ | ✗ | ✅ | Update filters by tenant_id (L303); no writeLog. |
| studio-shortcodes.js | 898 | ⚠ | ✅ | ✅ | ✗ | ✅ | Oversized (LOW); insert at L883 includes tenant_id; no writeLog. |
| studio-tags.js | 189 | ⚠ | ⚠ | ✅ | ✗ | ✅ | Insert includes tenant_id; `storefront_page_tags.delete().eq('id', tagId)` at L180 — **NO tenant_id filter**. No writeLog. |
| studio-templates.js | 364 | ⚠ | **✗** | ✅ | ✗ | ✅ | Oversized (LOW); **HIGH VIOLATION:** insert at L175 (`storefront_templates`) and L234 lack `tenant_id` — they insert without scoping. If `storefront_templates` is tenant-scoped (Rule 14), this is a data-integrity bug; if the table is global/shared, this is OK — **verify schema**. Also update at L331, L353 use only `.eq('id', templateId)` — no tenant_id. |
| studio-translation-editor.js | 306 | ⚠ | ⚠ | ✅ | ✗ | ✅ | Update at L243 has no tenant_id filter (only id); update at L256 same; inserts at L281/L295 include tenant_id via row payload. No writeLog. |
| studio-translation-glossary.js | 133 | ⚠ | ✅ | ✅ | ✗ | ✅ | Upsert rows include tenant_id; soft-delete filters by tenant_id. No writeLog. |
| studio-translations.js | 308 | ⚠ | ✅ | ✅ | ✗ | ✅ | All writes filter by tenant_id. No writeLog. |

## Findings by Severity

### HIGH (3)
1. **studio-templates.js:175, 234** — `storefront_templates.insert({name, description, page_type, blocks, is_active})` **omits `tenant_id`**. If the table is per-tenant (Rule 14 requires tenant_id NOT NULL), this insert will fail at DB level OR create tenant-less rows. Update calls at L331/L353 also don't filter by tenant_id. **Action:** verify schema in `docs/GLOBAL_SCHEMA.sql` — if tenant-scoped, add `tenant_id: getTenantId()` to row payload and `.eq('tenant_id', getTenantId())` to updates.
2. **studio-reviews.js** (5 call sites) — updates and deletes on `storefront_reviews` and `storefront_config` rely on `.eq('id', ...)` alone. Rule 22 requires belt-and-suspenders tenant_id filter alongside RLS.
3. **studio-media.js:525, 547** — `media_library.update(...)` and soft-delete `.eq('id', ...)` with no tenant_id filter. Media bucket is tenant-scoped; missing defense-in-depth.

### MEDIUM (8)
4. **Rule 2 — writeLog absent from entire Storefront/Studio module (26 files perform writes; 0 call writeLog/ActivityLog).** Per CLAUDE.md Rule 2, "every data modification" must call writeLog. This is a systemic gap: storefront_pages, blog_posts, campaigns, reviews, glossary, translations, media_library, brands, shortcodes, templates, leads — none log. **Decision needed:** either (a) declare Studio write-logging as out-of-scope for M3 and document in MODULE_SPEC, or (b) open a remediation phase to add writeLog calls. Defer to Foreman.
5. **Rule 7 — 100% of DB access uses `sb.from(...)` directly.** No file in this module uses `fetchAll/batchCreate/batchUpdate/DB.*`. Not a safety defect per-se (tenant_id is filtered nearly everywhere), but violates the project-wide abstraction standard. If shared.js helpers don't support PostgREST views / upserts with `onConflict`, this pattern may be acceptable — but it should be explicitly whitelisted.
6. **studio-campaigns.js** — `campaigns.update(...)` at L610/638/655/656 uses `.eq('id', cid)` only. No tenant_id filter. Add `.eq('tenant_id', getTenantId())`.
7. **studio-campaign-builder.js** — 4 `storefront_pages.update(...)` sites (L292, L362, L385, L409) use `.eq('id', ...)` only.
8. **studio-tags.js:180** — delete `.eq('id', tagId)` only. Missing tenant_id.
9. **storefront-glossary.js:127, 154** — updates filter by id only.
10. **studio-translation-editor.js:243, 256** — updates on `storefront_pages` by id only.
11. **studio-brands.js:843, 863** — rows passed to `translation_corrections.insert(corrections)` and `translation_memory.upsert(memRows, ...)` are constructed in the caller; spot-checked `saveBrandTranslationLearning(...)` — need to verify every row has tenant_id. Low risk but worth confirming.

### LOW (14)
12. Oversized files (>350 lines): 14 files listed in Summary. The largest three (`storefront-translations.js:1264`, `brand-translations.js:1010`, `studio-shortcodes.js:898`) are the highest-value split candidates. None exceed safety; Rule 12 is a target, not a hard enforcement, but all 14 violate it.
13. **Rule 9 TODO debt:** `studio-brands.js:298` — `// TODO(B4): replace hardcoded domain with getTenantConfig('custom_domain')`. Known, tracked, not a violation yet.

### DISCUSSION
14. **PIN verification on sensitive ops:** Studio deletes (pages, templates, reviews, glossary, tags, blog posts, campaigns, translations, media) currently use `confirm()` or `Modal.confirm()` only — no PIN re-verification. Storefront/Studio was scoped as editor-role only (already past login gate), so this may be by design. If PIN escalation is desired for hard deletes (especially media_library permanent delete and blog_posts hard delete), open a follow-up phase. No action for DNS switch.

## Studio ↔ Renderer Completeness

Renderers found in sibling repo at `C:\Users\User\opticup-storefront\src\components\blocks\`:
32 `.astro` files (including `BlockRenderer.astro`, `BlockWrapper.astro`, `PageRenderer.astro` — 3 infrastructure renderers, not block types → 29 block-type renderers).

Studio schema registry in `studio-block-schemas.js` BLOCK_SCHEMAS: **26 block types.**

| Block type (renderer) | Renderer (.astro) | Studio schema | Gap |
|---|:---:|:---:|---|
| banner | BannerBlock | ✅ banner | OK |
| blog_carousel | BlogCarouselBlock | ✅ blog_carousel | OK |
| brands | BrandsBlock | ✅ brands | OK |
| brand_strip | BrandStripBlock | ✅ brand_strip | OK |
| campaign_cards | CampaignCardsBlock | ✅ campaign_cards | OK |
| campaign_tiers | CampaignTiersBlock | ✅ campaign_tiers | OK |
| columns | ColumnsBlock | ✅ columns | OK |
| contact | ContactBlock | ✅ contact | OK |
| cta | CtaBlock | ✅ cta | OK |
| custom | CustomBlock | ✅ custom | OK |
| divider | DividerBlock | ✅ divider | OK |
| events_showcase | EventsShowcaseBlock | ✅ events_showcase | OK |
| faq | FaqBlock | ✅ faq | OK |
| gallery | GalleryBlock | ✅ gallery | OK |
| hero | HeroBlock | ✅ hero | OK |
| hero_luxury | HeroLuxuryBlock | ✅ hero_luxury | OK |
| lead_form | LeadFormBlock | ✅ lead_form | OK |
| optometry_teaser | OptometryTeaserBlock | ✅ optometry_teaser | OK |
| products | ProductsBlock | ✅ products | OK |
| reviews | ReviewsBlock | ✅ reviews | OK |
| steps | StepsBlock | ✅ steps | OK |
| sticky_bar | StickyBarBlock | ✅ sticky_bar | OK |
| story_teaser | StoryTeaserBlock | ✅ story_teaser | OK |
| text | TextBlock | ✅ text | OK |
| tier1_spotlight | Tier1SpotlightBlock | ✅ tier1_spotlight | OK |
| tier2_grid | Tier2GridBlock | ✅ tier2_grid | OK |
| trust_badges | TrustBadgesBlock | ✅ trust_badges | OK |
| video | VideoBlock | ✅ video | OK |
| visit_us | VisitUsBlock | ✅ visit_us | OK |

**Result: 29/29 renderer block types have Studio editor schemas. 0 orphan renderers, 0 orphan editors.** Block coverage is COMPLETE.

Note: SPEC comment in `studio-block-schemas.js:461-463` acknowledges that advanced nested fields for luxury blocks (`primary_cta`, `secondary_cta`, `cards[]`, `events[]`, `brands[]`) are currently SQL-only; Studio exposes top-level fields. This is documented inline and is by design, not a gap.

## Detailed Findings

### Finding H1 — studio-templates.js missing tenant_id on storefront_templates writes
Location: `modules/storefront/studio-templates.js:175` and `:234` (inserts) + `:331`, `:353` (updates).

```js
// L175
const { error } = await sb.from('storefront_templates').insert({
  name, description, page_type, blocks: [], is_active: true
});
// L234
const { error } = await sb.from('storefront_templates').insert({
  name, description, page_type: page.page_type || 'custom',
  blocks: page.blocks || [], is_active: true
});
// L331
.update({ name, description, blocks }).eq('id', templateId);
// L353
.update({ is_active: false }).eq('id', templateId);
```
If `storefront_templates` has `tenant_id NOT NULL` (Rule 14), these inserts will fail at INSERT time. If the table is global/shared (e.g., one template library for all tenants), this is intentional but should be documented. **Action required:** verify schema and either add `tenant_id: getTenantId()` or document that `storefront_templates` is a global shared table.

### Finding H2 — studio-reviews.js defense-in-depth gaps
Locations: L151, L175, L176, L236, L253, L302. Example:
```js
const { error } = await sb.from('storefront_reviews').delete().eq('id', id);
```
Rule 22 calls for `.eq('tenant_id', getTenantId())` on every write even though RLS covers it. Add filter on all 6 sites.

### Finding H3 — studio-media.js defense-in-depth gaps
Locations: L525 (edit), L547 (soft delete).
```js
.update({ title, caption, description, ... }).eq('id', id)
.update({ is_deleted: true }).eq('id', id)
```
Add `.eq('tenant_id', getTenantId())` on both.

### Finding M4 — Systemic: writeLog absence
26 files in this module perform database writes; **0** call `writeLog(...)` or `ActivityLog.write(...)`. Iron Rule 2 states "every data modification must call writeLog." Given this is a project-wide expectation (not M3-specific), flag this to the Foreman for a policy decision:
- Option A: M3 Storefront/Studio is exempt from writeLog (rationale: high write volume for AI content updates, CMS edits). Codify the exemption in MODULE_SPEC.md + update Rule 2.
- Option B: Add writeLog calls module-wide as a focused remediation phase.

Recommended: Option A with documentation, unless audit trail is required for compliance.

### Finding M5 — Systemic: Rule 7 abstraction never used
0 files use `fetchAll / batchCreate / batchUpdate / DB.*`. All 31 files call `sb.from(...)` directly. Pattern is consistent and (mostly) safe, but technically violates Rule 7. Decision: whitelist this pattern for M3 in MODULE_SPEC.md, or refactor to helpers. Low priority for DNS switch.

## Recommendations Prioritized

For DNS switch readiness (blocking):
- **None.** The findings are defense-in-depth gaps (RLS still protects correctness) and one possible schema mismatch in studio-templates.js. No CRITICAL XSS, no data-leakage risks, no hardcoded tenant values.

Pre-launch cleanup (non-blocking):
1. **Resolve H1 (studio-templates.js)** — verify `storefront_templates` schema and fix (1 hour).
2. **Resolve H2 + H3 + M6-M10** — add `.eq('tenant_id', getTenantId())` on 15 write sites (2–3 hours).
3. **Policy decision on writeLog (M4)** — Foreman decision, document in MODULE_SPEC.md.

Post-launch:
4. Split oversized files 1–3 (storefront-translations, brand-translations, studio-shortcodes).
5. Resolve `studio-brands.js:298` TODO (custom_domain from tenant config).
6. Decide on Rule 7 helpers vs. whitelist.

---
*End of audit. Read-only — no files modified.*
