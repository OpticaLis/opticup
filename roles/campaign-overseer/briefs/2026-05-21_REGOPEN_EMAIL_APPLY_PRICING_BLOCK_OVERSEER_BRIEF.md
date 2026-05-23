# Apply Pricing-Catalog Block to event_registration_open_email_he — Overseer Brief

> **Sealed:** 2026-05-21 · **Author:** Campaign Lead · **Audience:** `opticup-campaign-overseer`
> **Risk class:** MEDIUM (config application to a live template; demo-first per Iron Rule 33; touches prizma after promotion)

## 0. BLOCKING DEPENDENCY — read first

**Do NOT start until the Architect SPEC backfilling demo static short links is CLOSED.**
The new email block links to `https://prizma-optic.co.il/r/CEiBGCWj`. That code (`CEiBGCWj`) is a **prizma** short-link code. On **demo** there is currently NO `template_static` short-link row for the pricing-catalog page, so the link would 404 during the demo test. The SPEC request `roles/campaign-overseer/briefs/2026-05-21_DEMO_STATIC_LINKS_BACKFILL_SPEC_REQUEST.md` asks the Architect to create demo equivalents for stock + pricing-catalog.

**Before applying:** confirm demo now has a `template_static` short link whose `target_url` is `https://www.prizma-optic.co.il/supersalepricescatalog/`. Use ITS demo code in the demo template body (NOT prizma's `CEiBGCWj`). For prizma, use `CEiBGCWj` (already correct, already in the body). If demo's pricing-catalog short link does not exist yet → STOP, the dependency isn't met.

## 1. Goal (one line)

Replace the "EVENT PREVIEW BLOCK" in `event_registration_open_email_he` with the approved single-button pricing-catalog block — demo first, visual verification, then promote to prizma.

## 2. Background

Daniel is shifting the registration-open message from the stock page to the pricing catalog (the SMS he already changed himself). The Copywriter drafted the new block; Daniel approved it (heading "קטלוג המותגים והמחירים", intro without "המלא", single button "לקטלוג המותגים והמחירים", eye header + tag button icon). The approved copy + drop-in HTML are locked in `roles/campaign-overseer/briefs/2026-05-21_REGOPEN_EMAIL_PRICING_BLOCK_COPY_DRAFT.md` §1.0 + §1.4. The current block has TWO buttons (stock `5CBy1Do4` + pricing `CEiBGCWj`); the new block has ONE (pricing only). The stock button is removed entirely.

## 3. Constraints

- **Iron Rule 33 — demo-first.** Apply to demo, test, verify, ONLY THEN promote to prizma via `scripts/promote-config-to-prizma.mjs`.
- **Iron Rule 35 — authority.** This is a template `body` edit using NO new placeholders → squarely within Campaign Overseer authority. Allowed.
- **Iron Rule 34 — UI/visual verification.** Because this is a customer-facing rendered change, the close must include visual evidence the rendered email looks correct (the email opens correctly with the single button centered, eye + tag icons render, RTL intact). Daniel's standing rule: visual preview before final sign-off.
- **Test phones allowlist:** ONLY 0537889878 / 0503348349 (memory `feedback_test_data_phones`). Email test recipient: Daniel only.
- **Per-tenant link codes:** demo uses demo's pricing-catalog code; prizma uses `CEiBGCWj`. Do NOT cross-wire.

## 4. Scope — what to touch

| Surface | Access |
|---|---|
| `crm_message_templates.body` for `slug='event_registration_open_email_he'`, tenant=demo | UPDATE (replace the EVENT PREVIEW BLOCK only) |
| Same row on prizma | UPDATE only AFTER demo verified + via promote script |
| The approved HTML in the copy-draft §1.4 | READ (source of the new block) |

The block boundary in the live body: starts at the comment `EVENT PREVIEW BLOCK (stock + pricing - 2 CTAs)` and ends at its closing `</table>` immediately before the `IMPORTANT INFO BLOCK` comment. (Verified 2026-05-21: identical position in demo + prizma bodies.) Replace exactly that span; leave everything before and after byte-identical.

## 5. Scope — what NOT to touch

| Surface | Confirmed NOT touched |
|---|---|
| Any other block (header, event-details card, important-info, primary registration CTA `%registration_url%`, secondary links, sign-off, unsubscribe, copyright) | Untouched |
| The SMS template | Daniel already handled it |
| Any short_links row | Overseer does not create/edit short links (that was the Architect SPEC) |
| `event_registration_open_sms_he` | Out of scope |

## 6. Steps

1. Confirm the blocking dependency (§0) — demo pricing-catalog short link exists.
2. Apply the new block to the **demo** template body, using demo's pricing-catalog short code in the button href.
3. Trigger a demo test send (event status_change → tier2, or manual enqueue) to a demo test lead on an allowlist phone; email to Daniel.
4. Verify in `crm_message_log`: no `unsubstituted_placeholder`; surrounding `%name%/%event_name%/%event_date%` still resolve.
5. **Visual verify:** open the rendered demo email (Chrome MCP screenshot per Iron Rule 34) — single button centered, eye + tag icons present, RTL correct, stock button gone. Attach evidence.
6. Report to Daniel via the Campaign Lead. Wait for Daniel's go to promote.
7. On Daniel's go: promote to prizma via `scripts/promote-config-to-prizma.mjs` (single-row, audit-logged). Confirm Sentinel Mission 11 config-parity green within 24h.

## 7. Stop triggers

- Demo pricing-catalog short link missing → STOP (dependency unmet).
- The live block boundary doesn't match the expected markers (body changed since 2026-05-21) → STOP, re-confirm with the Lead.
- Any `unsubstituted_placeholder` in the test → STOP.
- Visual render shows a broken layout (button not centered, icons missing, RTL broken) → STOP, report to Lead (may need a Copywriter HTML fix).
- Promotion to prizma without Daniel's explicit go → never. Wait.

## 8. Cross-references

- Approved copy + HTML: `roles/campaign-overseer/briefs/2026-05-21_REGOPEN_EMAIL_PRICING_BLOCK_COPY_DRAFT.md` §1.0 + §1.4
- Blocking SPEC request: `roles/campaign-overseer/briefs/2026-05-21_DEMO_STATIC_LINKS_BACKFILL_SPEC_REQUEST.md`
- Analyst findings (why demo lacked the link): `roles/campaign-overseer/analyses/2026-05-21_short_links_screen_visibility.md`
- Iron Rules 33, 34, 35 in `CLAUDE.md`

## 9. Handoff

When done:
1. Update `roles/campaign-overseer/CAMPAIGN_OVERSEER_HANDOFF.md` with the applied change (demo done / prizma promoted).
2. Emit a one-line English status to Daniel.
3. Daniel re-engages the Campaign Lead to confirm closure.

---

*Brief authored by Campaign Lead. Overseer applies demo-first, visual-verifies, promotes on Daniel's go. Blocked until Architect backfills demo short links.*
