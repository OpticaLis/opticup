# SPEC — M3_REC014_ORPHAN_CLEANUP

**Module:** 3 — Storefront
**Repo:** **mixed** — DB UPDATE (this ERP repo via Supabase) + storefront-side cleanup (`opticalis/opticup-storefront`)
**Status:** Draft, awaiting Daniel approval
**Author:** opticup-strategic (Foreman + Site Overseer hat)
**Source:** REC-SITE-014 in `roles/site-overseer/SITE_OVERSEER_HANDOFF.md` ("Cleanup: orphan poweredBy i18n keys, `_deprecated/` folder, `/test-shortcodes/` archived rows")

---

## §1 Goal

Three orphan/cosmetic cleanup items left over from earlier sessions. None of them affect customer-facing behavior today, but they bloat the codebase + DB and cause future readers to wonder if the references are live. Eliminate all three in one tightly-scoped SPEC.

## §2 Background — measured 2026-05-09

| Item | Where | Pre-flight evidence | Action proposed |
|---|---|---|---|
| **A. `/test-shortcodes/` archived rows** | `storefront_pages` (DB) — 3 rows for prizma (he, en, ru), all `status='archived'` | Confirmed live: SQL pre-flight returned 3 rows with titles "טסט שורטקודים" / "Shortcode Test" / "Тест шорткодов". Customer-facing impact: HE returns `308 → /` (homepage); EN returns `404`. Sitemap correctly omits all 3 (route filter on `status='published'` works). **Already harmless to customers.** | Hard-delete the 3 rows from `storefront_pages` (not soft-delete — these are decommissioned test pages, not customer data). DB-only change. |
| **B. `_deprecated/` folder in storefront repo** | `opticup-storefront/_deprecated/` (filesystem) — exact contents to be confirmed by executor in Step 0 | Cannot pre-confirm from Cowork (storefront repo not mounted). Two reference clues from prior SPECs: (i) M3_PHONE_TEMPLATING_AND_CLEANUP closed M3-DEBT references to "_deprecated/legal-terms.ts artifact" — possibly already deleted by storefront commit `a4723b5` (2026-05-07, Daniel); (ii) REC-SITE-002 noted the typo `prizma-optice.co.il` lived in `_deprecated/` historical archives. | Executor confirms the folder exists; if it does, `git rm -rf opticup-storefront/_deprecated/`. If already gone (closed by `a4723b5`), skip step B and report. |
| **C. orphan `poweredBy` i18n keys** | `opticup-storefront/src/i18n/{he,en,ru}.json` (or wherever i18n strings live) — 3 keys total | Cannot pre-confirm from Cowork. Per REC-SITE-014: 3 langs, 1 key each. Likely a leftover from the WP-era footer "Powered by..." string that's no longer rendered anywhere on the Astro storefront. | Executor greps the storefront codebase for any reference to `poweredBy`/`powered_by`/`PoweredBy` outside the i18n JSON itself. If 0 references → delete from all 3 lang files. If any reference → STOP and surface for Daniel decision. |

All three items are LOW severity per REC-SITE-014 classification. None are customer-blocking. The SPEC's value is hygiene + greppability, not bug fixing.

## §3 Success Criteria (measurable)

After the fix:

1. **Item A:** `SELECT COUNT(*) FROM storefront_pages WHERE tenant_id=prizma AND slug='/test-shortcodes/'` returns **0**.
2. **Item A:** `curl https://www.prizma-optic.co.il/test-shortcodes/` continues to return either 200 (with homepage content via the existing 308 redirect) or 404. Neither is a regression — both mean "no live test page". Customer-facing behavior unchanged.
3. **Item B:** `ls opticup-storefront/_deprecated/ 2>/dev/null` returns nothing OR the path doesn't exist. Either outcome = success (folder is gone).
4. **Item C:** `grep -rn "poweredBy\|powered_by\|PoweredBy" opticup-storefront/src/` returns ONLY matches inside the i18n JSON files BEFORE the fix, and **zero matches** AFTER the fix (deletion completes the cleanup).
5. Storefront `npm run build` exits 0 after all 3 changes.
6. Pre-commit hooks pass on every commit (file-size, frozen-files, rule-23-secrets, rule-24-views-only, image-proxy guard).
7. `git status` clean in BOTH repos after the SPEC closes.
8. Sitemap `<loc>` count unchanged (within ±2) — these items are not in the sitemap.

**SQL-equivalent for SC #1** (per SPEC_TEMPLATE §10 browser-readiness convention):

```sql
SELECT COUNT(*) FROM storefront_pages
WHERE tenant_id = (SELECT id FROM tenants WHERE slug='prizma')
  AND slug = '/test-shortcodes/';
-- Pre-fix: 3. Post-fix: 0.
```

## §4 Autonomy Envelope

**Executor MAY without asking:**
- Run the DB DELETE for item A (Daniel-authorized Level 2 SQL DELETE on archived test data — the rows are not customer data, are status='archived', and are not referenced anywhere).
- Run `git rm -rf _deprecated/` if it exists; report and skip if gone.
- Delete the 3 `poweredBy` keys from the 3 i18n JSON files IF Step 0 grep confirms zero references outside the JSON files themselves.
- Build, commit, push to storefront `develop`.
- Open one PR to storefront `main` with all 3 items bundled (or skip the PR-to-main step if Daniel chose to land on `develop` only — see §10 step 11).

**Executor MUST stop and report on:**
- Step 0 grep for `poweredBy` returns ANY reference outside the i18n JSON files. Don't delete a string that's still rendered somewhere.
- The `_deprecated/` folder contains files whose contents the executor doesn't recognize from the SPEC's expected list. Don't blanket-delete unknown contents.
- DB DELETE for item A: any row count > 3 returned (would mean unexpected /test-shortcodes/ rows beyond the 3 the SPEC accounts for).
- Any other change required (a 4th cleanup item the executor notices) — log as finding, do not include.
- Build failure after any of the 3 changes.

## §5 Stop-on-Deviation Triggers

- DB DELETE returns row count != 3 — STOP.
- Storefront build fails after any of the 3 changes.
- Any image-proxy guard violation (Iron Rule 25) — `_deprecated/` may contain orphan image references; if removing reveals build-time check failures, STOP and report.
- `poweredBy` grep finds an active code reference (e.g. `<Footer>` component still calls `t('poweredBy')`) — STOP, surface to Daniel.
- More than 3 commits land — scope creep; STOP.

## §6 Rollback

- **Item A (DB DELETE):** restore via `INSERT INTO storefront_pages (...)` from pre-execution backup. Executor MUST `SELECT *` the 3 rows to a local JSON file BEFORE the DELETE so rollback is trivial. The JSON file lives inside this SPEC folder as `pre_delete_test_shortcodes_backup.json` and is committed alongside the DELETE-executing commit.
- **Item B (`_deprecated/` deletion):** `git revert <hash>` of the storefront commit.
- **Item C (`poweredBy` keys):** `git revert <hash>` of the storefront commit.

All 3 rollbacks are independent and isolated.

## §7 Out of Scope (explicit)

Things that look related but MUST NOT be touched in this SPEC:

- **Other archived `storefront_pages` rows** (any `status='archived'` row whose slug is NOT `/test-shortcodes/`). Other archived rows may be intentional history.
- **Other folders that look "deprecated" but aren't named `_deprecated/`** (e.g. `_archive/`, `_legacy/`, `backups/`). Only the literal `_deprecated/` folder.
- **Other unused i18n keys** beyond `poweredBy`/`powered_by`/`PoweredBy`. A full unused-i18n-key sweep is a separate, much larger SPEC and likely a TECH_DEBT item.
- The `/multifocal-guide/` 404 mentioned in the M3-DATA-01 finding — that's REC-SITE-014's neighbor REC-SITE-016 territory, not this SPEC.
- ANY view, RPC, schema change. This SPEC is row-DELETE + file-delete + JSON-key-delete only.

### Subset relationships (not applicable)

This SPEC has no predicate-vs-route subset relationship — each of the 3 items is a discrete delete. SC #1 is not a subset count; it's a hard-zero target. No tension between §4 and §7 expected.

## §8 Expected Final State

**DB state (after item A):**
- `storefront_pages` table: 3 fewer rows. Specifically the 3 rows for prizma + slug `/test-shortcodes/` (he, en, ru, all `status='archived'`).

**Storefront repo (after items B + C):**

### Modified files

- `opticup-storefront/src/i18n/he.json` — `poweredBy` key removed (1 line).
- `opticup-storefront/src/i18n/en.json` — same.
- `opticup-storefront/src/i18n/ru.json` — same.

(Executor confirms exact path in Step 0 — could also be `src/locales/{lang}.json` or `src/i18n/{lang}/common.json`.)

### Deleted files

- `opticup-storefront/_deprecated/**/*` — entire folder, IF it still exists.

### New files (in this ERP repo, inside SPEC folder)

- `pre_delete_test_shortcodes_backup.json` — JSON dump of the 3 rows BEFORE the DELETE executes. Trivial rollback artifact.

### Build-side-effect file expectations

- `npm run build` regenerates `src/data/tenant-fallback-map.json` per pre-existing TECH_DEBT M3-DEBT-12. **NOT touched by this SPEC** — executor MUST `git checkout opticup-storefront/src/data/tenant-fallback-map.json` before staging, AND log if drift is anything new beyond the known pattern.
- No other build-side-effect files expected. If executor sees additional drift, log as finding and restore.

### Docs updated (MUST include)

- `roles/site-overseer/SITE_OVERSEER_HANDOFF.md` — REC-SITE-014 marked (closed); 2026-05-09 row added in recent-decisions table.
- `roles/site-overseer/DECISIONS_LOG.md` — new entry "rec014-orphan-cleanup".
- (No GLOBAL_MAP / GLOBAL_SCHEMA / SESSION_CONTEXT updates needed — purely cosmetic.)

## §9 Commit Plan

Up to 3 commits split by repo + concern:

```
[ERP repo, this commit]
chore(spec): backup /test-shortcodes/ rows + execute REC-SITE-014 item A DB cleanup

DELETE 3 archived rows (he/en/ru) for prizma slug=/test-shortcodes/.
Backup file committed alongside for rollback.
SPEC: M3_REC014_ORPHAN_CLEANUP.
```

```
[storefront repo]
chore: remove _deprecated/ folder (REC-SITE-014 item B)

Folder contained pre-Astro WP-era leftovers; no longer referenced.
SPEC: M3_REC014_ORPHAN_CLEANUP in opticup repo.
```

```
[storefront repo]
chore(i18n): remove orphan poweredBy keys (REC-SITE-014 item C)

Verified zero active references via grep before delete.
SPEC: M3_REC014_ORPHAN_CLEANUP in opticup repo.
```

If any item turns out to be already-done (per Step 0 discovery), skip the corresponding commit + note in EXECUTION_REPORT.

Final retrospective commit (in ERP repo):
```
chore(spec): close M3_REC014_ORPHAN_CLEANUP with retrospective
```

## §10 Pre-Merge Checklist

### Browser readiness pre-flight

**Pre-flight (executor):** SPEC's QA is HTTP/SQL/script-based — no browser required. Skip Chrome readiness check.

### Step 0 — DB pre-flight (executor MUST run BEFORE any change)

```sql
-- Confirm exactly 3 rows exist, all archived, for the expected tenant
SELECT id, slug, lang, status, title, updated_at
FROM storefront_pages
WHERE tenant_id = (SELECT id FROM tenants WHERE slug='prizma')
  AND slug = '/test-shortcodes/';
-- Expected: exactly 3 rows, all status='archived'.
-- If count != 3 OR any row has status!='archived' → STOP, surface to Daniel.
```

Save full SELECT result to `pre_delete_test_shortcodes_backup.json` BEFORE running the DELETE.

### Step 0b — Storefront-side pre-flight (executor MUST run BEFORE any change)

```bash
cd opticup-storefront

# Item B: confirm folder existence
ls -la _deprecated/ 2>/dev/null && echo "EXISTS" || echo "ALREADY GONE"

# Item C: confirm zero active poweredBy references outside i18n JSON
grep -rn -E "poweredBy|powered_by|PoweredBy" src/ \
  --include="*.astro" --include="*.ts" --include="*.tsx" --include="*.js" \
  --exclude-dir=node_modules
# Expected: zero results.

# Find the actual i18n file paths
find src -name "*.json" -path "*i18n*" -o -name "*.json" -path "*locales*" 2>/dev/null
grep -rln "poweredBy" src/i18n/ src/locales/ 2>/dev/null || echo "search both dirs"
```

If grep returns ANY active reference → STOP. Daniel decides whether to ship a follow-up SPEC that removes the consumer first.

### Execution steps (each gated on its respective pre-flight passing)

1. **Item A:** save backup JSON; run DELETE; verify SC #1 (count returns 0); commit in ERP repo.
2. **Item B:** if folder exists, `git rm -rf _deprecated/`; commit in storefront repo.
3. **Item C:** if grep clean, edit 3 JSON files to remove the keys; `npm run build` (must exit 0); restore tenant-fallback-map.json drift per §8; commit in storefront repo.
4. Daniel opens PR(s) for storefront commits and merges.
5. Post-merge: re-run `curl https://www.prizma-optic.co.il/test-shortcodes/` to confirm SC #2 unchanged.
6. Update HANDOFF + DECISIONS_LOG per §8.
7. Write EXECUTION_REPORT + FINDINGS in this SPEC folder.

## §11 Lessons Already Incorporated

- **Step 0 — Reproduce-The-Bug-First (per opticup-strategic mandate):** queried prizma DB live; confirmed 3 archived rows for `/test-shortcodes/`; live HTTP probe confirmed customer-facing behavior is already harmless (308→home in HE; 404 in EN). Verified sitemap correctly omits the rows. Items B + C cannot be pre-flighted from Cowork (storefront repo not mounted) — explicit Step 0b in §10 instructs executor to verify before touching.
- **Cross-Reference Check (Rule 21):** no new DB objects, no new functions, no new files. Pure deletes. 0 collisions possible.
- **SQL-equivalent for SC #1 inline in §10** (per A1 from M3_STUDIO_TRANSLATIONS_BRAND_FILTER FOREMAN_REVIEW, applied to SPEC_TEMPLATE 2026-05-09 commit `74922cd`).
- **Subset-relationship sub-section in §7** (per A1 from M3_SITEMAP_BRAND_404_CLEANUP FOREMAN_REVIEW, applied to SPEC_TEMPLATE) — used to declare "not applicable" explicitly so executor doesn't waste time looking for one.
- **Build-side-effect expectations in §8** (per A2 from M3_SITEMAP_BRAND_404_CLEANUP FOREMAN_REVIEW, applied to SPEC_TEMPLATE) — pre-declared `tenant-fallback-map.json` restoration per known TECH_DEBT M3-DEBT-12.
- **Browser-readiness pre-flight in §10** (per A2 from M3_STUDIO_TRANSLATIONS_BRAND_FILTER FOREMAN_REVIEW, applied to SPEC_TEMPLATE) — explicitly declared "no browser needed" so executor skips Chrome readiness check.
- **Iron Rule 29 respected:** no view modification.
- **Three-commit ceiling on §9:** prevents scope creep; if executor finds a 4th cleanup target, it goes to FINDINGS, not into this SPEC.

## §12 Cross-Repo Note for Executor

This SPEC's commits land in BOTH repos:
- ERP repo (`opticalis/opticup`): item A DB-cleanup commit (with backup JSON) + final retrospective commit.
- Storefront repo (`opticalis/opticup-storefront`): items B + C cleanup commits, separate PR(s) to `main`.

Per CLAUDE.md §7 phase-label-ownership rule: descriptive commit messages in storefront repo, no Module 3 phase letters.
