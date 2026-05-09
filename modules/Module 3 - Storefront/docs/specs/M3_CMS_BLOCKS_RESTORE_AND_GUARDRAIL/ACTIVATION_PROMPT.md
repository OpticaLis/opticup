# ACTIVATION PROMPT — M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL

**URGENT:** 15 customer-facing pages on prizma-optic.co.il currently render empty bodies (terms, privacy, deal, contact, FAQ, accessibility × 3 langs). Daniel reports them as broken. This SPEC is the hot-fix.

Paste the block below into Claude Code (ERP repo) immediately.

---

```
Execute SPEC at:
modules/Module 3 - Storefront/docs/specs/M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL/SPEC.md

Mode: opticup-executor, Bounded Autonomy. URGENT — production hot-fix.
Repo: opticalis/opticup (ERP). Branch: develop.

INCIDENT: 15 storefront_pages rows for tenant=prizma have blocks::jsonb
stored as type 'string' (often double-encoded) instead of native 'array'.
Astro renderer can't parse → empty page body. Affected:
- /terms/ (he), /privacy/ (he/en/ru), /deal/ (he/en/ru),
  /צרו-קשר/ (he/en/ru), /שאלות-ותשובות/ (he/en/ru), /accessibility/ (he/en/ru)

ROOT CAUSE: M3_PHONE_TEMPLATING_AND_CLEANUP migration on 2026-05-07
did string-level .replace() on jsonb content and saved as string.
Foreman accountability: this SPEC author. Documented in §2.

Three deliverables:
1. Restore 15 rows via two-pass unwrap (zero data loss; content
   preserved in the encoded string). SQL pattern in SPEC §10.
2. Add CHECK constraints to storefront_pages.blocks AND .previous_blocks
   that REJECT future writes of non-array jsonb. Permanent guardrail.
3. Add LEARNINGS L-PROJECT-002 + Site Overseer SKILL.md v0.3 with
   incident case study.

Authorities:
- Level 2 SQL UPDATE on 15 storefront_pages rows — AUTHORIZED.
- Level 3 DDL: 2 ALTER TABLE ADD CONSTRAINT — AUTHORIZED.
- 4 migration files (2 up + 2 down) per SPEC §4 whitelist.
- Vercel redeploy via PR-to-main → Daniel approves merge button.

Order of operations:
  Step 0 sanity → 4-A restore rows → verify count=15 → 4-B+C add CHECK
  constraints → verify constraints fire (test INSERT must fail) → 4-D
  LEARNINGS append → 4-E SKILL update → commit ERP develop → push →
  PR to main → Daniel merges → Vercel auto-deploys → verify live (curl
  15 destinations all non-empty) → final commit + close.

Stop triggers (per SPEC §6 + §7):
- Step 0 count ≠ 15 → STOP
- Two-pass unwrap fails on any row → STOP
- Recovered array is empty for any row → STOP (data loss flag)
- CHECK constraint fails to install → STOP
- More than 15 rows match jsonb_typeof != 'array' → STOP, scope drift
- Any of 15 live destinations still empty after Vercel deploy → STOP

Final deliverable: ONE atomic commit on develop. Commit message starts
with "fix(storefront): restore 15 broken CMS pages + jsonb-array CHECK
constraints + L-PROJECT-002".

Begin Step 0 IMMEDIATELY per SPEC §3.
```

---

**Notes for Daniel:**

- This is a **hot-fix**. Estimated execution: 1.5-2 hours wall time, but the database restore happens in the first ~15 minutes. After that the live site is healthy again (post-Vercel-redeploy ~5 more min). The remaining time is documentation + guardrail installation.
- Risk: LOW. The restore is non-destructive (two-pass unwrap of preserved content). The CHECK constraints are additive and reversible.
- ONE thing you'll do mid-execution: click "Merge" on the PR-to-main on GitHub when Claude Code asks (~30 seconds).
- After restore: every customer-facing legal/contact/FAQ page works again across all 3 languages.
- After guardrail: this exact bug class CANNOT happen again. Any future write of non-array to `storefront_pages.blocks` is rejected at the database layer with a clear error message.
- This was my (Foreman/SPEC-author) failure on 2026-05-07. I'm documenting it openly in the SPEC + LEARNINGS so the same mistake isn't repeated.
