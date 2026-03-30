# Fix: AI Content Generation Issues

Context: Optic Up — multi-tenant SaaS optical store management.
Two repos:
- **ERP:** OpticaLis/opticup — `C:\Users\User\opticup`
- **Storefront:** OpticaLis/opticup-storefront — `C:\Users\User\opticup-storefront`
Machine: 🖥️ Windows

## ⛔ CRITICAL SAFETY RULES ⛔

1. Both repos on `develop`. Verify before ANY work.
2. SQL files SAVED, never run. Daniel runs manually in Supabase Dashboard.
3. Edge Functions: `/// <reference>` pattern, deploy with `--no-verify-jwt`.
4. NEVER commit `.env` or API keys.
5. **GOLDEN VIEW RULE:** Do NOT touch v_storefront_products view.
6. **REGRESSION CHECK:** After ANY change: images load, products display, WhatsApp visible, booking visible.

## FIRST — Setup:

```bash
cd C:/Users/User/opticup-storefront && git checkout develop && git pull origin develop && git branch
cd C:/Users/User/opticup && git checkout develop && git pull origin develop && git branch
```

Read (in order):
1. `C:\Users\User\opticup-storefront\CLAUDE.md`
2. `C:\Users\User\opticup-storefront\SESSION_CONTEXT.md`
3. `C:\Users\User\opticup\CLAUDE.md`

## Problems to Fix

### 1. AI CONTENT IN WRONG LANGUAGE
The bulk generate created content in Russian instead of Hebrew. The ai_content rows have `language='he'` but the actual text is in Russian.

**Fix:**
- Check `supabase/functions/generate-ai-content/index.ts` — the Claude prompt must explicitly say "Write in Hebrew (עברית)" and "שפה: עברית בלבד"
- Save SQL as `sql/020-fix-ai-content-language.sql` (DO NOT RUN) to delete wrong-language content:
```sql
-- Delete AI content that was generated in wrong language so it can be regenerated
DELETE FROM ai_content WHERE language = 'he' AND content_type IN ('description', 'seo_title', 'seo_description', 'alt_text') AND entity_type = 'product';
-- Also delete any auto-translations that were based on wrong source
DELETE FROM ai_content WHERE language IN ('en', 'ru') AND entity_type = 'product';
```
- Fix the Edge Function prompt, commit, push. Daniel will redeploy.

### 2. BULK GENERATE RUNS ON ALL PRODUCTS (NOT JUST VISIBLE)
The content page shows and generates AI content for ALL ~1000 inventory items. It should only work with products visible on storefront (the ones in `v_storefront_products`).

**Fix in ERP repo:**
- `modules/storefront/storefront-content.js` — change the product query to use `v_storefront_products` view instead of `inventory` table
- This ensures only products that pass visibility filters (brands.default_sync, exclude_website, quantity) get AI content
- Update the product count display accordingly

### 3. DUPLICATE BRANDS IN FILTER
In storefront ERP pages, brand dropdowns show duplicate entries (e.g., "Alexander McQueen" x2, "BALENCIAGA" x2) because same brand has products in different categories (eyeglasses + sunglasses).

**Fix in ERP repo:**
- `modules/storefront/storefront-content.js` — deduplicate brands in filter dropdown
- `modules/storefront/storefront-products.js` — same fix
- Use `DISTINCT brand_name` or deduplicate in JS after fetching

### 4. EDIT POPUP SHOWS WRONG CONTENT
Clicking any column in the content table shows a popup with Russian text for all fields. The popup should show the correct content_type (description/seo_title/seo_description/alt_text) for the column that was clicked.

**Fix in ERP repo:**
- `modules/storefront/storefront-content.js` — fix the click handler to pass the correct content_type
- Popup should show Hebrew content (after fix #1 and regeneration)
- Each column click should open the edit for that specific field

## Steps

1. Read all CLAUDE.md + SESSION_CONTEXT.md files
2. Fix Edge Function prompt (Hebrew language enforcement)
3. Create SQL 020 to clean wrong content (DO NOT RUN)
4. Fix storefront-content.js — use v_storefront_products, deduplicate brands, fix popup
5. Fix storefront-products.js — deduplicate brands
6. Build storefront: `npm run build` → zero errors
7. Commit both repos to develop, push
8. Update SESSION_CONTEXT.md with fixes

## Verify

After fixes:
- [ ] Edge Function prompt explicitly says Hebrew
- [ ] SQL 020 created (not run)
- [ ] Content page queries v_storefront_products (not inventory)
- [ ] Brand filter shows unique names
- [ ] Build succeeds
- [ ] All changes on develop branch

## ⛔ DO NOT merge to main. Daniel reviews first.

## WHEN DONE — Move this prompt:
```bash
move "C:\Users\User\opticup\modules\Module 3 - Storefront\docs\current prompt\PROMPT_FIX_AI_CONTENT.md" "C:\Users\User\opticup\modules\Module 3 - Storefront\docs\old prompts\"
```
