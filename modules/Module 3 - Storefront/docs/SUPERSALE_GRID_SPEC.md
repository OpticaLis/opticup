# SPEC — Supersale Grid Replacement + Comprehensive QA

**Repo:** `opticalis/opticup-storefront` (develop)
**Page:** `/supersale/` (he) — block at index 4
**Author:** Daniel (via Main Strategic Chat)
**Date:** 2026-04-13
**Type:** Content edit (no code changes anticipated) + Full site QA

---

## 0. Success Criteria (the Secondary Chat must match ALL of these)

A run is successful when ALL of the following hold:

1. Block index 4 of `/supersale/` (lang=`he`, tenant=`prizma`) has `type = "campaign_cards"`.
2. The block renders a grid of exactly 12 product cards, in the order listed in Section 4 below.
3. Each card shows the correct brand + model for its barcode, the two-image carousel with Prev/Next arrows, dot indicators, keyboard arrow navigation, touch swipe, and click-to-lightbox.
4. Each card displays the two prices exactly as in Section 4: the original price (red, strikethrough) and the campaign price (black, bold).
5. The title, subtitle, and disclaimer text shown on the page match the existing content verbatim (Section 5).
6. Visual regression: every other section of `/supersale/` (before and after block 4) is pixel-identical to the pre-change state. `pre-sql-check`, `post-sql-verify`, and `full-test` all pass.
7. All 9 QA sweeps in Section 7 pass with zero regressions.

If any one of (1)–(7) fails — STOP, do not commit, report the deviation.

---

## 1. Pre-Change Verification (mandatory — run before any edit)

Before making any change, the Secondary Chat must run these checks and produce the listed artifacts. This is not optional; it is the baseline that the post-change state is compared against.

### 1.1 — Confirm current repo state

```bash
git remote -v         # must show opticalis/opticup-storefront
git branch            # must be on develop
git status            # must be clean; if dirty, apply First Action §4 protocol
git fetch origin && git log origin/develop --oneline -3
```

### 1.2 — Confirm the target block structure (DB)

Run via Supabase MCP `execute_sql`:

```sql
SELECT slug, lang, jsonb_array_length(blocks) AS block_count
FROM storefront_pages
WHERE slug = '/supersale/' AND lang = 'he';
```

Expected: 1 row, `block_count = 12`.

```sql
SELECT ord-1 AS block_index,
       block->>'type' AS block_type,
       length(block->'data'->>'html') AS html_len
FROM storefront_pages,
     LATERAL (SELECT ord, block
              FROM jsonb_array_elements(blocks)
              WITH ORDINALITY AS t(block, ord)) x
WHERE slug='/supersale/' AND lang='he'
ORDER BY block_index;
```

Expected: block index `4` → `type='custom'`, `html_len` around 904.

```sql
SELECT block->'data'->>'html' AS full_html
FROM storefront_pages,
     LATERAL (SELECT block FROM jsonb_array_elements(blocks) WITH ORDINALITY AS t(block, ord) OFFSET 4 LIMIT 1) x
WHERE slug='/supersale/' AND lang='he';
```

Expected: contains the literal shortcode `[products limit="12" columns="4" grid_columns_mobile="2" card_style="campaign"]`.

**If the block index, type, or length does not match — STOP and report. Do not proceed to edit.**

### 1.3 — Confirm the 12 barcodes are all available in `v_storefront_products`

```sql
SELECT barcode, brand_name, model, jsonb_array_length(images::jsonb) AS image_count
FROM v_storefront_products
WHERE barcode IN (
  '0003001','0003561','0003471','0004169','0003514','0003792',
  '0003818','0003555','0003559','0002695','0002698','0004164'
)
AND tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
ORDER BY barcode;
```

Expected: 12 rows, each with `image_count >= 2`.

**If fewer than 12 rows — STOP. Report which barcode is missing. Do not proceed.**

### 1.4 — Capture pre-change visual baseline

With `npm run dev` running at `http://localhost:4321`:

1. Navigate to `/supersale/` (he locale).
2. Take a full-page screenshot. Save as `supersale-pre-he.png` in the Secondary Chat's working folder.
3. Scroll to the grid section (block 4) and take a focused screenshot of just the grid. Save as `grid-pre-he.png`.
4. Record the rendered HTML of the grid section only (`document.querySelector('section:has(h2)')` wrap — use DevTools / `curl http://localhost:4321/supersale/ | grep -A 80 'דגמים ומחירים'`). Save as `grid-pre-he.html`.

These three artifacts are the baseline. Every other section on the page must look identical after the change (items 6 in Success Criteria).

### 1.5 — Backup the page JSON

```sql
-- Read current blocks for manual fallback
SELECT blocks::text FROM storefront_pages WHERE slug='/supersale/' AND lang='he';
```

Save the full JSON to `backups/supersale-he-pre-[timestamp].json` in the working folder. If any step below goes wrong, this is the restore point.

---

## 2. The Change — Replace Block Index 4

### 2.1 — What changes

**Before:** block 4 is `type='custom'` containing a `<section>` with heading, paragraph, a generic `[products ... card_style="campaign"]` shortcode, and a disclaimer paragraph.

**After:** block 4 is `type='campaign_cards'` containing 12 explicit products with explicit prices, plus `title`, `subtitle`, and `disclaimer_text` carried over verbatim from the old HTML.

### 2.2 — Why this is a pure JSON edit (no code changes)

The component `CampaignCardsBlock.astro` already exists and handles: two-image carousel with Prev/Next arrows, dot indicators, keyboard arrow keys, touch swipe, click-to-lightbox (shared `CampaignLightbox.astro`), red strikethrough original price + black bold campaign price, RTL-safe layout.

No source file in `src/` is modified. The edit is a single `UPDATE storefront_pages` SQL statement.

### 2.3 — Preserve visual parity

`CampaignCardsBlock.astro` renders a CTA button per card (`cta_text`, `cta_action`). **The existing grid does NOT have a CTA button per card.** To preserve the "looks exactly the same, just with the specific products" requirement (Daniel's explicit instruction), the CTA button must be suppressed for this block.

**Execute this check before writing the migration:**

```bash
grep -n "cta_text\|ctaText" src/components/campaign/CampaignCard.astro \
  src/components/blocks/CampaignCardsBlock.astro
```

If `cta_text` is a required field and the CTA button cannot be hidden via data alone, STOP and report. The options are:
  (a) add a `hide_cta: boolean` field to `CampaignCardsData` and honor it in `CampaignCard.astro`, OR
  (b) keep the old shortcode and instead extend the shortcode to accept an explicit `barcodes` list.

Do not choose — report back and wait.

### 2.4 — If CTA can be suppressed: the block payload

Use this exact JSON for the new block 4. The `products` array order determines the grid order.

```json
{
  "type": "campaign_cards",
  "data": {
    "title": "דגמים ומחירים מאירועים קודמים:",
    "subtitle": "לפעמים תמונה אחת שווה אלף מילים - אבל פה, התמונות מראות חיסכון של מאות שקלים 🔥",
    "columns_desktop": 4,
    "columns_mobile": 2,
    "theme": "light",
    "disclaimer_text": "*המחיר המחוק משקף מחיר מומלץ לצרכן או מחיר מקובל ברשתות יבואן רשמי, ואינו בהכרח מחיר שנגבה על ידי אופטיקה פריזמה.\n*התמונות להמחשה בלבד. רשימת המותגים והמחירים העדכנית זמינה לאחר ההרשמה.",
    "cta_text": "",
    "cta_action": "link",
    "cta_link": "#",
    "products": [
      { "barcode": "0003001", "original_price": 1650, "campaign_price": 790 },
      { "barcode": "0003561", "original_price": 1550, "campaign_price": 790 },
      { "barcode": "0003471", "original_price": 1450, "campaign_price": 790 },
      { "barcode": "0004169", "original_price": 1350, "campaign_price": 790 },
      { "barcode": "0003514", "original_price": 1500, "campaign_price": 790 },
      { "barcode": "0003792", "original_price": 1500, "campaign_price": 790 },
      { "barcode": "0003818", "original_price": 1200, "campaign_price": 790 },
      { "barcode": "0003555", "original_price": 1250, "campaign_price": 790 },
      { "barcode": "0003559", "original_price": 1350, "campaign_price": 790 },
      { "barcode": "0002695", "original_price": 1300, "campaign_price": 790 },
      { "barcode": "0002698", "original_price": 1250, "campaign_price": 790 },
      { "barcode": "0004164", "original_price": 1350, "campaign_price": 790 }
    ]
  }
}
```

### 2.5 — Update statement

Run via Supabase MCP `execute_sql`:

```sql
UPDATE storefront_pages
SET blocks = jsonb_set(
  blocks,
  '{4}',
  '<JSON PAYLOAD FROM 2.4 ABOVE>'::jsonb,
  false
),
updated_at = now()
WHERE slug = '/supersale/' AND lang = 'he'
RETURNING slug, lang, jsonb_array_length(blocks), blocks->4->>'type' AS new_block_4_type;
```

Expected return: 1 row, `jsonb_array_length = 12`, `new_block_4_type = 'campaign_cards'`.

### 2.6 — Storefront Rule 29 check

This edit does NOT modify any View. It only updates a row in `storefront_pages`. No `pre-sql-check.mjs` is needed because that script targets View-modifying SQL. Run `post-sql-verify.mjs` anyway as a defense-in-depth check — it should pass unchanged.

---

## 3. Self-Verification Before Moving to QA (MANDATORY)

After the UPDATE completes, the Secondary Chat must verify every one of these on its own before declaring success. These are non-negotiable.

1. **DB state:**
   ```sql
   SELECT jsonb_array_length(blocks->4->'data'->'products') AS product_count,
          blocks->4->>'type' AS block_type
   FROM storefront_pages WHERE slug='/supersale/' AND lang='he';
   ```
   Expected: `product_count=12`, `block_type='campaign_cards'`.

2. **Visual — grid:** Navigate to `/supersale/` in the running dev server. Take `grid-post-he.png`. The grid must show exactly 12 cards, in the order listed in Section 4, with the correct brand + model for each barcode.

3. **Visual — rest of page:** Take `supersale-post-he.png`. Compare side-by-side with `supersale-pre-he.png`. Every section OTHER than the grid must be identical. The grid itself is the only thing that should look different — new products, correct prices.

4. **Carousel — per card:**
   - Hover over card #1. Prev/Next arrows appear.
   - Click the Next arrow. Image changes to the second image. Dot indicator moves.
   - Click the Prev arrow. Image returns to first. Dot indicator moves back.
   - Press ArrowLeft / ArrowRight on the keyboard. (RTL-aware: left = next, right = previous.) Verify image changes.
   - On mobile emulation (DevTools → 375px width), swipe left on the card. Image advances.
   - Click the image itself. Lightbox opens showing the same image. Lightbox Prev/Next arrows work. Esc closes.
   - Repeat on 2 other randomly-picked cards (e.g. #5, #12) — same behavior.

5. **Prices:**
   - Card for `0003001` — original price shows ₪1,650 red strikethrough, campaign price ₪790 black bold.
   - Card for `0003818` — original price shows ₪1,200 red strikethrough, campaign price ₪790 black bold.
   - Card for `0002695` — original price shows ₪1,300 red strikethrough, campaign price ₪790 black bold.
   - Spot-check 2 more cards — all must match Section 4.

6. **No CTA button:** no "בקש הצעה ב-WhatsApp" or equivalent CTA button under any card. If one exists, STOP — the payload's `cta_text: ""` did not suppress it; apply the Section 2.3 fallback.

7. **RTL sanity:** page direction is RTL. Arrows are positioned correctly (Prev on the right side physically, Next on the left — matching the existing `CampaignCard.astro` logic). Text flows right-to-left.

8. **Network sanity:** DevTools Network tab — no 4xx/5xx for any image in the grid. Every image URL starts with `/api/image/...` (per Iron Rule 25 — image proxy mandatory).

9. **Console sanity:** DevTools Console is empty. No errors, no warnings, no 404s logged.

10. **Build:**
    ```bash
    npm run build
    ```
    Must exit 0, no TypeScript errors, no broken imports.

If ANY of 1–10 fails, do NOT proceed to QA. Roll back using Section 1.5 backup, report the failure.

---

## 4. Canonical Product List (source of truth for the grid)

Order matters — this is the order cards must appear in the grid, left-to-right, top-to-bottom (in RTL: right-to-left, top-to-bottom).

| # | Barcode  | Original price (red ₪) | Campaign price (black ₪) |
|---|----------|------------------------|---------------------------|
| 1 | 0003001  | 1,650                  | 790                       |
| 2 | 0003561  | 1,550                  | 790                       |
| 3 | 0003471  | 1,450                  | 790                       |
| 4 | 0004169  | 1,350                  | 790                       |
| 5 | 0003514  | 1,500                  | 790                       |
| 6 | 0003792  | 1,500                  | 790                       |
| 7 | 0003818  | 1,200                  | 790                       |
| 8 | 0003555  | 1,250                  | 790                       |
| 9 | 0003559  | 1,350                  | 790                       |
| 10| 0002695  | 1,300                  | 790                       |
| 11| 0002698  | 1,250                  | 790                       |
| 12| 0004164  | 1,350                  | 790                       |

---

## 5. Preserved Text (must appear verbatim in the rendered block)

- **Title (H2):** `דגמים ומחירים מאירועים קודמים:`
- **Subtitle (paragraph):** `לפעמים תמונה אחת שווה אלף מילים - אבל פה, התמונות מראות חיסכון של מאות שקלים 🔥`
- **Disclaimer (below grid):** `*המחיר המחוק משקף מחיר מומלץ לצרכן או מחיר מקובל ברשתות יבואן רשמי, ואינו בהכרח מחיר שנגבה על ידי אופטיקה פריזמה.` + line break + `*התמונות להמחשה בלבד. רשימת המותגים והמחירים העדכנית זמינה לאחר ההרשמה.`

If the rendered disclaimer does not include both lines, or replaces them with a single run-on sentence, STOP. The `CampaignCardsBlock` disclaimer field may not preserve line breaks — in that case, verify the output visually and decide whether a one-line disclaimer is acceptable, or whether a different rendering path is needed.

---

## 6. Rollback Plan

If any self-verification step (Section 3) fails and cannot be fixed in place:

```sql
UPDATE storefront_pages
SET blocks = '<ORIGINAL_JSON_FROM_SECTION_1.5>'::jsonb,
    updated_at = now()
WHERE slug = '/supersale/' AND lang = 'he';
```

Confirm:

```sql
SELECT blocks->4->>'type' FROM storefront_pages WHERE slug='/supersale/' AND lang='he';
-- Must return 'custom'
```

Do not commit any Git changes if rollback was needed. Report the exact failure and wait for instructions.

---

## 7. Full-Site QA Sweep (runs ONLY after Section 3 verifications pass)

Every sweep below must be executed. Report findings as `✅ PASS` / `⚠ ISSUE — <detail>` / `❌ FAIL — <detail>`. Per Guardian Rule 23b: every `FAIL` finding must be backed by a concrete artifact (screenshot, URL, console error, DB row). No inferences.

### Sweep 1 — `/supersale/` end-to-end (he / en / ru)

For each locale:
- Page loads with 200 status.
- All 12 blocks render (no empty slots, no `<!-- products: none found -->` comments).
- Hero video autoplays (muted).
- Sticky bar appears on scroll and stays within viewport.
- Sticky CTA button opens the correct action (WhatsApp / form popup).
- YouTube iframe loads (no CSP block).
- Footer renders with correct tenant info (name, address, phone).
- For `he` only: the new `campaign_cards` grid works as in Section 3.4.
- For `en` / `ru`: confirm block 4 still renders the OLD shortcode (we did NOT update en/ru) — that is expected and correct.

### Sweep 2 — Homepage, category pages, brand pages

- `/` — hero + featured sections render, no console errors, all images load.
- `/en/`, `/ru/` — same.
- 3 random brand pages (e.g. `/brands/prada`, `/brands/versace`, `/brands/dolce-gabbana`) — products render, carousel works on product cards, SEO meta present.
- 3 random category pages (e.g. `/category/sunglasses`, `/category/optical`, `/category/multifocal`) — products render, filters work.

### Sweep 3 — Campaign pages beyond supersale

- `/premiummultisale/` (he/en/ru)
- `/multisale-brands-cat/` (he)
- `/multisale-brands-cat2/` (he)
- `/multi/` (he/en/ru)
- `/multifocal-guide/` (he/en/ru)
- `/successfulsupersale/` (he/en/ru)
- `/successfulmulti/` (he)

For each: page loads, all blocks render, no console errors, lead form (if present) accepts submission to the correct endpoint.

### Sweep 4 — Redirects & SEO

- From the 1,606-redirect file `vercel.json`, spot-check 10 random redirect entries. For each: `curl -sI <old-url>` must return 301/308, `Location` must match the configured `destination`.
- Confirm `/sitemap.xml` loads and includes `/supersale/`, `/premiummultisale/`, `/multi/`, `/multifocal-guide/` entries.
- `/robots.txt` loads and points to the sitemap.
- View-source of `/supersale/` (he): `<title>`, `<meta name="description">`, `<meta property="og:image">`, `<link rel="canonical">` — all present and non-empty.

### Sweep 5 — Lead forms

- Open `/supersale/` → scroll to any lead form or click CTA → popup opens.
- Submit with a test name + phone number (use `0500000000` or similar). Confirm success state appears.
- Verify a row was inserted into `pending_sales` (or the relevant lead table) via SQL — confirm `tenant_id` matches prizma's UUID (defense-in-depth per Rule 22).

### Sweep 6 — Image proxy + Storage (Iron Rule 25)

- `curl -sI https://opticup-storefront.vercel.app/api/image/media/some-known-path.webp` — must return 200, content-type `image/*`.
- In DevTools → Network, every image src on `/supersale/` starts with `/api/image/`. Zero direct `supabase.co/storage/...` URLs.

### Sweep 7 — Mobile

- Chrome DevTools → Responsive → iPhone 12 (390×844).
- `/supersale/` — grid switches to 2 columns. Cards render correctly. Touch swipe on the carousel works. Sticky bar does not overlap content.
- `/` — hamburger / mobile nav works.
- Typography is readable (no text < 14px body). No horizontal scroll.

### Sweep 8 — Accessibility quick check

- Tab through a brand page or category page — focus indicators are visible.
- Every `<img>` has non-empty `alt`.
- Every button has either visible text or `aria-label`.
- Carousel arrows have `aria-label="Next image"` / `"Previous image"` (confirmed in source already).

### Sweep 9 — Safety-net scripts

Run from the storefront repo root:

```bash
node scripts/full-test.mjs --no-build
node scripts/post-sql-verify.mjs
node scripts/smoke-test.mjs
```

All three must exit 0. Any warning must be investigated before commit.

---

## 8. Commit Protocol (only if Sections 3 + 7 all pass)

This edit is a DB-only change. There is nothing in the file system to commit. BUT the Secondary Chat must document the change in the repo so it is traceable — per Rule 21 (No Orphans).

1. Add an entry to `docs/CHANGELOG.md` (or create if absent) under today's date:
   ```
   ## 2026-04-13 — /supersale/ grid replaced (he)
   - Replaced custom HTML shortcode block with typed `campaign_cards` block.
   - 12 explicit barcodes with per-item original + campaign prices (790 flat campaign, 1200–1650 originals).
   - No source code changed. No views changed. DB-only edit.
   - Rollback JSON saved in `backups/supersale-he-pre-<timestamp>.json`.
   ```

2. Commit:
   ```bash
   git add docs/CHANGELOG.md
   git commit -m "docs(supersale): document /supersale/ grid content swap to campaign_cards block"
   git push origin develop
   ```

3. Do NOT merge to main. Do NOT deploy. Only Daniel authorizes main merges (Rule 7).

---

## 9. Final Report Format

The Secondary Chat should end with exactly this structure:

```
STATUS: [SUCCESS | PARTIAL | FAILED]

1. Pre-change verification:  ✅ / ❌
2. Edit applied:             ✅ / ❌
3. Self-verification (§3):   10/10 ✅  or  N/10 — list failures
4. QA sweeps (§7):           9/9 ✅  or list failures
5. Commit:                   <hash>  or  SKIPPED (reason)

Artifacts:
- backups/supersale-he-pre-<ts>.json
- supersale-pre-he.png, supersale-post-he.png
- grid-pre-he.png, grid-post-he.png
- full-test.mjs output: <path>
- post-sql-verify.mjs output: <path>

Issues found (severity + evidence):
- [NONE] or itemized list per Guardian Rule 23b

Next action for Daniel:
- None / Review QA findings / Approve main merge
```

---

## 10. Guardian Compliance Summary (Rule 23b)

Every verification step in this SPEC is tied to a concrete artifact:

| Claim | Verification Mechanism |
|---|---|
| "Block 4 is custom and matches expected shape" | Supabase SQL query (Section 1.2) |
| "12 barcodes exist with ≥2 images" | Supabase SQL query (Section 1.3) |
| "Pre-change page looked like X" | Screenshots (Section 1.4) |
| "Post-change page looks like Y except grid" | Screenshot diff (Section 3.3) |
| "Prices render correctly" | Spot-check 5 cards against Section 4 table (Section 3.5) |
| "Carousel works" | Manual navigation test + keyboard + swipe + lightbox (Section 3.4) |
| "No CTA button" | Visual inspection (Section 3.6) |
| "Build passes" | `npm run build` exit 0 (Section 3.10) |
| "All sweeps pass" | Each sweep item has an explicit PASS/FAIL marker (Section 7) |

No CRITICAL or HIGH claim in this SPEC is made without a corresponding verification step. No finding in the final report may be marked CRITICAL/HIGH without the evidence line that backs it.

---

*End of SPEC.*
