# SPEC — M3_SUPERSALE_CHECKBOX_COMMA_FIX

> **Location:** `modules/Module 3 - Storefront/docs/specs/M3_SUPERSALE_CHECKBOX_COMMA_FIX/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, Site Overseer hat)
> **Authored on:** 2026-05-13
> **Module:** 3 — Storefront
> **Repo:** Supabase (DB UPDATE only) + `opticup` (ERP docs)

---

## 1. Goal

Replace the inner comma in the marketing-consent checkbox label on `/supersale/` (3 langs: he/en/ru) with a non-splitting separator, so the shortcode parser stops splitting the label into a third orphan checkbox. The form on `/supersale/` should render exactly TWO checkboxes (terms + marketing), not three.

---

## 2. Background & Motivation

Daniel screenshot 2026-05-13 (post-deploy of M3_SUPERSALE_MARKETING_CHECKBOX) showed THREE checkboxes on `/supersale/`:
1. תקנון האירוע ולמדיניות דמי הפיקדון *
2. שלחו לי קופונים והטבות מיוחדות — לפני כולם (כולל שימוש בקוקיז שיווקיים
3. מדיניות פרטיות)

Root cause: the `[lead_form]` shortcode's `checkboxes=` parameter splits on commas. The new HE label contains an internal comma ("…כולל שימוש בקוקיז שיווקיים, {link:/privacy/}מדיניות פרטיות{/link})") — the parser splits at that comma and renders the closing parenthesis + link as a third checkbox.

The TERMS checkbox (first one) has no internal comma and works correctly.

Fix: rewrite the marketing label using an em-dash (`—`) instead of an internal comma. Same result visually, no parser change required, no code change.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Pre-flight: HE blocks[1].data.html `checkboxes=` value contains the buggy comma | grep returns the current 3-comma string | SQL probe |
| 2 | After UPDATE: HE label has em-dash instead of inner comma | New HE inside `checkboxes=`: `שלחו לי קופונים והטבות מיוחדות — לפני כולם (כולל שימוש בקוקיז שיווקיים — {link:/privacy/}מדיניות פרטיות{/link})` (em-dash before "מדיניות") | SQL probe |
| 3 | Same for EN | `Send me exclusive coupons & special offers — before everyone else (includes use of marketing cookies — {link:/privacy/}privacy policy{/link})` | Same |
| 4 | Same for RU | `Присылайте мне эксклюзивные купоны и специальные предложения — раньше всех (включая маркетинговые куки — {link:/privacy/}политика конфиденциальности{/link})` | Same |
| 5 | Post-state: `jsonb_typeof(blocks) = 'array'` for all 3 rows | array | SQL probe |
| 6 | Post-state: `jsonb_array_length(blocks) = 12` for all 3 rows | 12 | SQL probe |
| 7 | Live verification (post-update, no deploy needed — DB-live) | `/supersale/` renders EXACTLY 2 checkboxes on each lang | Manual screenshot |
| 8 | Pixel still fires when marketing checkbox is ticked | Same flow as before, Network shows fbevents.js + PageView + Lead | Manual Daniel verification |
| 9 | Backups | Pre-update JSON for all 3 rows saved to `BACKUPS/` | `ls BACKUPS/` → 3 files |
| 10 | ERP commit closes the loop | HANDOFF + DECISIONS_LOG updated; this SPEC folder gets EXECUTION_REPORT + FINDINGS | `git log origin/develop..HEAD --oneline` → 1 |

---

## 4. Autonomy Envelope

- Level 1 read SQL pre-flight on `storefront_pages`
- Level 2 UPDATE on 3 rows of `storefront_pages` — pre-authorized by this SPEC for the marketing checkbox label only. Backup BEFORE update.
- ERP commit: HANDOFF + DECISIONS_LOG + retrospective files
- Push to ERP `develop`
- NO code change. NO storefront repo touch. NO Vercel deploy needed (storefront reads CMS at runtime — verified 2026-05-06 via the `business_phone` UPDATE precedent).

### Stops
- Any UPDATE that touches anything other than the marketing checkbox label substring
- Any code change in the storefront repo
- Merge to main (not applicable — no storefront commit)

---

## 5. Stop-on-Deviation Triggers

- If pre-flight HE doesn't match expected current value → STOP
- If post-update SELECT shows fewer/more than 2 substring replacements per row → STOP and rollback
- If `jsonb_typeof` is anything other than `'array'` after the UPDATE → STOP and rollback (L-PROJECT-002 anti-pattern)

---

## 6. Rollback Plan

Restore from `BACKUPS/{lang}_blocks_pre_update.json` via 3 Level-2 UPDATEs. <30 seconds.

---

## 7. Destructive Operations

**1. SQL UPDATE on 3 rows of `storefront_pages`** (`tenant_id=prizma`, `slug='/supersale/'`, lang IN ('he','en','ru')) — `blocks` JSONB modified to replace one specific text inside `blocks[1].data.html`. Authorized 2026-05-13 in chat by Daniel ("נלך עם ההמלצה שלך. תתקן"). Pre-update backup JSON written to `BACKUPS/{lang}_blocks_pre_update.json` per Criterion 9. Pattern: parse-then-modify (driver re-serializes the array), NOT raw text replace (L-PROJECT-002 anti-pattern).

No other destructive operations. No DROP/DELETE/TRUNCATE/ALTER. No force-push. No file deletions. No main-branch modifications.

---

## 8. Out of Scope

- The shortcode parser at `src/lib/shortcodes/lead-form.ts` — Daniel chose the data-side fix, not the parser fix
- The terms checkbox — unchanged
- The form structure — unchanged
- The Pixel wiring (M3_SUPERSALE_MARKETING_CHECKBOX work) — unchanged, will still work after this fix
- The cookie banner — already suppressed, unchanged
- `/quick-register/` — out of scope

---

## 9. Expected Final State

### DB state (3 rows updated)
- HE `/supersale/`: inner-comma between "שיווקיים" and "{link:" replaced with ` — ` (space em-dash space)
- EN `/supersale/`: inner-comma between "cookies" and "{link:" replaced with ` — `
- RU `/supersale/`: inner-comma between "куки" and "{link:" replaced with ` — `

### New files in this SPEC folder
- `BACKUPS/he_blocks_pre_update.json`
- `BACKUPS/en_blocks_pre_update.json`
- `BACKUPS/ru_blocks_pre_update.json`
- `EXECUTION_REPORT.md`
- `FINDINGS.md` (if any)

### ERP docs
- `roles/site-overseer/SITE_OVERSEER_HANDOFF.md` — add REC-SITE-023 closed
- `roles/site-overseer/DECISIONS_LOG.md` — append closure entry under 2026-05-13

---

## 10. Commit Plan

**Single ERP commit:**
- Files: HANDOFF + DECISIONS_LOG + this SPEC folder's BACKUPS + EXECUTION_REPORT + FINDINGS
- Message:
  ```
  docs(site-overseer): close REC-SITE-023 (supersale checkbox comma fix)

  Replaced inner comma in /supersale/ marketing checkbox label with em-dash
  in 3 langs (he/en/ru). Shortcode parser splits on commas; the comma was
  creating an orphan third checkbox. Em-dash renders the same visually.

  DB rows updated: 3 (storefront_pages /supersale/ he/en/ru — label only).
  Backups: BACKUPS/{he,en,ru}_blocks_pre_update.json.
  No storefront commit, no deploy — CMS content is DB-live.

  Refs: SPEC M3_SUPERSALE_CHECKBOX_COMMA_FIX
  ```

---

## 11. Dependencies / Preconditions

- M3_SUPERSALE_MARKETING_CHECKBOX must be CLOSED (it is — commit 82f820b, merged to main, deployed)
- ERP repo on `develop`, scope-clean

---

## 12. Lessons Already Incorporated

- L-PROJECT-002 — parse-then-modify for jsonb arrays. APPLIED in §7.
- L-SITE-002 — "supersale" = `/supersale/`. APPLIED in §1 (correct page from the start).
- M3_QUICK_REGISTER_MARKETING_PRETICK_REMOVAL Author Proposal 1 — explicit Destructive Operations. APPLIED in §7.
- M3_QUICK_REGISTER_MARKETING_PRETICK_REMOVAL Author Proposal 2 — Protocol artifacts. APPLIED in §9.

**Cross-Reference Check (Rule 21):** No new symbols. Sweep N/A.

---

*End of SPEC.*
