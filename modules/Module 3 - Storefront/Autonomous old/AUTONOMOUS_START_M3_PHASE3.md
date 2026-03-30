# Optic Up — Module 3 Storefront — Phase 3: SEO Migration (3A → 3B → 3C)

Context: Optic Up — multi-tenant SaaS optical store management.
Repo: OpticaLis/opticup-storefront (NOT opticup!)
Working directory: C:\Users\User\opticup-storefront
ERP repo (READ-ONLY): C:\Users\User\opticup
Machine: 🖥️ Windows

MODE: AUTONOMOUS — execute all steps without waiting for approval.
This phase runs 3A → 3B → 3C sequentially with quality gates between them.

## ⛔ CRITICAL SAFETY RULES ⛔

1. Work ONLY in `C:\Users\User\opticup-storefront\`. NEVER modify files in `C:\Users\User\opticup\` (except ROADMAP.md status and backups folder).
2. ERP repo (`opticup`) is READ-ONLY for code — only write to `modules/Module 3 - Storefront/backups/` and `ROADMAP.md`.
3. NEVER commit `.env` files to git. Before EVERY commit: `git status` must NOT show .env.
4. NEVER run SQL against Supabase — Phase 3 has ZERO database changes.
5. All Supabase queries use Views only — `v_storefront_products`, `v_storefront_categories`, `v_storefront_brands`, `v_public_tenant`.
6. If unsure: document as DECISION_NEEDED, choose safer option, continue.
7. All SEO scripts go in `scripts/seo/`. All generated output goes in `scripts/seo/output/`.

## ⛔ BACKUP RULE (NEW — applies to ALL phases from now on) ⛔

**Every phase starts with a timestamped backup BEFORE any changes.**

Backup location: `C:\Users\User\opticup\modules\Module 3 - Storefront\backups\`
Format: `[YYYY-MM-DD_HH-MM]_pre-[phase-name]\opticup-storefront\`

```powershell
$ts = Get-Date -Format "yyyy-MM-dd_HH-mm"
$backupDir = "C:\Users\User\opticup\modules\Module 3 - Storefront\backups\${ts}_pre-[PHASE_NAME]"
New-Item -ItemType Directory -Force -Path $backupDir
robocopy "C:\Users\User\opticup-storefront" "$backupDir\opticup-storefront" /E /XD node_modules .git dist .vercel /XF .env
```

Verify backup contains: src/, CLAUDE.md, SESSION_CONTEXT.md, package.json, vercel.json
Verify backup does NOT contain: node_modules, .git, .env

**WHY:** Each backup is taken at the START of a phase. The previous phase was already verified as working. This means every backup is a known-good state we can restore to.

## FIRST — Setup:

```bash
cd C:/Users/User/opticup-storefront
git checkout develop
git pull origin develop
git branch  # Must show: develop
```

Then read (in this order):
1. `CLAUDE.md` — project rules
2. `SESSION_CONTEXT.md` — current status
3. PHASE_3A_SPEC.md at `C:\Users\User\opticup\modules\Module 3 - Storefront\docs\PHASE_3A_SPEC.md`
4. PHASE_3B_SPEC.md at `C:\Users\User\opticup\modules\Module 3 - Storefront\docs\PHASE_3B_SPEC.md`
5. PHASE_3C_SPEC.md at `C:\Users\User\opticup\modules\Module 3 - Storefront\docs\PHASE_3C_SPEC.md`

Verify SEO audit data exists:
```bash
dir "C:\Users\User\opticup\modules\Module 3 - Storefront\seo-audit\"
dir "C:\Users\User\opticup\modules\Module 3 - Storefront\seo-audit\data\"
```

---

## EXECUTION FLOW

```
┌─────────────────────────────────────────────┐
│  PHASE 3A — Data Prep & Redirects           │
│  Steps 0-9 from PHASE_3A_SPEC.md            │
│  Backup → Scripts → Mapping → Redirects     │
└──────────────────┬──────────────────────────┘
                   │
              QUALITY GATE 3A
              ├─ Match rate > 70%?
              ├─ Redirects ≤ 1,024?
              ├─ Coverage > 90%?
              └─ All scripts run?
                   │
            ┌──────┴──────┐
            │ ALL PASS    │ ANY FAIL
            ▼             ▼
┌───────────────────┐  ⛔ STOP
│  PHASE 3B         │  Document in SESSION_CONTEXT:
│  Blog Migration   │  - Which check failed
│  Steps 0-9        │  - Current stats
│  from SPEC        │  - "WAITING FOR DANIEL"
└────────┬──────────┘  Tag: v3.0-phase3a-needs-review
         │             Exit.
    QUALITY GATE 3B
    ├─ 58 HE posts render?
    ├─ Images > 90% success?
    ├─ Catch-all doesn't break routes?
    └─ Zero console errors?
         │
   ┌─────┴──────┐
   │ ALL PASS   │ ANY FAIL
   ▼            ▼
┌────────────┐  ⛔ STOP
│  PHASE 3C  │  Same pattern:
│  Landing   │  document, tag, exit.
│  Pages +   │
│  SEO Infra │
│  Steps 0-9 │
└────────┬───┘
         │
    FINAL VALIDATION
    └─ 100% coverage?
         │
   ┌─────┴──────┐
   │ YES        │ NO (but > 95%)
   ▼            ▼
   ✅ DONE      ⚠️ DONE with warnings
                Document gaps in
                SESSION_CONTEXT
```

---

## FOR EACH STEP IN EACH PHASE:

1. Read step requirements from the relevant SPEC
2. Implement
3. Run verification checklist for that step
4. Commit: `git add -A && git commit -m "Phase 3[A/B/C] Step N: [description]" && git push origin develop`
5. Update SESSION_CONTEXT.md

EVERY 3 STEPS within a phase: checkpoint commit + push.
IF BLOCKED after 3 attempts: document in SESSION_CONTEXT.md, skip step, continue.
IF DECISION NEEDED: document in SESSION_CONTEXT.md, choose simpler option, continue.

---

## QUALITY GATE IMPLEMENTATION

After completing each sub-phase, run this check before proceeding:

### After Phase 3A (before starting 3B):
```
CHECK 1: Read scripts/seo/output/product-mapping.json → stats.matched / stats.total > 0.70
CHECK 2: Count redirects in vercel.json → count ≤ 1024
CHECK 3: Read scripts/seo/output/migration-validation-report.md → coverage > 90%
CHECK 4: All 7 scripts in scripts/seo/ ran without errors

IF ALL PASS → Log "✅ Quality Gate 3A PASSED" in SESSION_CONTEXT.md → proceed to 3B
IF ANY FAIL → Log "⛔ Quality Gate 3A FAILED: [reason]" → tag v3.0-phase3a-needs-review → STOP
```

### After Phase 3B (before starting 3C):
```
CHECK 1: Access a known HE blog post URL → returns 200 (build the site: npm run build)
CHECK 2: Access /products/ → returns 200 (existing routes intact)
CHECK 3: Blog images in public/blog/images/ → count > 0
CHECK 4: npm run build completes without errors

IF ALL PASS → Log "✅ Quality Gate 3B PASSED" → proceed to 3C
IF ANY FAIL → Log "⛔ Quality Gate 3B FAILED: [reason]" → tag v3.0-phase3b-needs-review → STOP
```

### After Phase 3C (final):
```
CHECK 1: Run validate-migration.ts → coverage = 100% (or > 95% with documented gaps)
CHECK 2: npm run build completes without errors
CHECK 3: Landing pages render at root-level URLs
CHECK 4: sitemap.xml generated
CHECK 5: robots.txt accessible

IF ALL PASS → COMPLETE
IF < 95% coverage → tag v3.0-phase3c-needs-review → STOP
IF 95-99% → COMPLETE with warnings in SESSION_CONTEXT
```

---

## WHEN ALL 3 PHASES COMPLETE:

1. Final SESSION_CONTEXT.md update with complete Phase 3 summary:
   - Product mapping stats
   - Total redirects in vercel.json
   - Blog posts migrated (HE/EN/RU counts)
   - Landing pages built
   - Static pages built (3 languages)
   - Migration validator coverage %
   - Backup locations (all 3)
   - Known issues / remaining gaps
   - What's next: Phase 4

2. Final CHANGELOG.md entry for Phase 3

3. Update ROADMAP.md: Phase 3 → "✅ Complete (3A+3B+3C)"

4. Final commit: `git add -A && git commit -m "Phase 3 complete: SEO Migration (3A+3B+3C)" && git push origin develop`

5. **Do NOT merge to main** — Daniel reviews migration results first

6. Tag: `git tag v3.0-phase3-seo-migration-complete && git push origin v3.0-phase3-seo-migration-complete`

7. Output summary to console:
```
=== PHASE 3 COMPLETE ===
Products mapped: X/735 (Y%)
Redirects in vercel.json: Z
Blog posts: 58 HE + 43 EN + 42 RU
Landing pages: 7
Static pages: 12 (4 × 3 langs)
Migration coverage: X%
Backups: 3 (timestamps listed)
Status: develop branch, NOT merged to main
Next: Daniel reviews → merge → Phase 4
=====================
```

Go.
