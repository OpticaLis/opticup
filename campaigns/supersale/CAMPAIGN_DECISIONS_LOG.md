# SuperSale Campaign — Decisions Log

> **Purpose:** Living memory for the SuperSale campaign. Architect reads this on every SuperSale-related session.
> **Append-only.** Never delete an entry — supersede with a new one if needed.
> **Read priority:** Read this file BEFORE making any SuperSale recommendation, regardless of what other files say.

---

## How to use this file

- **Reading:** When user mentions "supersale" / "סופרסייל" / catalog page / takanon / commitment / fashion houses → read ALL entries below first.
- **Writing:** After every meaningful decision in a SuperSale session, append a new dated entry. Include: situation, decision, reason, and what NOT to repeat.
- **Architect bootstrap addition:** When the user says "אתה הארכיטקט" AND the session opens with any SuperSale context, also read this file as part of Step 4 (CLAUDE.md skim).

---

## Campaign Identity — The North Star

**The SuperSale is a high-margin event sale that lives in two universes simultaneously:**

1. **The customer's mental model:** "Optical-frame discounts at curated event evenings, with a price commitment + 14-day guarantee + free-glasses fallback."
2. **The operational model:** A registration funnel where leads must opt-in via SMS/WhatsApp, get a personal barcode (coupon), and only then buy at the event price. Walk-ins do NOT get event prices.

**The funnel:**
1. Lead source (Monday legacy / new lead form / WhatsApp / Instagram)
2. SMS broadcast when event opens
3. Lead clicks short-link → `/event-register/` form
4. Form submit creates `crm_event_attendees` row
5. Personal coupon (barcode) sent before event
6. Customer arrives, presents barcode, purchases at event price

**Conversion data (last event #24, captured 2026-05-19):**
- 88% of leads come from `monday_legacy` source — CTR 0.55% (cold pool).
- 12% come from `shortcode_lead_form` — CTR 5.0% (warm pool).
- `/event-register/` form: 95% drop-off (254 opened, 13 submitted).
- 50 ₪ deposit step: 100% drop-off in event #24 (BUT — the deposit was intentionally not collected for event #24; this is not a bug, this is a closed-event artifact).

---

## Brand Tiers (locked 2026-05-19)

**4-tier price grid on the catalog page (`/supersalepricescatalog/`):**

- **Tier 1 — קטגוריה 1 (400 ₪):** Michael Kors · Ray-Ban · Emporio Armani · Oakley · Vogue (5 brands)
- **Tier 2 — קטגוריה 2 (690 ₪):** Versace · Burberry · Dolce & Gabbana · Swarovski · Jimmy Choo (5 brands)
- **Tier 3 — PREMIUM (890 ₪):** Prada · Miu Miu · Tiffany & Co (3 brands)
- **Tier 4 — ICONIC (no public price):** Gucci · Dior · Saint Laurent · Fendi · Balenciaga · Valentino · Chloé · Celine · Stella McCartney (9 brands)

**Critical understanding of Tier 4:** These brands have a uniform event price, EXACTLY like Tiers 1-3. The only difference: Prizma is not authorized by the distributors to publish their prices online. The customer experiences Tier 4 as just another regular price tier — the no-price display is a publishing constraint, NOT a different commercial mechanism. **NEVER suggest UI/copy/takanon language that implies Tier 4 customers get a "different mechanism" (personal quote process, custom comparison, etc.) unless the user explicitly says so.**

**Boutique Club (separate block, OUTSIDE the price commitment):**
- Cazal · John Dalia · KameManNen · Matsuda · Masunaga · Hublot · Fred (7 brands)

These are Japanese/European ultra-luxury maisons sold in Israel through exclusive distribution channels that don't permit reasonable cross-retailer SKU comparison. They are advertised on the catalog page as "Boutique Club" with the subtitle "הצעות בלעדיות לנרשמי האירוע על קולקציות בוטיק נבחרות". The takanon §5.7.ד explicitly excludes them from the price commitment.

---

## Hard Constraints — Brand Publishing

**Cannot publish prices for these brands (distributor constraint):**

Fashion Houses (10): Gucci, Dior, Saint Laurent, Fendi, Balenciaga, Valentino, Chloé, Jimmy Choo, Celine, Stella McCartney
Japanese/European Luxury (7): Cazal, John Dalia, KameManNen, Matsuda, Masunaga, Hublot, Fred

**Exception:** Jimmy Choo MOVED to Tier 2 (690 ₪) on 2026-05-19. Apparently the constraint loosened or Daniel got authorization — this is the live state. Going forward, treat Jimmy Choo as a Tier 2 brand with a publicly displayed price.

**This is a hard legal/commercial limit, NOT a design preference.** Publishing a price for any of the other 16 restricted brands would expose Prizma to distributor sanctions and possible loss of distribution rights.

---

## Price Commitment — Legal Architecture (locked 2026-05-19)

**Public-facing promise:**
> "התחייבות למחיר הזול בישראל*" — appears as a gold link badge at the bottom of all 4 catalog tiles.

**Backing in takanon §5 (`/supersale-takanon/`):**
- §5.1 — eligibility (registered customers only).
- §5.2 — in-event redemption only.
- §5.3 — "מנגנון שוברים את המחיר או מקבלים חינם" (match the price OR get the glasses free, company's choice).
- §5.4 — competing product conditions (identical SKU, brand-new, official importer, in-stock).
- §5.5 — competing retailer conditions (≥2 physical branches in mainland Israel, authorized distributor, no Eilat).
- §5.6 — package and bundle comparison rules.
- §5.7 — exclusions:
  - §5.7.א — extreme errors (loss-leader / price typos).
  - §5.7.ב — closed-club sales.
  - §5.7.ג — personal coupons.
  - **§5.7.ד — WHITELIST (added 2026-05-19):** Commitment applies ONLY to the 22 brands explicitly named across Tiers 1-4. Examples of brands NOT covered: the 7 Boutique Club brands (named by example). Company reserves right to update the list — updates are forward-only, never retroactive.
  - §5.7.ה — (added 2026-05-19): Tier 4 special handling — written, signed, dated quote-vs-quote comparison since prices aren't publicly displayed.
- §5.8 — claim process (14-day post-purchase refund of price difference).
- §5.9 — benefit-recovery on transaction cancellation.

**Legal gap status (as of 2026-05-19):**
- ✅ Takanon covers all 22 whitelisted brands.
- ✅ Tier 4 has explicit mechanism (§5.7.ה).
- ✅ Catalog page bottom block ("המותגים הכלולים בהתחייבות") publicly discloses the 22-brand whitelist (חוק הגנת הצרכן §4 — disclosure duty).
- ⚠️ Per-tile badge text still says "התחייבות למחיר הזול בישראל*" — NOT yet "למותגים נבחרים". Gap 3, optional but recommended.
- ⚠️ Whole package NOT yet reviewed by a real Israeli consumer-protection attorney. **Mandatory before merge to main.**

---

## Critical Patterns (mistakes made in this session — DO NOT repeat)

### Pattern A — "Verify don't assume" (2026-05-19 lesson)

When user mentions a constraint (e.g., "we can't publish prices for X brand"), do NOT extrapolate that constraint into a different commercial mechanism (different pricing, different commitment, different funnel). Ask: "Is this purely a publishing/marketing constraint, or does it actually change how the customer experiences the product?" In SuperSale's case, Tier 4 has the same event price as the others — only the publication is restricted.

### Pattern B — "Surgical takanon edits over full rewrites" (2026-05-19 lesson)

When a legal team or AI agent proposes replacing whole sections of a takanon, FIRST check what the existing sections actually do. A takanon has load-bearing mechanisms (the Challenge, the 14-day guarantee, the free-glasses fallback) that may not appear in a generic legal template. Replace ONLY what needs replacing (in this case: just §5.7.ד + adding §5.7.ה). Preserve everything else.

### Pattern C — "Mistake: silent assumption that 'no public price' = 'different process'" (2026-05-19)

Multiple times in this session I proposed UI/copy that implied Tier 4 customers go through "personal quote comparison" or "in-store pricing process". Daniel corrected — Tier 4 brands have a uniform event price; it's the same mechanism as Tiers 1-3, just without public display. The copy/UI must read as "another category of event-price brands", not "a custom-priced VIP option".

### Pattern D — "Legacy mechanisms (the Challenge / 14-day guarantee) are load-bearing" (2026-05-19)

The takanon's §5 contains specific mechanisms that the `/supersale/` landing page references directly:
- Hero promise: "ננצח את ההצעה או שתקבלו את המשקפיים חינם!"
- Guarantee card: "14 ימי ביטחון"
- Guarantee card: "100% מקוריות"

Any takanon edit MUST preserve these. The page-takanon contract is live and customer-facing.

### Pattern E — "MCP-direct DB updates are valid for catalog micro-iterations" (2026-05-19)

For small catalog adjustments (text tweaks, class additions, single-block edits), updating the `storefront_pages` row directly via Supabase MCP is faster and safer than writing a `UPDATE-supersalepricescatalog-vN.sql` file. Trade-off: NO repo-level traceability. **Rule:** For substantive changes (block additions, structural changes, multi-block edits) — use a SQL migration file. For 1-line text edits or class toggles during an Architect-led design session — direct MCP is acceptable. Always document in this log.

### Pattern F — "Add a 'legal compliance' check before micro-text changes" (2026-05-19)

User changed "מותגי היוקרה היפנית והאירופאית — מחירים אישיים, אינם כלולים בהתחייבות המחיר" to "הצעות בלעדיות לנרשמי האירוע על קולקציות בוטיק נבחרות". This is a marketing improvement but REMOVES the explicit "not in commitment" disclosure from the boutique block. The exclusion still exists in:
- Takanon §5.7.ד (legal source)
- Catalog page bottom block ("המותגים הכלולים בהתחייבות" — only the 22 whitelisted)

This is still legally defensible (the disclosure exists, just not co-located with the boutique block), but it raised the bar for the attorney review. **Going forward:** when user requests a UI text change that removes a legal disclosure, FLAG IT explicitly and reaffirm that the disclosure still exists elsewhere on the page.

---

## Decision Entries (append-only, newest at top)

### 2026-05-19 — Session: Catalog page V1-V3 + ICONIC tile + Bottom whitelist disclosure

**What happened:** Full-day session refining the catalog page (`/supersalepricescatalog/`) and the takanon. Started with hypothesis "tile 4 = 1,050 ₪ is the problem"; investigation surfaced the real bottleneck (event-register form 95% drop-off, cold lead pool 88% from Monday legacy). User chose to ship catalog refinements anyway as a baseline improvement before tackling the bigger funnel issues.

**Outcomes:**
1. Tile 4 redesigned: removed price, added Hebrew title "עוד מותגים נבחרים:", 9 fashion-house brand names, ICONIC badge (Premium-equivalent visual weight).
2. Jimmy Choo moved Tier 4 → Tier 2 (690 ₪).
3. Capacity block rewritten: removed the "50" number, removed red, gold-on-charcoal luxurious treatment.
4. Boutique block: removed English eyebrow (✦ THE BOUTIQUE CIRCLE ✦), 7 luxury brands only, new subtitle "הצעות בלעדיות לנרשמי האירוע על קולקציות בוטיק נבחרות".
5. PRIZMA PROMISE central block removed.
6. Per-tile commitment badges added to all 4 tiles (gold links to takanon).
7. Bottom whitelist disclosure block added ("המותגים הכלולים בהתחייבות" — 22 brands in sequence).
8. Takanon §5.7.ד: blacklist → whitelist (22 brands explicitly).
9. Takanon §5.7.ה (new): Tier 4 special handling.
10. Takanon date stamp: 21.2.2026 → 19.5.2026.

**What was NOT done:**
- Per-tile badge text NOT changed to "למותגים נבחרים" (Gap 3 still open).
- Attorney review NOT scheduled (mandatory before merge to main).
- EN/RU language rows NOT updated (deferred per V3 RECOMMENDATIONS §R-5).

**Live state of catalog page:** `storefront_pages` row `2a02a75f-a773-4b33-a9eb-23207f36fed0`, last updated 2026-05-19 ~19:40 UTC, blocks size ~29.2 KB.

**Live state of takanon:** `src/pages/supersale-takanon/index.astro`, 165 lines, edited inline via Edit tool (NOT a CMS row).

**Lessons captured:** Patterns A through F above.

---

### 2026-05-21/22 — Session: Catalog badges + ICONIC tile + event-register Quiet Gold redesign + ghost-page hunt

**What happened:** Continuation session. Refined the catalog further, redesigned the event-register form, and chased a "won't-die" archived page through 4 layers. Several deploy/state mishaps surfaced systemic lessons (G–J below).

**Catalog refinements (live via DB MCP):**
1. Per-tile commitment badge text → "התחייבות למחיר הזול בישראל* / *למותגים נבחרים | בכפוף לתקנון" (closes Gap 3 — the §F.2 legal recommendation).
2. Bottom whitelist block simplified: positive framing only ("ההתחייבות בתוקף על המותגים הבאים:") + 22 brands in ONE sequential row (no tier breakdown, no negative "אינה חלה" line). Daniel's directive — shorter + sounds better.
3. Tile 4 ("עוד מותגים נבחרים:") got ICONIC badge + full Premium visual treatment (gold pill, gold border) — matched to PREMIUM tile weight. Title raised to align with the "890" of the neighboring tile.
4. Boutique block subtitle → "הצעות בלעדיות לנרשמי האירוע על קולקציות בוטיק נבחרות" (replaced the "אינם כלולים בהתחייבות" disclosure — still legally covered by the takanon + bottom whitelist block).

**Tier 4 understanding REINFORCED (Pattern C restated):** Daniel corrected me AGAIN — Tier 4 brands have a uniform event price like all tiers; the ONLY constraint is they can't publish the price online (distributor restriction). NOT a different mechanism. Copy must read "another category of event-price brands", never "custom/personal pricing". This is now Pattern C in this log AND P40 in the architect skill.

**event-register form (`/event-register/`):** redesigned to Quiet Gold (Sketch 2, approved via HTML sketch file). Style-only, zero functional change — all 5 eye-exam options, char counter, radios, submit payload preserved. Verified with a real demo submit (row landed in crm_event_attendees). Merged to main (PR #26). Hash changed Ux40ZUy3 → BuznZ3Wn.

**Ghost-page saga (`/supersale-models-prices/`):** Daniel archived it via Studio but it stayed live. Root cause was found in LAYERS, fixed across multiple commits:
- Layer 1: duplicate `he` DB row (one archived, one published-seed) — fixed.
- Layer 2: the `v_storefront_pages` VIEW filtered only `status='published'` and IGNORED `is_deleted` — soft-deleted pages leaked live. Fixed (commit 90a98fe, PR — added `AND is_deleted=false`). This was a real infrastructure bug affecting EVERY soft-deleted page.
- Layer 3: a WordPress-scrape entry in `scripts/seo/output/landing-pages-content.json` (loaded by `src/data/landing-pages.ts` as the 3rd-tier fallback in `[...slug].astro`). Studio archival only kills the DB row; this JSON shadow kept serving old WP content. Fixed (commit f1b9466, PR #27).

**Systemic finding (open follow-up):** any page archived via Studio that ALSO has a JSON shadow in `landing-pages-content.json` is a potential ghost. Recommended SPEC: cross-reference slugs between the JSON and `storefront_pages`, flag remaining ghosts. NOT yet built.

**GDPR finding (open, separate, ERP repo — CRITICAL):** an unrelated Suppression-List Pipeline run surfaced that `fb-capi-dispatch` EF sends opt-out contacts to Meta — it doesn't check suppression/unsubscribed_at/marketing_consent, only tenant_id. Recommended SPEC `M4_FB_CAPI_SUPPRESSION_GATE`. This is the ERP repo, not storefront — flagged here so it isn't lost.

---

## Critical Patterns — continued (G–J, added 2026-05-22)

### Pattern G — Cowork is UNRELIABLE for live state (git, files, web). Always verify against the real source.

In ONE day, Cowork's FUSE mount / cache gave THREE false readings:
1. Reported 1,361 null bytes in event-register .astro that did NOT exist in git (FUSE phantom — the Brief's whole null-byte premise was wrong).
2. Showed a local commit (c86ee0c) as if it were on origin/develop — it was never pushed.
3. WebFetch from Cowork returned a CACHED copy of `/supersale-models-prices/` showing it "still live" after it had actually come down for Daniel.

**The rule:** before diagnosing any deploy/state problem, verify against the AUTHORITATIVE source — Vercel MCP (`list_deployments`, `get_deployment`) for deploy state, GitHub compare for branch state, Supabase MCP for DB state. NEVER trust Cowork's git mount or web cache for "is it live?" questions. Daniel's own eyes on the real domain beat my Cowork WebFetch.

### Pattern H — commit ≠ push. Every Brief to Claude Code must end with "push + verify deployment started".

TWICE today a Claude Code Pipeline reported "committed" and I (and Daniel) assumed it was live — but the commit sat unpushed on the desktop. The GitHub compare was empty and no Vercel deploy fired. Caught only when Daniel said "there's nothing to merge".

**The rule:** every Brief / Activation Prompt for Claude Code MUST include an explicit final step: "git push origin develop, then verify via Vercel that a NEW deployment started and reached READY, and that the GitHub compare shows the commit." A commit that isn't pushed + deployed is invisible. Don't treat "committed" as done.

### Pattern I — A "deleted" page can live in multiple independent layers. Hunt ALL of them.

The models-prices page lived in 4 layers simultaneously: DB row, the view's missing is_deleted filter, the JSON shadow, and CDN cache. Fixing one layer revealed the next ("whack-a-mole"). 

**The rule:** when something "deleted" is still live, do NOT assume the first source you find is the only one. Enumerate every layer that can serve content for that route: (1) the table row, (2) the view's WHERE clause, (3) any fallback data source (JSON, landing-pages, blog), (4) static build output / dist, (5) CDN/edge cache. Check them ALL before declaring victory. The SSR fallback chain in `[...slug].astro` (CMS → blog → landing-pages) is the map of where to look.

### Pattern J — Studio "archive" only kills the DB row, not the JSON shadow.

Daniel's mental model: "I archived it in Studio, so it's gone." Reality: Studio archival sets the DB row to archived, but legacy WordPress-scrape content in `landing-pages-content.json` is a SEPARATE source that keeps serving. This is a known structural gap until the JSON shadows are cleaned out.

**The rule:** when Daniel says "I already deleted/archived that page", do NOT assume it's fully gone. Verify the route is actually 404 on the real domain, and if it's still live, check the JSON shadow layer (Pattern I). Until the systemic ghost-audit SPEC runs, treat every "I archived it via Studio" as "the DB row is archived; other layers may still serve it."

---

*End of Decisions Log. Architect: read this file at the start of every SuperSale-related session.*
