# Registration-Open Email — Pricing-Catalog Preview Block — Copy Brief

> **Sealed:** 2026-05-21 · **Author:** Campaign Lead · **Audience:** `opticup-campaign-copywriter`
> **Risk class:** LOW (drafts copy only; Campaign Overseer applies later, demo-first)

## 1. Goal (one line)

Rewrite the "תצוגה מקדימה / הצצה לאירוע" preview block in `event_registration_open_email_he` so it points readers to the **brands-and-prices catalog** (not the stock page), as a single focused button.

## 2. Background (3–5 sentences)

Daniel is shifting the registration-open message away from the stock page toward the pricing catalog. Reason (his words): last time he sent the stock link the registration didn't go well, and the pricing structure is one of the main things that changed since the last (pre-failure) run. He has already changed the SMS himself and is changing the email himself — your draft is the copy he will paste into the block. Today the email's preview block has a heading "הצצה לאירוע", an intro paragraph mentioning both stock and prices, and a TWO-button row: "מלאי לאירוע" (→ `/r/5CBy1Do4`, stock) and "מבנה מחירים" (→ `/r/CEiBGCWj`, pricing). The decision is: **collapse to a SINGLE button** for the pricing catalog and **drop the stock button entirely**, rewriting the heading + intro to fit.

## 3. Constraints

- **Iron Rule 35 boundary** — copy only. No new placeholders. This block uses NO `%var%` at all (it is static marketing copy + a static link), so the contract is not even in play here — but do not introduce any placeholder.
- **The button name Daniel chose:** "קטלוג המותגים והמחירים" (brands-and-prices catalog). Use this as the canonical name. A shorter button label is fine if needed for the button itself (e.g. "לקטלוג המותגים והמחירים" or "מבנה מחירים") — propose, but keep "קטלוג המותגים והמחירים" as the concept the heading/intro builds on.
- **The link is a static short link, intentionally:** `https://prizma-optic.co.il/r/CEiBGCWj` → the pricing catalog. This is the ONE place the copywriter's normal "no raw URLs" anti-pattern does NOT apply: it is a static catalog short link already in production (not a per-recipient link), it cannot be a `%placeholder%`, and the SMS already ships it. Keep this exact URL in the button `href`. Do not swap it for a placeholder, do not invent a new code.
- **Brand voice (re-confirm from your KBs):** warm, family-feel, no pressure; gender-neutral plural ("אתם / תוכלו / לכם"); ZERO emoji in email (Heroicons SVG only); short hyphens only, never em/en-dash; campaign name "אירוע המותגים" family. The block must read as Prizma luxury-but-warm.
- **Authority mode:** RECOMMEND-ONLY. You draft; Daniel approves; Campaign Overseer applies (demo-first per Iron Rule 33).

## 4. Scope — what to touch

| Surface | Access |
|---|---|
| The preview block ONLY — heading ("הצצה לאירוע"), intro paragraph, and the button row | DRAFT new copy |
| `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md` §1, KB_MESSAGING, KB_STRATEGY | READ (your standard bootstrap) |
| The current email HTML (provided below in §8) | READ — to match structure/tone |

## 5. Scope — what NOT to touch

| Surface | Confirmed NOT touched |
|---|---|
| Any other block in the email (header, event-details card, "מידע חשוב", primary CTA "מעבר לטופס רישום", secondary links, sign-off, unsubscribe, copyright) | Leave exactly as-is |
| The primary registration CTA `%registration_url%` | Untouched — that is the main conversion action; the pricing button is secondary |
| The stock short link `/r/5CBy1Do4` | Removed from this block (button dropped); do NOT repurpose it |
| `crm_message_templates` (the DB) | No writes — Overseer applies later |
| The SMS template | Daniel already handled it; out of scope here |

## 6. Deliverable

`roles/campaign-overseer/briefs/2026-05-21_REGOPEN_EMAIL_PRICING_BLOCK_COPY_DRAFT.md` per your skill's required draft shape, containing:
1. **New heading** for the block (replaces "הצצה לאירוע").
2. **New intro paragraph** — pricing-catalog focused (today's intro mentions "מלאי המעודכן של דגמי האירוע ובמבנה המחירים"; rewrite to center on viewing the brands + the full pricing that will be valid on event day).
3. **New single-button label** for the pricing catalog.
4. **The exact HTML for the rewritten block** — single button, keep the existing visual style (transparent bg, gold `#c9a555` 1.5px border, pill radius, Rubik), keep the "tag" Heroicon (pricing icon) already used by the pricing button, and keep the block's outer gold-tinted container + the eye SVG header treatment OR propose a cleaner single-CTA layout. Whatever you choose, it must drop the stock button cleanly (no empty cell, no broken 2-col table).
5. Char counts / reality-check section as your skill requires (even though there are no placeholders, note "no %var% used").

Single language: **HE only** (this template is `_he`). No EN/RU needed.

## 7. Stop triggers

STOP and write back to the Campaign Lead if:
- The brief seems to require a placeholder (it should not — this is static copy).
- You believe dropping the stock button breaks the block's responsive layout in a way you can't cleanly resolve in HTML — flag it.
- You think the pricing catalog should ALSO replace or compete with the primary registration CTA — that is a strategy call, not a copy call; surface it, don't decide it.

## 8. Source — current email (authoritative, provided by Daniel 2026-05-21)

The block to rewrite is the one commented `<!-- ═══ EVENT PREVIEW BLOCK (stock + pricing - 2 CTAs) ═══ -->`. Current content:
- Outer container: gold-tinted gradient bg, `rgba(201,165,85,0.3)` border, radius 12.
- Eye Heroicon (32px) centered.
- Eyebrow: "תצוגה מקדימה"
- Heading: "הצצה לאירוע"
- Intro: "רוצים לראות מה מחכה לכם? צפו במלאי המעודכן של דגמי האירוע ובמבנה המחירים המלא שיהיה תקף ביום האירוע."
- 2-button row:
  - Button 1: grid icon + "מלאי לאירוע" → `https://prizma-optic.co.il/r/5CBy1Do4`  **(REMOVE)**
  - Button 2: tag icon + "מבנה מחירים" → `https://prizma-optic.co.il/r/CEiBGCWj`  **(KEEP + rename to the pricing-catalog concept)**

The full email HTML is in the Campaign Lead's session record for 2026-05-21; if you need the exact surrounding markup, request it from the Lead or read the live row: `SELECT body FROM crm_message_templates WHERE slug='event_registration_open_email_he'` (demo tenant) — but the block above is the only part you change.

## 9. Handoff

When you complete:
1. Write the draft to the §6 path.
2. Do NOT update CAMPAIGN_OVERSEER_HANDOFF (draft, not live state).
3. Emit a one-line English status to Daniel: "Pricing-block copy draft ready for event_registration_open_email_he. Single button to pricing catalog. See draft doc."
4. Daniel re-engages the Campaign Lead — Lead reviews, translates to Hebrew, and either delivers the HTML to Daniel (who applies it himself) or briefs the Overseer to apply it demo-first.

---

*Brief authored by Campaign Lead. Copywriter drafts; Daniel approves; Overseer applies. No DB writes by the Copywriter.*
