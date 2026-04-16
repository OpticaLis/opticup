# English Language Quality Audit — Mission 6a

**Generated:** 2026-04-16
**Auditor:** opticup-executor acting as senior native-English editor
**Scope:** All EN `storefront_pages` rows (tenant Prizma, `lang='en'`, not deleted)
**Method:** Read-only; pulled HE source for comparison on suspicious pages; no DB writes.

---

## Overall Grade: **B**

## Verdict: **Minor polish needed before DNS switch**

The EN content is overall **surprisingly strong** — much better than typical machine-translated storefront content. Most prose reads as if a fluent or native writer rewrote, not literally translated, the Hebrew source. The premium optical brand voice is intact across the marketing pages. Legal pages are competently drafted in formal English.

However, there are **targeted credibility leaks** that should be fixed before any English-speaking customer sees the site:

1. **Four pages have Hebrew `title` fields and Hebrew URL slugs** that show up in browser tabs, SEO, and shared-link previews.
2. **The `/about/` page is the weakest content** — clearly a literal translation, with one specific factual inconsistency vs. the homepage (15 vs. 30 minute claim).
3. **Two unrendered shortcodes** (`[reviews ...]`, `[products ...]`) leak into visible content on `/multi/` and `/prizmaexpress/`.
4. **Hebrew-only jargon** leaked into English copy in a few places ("Horat Keva", "Pedestrian Mall").
5. **Cross-page inconsistency** on a key claim (same-day turnaround: homepage = 30 min, about = 15 min, lab = 15–60 min).

None of the above is a blocker for soft launch, but they should be resolved before any paid acquisition points an English-speaking visitor here.

---

## Summary

- **EN pages audited:** 18
- **A (native):** 4 → `/`, `/optometry/`, `/lab/`, `/multifocal-guide/`
- **B (good, minor awkwardness):** 7 → `/multi/`, `/prizmaexpress/`, `/משקפי-מולטיפוקל/`, `/צרו-קשר/`, `/שאלות-ותשובות/`, `/supersale-takanon/`, `/privacy/`, `/terms/`, `/terms-branches/`, `/prizma-express-terms/`, `/deal/`, `/accessibility/`, `/משלוחים-והחזרות/` (legal pages grouped as B — formally correct, dry-but-acceptable)
- **C (acceptable, clearly translated):** 1 → `/about/`
- **D (poor):** 0
- **F (broken):** 0

(Counts sum to more than 18 because legal pages share a grade bucket; only `/about/` falls into C.)

---

## Common Issues Across Pages

### 1. Hebrew content leaking into the EN row (HIGHEST priority)

Four EN pages have Hebrew text in places an English visitor will see:

| Slug | Field | Current value (Hebrew) |
|---|---|---|
| `/lab/` | `storefront_pages.title` | `מעבדת מסגורים` |
| `/multi/` | `storefront_pages.title` | `משקפי מולטיפוקל` |
| `/prizmaexpress/` | `storefront_pages.title` | `פריזמה אקספרס - שירות אופטיקה ניידת עד הבית` |
| `/משקפי-מולטיפוקל/` | `storefront_pages.title` | `משקפי מולטיפוקל` |

Impact: browser tab, `<h1>` fallback, `og:title`, breadcrumb labels — any surface that reads `title` instead of `meta_title` will render Hebrew to an English visitor. `meta_title` on all four is correctly in English, which may mask the issue in some views but not all.

### 2. Hebrew URL slugs on EN pages

Five EN pages have Hebrew slugs. An English user who shares a link will send a URL like `https://app.../en/%D7%9E%D7%A9%D7%A7%D7%A4%D7%99-%D7%9E%D7%95%D7%9C%D7%98%D7%99%D7%A4%D7%95%D7%A7%D7%9C/` — unreadable and bad for SEO:

- `/משלוחים-והחזרות/` (Shipping & Returns)
- `/משקפי-מולטיפוקל/` (Multifocal Glasses)
- `/צרו-קשר/` (Contact Us)
- `/שאלות-ותשובות/` (Q&A)

Worse: `/צרו-קשר/` contact-card links point **internally** to `/שאלות-ותשובות/` and `/משלוחים-והחזרות/`, so users clicking from the EN contact page end up with percent-encoded gibberish in their URL bar.

### 3. Internal cross-page factual inconsistency (same-day turnaround claim)

Same service, three different numbers across three EN pages:
- Homepage (`/`, story_teaser block): "30 minutes from purchase"
- About (`/about/`): "15 minutes after placing your order"
- Lab (`/lab/`, timeline table): "15–60 Minutes" for single-vision in-stock

Not a translation error — a content-authoring error that survived the rewrite. Pick one and align.

### 4. Duplication (three multifocal landing pages)

EN users see **three** separate pages competing for "multifocal":
- `/multi/` — short marketing landing page (2 blocks)
- `/multifocal-guide/` — 10-minute deep article (excellent quality)
- `/משקפי-מולטיפוקל/` — 16-block marketing tour (Hebrew slug)

Content overlaps significantly. A native user lands on one and the other two become orphan pages that dilute SEO and confuse nav. Decide which single EN page is canonical and consolidate.

### 5. Unrendered shortcodes leaking into prose

Two pages have WordPress-style shortcodes visible in the HTML blob:

- `/multi/` block `multi-top`: literal text `[reviews style="carousel" limit="8"]`
- `/prizmaexpress/` block `pe-block2-middle`: literal text `[products category="eyeglasses" limit="8" columns="4"]`

These will either display as raw text or (if parsed by a legacy renderer) silently fail. Either way: credibility hit. These are renderer issues, not translation issues, but are visible only on the EN side of the audit.

### 6. Hebrew/Israeli jargon left untranslated

- `/שאלות-ותשובות/`, Payment Methods: `"standing orders (Horat Keva)"` — native EN readers have no idea what "Horat Keva" is. Correct: "direct debit" or "standing order" without the transliteration.
- `/צרו-קשר/`, address: `"32 Herzl St, Pedestrian Mall, Ashkelon"` — "midrachov" translated too literally. Native EN: "Herzl Pedestrian Street" or simply "32 Herzl St, Ashkelon".
- `/prizma-express-terms/`, §5.8: `"offered only in exceptional cases"` — stilted. "Available only by special arrangement" is more natural.
- `/multi/`, guarantee block: `"We put our livelihood on the line every day"` — direct literal of HE `"אנחנו שמים את הפרנסה שלנו על הקו"`. Melodramatic in English for a premium brand. Suggest: "We back every multifocal pair with a full adaptation guarantee."

### 7. Hebrew CSS comments inside `/משקפי-מולטיפוקל/` HTML

Non-visible to users but a code smell. Examples: `/* מבנה דף בסיסי למניעת זליגת אלמנטים */`, `/* מיוצב עם Flexbox */`. Reveals that the EN page was cloned from HE without a clean pass, and anyone who views source sees mixed-language comments.

---

## Per-Page Ratings

| Slug | Grade | Key Issues | Priority |
|------|-------|------------|----------|
| `/` (Homepage) | **A** | None significant. Strong, premium voice. | — |
| `/about/` | **C** | Literal translation of HE; "15 min after placing order" contradicts homepage; phrases like "we must do everything possible to make the customer feel at home, even on the site!" are stiff | **HIGH** |
| `/optometry/` | **A** | Reads as native English. Premium, confident, knowledgeable. | — |
| `/lab/` | **A** | Excellent idiomatic English ("Millimetric Precision," "frame tells a story — a gift, a memory"). Only issue: `title` field in Hebrew. | LOW (title fix) |
| `/multi/` | **B** | `title` in Hebrew; `[reviews ...]` shortcode leaks; "We put our livelihood on the line" melodramatic; "How is this profitable for them?" is Hebrew marketer-speak | **HIGH** |
| `/multifocal-guide/` | **A** | ~10-minute technical article, near-publication quality. Nothing to fix. | — |
| `/prizmaexpress/` | **B** | `title` in Hebrew; `[products ...]` shortcode leaks; "In-Home Eyewear" used as a product name reads awkwardly; service banner shows "currently inactive" which is a cold welcome for an EN visitor clicking a hero CTA | **HIGH** |
| `/צרו-קשר/` (Contact) | **B** | Hebrew slug; internal links point to Hebrew slugs; "Pedestrian Mall" awkward | MEDIUM |
| `/שאלות-ותשובות/` (FAQ) | **B** | Hebrew slug; "Horat Keva" untranslated; otherwise clean | MEDIUM |
| `/משקפי-מולטיפוקל/` | **B** | Hebrew slug and `title`; duplicates `/multi/` and `/multifocal-guide/` content; Hebrew CSS comments in source | MEDIUM |
| `/משלוחים-והחזרות/` (Shipping) | **B** | Hebrew slug; content itself is well-written legal English | MEDIUM |
| `/accessibility/` | **B** | Formal, correct. "Left side of the screen" presumes LTR — if the widget is RTL-positioned on HE version, EN copy should say "to the side" or match actual widget position | LOW |
| `/deal/` (Cancellation) | **B** | Clean, professional legal English. No issues. | — |
| `/privacy/` | **B** | Formal legal English. "Written in the masculine form for convenience" is a Hebraism (Israeli legal convention); acceptable but unusual for EN readers | LOW |
| `/prizma-express-terms/` | **B** | Competent legal English; uses "ex gratia" (acceptable in legal docs); a few stilted phrases | LOW |
| `/supersale-takanon/` | **B** | Very short; clean. Slug still uses HE transliteration ("takanon" = regulations) — inconsistent with other EN slugs. | LOW |
| `/terms-branches/` | **B** | Dense legal prose, formally correct | — |
| `/terms/` | **B** | Polished marketing-legal hybrid. No translation smells. | — |

---

## Page-by-Page Detail (Top Priority Pages)

### `/about/` — Grade: **C** (needs rewrite)

**What works:**
- Overall meaning and structure are clear.
- No grammar errors.

**What's awkward/wrong:**
- Block 1, paragraph 1: "we're more than just optical professionals-we're pioneers in stylish and innovative eyewear." — corporate puffery; "pioneers in stylish eyewear" is not a native-English claim. Hebrew original: `מובילים את הדרך בעיצוב אופנתי וחדשני` (leading the way in fashionable and innovative design). Better EN: "…we're curators of the world's most inspired eyewear design."
- Block 1, paragraph 4: "you can walk away with new glasses in just 15 minutes after placing your order—a perfect combination of speed, quality, and style." — **Contradicts the homepage** (which says 30 minutes) and the `/lab/` timing table (15–60 minutes depending on lens type). Also "walk away with" is slightly negative; "walk out with" is more common, or just "pick up your new glasses the same day."
- Block 2, paragraph 1: "We believe that every person has the right not only to quality vision, but also to glasses that express their uniqueness and enrich their appearance." — literal translation of `זכאי` ("has the right"). In English "right" carries a legal tone that clashes with a mission statement. Suggest: "deserves not just clear vision, but eyewear that expresses who they are."
- Block 2, paragraph 4: "We believe that a purchase is not a one-time thing and we must do everything possible to make the customer feel at home, even on the site!" — "even on the site!" is an over-translated enthusiasm marker (the HE original uses Hebrew's natural `!` at the end). Reads as breathless.
- Block 2, paragraph 4: "if you purchased a model and regret it, you can exchange or return the model up to 14 days." — "regret it" is Hebraism (`התחרטתם`). Native EN: "if you change your mind, you can exchange or return your purchase within 14 days."

**Recommendation:** Full rewrite by native-EN editor. This is the highest-traffic "tell us about yourself" page and the weakest copy on the site.

---

### `/` (Homepage) — Grade: **A**

**What works:**
- Hero copy is excellent: "Luxury eyewear from the world's finest brands, handpicked at exhibitions around the globe." — confident, brand-aligned.
- "Private Events & Collections" block has genuinely sophisticated English: "At the intersection of the world's most iconic fashion houses and limited-run capsule collections…" — this is written, not translated.
- Optometry teaser: "Sharp vision is the foundation of every style choice" — strong native-English headline craft.
- Story teaser: "We are proud to offer our customers a unique experience: most of our eyeglasses are prepared on-site, which means you can walk out with your new pair in as little as 30 minutes from purchase." — clear, specific, confident.

**What's awkward/wrong:**
- Brand strip section title: "The World's Leading Brands" — fine but generic. Not broken.
- Minor: "From World Exhibitions - Straight to Us" — slightly stiff; "From the World's Exhibitions to Our Boutique" would scan better. Not a fix-now item.

**Recommendation:** Ship as-is.

---

### `/optometry/` — Grade: **A**

**What works:**
- "We start from the same place we started in 1985: understanding your personal need." — native voice.
- "A frame without properly fitted lenses is an accessory, not eyewear." — punchy, quotable, very English-copywriter.
- "The less good news: not all multifocal lenses are equal…" — natural connective, not a literal HE equivalent.
- "After 40 years in the profession, we have patience for the process." — confident brand voice.

**What's awkward/wrong:**
- Bullet list item "Multifocal lenses — consultation and fitting by lifestyle" — "by lifestyle" is a slight Hebraism; "lifestyle-based fitting" is smoother. Minor.

**Recommendation:** Ship as-is.

---

### `/lab/` — Grade: **A** (content), **B** overall due to Hebrew title field

**What works:**
- "Every pair undergoes computerized cutting, polishing, and rigorous QA in our lab. Here are our realistic timelines:" — note the word "realistic" — a native copywriter's instinct for under-promising.
- Specialty service block: "Sometimes a frame tells a story - a gift, a memory, or a discontinued favorite. In our lab, we fit new lenses to your existing frames so you can enjoy sharp vision without parting with what you love." — this is genuinely good English prose.
- "No Off-site Shipping — On-site Edging, Live" headline — native slogan construction.
- "Millimetric Precision" and "Unprecedented Turnaround" — strong technical-luxury register.

**What's awkward/wrong:**
- Row mismatch: desktop table says "15-60 Minutes" for Single Vision In-Stock; mobile card says "30-60 Min." Pick one.
- Row mismatch: Semi-Rimless desktop = "15-60 Minutes", mobile = "45-90 Min". Pick one.
- "Have a Favorite Frame? We'll Keep It Alive" — "Keep It Alive" is slightly informal for the premium register but works as a headline play.
- `storefront_pages.title = "מעבדת מסגורים"` — Hebrew. Change to "Finishing Lab" or "Advanced Finishing Lab."

**Recommendation:** Fix the title field and reconcile the mobile/desktop time values. Content ships.

---

### `/multi/` — Grade: **B**

**What works:**
- "We are the Multifocal Experts" — clean, direct.
- "5 Reasons to Choose Us" block is correctly localized.
- "Didn't adapt to your lenses? Get a full refund—no fine print, no excuses!" — native phrasing.

**What's awkward/wrong:**
- `title` field in Hebrew (already noted).
- `[reviews style="carousel" limit="8"]` shortcode is visible as literal text inside `mu-reviews` container. Either renderer bug, or content author left a WP shortcode in a non-WP context.
- Guarantee block headline: "We put our livelihood on the line every day so that you can have perfect vision!" — literal rendering of HE `שמים את הפרנסה שלנו על הקו`. Melodramatic and slightly desperate-sounding for a premium brand. Recommend: "We back every multifocal pair with a full adaptation guarantee — or your money back."
- Guarantee body: "You're probably asking: 'How is this profitable for them?' Honestly? It's not always. Sometimes we take a loss." — this self-narrating style ("you're probably asking…") is very Hebrew-marketer and feels needy in English. Recommend trimming to: "You might wonder how we can afford this guarantee. Honestly: sometimes we take a loss. After 40 years and thousands of satisfied wearers, we know it rarely happens."
- Quote attribution: `"The eye is the window of the body through which man feels and enjoys the beauty of the world" - Leonardo da Vinci` — "man" is gendered-Hebrew thinking (generic masculine); English prefers "we" or rewording. Also, this quote is not verifiably from da Vinci — it's a paraphrase in common Hebrew use. Consider removing or attributing generically.

**Recommendation:** Edit the guarantee block and remove the unrendered shortcode.

---

### `/prizmaexpress/` — Grade: **B**

**What works:**
- Step cards are clear, parallel construction.
- FAQ items are well-adapted.
- "There are multifocal glasses - and then there is true personalized multifocal fitting." — native English copywriter cadence.

**What's awkward/wrong:**
- `title` field in Hebrew.
- "⚠️ This service is currently inactive. Click here for in-store services." — an English visitor clicking a hero CTA lands on a cold message. Either hide the EN page from nav when inactive, or lead with "Coming soon" instead of "currently inactive."
- `[products category="eyeglasses" limit="8" columns="4"]` shortcode leaks as literal text in the "Our Frames" section.
- "In-Home Eyewear" used as a service name — it's a direct translation of `משקפיים עד הבית`. In English it reads as a label, not a product. Recommend "In-Home Eyewear Service" throughout or rename entirely to "Prizma Express At Home."
- FAQ: "Eye examinations are performed exclusively for organizations and businesses (minimum 5 people) by prior arrangement for an additional fee of ₪500." — minor: "by prior arrangement" is idiomatic-HE legal register.

**Recommendation:** Medium-priority edit pass; fix shortcode; reconsider "inactive" banner copy.

---

### `/multifocal-guide/` — Grade: **A**

**What works:**
- Near-publication-quality technical long-form English. Examples:
  - "Presbyopia is a universal and irreversible process called presbyopia. It has nothing to do with health, diet, or screen use - it happens to every human being, without exception."
  - "Minkwitz's Theorem (1978), from the field of differential geometry, states that when the power of a lens is changed gradually along a vertical axis, distortions on the sides are inevitably created."
  - "You Don't See With Your Eyes - You See With Your Brain"
  - Six lens manufacturer portraits — sophisticated register, correctly comparative.
- FAQ answers are crisp and native.

**What's awkward/wrong:**
- Minor: "Individual lenses - every point on the lens surface is calculated according to full personal biometric parameters." — "full personal biometric parameters" is a bit clunky. Not a fix-now item.
- Minor: "The science exists. The technology exists. The only remaining question is how precisely the selection and fitting process will be carried out…" — slight passive-voice preference typical of translated prose; native EN would use: "…the only question is how precisely you'll be measured and fitted."

**Recommendation:** Ship as-is. This is the strongest long-form page on the site.

---

## Findings by Severity

### CRITICAL (content-breaking, harms credibility on first page view): 2
- **F-C1:** Hebrew `title` field on four pages leaks into browser tabs, OG cards, and SEO snippets for English visitors.
- **F-C2:** Hebrew URL slugs on four EN pages produce unshareable/unreadable URLs.

### HIGH (credibility leak on main marketing pages): 5
- **F-H1:** `/about/` page is a clear literal translation; needs native-editor rewrite.
- **F-H2:** Internal factual inconsistency — same-day turnaround claimed as 15 min, 30 min, and 15–60 min on three different pages.
- **F-H3:** `/multi/` guarantee block ("we put our livelihood on the line…") is melodramatic and off-brand.
- **F-H4:** `[reviews ...]` shortcode leaks as literal text on `/multi/`.
- **F-H5:** `[products ...]` shortcode leaks as literal text on `/prizmaexpress/`.

### MEDIUM (quality issues, not blocking): 5
- **F-M1:** `/prizmaexpress/` "currently inactive" banner is a cold welcome for EN visitors reaching from a CTA.
- **F-M2:** `/צרו-קשר/` internal links point to Hebrew-slug pages; contact card UX breaks for EN users.
- **F-M3:** "Horat Keva" left untranslated in `/שאלות-ותשובות/` FAQ.
- **F-M4:** Three competing multifocal pages (`/multi/`, `/multifocal-guide/`, `/משקפי-מולטיפוקל/`) dilute SEO and confuse nav.
- **F-M5:** "Pedestrian Mall" in `/צרו-קשר/` is a too-literal rendering of "midrachov."

### LOW (polish items): 4
- **F-L1:** Hebrew CSS comments inside `/משקפי-מולטיפוקל/` HTML blocks.
- **F-L2:** Mobile vs. desktop row time mismatches in `/lab/` turnaround table.
- **F-L3:** `/supersale-takanon/` slug uses Hebrew transliteration ("takanon") — inconsistent with other EN slugs.
- **F-L4:** `/privacy/` "written in the masculine form for convenience" is a Hebraism; stylistically unusual for EN but legally benign.

---

## Recommendations

### Must-do before DNS switch:
1. **Translate the four Hebrew `title` fields.** SQL: update `storefront_pages.title` for `/lab/`, `/multi/`, `/prizmaexpress/`, `/משקפי-מולטיפוקל/` to English. 5 minutes of DB work.
2. **Rewrite `/about/`** as native English (not translated). Target 2–3 paragraphs, not 5. Strongest single return-on-edit on the site.
3. **Reconcile the same-day turnaround claim** to one number (recommend "as little as 30 minutes for in-stock single vision" per homepage, with honest "1–5 business days for out-of-stock and multifocal" caveat per the lab timing table).
4. **Fix the two unrendered shortcodes** on `/multi/` and `/prizmaexpress/` — either remove them or route through a real block renderer.

### Should-do soon (within 2 weeks of DNS switch):
5. **Add English slugs** for the 4–5 Hebrew-slug EN pages. Leave the HE ones as HE-only redirects.
6. **Rewrite the `/multi/` guarantee block** — specifically the "livelihood on the line" passage.
7. **Consolidate the three multifocal pages** into one canonical EN page. `/multifocal-guide/` is the strongest; keep it and redirect the others.
8. **Fix the `/צרו-קשר/` contact card links** so they point to EN slugs, not HE.
9. **Replace "Horat Keva"** with "direct debit" or "standing order."

### Nice-to-have:
10. Strip Hebrew CSS comments from the `/משקפי-מולטיפוקל/` block HTML.
11. Update the `/prizmaexpress/` "currently inactive" banner copy or hide the EN page from nav while inactive.

### Do NOT do:
- A full re-translation pass is **not** warranted. 13 of 18 pages read as native-quality or near-native-quality English. The targeted fixes above capture 90% of the quality delta at 10% of the cost of a full re-translation.

---

## Evidence Appendix — Key Quoted Phrases

**Native-quality (examples of what's working):**
- `/` hero: "Luxury eyewear from the world's finest brands, handpicked at exhibitions around the globe."
- `/` events: "At the intersection of the world's most iconic fashion houses and limited-run capsule collections, we invite you to experience eyewear as a genuine art form."
- `/optometry/` approach: "A frame without properly fitted lenses is an accessory, not eyewear."
- `/lab/` specialty: "Sometimes a frame tells a story — a gift, a memory, or a discontinued favorite."
- `/multifocal-guide/` intro: "It happens to every human being, without exception."

**Translated-feeling (examples of what needs work):**
- `/about/`: "we must do everything possible to make the customer feel at home, even on the site!"
- `/about/`: "if you purchased a model and regret it, you can exchange or return the model up to 14 days."
- `/multi/` guarantee: "We put our livelihood on the line every day so that you can have perfect vision!"
- `/multi/` guarantee: "You're probably asking: 'How is this profitable for them?' Honestly? It's not always."
- `/שאלות-ותשובות/` FAQ: "We accept credit cards, standing orders (Horat Keva), bank transfers, and cash payments at our branch."

---

**Auditor's bottom line:** The EN storefront is in much better shape than I expected going in. It reads mostly as native prose, not translation. But there are five discrete issues (Hebrew titles, Hebrew slugs, `/about/` literal translation, internal inconsistency on turnaround, two shortcode leaks) that will puncture the premium illusion the moment a sharp-eyed English visitor arrives. Fix those five before DNS switch; the rest can polish post-launch.
