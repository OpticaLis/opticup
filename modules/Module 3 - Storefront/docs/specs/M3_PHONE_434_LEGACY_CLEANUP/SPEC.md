# SPEC — M3_PHONE_434_LEGACY_CLEANUP

**Module:** Module 3 — Storefront
**Author:** opticup-strategic (Site Overseer Foreman)
**Created:** 2026-05-08
**Type:** Cleanup — remove legacy artifacts containing defunct phone `053-434-7265`
**Severity:** CRITICAL closure (closes REC-SITE-002)
**Live impact:** ZERO — these files are NOT referenced by any live page; this is hygiene cleanup

---

## 1. Goal

Close REC-SITE-002 from the 2026-05-08 site audit. Remove the 3 legacy artifacts in the `opticup-storefront` repo that still contain the defunct phone `053-434-7265`:

1. `public/images/lab/israel-hayom-logo.png` — misnamed file (HTML masquerading as a PNG, contains the phone in HTML body).
2. `src/_deprecated/legal-terms.ts` — defunct TypeScript module.
3. `src/_deprecated/legal-privacy.ts` — defunct TypeScript module.

After this SPEC, **0 live, deployed, or build-time-included files** in the storefront contain `053-434-7265`. Only historical `docs/` records (intentionally preserved for audit trail) and auto-regenerable `scripts/seo/output/` cached files will retain mentions, neither of which is customer-facing.

---

## 2. Background — verified live 2026-05-08

### Reference verification (Site Overseer pre-flight)

- **`israel-hayom-logo.png`:** `grep` across the storefront repo finds 2 references — both in `docs/` (historical) and `sql/` (historical migration). **Zero references** in `src/` (Astro source). **Zero references** in `storefront_pages.blocks` for tenant=prizma (verified via Supabase MCP). Conclusion: file is orphaned; safe to delete.
- **`_deprecated/legal-terms.ts` and `_deprecated/legal-privacy.ts`:** `_deprecated/` is by convention an unused-code holding area. Verified no Astro page imports them.
- **`prizma-optice.co.il` typo:** Site Overseer pre-flight confirmed **0 occurrences in the live CMS** (`storefront_pages.blocks` for tenant=prizma). 5 occurrences in storefront repo, all in `docs/TRANSLATION-*` historical archives + 2 in `scripts/seo/output/` cached files (auto-regenerable). **No active customer-facing fix needed.** This is documented in §11.

### Why this SPEC exists

The 053-434-7265 phone-cleanup work was already done at the data layer in M3_PHONE_TEMPLATING_AND_CLEANUP (which replaced 21 CMS-row mentions with the `{{phone_general}}` token). REC-SITE-002 from the audit also flagged 3 file-level artifacts that the CMS-row work didn't address. This SPEC closes the file-level half.

---

## 3. Step 0 — Reproduce-the-bug-first (MANDATORY)

```bash
# 1. Confirm all 3 target files exist:
ls -la opticup-storefront/public/images/lab/israel-hayom-logo.png
ls -la opticup-storefront/src/_deprecated/legal-terms.ts
ls -la opticup-storefront/src/_deprecated/legal-privacy.ts
# expected: all 3 exist

# 2. Confirm none of the 3 are imported / referenced by live Astro source:
cd opticup-storefront
grep -rn "israel-hayom-logo" src/        # expected: 0 results in src/
grep -rn "_deprecated/legal-terms" src/  # expected: 0 results
grep -rn "_deprecated/legal-privacy" src/ # expected: 0 results
grep -rn "from.*_deprecated" src/        # expected: 0 results

# 3. Confirm 053-434-7265 still exists ONLY in the 3 target files (within src/ and public/):
grep -rln "053-434-7265" src/ public/
# expected: exactly 3 files matching the §1 list

# 4. Live homepage no longer renders 053-434-7265:
curl -sL "https://www.prizma-optic.co.il/" -A "Mozilla/5.0" | grep -c "053-434-7265"
# expected: 0
```

If any check deviates → STOP. Especially: if step 2 shows ANY import in `src/`, do not proceed; investigate the dependency.

---

## 4. Scope

### In scope (delete the 3 files in storefront repo)

1. `opticup-storefront/public/images/lab/israel-hayom-logo.png` — DELETE
2. `opticup-storefront/src/_deprecated/legal-terms.ts` — DELETE
3. `opticup-storefront/src/_deprecated/legal-privacy.ts` — DELETE

### Out of scope

- The `prizma-optice.co.il` typo. Verified 0 occurrences in live CMS; the 5 file-level occurrences are all historical archives or auto-regenerable. No active fix needed.
- The `_deprecated/` folder itself. If after these 2 file deletes the folder becomes empty, the executor MAY delete the empty folder, but this is not required.
- Any CMS row updates. M3_PHONE_TEMPLATING_AND_CLEANUP already handled those.
- Historical `docs/` files (intentionally preserved per the project's historical-record discipline).
- `scripts/seo/output/*.json` files (auto-regenerable; will refresh next SEO sync).

### Whitelist of write paths

**Storefront repo** (`opticup-storefront`):
1. DELETE `public/images/lab/israel-hayom-logo.png`
2. DELETE `src/_deprecated/legal-terms.ts`
3. DELETE `src/_deprecated/legal-privacy.ts`
4. (optional) DELETE empty `src/_deprecated/` folder if no other files remain

**ERP repo** (`opticup`):
5. CREATE `modules/Module 3 - Storefront/docs/specs/M3_PHONE_434_LEGACY_CLEANUP/EXECUTION_REPORT.md`
6. CREATE `modules/Module 3 - Storefront/docs/specs/M3_PHONE_434_LEGACY_CLEANUP/FINDINGS.md`
7. UPDATE `__LAUNCH_PLAN_DRAFT__/site-overseer/SITE_OVERSEER_HANDOFF.md` (mark REC-SITE-002 closed)
8. APPEND to `__LAUNCH_PLAN_DRAFT__/site-overseer/DECISIONS_LOG.md`

No DB writes. No deploys (file-level cleanup only; no live runtime change since these files weren't referenced by live code).

---

## 5. Success Criteria

| # | Criterion | Verification | Expected |
|---|---|---|---|
| 1 | Step 0 sanity passed | Step 0 outputs | All 4 sub-checks PASS |
| 2 | The 3 storefront files no longer exist | `ls` after delete | All 3 absent |
| 3 | NO references remain in `src/` to any of the deleted files | `grep -rn "israel-hayom-logo\|_deprecated/legal" opticup-storefront/src/` | 0 results |
| 4 | NO occurrences of `053-434-7265` remain in storefront `src/` or `public/` | `grep -rln "053-434-7265" opticup-storefront/src/ opticup-storefront/public/` | 0 results |
| 5 | Storefront builds cleanly | `npm run build` (storefront) | exit 0, no missing-import errors |
| 6 | Storefront commit on develop | `git log -1 --oneline` (storefront) | one commit, message starts `chore(storefront): remove legacy 053-434-7265 artifacts` |
| 7 | ERP commit on develop | `git log -1 --oneline` (ERP) | one commit, message starts `chore(spec): close M3_PHONE_434_LEGACY_CLEANUP` |
| 8 | Both repos clean post-commit | `git status` in each | `nothing to commit, working tree clean` |
| 9 | ERP integrity gate clean | `npm run verify:integrity` | exit 0 |
| 10 | Live storefront unaffected | `curl -sL https://www.prizma-optic.co.il/` returns 200 + non-empty body | PASS |
| 11 | Live homepage still has 0 occurrences of `053-434-7265` | `curl + grep` | 0 |

---

## 6. Autonomy Envelope

**Executor MAY autonomously:**
- DELETE the 3 files explicitly listed in §4.
- Build + verify storefront locally.
- Commit + push BOTH repos to `develop` ONCE each.
- Open the GitHub PR from develop → main on storefront repo.

**Executor MUST stop and report:**
- Step 0 reveals any `src/` reference to one of the 3 target files → STOP, dependency must be resolved first.
- `npm run build` fails post-delete → STOP and roll back.
- A 4th file containing `053-434-7265` appears in `src/` or `public/` that wasn't in §1 list → STOP, scope drift.

**Executor MUST NOT:**
- Push directly to main (Daniel-only PR-merge).
- Modify ANY file beyond the 4 deletes + 2 commits.
- Touch `docs/` historical files.
- Touch `scripts/seo/output/*.json` files.

---

## 7. Stop-on-Deviation Triggers

In addition to global:
- If `src/_deprecated/` contains files OTHER than the 2 named (legal-terms, legal-privacy) → leave it intact and document; do NOT mass-delete a folder of unknown content.

---

## 8. Expected Final State

**On storefront repo `develop` (commit hash X):**
- 3 files deleted as named.

**On ERP repo `develop` (commit hash Y):**
- SPEC folder populated with EXECUTION_REPORT + FINDINGS.
- HANDOFF + DECISIONS_LOG updated.

**On production:** NO change observed by any user. The 3 deleted files were not referenced by live code.

**Daniel's experience:** REC-SITE-002 marked CLOSED in HANDOFF. The defunct phone `053-434-7265` is now fully eliminated from the customer-facing surface (CMS rows handled in earlier SPEC; file-level handled here).

---

## 9. Commit Plan

**Storefront commit:**
```
chore(storefront): remove legacy 053-434-7265 artifacts

Closes REC-SITE-002 (file-level half). Deletes:
- public/images/lab/israel-hayom-logo.png (misnamed HTML, NOT a PNG)
- src/_deprecated/legal-terms.ts (defunct module)
- src/_deprecated/legal-privacy.ts (defunct module)

All 3 verified zero references from live Astro source. Live storefront
unaffected. CMS-row cleanup of the same phone was completed earlier in
M3_PHONE_TEMPLATING_AND_CLEANUP.

SPEC: opticup ERP repo modules/Module 3 - Storefront/docs/specs/M3_PHONE_434_LEGACY_CLEANUP/SPEC.md
```

**ERP commit:**
```
chore(spec): close M3_PHONE_434_LEGACY_CLEANUP

EXECUTION_REPORT + FINDINGS documenting the storefront cleanup.
Site Overseer HANDOFF updated to mark REC-SITE-002 CLOSED.
```

---

## 10. Methodology

The deletes are simple `git rm`. After delete, run `npm run build` to confirm no orphan import causes a build failure. If build passes, commit & push. If build fails, STOP — there's a hidden dependency that Step 0 missed; investigate before re-attempting.

PR to main on storefront: open the compare URL (Daniel clicks Merge).

---

## 11. Cross-Reference Check (Step 1.5)

Performed 2026-05-08 by SPEC author:

- **`israel-hayom-logo.png`:** 2 references in storefront repo — both in `docs/` and `sql/` (historical). **0 in `src/`**. ✓
- **`_deprecated/legal-terms.ts` and `_deprecated/legal-privacy.ts`:** by `_deprecated/` naming convention they are unused. Confirmed no Astro page imports `from '../_deprecated/...'` or similar. ✓
- **`prizma-optice.co.il` typo:** **0 occurrences in live CMS** (verified 2026-05-08 via `SELECT slug, lang FROM storefront_pages ... WHERE blocks::text LIKE '%prizma-optice%'` returned empty). 5 occurrences in storefront repo: 3 in `docs/TRANSLATION-*` (historical, preserved per discipline) + 2 in `scripts/seo/output/*.json` (auto-regenerable cache). **No live customer-facing fix needed.** This finding from REC-SITE-002 is closed-as-already-resolved-by-prior-SPEC.
- **L-PROJECT-001 (no decorative real-looking demo values):** N/A — no new demo values introduced.
- **L-PROJECT-002 (jsonb writes require type preservation):** N/A — no DB writes.

**0 collisions.** SPEC ready for dispatch.

---

## 12. Lessons already incorporated

- §3 Step 0 verifies absence of imports BEFORE deletion (avoids the `npm run build` failure path).
- §6 stop trigger on unexpected `_deprecated/` contents prevents mass-deletion of unknown files.
- §11 Cross-Reference Check verified the typo issue is non-actionable, narrowing the SPEC's scope to a clean 3-file delete.

---

## 13. Estimated effort

- 15-30 minutes executor wall time. Two atomic commits, one PR-merge by Daniel.

---

## 14. Definition of Done

All 11 success criteria pass. Two commits (storefront + ERP). Both repos clean. REC-SITE-002 marked CLOSED in Site Overseer HANDOFF. The defunct phone is fully gone from active customer-facing surface.

---

*End of SPEC.*
