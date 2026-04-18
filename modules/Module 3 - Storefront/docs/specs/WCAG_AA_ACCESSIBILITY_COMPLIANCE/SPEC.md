# SPEC — WCAG_AA_ACCESSIBILITY_COMPLIANCE

> **Location:** `modules/Module 3 - Storefront/docs/specs/WCAG_AA_ACCESSIBILITY_COMPLIANCE/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-17
> **Module:** 3 — Storefront
> **Phase:** Post-B (standalone compliance SPEC)
> **Author signature:** Cowork session funny-elegant-ptolemy

---

## 1. Goal

Bring the Optic Up storefront to full Israeli Standard 5568 / WCAG 2.0 AA
compliance so Prizma Optics meets its legal obligation under חוק שוויון זכויות
לאנשים עם מוגבלות. This SPEC covers code-level accessibility fixes and the
mandatory accessibility statement page — complementing the UserWay overlay
widget already deployed.

---

## 2. Background & Motivation

Israeli law requires every public-facing website providing commercial services
to conform to IS 5568 (WCAG 2.0 Level AA). Non-compliance exposes the business
to fines up to ₪150,000 and statutory damages of ₪50,000 per plaintiff without
proof of harm. The storefront currently has a UserWay overlay widget (deployed
2026-04-17, commit on main) but lacks code-level compliance. A full audit
(2026-04-17) identified 3 CRITICAL, 4 HIGH, 6 MEDIUM, and 2 LOW issues.

The UserWay widget references `/accessibility/` as the statement URL, but
**that page does not exist**. This is the highest-priority gap.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| SC-1 | Branch state after completion | On `develop`, clean | `git status` → "nothing to commit" |
| SC-2 | Accessibility page exists (HE) | File present | `ls src/pages/accessibility.astro` → exit 0 |
| SC-3 | Accessibility page exists (EN) | File present | `ls src/pages/en/accessibility.astro` → exit 0 |
| SC-4 | Accessibility page exists (RU) | File present | `ls src/pages/ru/accessibility.astro` → exit 0 |
| SC-5 | All `<img>` tags have non-empty alt (or role="presentation" for decorative) | 0 violations | `grep -rn 'alt=""' src/components/ --include="*.astro"` → only decorative images with explicit `role="presentation"` |
| SC-6 | All modal/lightbox elements have role="dialog" + aria-modal="true" | Present in CampaignLightbox.astro, ProductImageCarousel.astro | Manual grep |
| SC-7 | All form error/success messages have aria-live | Present in ContactForm.astro, LeadFormBlock.astro, NotifyMe.astro | `grep -n 'aria-live' src/components/ContactForm.astro` → at least 1 match |
| SC-8 | Mobile menu button has aria-expanded | Present in Header.astro | `grep -n 'aria-expanded' src/components/Header.astro` → at least 1 match |
| SC-9 | No text-gray-300 on interactive/readable elements | 0 occurrences in Header.astro for disabled langs | Manual check |
| SC-10 | Form inputs with required have aria-required="true" | Present in ContactForm.astro | `grep -n 'aria-required' src/components/ContactForm.astro` → at least 1 match |
| SC-11 | FAQ block has proper ARIA | aria-expanded on details/summary | `grep -n 'aria-expanded' src/components/blocks/FaqBlock.astro` → at least 1 match |
| SC-12 | Build passes | 0 errors | `npm run build` → exit 0 |
| SC-13 | No TypeScript errors | 0 errors | `npx tsc --noEmit` → exit 0 (or build success) |
| SC-14 | Homepage renders correctly | No visual regression | Manual browser check on localhost:4321 |
| SC-15 | i18n keys added for accessibility page | Keys present in he.json, en.json, ru.json | `grep 'accessibility' src/i18n/he.json` → at least 1 match |
| SC-16 | Commits produced | 4–6 commits | `git log origin/develop..HEAD --oneline` |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in the storefront repo
- Create new `.astro` pages for accessibility statement (3 languages)
- Add i18n translation keys for accessibility content
- Edit existing `.astro` components to add ARIA attributes, aria-live, aria-expanded, aria-required, role="dialog", aria-modal
- Replace `alt=""` with meaningful alt text (sourced from context: brand name, product name, event title)
- Change `text-gray-300` to `text-gray-500` on disabled language selectors
- Add `role="presentation"` to genuinely decorative images
- Add focus trap script to modal/lightbox components
- Run build, TypeScript check, and full-test.mjs
- Commit and push to `develop`

### What REQUIRES stopping and reporting
- Any modification to `vercel.json` (currently fragile — just fixed corruption)
- Any modification to files in `FROZEN_FILES.md`
- Any change to Supabase Views or DB schema
- Any change to `BaseLayout.astro` HEAD section (SEO-sensitive)
- Any change that causes `npm run build` to fail
- Any change to routing/URL structure
- Any component that renders visually different after the change (beyond intended fixes)

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- If `npm run build` fails after any commit → STOP, revert last commit, report
- If any `.astro` file exceeds 350 lines after editing → STOP, split first
- If adding ARIA attributes changes the visual layout (elements shifting, appearing/disappearing) → STOP, investigate
- If the accessibility page build produces hydration errors → STOP, report
- If any i18n key conflicts with existing keys → STOP, rename

### STOP-ESCALATE (requires Daniel)
- If the accessibility statement needs legal text that isn't covered by the template below → STOP, ask Daniel

### STOP-SUMMARIZE (executor decides, reports at end)
- Minor whitespace or formatting inconsistencies found during editing
- Existing code style inconsistencies noticed but outside scope

---

## 6. Rollback Plan

- **Code rollback:** `git reset --hard {START_COMMIT}` where START_COMMIT is the commit hash on develop before this SPEC starts
- **No DB changes** in this SPEC — rollback is purely git
- **No Vercel config changes** — production unaffected until merge to main
- If rollback needed, SPEC is marked REOPEN

---

## 7. Out of Scope (explicit)

Things that look related but MUST NOT be touched:
- `vercel.json` — do not touch, recently fixed corruption
- `BaseLayout.astro` `<head>` section — SEO meta tags, OG tags, analytics scripts
- YouTube video captions — requires content from Daniel (video transcripts), not a code task
- Color scheme / brand palette changes beyond the specific gray-300→gray-500 fix
- UserWay widget configuration — already deployed and working
- Performance optimization — separate concern
- Any Supabase View or DB table
- Any file in the ERP repo (opticup) except this SPEC folder and docs
- `src/lib/` business logic files — this SPEC is presentation-layer only
- Blog post content accessibility (content is CMS-driven, not code)

---

## 8. Expected Final State

### New files
- `src/pages/accessibility.astro` — Hebrew accessibility statement page
- `src/pages/en/accessibility.astro` — English accessibility statement page
- `src/pages/ru/accessibility.astro` — Russian accessibility statement page

### Modified files

**Components (ARIA fixes):**
- `src/components/Header.astro` — aria-expanded on mobile menu button, text-gray-300→text-gray-500
- `src/components/ContactForm.astro` — aria-live on messages, aria-required on inputs, role="alert" on errors
- `src/components/blocks/FaqBlock.astro` — aria-expanded on details/summary
- `src/components/campaign/CampaignLightbox.astro` — role="dialog", aria-modal="true", focus trap, meaningful alt
- `src/components/product/ProductImageCarousel.astro` — role="dialog", aria-modal="true", focus trap, meaningful alt
- `src/components/blocks/EventsShowcaseBlock.astro` — meaningful alt on poster images
- `src/components/NotifyMe.astro` — aria-live on notification message
- `src/components/blocks/LeadFormBlock.astro` — aria-live on success message, aria-required on inputs

**i18n:**
- `src/i18n/he.json` — accessibility page translation keys
- `src/i18n/en.json` — accessibility page translation keys
- `src/i18n/ru.json` — accessibility page translation keys

### Deleted files
- None

### DB state
- No DB changes

### Docs updated (MUST include)
- `SESSION_CONTEXT.md` (storefront repo) — note accessibility SPEC completed
- Module 3 `CHANGELOG.md` (ERP repo) — entry for this SPEC
- Module 3 `SESSION_CONTEXT.md` (ERP repo) — cross-reference

---

## 9. Commit Plan

- **Commit 1:** `feat(a11y): add accessibility statement pages (HE/EN/RU)` — new pages + i18n keys
- **Commit 2:** `fix(a11y): add ARIA attributes to modals and lightboxes` — CampaignLightbox, ProductImageCarousel, focus trap
- **Commit 3:** `fix(a11y): add aria-live to form feedback and aria-required to inputs` — ContactForm, LeadFormBlock, NotifyMe
- **Commit 4:** `fix(a11y): fix heading ARIA, alt text, contrast, and menu toggle` — Header, FaqBlock, EventsShowcaseBlock, misc
- **Commit 5:** `docs(m3): update SESSION_CONTEXT and CHANGELOG for accessibility SPEC`
- **Commit 6:** `chore(spec): close WCAG_AA_ACCESSIBILITY_COMPLIANCE with retrospective` (executor writes EXECUTION_REPORT + FINDINGS)

---

## 10. Dependencies / Preconditions

- Storefront repo `develop` branch must be up to date with `main` (sync the vercel.json fix)
- `npm install` must succeed
- `npm run build` must pass before SPEC starts (baseline health)
- UserWay widget already deployed on production (confirmed 2026-04-17)

---

## 11. Lessons Already Incorporated

- FROM `STOREFRONT_LANG_AND_VIDEO_FIX/FOREMAN_REVIEW.md` → "SPEC should account for possibility that no code change is needed for a given task" → APPLIED: each task in this SPEC is a confirmed code-level issue verified by audit, not assumed.
- FROM `DNS_SWITCH_READINESS_QA/FOREMAN_REVIEW.md` → "Executor caught wrong tenant UUID before dispatch" → APPLIED: no tenant UUIDs in this SPEC (no DB work).
- FROM `STOREFRONT_S2S3_QA/FOREMAN_REVIEW.md` → "SPECs with Level 2+ SQL must include explicit Rollback Plan" → APPLIED: §6 has explicit rollback plan (git-only, no SQL).
- **Cross-Reference Check completed 2026-04-17:** 0 collisions. No new DB objects, functions, or T-constants introduced. All changes are ARIA attributes and new static pages.

---

## 12. Accessibility Statement Content Guide

The accessibility pages MUST include (per IS 5568 requirements):

### Hebrew (primary):
- Site name and owner: read from tenant config (Rule 9)
- Compliance standard: תקן ישראלי 5568, WCAG 2.0 רמה AA
- Accessibility measures taken (general list)
- Known limitations (if any)
- Contact method for accessibility issues: email from tenant config
- Date of last accessibility update
- Widget information (UserWay)

### English and Russian:
- Same content, translated appropriately
- Use existing i18n system

**Content must NOT be hardcoded** — tenant name, email, phone come from
`v_public_tenant` and `v_storefront_config` per Rule 9.

---

## 13. Execution Safety Notes

### Non-Breaking Guarantee
This SPEC is designed to be non-breaking:
- All changes are **additive** (new ARIA attributes, new pages) or **cosmetic** (gray-300→gray-500)
- No HTML structure changes that affect layout
- No CSS class removals
- No JavaScript logic changes
- No routing changes (new pages only)
- No DB changes
- Focus trap scripts use `addEventListener`, not inline handlers — no conflict with existing code

### Testing Protocol
After each commit:
1. `npm run build` — must pass
2. Visual check on localhost:4321 — homepage, product page, brand page, contact page must look identical except for the gray-300→gray-500 change
3. Keyboard-navigate through modified components to verify focus behavior
4. At SPEC end: run `node scripts/full-test.mjs --no-build` if available
