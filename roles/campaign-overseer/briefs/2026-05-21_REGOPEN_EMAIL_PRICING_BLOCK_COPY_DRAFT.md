# event_registration_open_email_he — Preview Block (Pricing Catalog) — Copy Draft — 2026-05-21

> **Brief:** `roles/campaign-overseer/briefs/2026-05-21_REGOPEN_EMAIL_PRICING_BLOCK_BRIEF.md`
> **Template touched:** `event_registration_open_email_he` (preview block ONLY — heading, intro, button row inside the gold-tinted container commented `<!-- ═══ EVENT PREVIEW BLOCK ... ═══ -->`).
> **For application by:** Daniel (himself, per brief §9) — or `opticup-campaign-overseer` if Daniel delegates demo-first promotion.
> **Status:** APPROVED by Daniel 2026-05-21 — heading v1, button label v1, eye header kept. Intro = v1 with "המלא" removed (Daniel edit). Final approved copy locked in §1.0 below.

## 1.0 APPROVED FINAL COPY (Daniel-locked 2026-05-21)

- **Heading:** קטלוג המותגים והמחירים
- **Intro:** רוצים לדעת מה יחכה לכם? תוכלו להציץ בקטלוג המותגים ולעיין במבנה המחירים שיהיה בתוקף ביום האירוע, מראש ובשקיפות מלאה.
- **Button label:** לקטלוג המותגים והמחירים
- **Button href:** https://prizma-optic.co.il/r/CEiBGCWj (existing static pricing-catalog short link)
- **Header icon:** eye (kept) · **Button icon:** tag (kept)
- **Change vs draft v1 intro:** removed the word "המלא" after "קטלוג המותגים" per Daniel.

The drop-in HTML in §1.4 below must use THIS intro text (without "המלא").

## 0. Reality check

- **Variable contract re-read:** yes. `M4_INFRASTRUCTURE_CONTRACT.md` §1 + `KB_MESSAGING.md` §3 + Iron Rule 35 in CLAUDE.md.
- **Placeholders used in this draft:** NONE. The block is static marketing copy + a single static short link (per brief §3, this is the one place "no raw URLs" does not apply — the link is the catalog short link already shipping in the SMS).
- **Placeholders that would have helped but are NOT in the contract:** none — the brief explicitly does not need any.
- **Iron Rule 35 status:** unchanged. No new `%var%` introduced. No new trigger_type / action_type / recipient_type. No EF / DB / migration change.
- **Iron Rule 9 status:** the static catalog URL (`https://prizma-optic.co.il/r/CEiBGCWj`) is data inside the `crm_message_templates` row, not a code-level hardcoded value — and it is the existing in-production URL the SMS already ships. Continuing to ship the same URL preserves existing behavior, does not introduce new hardcoding.
- **Char count (visible HE text post-substitution, no %var% in this block):** heading 21 chars + intro v1 131 chars + button label v1 22 chars = ~174 visible Hebrew chars in the rewritten block. No segment cost (email, no length cap).
- **Languages:** HE only (this template is `_he` per brief §6 final line). No EN/RU.

## 1. Drafts

### 1.1 Heading (replaces "הצצה לאירוע")

| # | Hebrew | Chars | Notes |
|---|---|---|---|
| **v1 (primary)** | קטלוג המותגים והמחירים | 21 | Daniel's canonical phrasing verbatim. Reads as the catalog identity itself. |
| v2 (alt) | המותגים והמחירים שלכם | 20 | Warmer, possessive plural. Less "catalog-named", more relational. |
| v3 (alt) | כל המותגים, וכל המחירים | 22 | Punchier, comma-rhythm, leans on the "all up front" promise. |

### 1.2 Intro paragraph (replaces "רוצים לראות מה מחכה לכם? צפו במלאי המעודכן של דגמי האירוע ובמבנה המחירים המלא שיהיה תקף ביום האירוע.")

| # | Hebrew | Chars |
|---|---|---|
| **v1 (primary)** | רוצים לדעת מה יחכה לכם? תוכלו להציץ בקטלוג המותגים המלא ולעיין במבנה המחירים שיהיה בתוקף ביום האירוע, מראש ובשקיפות מלאה. | 131 |
| v2 (alt — fuller) | בקטלוג שלנו תמצאו את כל המותגים שישתתפו באירוע, לצד מבנה המחירים שיהיה בתוקף ביום - הכל לפניכם, מראש ובשקיפות מלאה. | 130 |
| v3 (alt — shorter) | תוכלו להציץ בקטלוג המותגים המלא ובמבנה המחירים שיהיה בתוקף ביום האירוע. הכל לפניכם, מראש. | 102 |

**Voice notes:**
- "תוכלו" / "לכם" gender-neutral plural — matches Prizma brand voice (KB_STRATEGY + brief §3).
- "מראש ובשקיפות מלאה" carries the strategic intent Daniel surfaced (the pricing structure is what changed since the pre-failure run — emphasize transparency, pre-published, no surprises).
- "רוצים לדעת מה יחכה לכם?" preserves the rhetorical opener cadence of the current intro ("רוצים לראות מה מחכה לכם?") — same warmth, retargeted from "stock" to "knowing in advance".
- Zero emoji (brand rule: Heroicons SVG only in email).
- Plain hyphen in v2 (`-`), no em-dash, no en-dash (brand rule).

### 1.3 Button label (single button, replaces the 2-button row)

| # | Hebrew | Chars | Notes |
|---|---|---|---|
| **v1 (primary)** | לקטלוג המותגים והמחירים | 22 | Matches the heading + Daniel's canonical concept. Long but readable; fits the existing `.preview-btn` pill at 14px Rubik (mobile `.btn` will stack/full-width via existing CSS). |
| v2 (alt — shorter) | מותגים ומחירים | 14 | Tight, punchy. Loses the "catalog" word but the heading covers it. |
| v3 (alt — preserve prior) | מבנה מחירים | 11 | Current label. Cleanest fit visually but does NOT signal the brands axis. |

### 1.4 Full rewritten block HTML (drop-in replacement)

Drop-in replacement for the existing section between `<!-- ═══ EVENT PREVIEW BLOCK (stock + pricing - 2 CTAs) ═══ -->` and its closing `</table>` (the closing one immediately before the next sibling block in the email).

Uses **heading v1 + intro v1 + button label v1** (swap as Daniel chooses).

```html
<!-- ═══ EVENT PREVIEW BLOCK (pricing catalog - single CTA) ═══ -->
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, rgba(201, 165, 85, 0.08) 0%, rgba(232, 218, 148, 0.05) 100%); border:1px solid rgba(201, 165, 85, 0.3); border-radius:12px; margin-bottom:25px;">
  <tr>
    <td class="stock-box" style="padding: 28px 25px; text-align:center;">
      <!-- Heroicons outline: eye -->
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c9a555" stroke-width="1.5" style="margin-bottom:10px;">
        <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/>
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
      <p style="margin:0 0 6px 0; font-size:12px; font-weight:700; color:#c9a555; text-transform:uppercase; letter-spacing:0.15em;">
        תצוגה מקדימה
      </p>
      <h3 style="margin:0 0 10px 0; font-size:20px; font-weight:700; color:#ffffff;">
        קטלוג המותגים והמחירים
      </h3>
      <p style="margin:0 0 22px 0; font-size:14px; line-height:1.6; color:#cccccc;">
        רוצים לדעת מה יחכה לכם? תוכלו להציץ בקטלוג המותגים ולעיין במבנה המחירים שיהיה בתוקף ביום האירוע, מראש ובשקיפות מלאה.
      </p>
      <!-- Single-button row -->
      <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
        <tr>
          <td align="center">
            <a href="https://prizma-optic.co.il/r/CEiBGCWj" class="preview-btn" style="display:inline-block; padding:13px 26px; background-color:transparent; color:#c9a555; border: 1.5px solid #c9a555; font-family:'Rubik','Segoe UI',sans-serif; font-size:14px; font-weight:700; text-decoration:none; border-radius:9999px; letter-spacing:0.3px;">
              <!-- Heroicons outline: tag (pricing icon) -->
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c9a555" stroke-width="1.8" style="vertical-align:middle; margin-left:6px;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"/>
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6z"/>
              </svg>
              לקטלוג המותגים והמחירים
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

**Structural changes vs current:**
1. Outer block container — unchanged (gold-tinted gradient bg, `rgba(201,165,85,0.3)` border, radius 12, 28px/25px padding, `class="stock-box"`).
2. Eye Heroicon header treatment — unchanged.
3. Eyebrow "תצוגה מקדימה" — unchanged (still fits semantically: previewing the catalog before the event).
4. Heading `<h3>` — text only changed ("הצצה לאירוע" → "קטלוג המותגים והמחירים"). Styles untouched.
5. Intro `<p>` — text only changed. Styles untouched.
6. Button row table — collapsed from 2 cells to 1 cell. Stock button (`/r/5CBy1Do4` + grid icon + "מלאי לאירוע") REMOVED. Pricing button kept, label changed to "לקטלוג המותגים והמחירים". The `preview-btn-cell` class is dropped from the single remaining `<td>` because the 5px lateral gap padding it provided was only needed to separate the two buttons; with one button, it's redundant. The `preview-btn` class on the `<a>` is preserved (it may be referenced by a media query in the email's `<style>` block).
7. Comment label updated: `EVENT PREVIEW BLOCK (stock + pricing - 2 CTAs)` → `EVENT PREVIEW BLOCK (pricing catalog - single CTA)` for future-grep clarity.
8. No empty cells, no broken 2-col fallback on mobile — the single button centers via `align="center"` + `margin: 0 auto` on the inner table.

## 2. Rationale

**Why this copy.** Daniel's stated reason for the shift: the last stock-focused message preceded a registration that didn't go well, and the **pricing structure** is one of the main things that changed since then. The rewrite therefore foregrounds the pricing-catalog axis and drops the stock axis entirely. The intro deliberately surfaces "מראש ובשקיפות מלאה" — naming the trust posture the new pricing structure is meant to convey, without being heavy-handed about it.

**Why "קטלוג המותגים והמחירים" as the canonical phrase.** Daniel chose this. It does two jobs in one phrase: signals the brands axis (which Tier-4 ICONIC / Boutique-Club customers care about) AND the pricing axis (the strategic shift). The heading carries it, the button label echoes it, the eyebrow + intro frame it.

**Why I kept the eye header instead of switching to a tag-icon header.** Two icons in the block (eye = preview, tag = pricing) read as complementary rather than redundant: the eye says "you can look ahead", the tag says "this is the pricing artifact you'll be looking at". Switching the header to a tag would lose the "preview" feel that the eyebrow "תצוגה מקדימה" relies on. Mentioned as a trade-off the brief invited — I prefer the eye but Daniel can call it.

**Comparison to prior approved drafts.** The existing block (current pre-failure version) and `campaigns/supersale/MESSAGES UPDATE/registration confirmation/EMAIL.txt` both use the Prizma luxury-but-warm voice with gender-neutral plural and the `#c9a555` / `#d4af37` gold palette. The rewrite preserves that voice register exactly. No emoji in the block (current block already has none — kept).

**What's deliberately NOT in the rewrite.**
- No reference to the (removed) stock page. Clean drop, no apology, no "by the way".
- No competing CTA against the primary registration button further up the email — this remains a secondary block, visually subordinate (transparent bg button, no gradient fill, no shadow).
- No prices, no specific brand names — those live in the catalog itself. The block's job is to send people there, not to preview prices in-line.

## 3. Test plan for Campaign Overseer (if Daniel delegates)

If Daniel applies the change himself, this section is informational; if it's routed through the Overseer, follow these steps verbatim:

1. **Apply to demo first (Iron Rule 33).** Update `crm_message_templates.body` for `slug='event_registration_open_email_he'` on tenant `demo` only. Audit log entry naming this draft path.
2. **Test send** to demo via the existing M4 path — trigger a test `event:status_change → tier2` for a demo event, OR enqueue manually via `crm-broadcasts` test feature.
3. **Phone allowlist** for the test: ONLY Daniel's two personal phones (0537889878 / 0503348349) per `feedback_test_data_phones`. Email test recipient: Daniel only.
4. **Verify no unsubstituted placeholders** in `crm_message_log` rows produced by the test (this block has no `%var%`, but confirm the surrounding email still resolves `%name%`, `%event_name%`, `%event_date%`, etc. — pre-existing behavior must remain green).
5. **Render verification** — Daniel opens the test email in his inbox: confirm the eye SVG renders, the heading line breaks correctly, the single button centers on desktop AND stacks/full-width via `.btn` media query on mobile (the existing `<style>` block already provides this for the `.btn` class — confirm the `.preview-btn` width behavior is acceptable; if a regression appears, re-add a `.btn` class on the `<a>`).
6. **Click verification** — click the single button; verify it lands on `https://prizma-optic.co.il/r/CEiBGCWj` (the pricing catalog page). Click-data should NOT be used to declare conversion (memory `feedback_clicks_are_not_actions`); render + landing destination are what we confirm here.
7. **Promote to Prizma** via `scripts/promote-config-to-prizma.mjs` once Daniel approves the demo render. Single-row promotion, audit-logged. Sentinel Mission 11 (config parity) should be green within 24h.

## 4. Approval

- [ ] Daniel approves heading variant: ☐ v1 "קטלוג המותגים והמחירים" / ☐ v2 "המותגים והמחירים שלכם" / ☐ v3 "כל המותגים, וכל המחירים"
- [ ] Daniel approves intro variant: ☐ v1 (primary) / ☐ v2 (fuller) / ☐ v3 (shorter)
- [ ] Daniel approves button label variant: ☐ v1 "לקטלוג המותגים והמחירים" / ☐ v2 "מותגים ומחירים" / ☐ v3 "מבנה מחירים"
- [ ] Daniel confirms eye header treatment kept (vs swap to tag header)
- [ ] Demo applied + render verified (Daniel OR Overseer)
- [ ] Promoted to Prizma via `scripts/promote-config-to-prizma.mjs` (Daniel OR Overseer)

## 5. Escalations

None. No placeholder gap, no contract crossing, no Architect SPEC request triggered by this draft. The static catalog short link is an in-production resource (already in SMS body and current email body) and is preserved verbatim — not a hardcoding regression.

If Daniel decides the pricing-catalog button should become the PRIMARY CTA of the email (replacing or competing with "מעבר לטופס רישום"), that is a strategy call per brief §7 — surface back to the Campaign Lead, do NOT decide it in the Copywriter draft.

---

*Draft authored by `opticup-campaign-copywriter` on 2026-05-21. Recommend-only. No DB writes performed.*
