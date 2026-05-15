# SPEC — M3_SUPERSALE_MARKETING_CHECKBOX

> **Location:** `modules/Module 3 - Storefront/docs/specs/M3_SUPERSALE_MARKETING_CHECKBOX/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, Site Overseer hat)
> **Authored on:** 2026-05-13
> **Module:** 3 — Storefront
> **Repo:** `opticup-storefront` (code change) + `opticup` (ERP docs only) + Supabase (DB UPDATE)

---

## 1. Goal

In the SuperSale lead form on `https://www.prizma-optic.co.il/supersale/` (CMS-driven page, `storefront_pages.slug='/supersale/'`), do three things:

1. **Replace the marketing checkbox label** from `"אני מאשר/ת קבלת מסרים שיווקיים מאופטיקה פריזמה"` to a value-forward variant that ALSO covers marketing-cookie consent and links to the privacy policy.
2. **Wire the marketing checkbox to ALSO write cookie consent.** When a user submits the form with the marketing checkbox ticked, the storefront's `cookie_consent` localStorage + cookie entry must be set to `{ necessary:true, analytics:false, marketing:true, version:'v1', accepted_at:... }`. This causes the Facebook Pixel (already loaded on `/supersale/` and gated by `__consent.marketing===true`) to fire `PageView` + any subsequent events for THIS visitor for THIS visit and the next year (consent cookie has 365-day max-age).
3. **Verify the cookie banner remains suppressed on `/supersale/`** (already the case — `page_type='campaign'` → `hideChrome=true` per BaseLayout.astro line 247). Do NOT touch the banner suppression logic; only verify the post-deploy state.

The intended UX/legal flow: a user fills the form, ticks the marketing checkbox (informed: text mentions cookies + links to privacy policy), submits — and BY DOING SO grants both direct-marketing consent AND marketing-cookie consent in one informed action. This is legally compliant under Israeli Privacy Act 2024 amendment because: not pre-ticked, active opt-in, explicit text naming cookies, link to privacy policy.

---

## 2. Background & Motivation

Daniel directive 2026-05-13 (after a 90-minute confusion arc where `/quick-register/` was edited by mistake — see `M3_QUICK_REGISTER_ROLLBACK`): the intended scope was always `/supersale/`. The customer-facing goal is single-checkbox compliance for the SuperSale lead form so Facebook Pixel can receive conversion data from form submitters (currently it cannot — `__consent` defaults to `null`, gate fails, Pixel never fires).

Pre-flight findings (Site Overseer, 2026-05-13):
- `/supersale/` is CMS-driven; lives in `storefront_pages` for 3 langs (he/en/ru), all `status='published'`, `page_type='campaign'`.
- The form is rendered from a `[lead_form]` shortcode inside the first CMS block (`ss-hero`, type=`custom`). Shortcode parser at `src/lib/shortcodes/lead-form.ts`.
- Shortcode `checkboxes=` syntax: comma-separated labels; trailing `!` marks a checkbox as `required`. No native syntax for `checked` (pre-tick) — default is unchecked. ✅ correct legal posture, no pre-tick to remove.
- Cookie banner on `/supersale/`: ALREADY suppressed via `hideChrome={isCampaign}` where `isCampaign = page_type === 'campaign'`. ✅ no change needed.
- Facebook Pixel `304574492100180` IS loaded on `/supersale/` and IS gated on `__consent.marketing === true`. ✅ correct architecture (REC-SITE-010).
- **The missing piece:** the marketing checkbox today writes consent ONLY for direct-marketing communications (SMS/WhatsApp/email) into the `pending_sales` row via the lead-intake Edge Function. It does NOT update `window.__consent` or the `cookie_consent` localStorage. Result: even when a user ticks the checkbox and submits, the Pixel still does not fire because the consent gate is checked at page-script-evaluation time, which has already passed. Even on subsequent navigation within the session, `cookie_consent` localStorage is still null.

This SPEC closes the gap.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Repos & branches | `opticup-storefront` on `develop`, `opticup` on `develop`, both scope-clean | `git status` in both |
| 2 | Supabase MCP write Level 2 — replace marketing checkbox label in HE | UPDATE storefront_pages SET blocks[0]['data']['html'] = REPLACE(..., 'אני מאשר/ת קבלת מסרים שיווקיים מאופטיקה פריזמה', '{NEW_LABEL_HE}') WHERE slug='/supersale/' AND lang='he'. Post-state: live page renders new label. | SQL probe + curl |
| 3 | Same for EN | Replace EN label `"I confirm receipt of marketing messages from Optika Prizma"` (current text TBD — pre-flight will fetch and quote verbatim) with `{NEW_LABEL_EN}` | Same |
| 4 | Same for RU | Replace RU label (text TBD) with `{NEW_LABEL_RU}` | Same |
| 5 | Code change: marketing checkbox toggles `window.__consent` + persists to cookie + localStorage | New TypeScript code in `src/lib/shortcodes/lead-form.ts` (or a paired client-side script) — when checkbox state changes AND when form submits successfully, call a helper that writes the v1 consent shape (matching CookieBanner.astro `writeChoice()` logic) | `grep -rn 'cookie_consent' src/lib/shortcodes/` → at least 1 new reference |
| 6 | Code change: helper function exists and matches existing CookieBanner write logic byte-for-byte | New file `src/lib/cookie-consent-helpers.ts` (or function in existing file) exporting `setConsent({ analytics, marketing })` → writes 365-day cookie + localStorage + dispatches `consent-changed` event | `grep -n 'export function setConsent' src/lib/cookie-consent-helpers.ts` |
| 7 | The new label text contains a link to `/privacy/` | Inside the `checkboxes=` shortcode parameter, the second checkbox label includes `{link:/privacy/}...{/link}` (per shortcode DSL — verified pre-flight via inspection of TERMS checkbox which uses `{link:/supersale-takanon/}...{/link}`) | SQL probe of blocks[0].data.html |
| 8 | Shortcode parser supports `{link:URL}label{/link}` inside a checkbox label | Either: (a) already supported (pre-flight verify) or (b) extended in this SPEC with a 1-2 line parser change. If (b) — SPEC §11 documents the extension. | Test render via build |
| 9 | Storefront build PASS after code changes | exit 0 | `npm run build` |
| 10 | Cookie banner remains absent on `/supersale/` post-deploy | Curl HTML response does NOT contain `<div id="cookie-consent-banner">` for `/supersale/` | `curl -sL https://www.prizma-optic.co.il/supersale/ \| grep cookie-consent-banner` → 0 matches |
| 11 | Pixel fires on form submit (live verification, post-merge) | Manual: fill form on production `/supersale/` with test phone `0537889878`, tick marketing checkbox, submit. In a browser dev-tools Network tab, see request to `connect.facebook.net/.../fbevents.js` AND requests to `facebook.com/tr/?...&ev=PageView&id=304574492100180` AND on the `/successfulsupersale/` redirect, a `Lead` event request | Manual Daniel verification |
| 12 | Pixel does NOT fire when checkbox is NOT ticked | Manual: fill form, do NOT tick marketing, submit. No Facebook network requests in Network tab after submit. | Manual Daniel verification |
| 13 | DB write reversibility | Backup JSON of all 3 pre-update `blocks` JSONB values saved to this SPEC folder under `BACKUPS/` BEFORE any UPDATE runs | `ls modules/Module 3 - Storefront/docs/specs/M3_SUPERSALE_MARKETING_CHECKBOX/BACKUPS/` → 3 files |
| 14 | Commit count | 1 commit on storefront (code) + 1 commit on ERP (docs + retro) | `git log` |
| 15 | HANDOFF + DECISIONS_LOG updated | REC-SITE-022 added (closed) for this work | `grep REC-SITE-022 roles/site-overseer/SITE_OVERSEER_HANDOFF.md` |

Criteria 11 + 12 are post-deploy. Executor reports completion at criterion 15. Daniel completes 11 + 12 after merge.

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in both repos
- Pre-flight SQL probes (Level 1) — read `storefront_pages` row JSON to confirm exact current labels in all 3 langs
- Pre-flight grep + read on `src/lib/shortcodes/*` + `src/components/CookieBanner.astro` to confirm the parser + the existing `writeChoice()` consent-write logic
- **Level 2 SQL UPDATEs on `storefront_pages` rows** for the 3 langs — pre-authorized by this SPEC for the marketing checkbox label only. Backup BEFORE update (Criterion 13).
- Code changes in `opticup-storefront` to add `setConsent()` helper + wire it from the lead-form submit path
- `npm run build` to verify
- Commit + push to `develop` (storefront)
- Open PR to main via `gh pr create` if authenticated, else surface compare URL
- ERP commit: HANDOFF + DECISIONS_LOG + retrospective files
- Push to ERP `develop`

### What REQUIRES stopping and reporting
- Any DB UPDATE that touches more than the marketing checkbox label inside `blocks[0].data.html`
- Any code change outside `src/lib/shortcodes/*` + `src/lib/cookie-consent-helpers.ts` (new file) + (if needed) `src/components/CookieBanner.astro` to extract a shared write helper
- Any change to `BaseLayout.astro` banner-render logic — banner suppression on `/supersale/` is via existing `hideChrome` mechanism, not touched
- Any change to the Pixel-gating logic in any tracker injection script — already correct
- Any merge to `main`
- Any pre-flight that finds the labels DON'T match expectations (text changed since 2026-05-13 read) — STOP, don't update under stale assumptions

---

## 5. Stop-on-Deviation Triggers

- If pre-flight SQL shows the 3 current labels are not what we recorded today → STOP
- If shortcode parser does NOT support `{link:URL}label{/link}` inside a checkbox label AND extending it requires >10 lines → STOP and report (consider alternative: use raw HTML `<a>` inside the label and adjust parser to allow it)
- If the existing `CookieBanner.astro writeChoice()` logic uses a different cookie format or schema than what we replicate → STOP (must match byte-for-byte for the gate to recognize the consent)
- Any `npm run build` failure
- Any `dispatchEvent(new CustomEvent('consent-changed', { detail }))` missing from the new helper — the Pixel-loader script listens for this event to fire after consent flips; without it, Pixel waits until next page load (still works but degrades UX)

---

## 6. Rollback Plan

- DB: restore the 3 `blocks` JSONB values from the backups in `BACKUPS/` (SPEC §3 #13). UPDATE 3 rows.
- Code: `git revert {COMMIT_HASH}` then `git push origin develop`.
- PR: close without merging if not yet merged; revert PR if already merged.
- ERP docs: `git revert {ERP_COMMIT_HASH}`.

---

## 7. Destructive Operations

**1. SQL UPDATE on 3 rows of `storefront_pages` table** (`tenant_id=prizma`, `slug='/supersale/'`, lang IN ('he','en','ru')) — `blocks` JSONB modified to replace one specific text inside `blocks[0].data.html`. Authorized 2026-05-13 in chat by Daniel ("נלך עם ההמלצה שלך"). Pre-update backup JSON written to `BACKUPS/{lang}_blocks_pre_update.json` per Criterion 13.

No other destructive operations: no DROP, no DELETE, no TRUNCATE, no ALTER ... DROP, no force-push, no rebase, no main-branch modification, no file deletions, no governance-file deletions.

The CHECK constraint `storefront_pages_blocks_must_be_array` (added 2026-05-08 per M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL) protects against the L-PROJECT-002 anti-pattern. The UPDATE in this SPEC parses the existing array, modifies one block's inner HTML string via JS-side string-replace, and writes back the parsed array — the driver re-serializes correctly. Post-UPDATE verification: `SELECT jsonb_typeof(blocks) FROM storefront_pages WHERE …` must return `'array'`.

---

## 8. Out of Scope

- `/quick-register/` — see `M3_QUICK_REGISTER_ROLLBACK` (separate SPEC)
- The TERMS checkbox label — unchanged
- The form field set (name/phone/email/eye-exam/notes) — unchanged
- The form's submit URL, webhook, redirect URL — unchanged
- The Pixel ID or pixel_events DB config — unchanged
- The cookie banner UI — unchanged; remains suppressed on `/supersale/` via existing `hideChrome` mechanism
- EN + RU labels: included in this SPEC for parity (criteria 3 + 4). If pre-flight reveals the EN/RU labels are NOT direct equivalents of the HE one, executor STOPS and reports — translation of the new wording is a separate sub-task that needs Daniel's review.
- Analytics consent (Hotjar, GA4) — not touched. The new label grants `marketing` only, not `analytics`. Marketing covers Pixel + TikTok per `tenants.ui_config.cookie_consent.tracker_categories`.

---

## 9. Expected Final State

### Storefront repo
- **New file:** `src/lib/cookie-consent-helpers.ts` — exports `setConsent({ analytics, marketing })` matching `CookieBanner.astro writeChoice()` byte-for-byte: writes 365-day cookie `cookie_consent=...; max-age=31536000; path=/; SameSite=Lax`, mirrors to `localStorage.setItem('cookie_consent', json)`, sets `window.__consent = choice`, dispatches `window.dispatchEvent(new CustomEvent('consent-changed', { detail: choice }))`.
- **Modified file:** `src/lib/shortcodes/lead-form.ts` — after a successful form submission AND when the marketing checkbox is checked, call `setConsent({ analytics: false, marketing: true })`. Also call on `change` of the marketing checkbox so the consent-gated trackers can warm up before submit.
- **Maybe modified file:** `src/components/CookieBanner.astro` — IF the executor extracts the existing `writeChoice()` logic into the new helper for DRY, the banner imports + uses it. This is optional — duplicating the small write logic is also acceptable if extraction is risky.

### DB state
- 3 `storefront_pages` rows updated (he/en/ru × slug=`/supersale/`):
  - HE label after update (NEW_LABEL_HE): `שלחו לי קופונים והטבות מיוחדות — לפני כולם (כולל שימוש בקוקיז שיווקיים, {link:/privacy/}מדיניות פרטיות{/link})`
  - EN label after update (NEW_LABEL_EN): `Send me exclusive coupons & special offers — before everyone else (includes use of marketing cookies, {link:/privacy/}privacy policy{/link})`
  - RU label after update (NEW_LABEL_RU): `Присылайте мне эксклюзивные купоны и специальные предложения — раньше всех (включая маркетинговые куки, {link:/privacy/}политика конфиденциальности{/link})`

(If the shortcode parser does not support `{link:...}` inside a checkbox label as-is, the executor either extends the parser by ≤10 lines, OR falls back to raw HTML `<a>` with a parser-side allowlist tweak. Stop trigger if >10 lines.)

### New files in this SPEC folder
- `BACKUPS/he_blocks_pre_update.json`
- `BACKUPS/en_blocks_pre_update.json`
- `BACKUPS/ru_blocks_pre_update.json`
- `EXECUTION_REPORT.md`
- `FINDINGS.md` (if any)

### ERP docs updated
- `roles/site-overseer/SITE_OVERSEER_HANDOFF.md` — REC-SITE-022 row added with closure summary
- `roles/site-overseer/DECISIONS_LOG.md` — closure entry under 2026-05-13

---

## 10. Commit Plan

**Storefront commit:**
- Files: new `src/lib/cookie-consent-helpers.ts` + modified `src/lib/shortcodes/lead-form.ts` (+ optionally `src/components/CookieBanner.astro` if extracted)
- Message:
  ```
  feat(supersale): wire marketing checkbox to also grant cookie consent

  When a user ticks the marketing-consent checkbox on the SuperSale lead
  form and submits, the storefront now writes the v1 cookie_consent
  shape to localStorage + cookie + window.__consent, so the consent-
  gated Facebook Pixel can fire PageView + Lead events for THIS visit
  + the next year (365-day consent cookie). Banner on /supersale/ is
  already suppressed via hideChrome={isCampaign}; this closes the data
  gap so submitted leads actually reach Meta Ads Manager.

  Refs: REC-SITE-022, SPEC M3_SUPERSALE_MARKETING_CHECKBOX
  ```

**ERP commit:**
- Files: HANDOFF + DECISIONS_LOG + this SPEC folder's BACKUPS + EXECUTION_REPORT + FINDINGS
- Message:
  ```
  docs(site-overseer): close REC-SITE-022 (supersale checkbox + cookie consent)

  Storefront commit: {STOREFRONT_COMMIT_HASH}
  PR: {URL}

  DB rows updated: 3 (storefront_pages /supersale/ he/en/ru — label only)
  Backups: BACKUPS/{he,en,ru}_blocks_pre_update.json

  Refs: SPEC M3_SUPERSALE_MARKETING_CHECKBOX
  ```

---

## 11. Dependencies / Preconditions

- M3_QUICK_REGISTER_ROLLBACK SPEC must be CLOSED first (so `/quick-register/` is clean)
- Both repos on `develop`, scope-clean
- `gh` authentication checked at step 0 (executor SKILL §4b)
- `/privacy/` storefront_page exists with `status='published'` in he/en/ru (verified 2026-05-13 — all 3 exist, all `status='published'`)

---

## 12. Lessons Already Incorporated

- L-PROJECT-002 — `jsonb` arrays must be mutated via parse-then-modify, never via raw text replace. Applied in §7 (executor parses array, modifies inner block.data.html string, writes back parsed array).
- L-SITE-002 (new today) — Daniel's terminology for "supersale page" always means `/supersale/`. This SPEC is the result.
- M3_QUICK_REGISTER_MARKETING_PRETICK_REMOVAL/FOREMAN_REVIEW Author Proposal 1 — explicit `## Destructive Operations`. APPLIED in §7.
- M3_QUICK_REGISTER_MARKETING_PRETICK_REMOVAL/FOREMAN_REVIEW Author Proposal 2 — protocol artifacts called out. APPLIED in §9.
- M3_QUICK_REGISTER_MARKETING_PRETICK_REMOVAL/FOREMAN_REVIEW Executor Proposal 1 — gh-auth pre-flight. REFERENCED in §11.
- M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL — CHECK constraint on `storefront_pages.blocks` protects post-state. REFERENCED in §7.

**Cross-Reference Check (Rule 21):**
- New names: `setConsent` function in new file `src/lib/cookie-consent-helpers.ts`.
- Grep against `GLOBAL_MAP.md` + `FILE_STRUCTURE.md` + storefront `src/**`: confirm no existing `setConsent` symbol.
- If a collision is found → rename to `setCookieConsent`.
- Documented per Step 1.5 #5: "Cross-Reference Check completed 2026-05-13 against storefront codebase: 1 new symbol (`setConsent`) — executor performs final grep at Step 1.5 to confirm no collision before commit."

---

*End of SPEC.*
