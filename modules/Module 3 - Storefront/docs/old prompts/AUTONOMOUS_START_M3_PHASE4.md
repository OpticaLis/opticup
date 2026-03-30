# Optic Up — Module 3 Storefront — Phase 4: Catalog/Shop + WhatsApp + Bulk Ops (4A → 4B)

Context: Optic Up — multi-tenant SaaS optical store management.
Two repos involved:
- **ERP:** OpticaLis/opticup — `C:\Users\User\opticup`
- **Storefront:** OpticaLis/opticup-storefront — `C:\Users\User\opticup-storefront`
Machine: 🖥️ Windows

MODE: AUTONOMOUS — execute all steps without waiting for approval.
Phase 4A uses BOTH repos. Phase 4B is ERP only.

## ⛔ CRITICAL SAFETY RULES ⛔

1. **Two repos, two branches.** Both must be on `develop`. Verify before ANY work.
2. ERP repo: DO NOT modify shared components (shared.js, auth-service.js) unless explicitly in SPEC.
3. Storefront repo: Views only, no direct table access.
4. NEVER commit `.env` files. Check `git status` before every commit.
5. SQL files are SAVED, never run. Daniel runs SQL manually in Supabase Dashboard.
6. **Before CREATE TABLE:** check if table exists first (`SELECT to_regclass('public.TABLE_NAME');`). Document finding.
7. If unsure: DECISION_NEEDED, choose safer option, continue.

## ⛔ BACKUP RULE ⛔

Every sub-phase starts with a timestamped backup:
```powershell
$ts = Get-Date -Format "yyyy-MM-dd_HH-mm"
$backupDir = "C:\Users\User\opticup\modules\Module 3 - Storefront\backups\${ts}_pre-[PHASE_NAME]"
New-Item -ItemType Directory -Force -Path $backupDir
robocopy "C:\Users\User\opticup-storefront" "$backupDir\opticup-storefront" /E /XD node_modules .git dist .vercel /XF .env
robocopy "C:\Users\User\opticup" "$backupDir\opticup-erp" /E /XD node_modules .git /XF .env
```
Verify backup before proceeding.

## FIRST — Setup both repos:

```bash
cd C:/Users/User/opticup-storefront && git checkout develop && git pull origin develop && git branch
cd C:/Users/User/opticup && git checkout develop && git pull origin develop && git branch
```

Both must show `develop`.

Then read (in order):
1. `C:\Users\User\opticup-storefront\CLAUDE.md`
2. `C:\Users\User\opticup-storefront\SESSION_CONTEXT.md`
3. `C:\Users\User\opticup\CLAUDE.md`
4. `PHASE_4A_SPEC.md` at `C:\Users\User\opticup\modules\Module 3 - Storefront\docs\PHASE_4A_SPEC.md`
5. `PHASE_4B_SPEC.md` at `C:\Users\User\opticup\modules\Module 3 - Storefront\docs\PHASE_4B_SPEC.md`

---

## EXECUTION FLOW

```
┌──────────────────────────────────────────────────┐
│  PHASE 4A — Catalog/Shop + WhatsApp + Booking    │
│  Steps 0-9 from PHASE_4A_SPEC.md                 │
│  ERP: SQL files (006, 007, 008)                   │
│  Storefront: WhatsApp, NotifyMe, Booking, modes  │
└───────────────────┬──────────────────────────────┘
                    │
               QUALITY GATE 4A
               ├─ Build succeeds?
               ├─ Catalog mode works? (no price, WhatsApp visible)
               ├─ NotifyMe form submits?
               ├─ Booking button shows/hides?
               ├─ Existing pages still 200?
                    │
             ┌──────┴──────┐
             │ ALL PASS    │ ANY FAIL
             ▼             ▼
┌───────────────────┐   ⛔ STOP
│  PHASE 4B         │   Document in SESSION_CONTEXT
│  Bulk Ops (ERP)   │   Tag: v4.0-phase4a-needs-review
│  Steps 0-5        │   Exit.
└────────┬──────────┘
         │
    QUALITY GATE 4B
    ├─ Settings page works?
    ├─ Brand manager works?
    ├─ Product manager + bulk select works?
    ├─ Navigation links work?
         │
   ┌─────┴──────┐
   │ ALL PASS   │ ANY FAIL
   ▼            ▼
   ✅ DONE      ⛔ STOP
```

---

## ⚠️ IMPORTANT: SQL EXECUTION ORDER

Phase 4A creates SQL files but does NOT run them. Before testing Storefront changes that depend on new DB columns/views, Claude Code must:

1. **Notify Daniel** in SESSION_CONTEXT.md: "SQL files ready. Run these in Supabase Dashboard before testing: 006, 007, 008"
2. **Continue with Storefront code** that can be written without the DB changes
3. **Mark in SPEC** which verification steps require DB changes to be applied

If a step REQUIRES the DB changes to test (e.g., testing resolved_mode display):
- Write the code
- Build to verify no compile errors
- Mark verification as "PENDING_DB_MIGRATION" in SESSION_CONTEXT.md
- Continue to next step

---

## FOR EACH STEP IN EACH PHASE:

1. Read step requirements from the relevant SPEC
2. Verify which repo (opticup or opticup-storefront)
3. `cd` to correct repo directory
4. Implement
5. Run verification checklist
6. Commit: `git add -A && git commit -m "Phase 4[A/B] Step N: [description]" && git push origin develop`
7. Update SESSION_CONTEXT.md

EVERY 3 STEPS: checkpoint commit + push.
IF BLOCKED after 3 attempts: document, skip, continue.
IF DECISION NEEDED: document, choose simpler, continue.

---

## QUALITY GATE IMPLEMENTATION

### After Phase 4A:
```
CHECK 1: cd opticup-storefront && npm run build → zero errors
CHECK 2: WhatsAppButton component exists and renders
CHECK 3: NotifyMe component exists
CHECK 4: BookingButton component exists
CHECK 5: Product page handles resolved_mode prop
CHECK 6: curl all key URLs return 200:
  - https://opticup-storefront.vercel.app/
  - https://opticup-storefront.vercel.app/products/
  - https://opticup-storefront.vercel.app/brands/
  - https://opticup-storefront.vercel.app/%D7%91%D7%9C%D7%95%D7%92/

IF ALL PASS → proceed to 4B
IF ANY FAIL → tag v4.0-phase4a-needs-review → STOP
```

### After Phase 4B:
```
CHECK 1: storefront-settings.html exists and loads
CHECK 2: storefront-brands.html exists and loads
CHECK 3: storefront-products.html exists with bulk selection
CHECK 4: Navigation links added to ERP menu

IF ALL PASS → COMPLETE
IF ANY FAIL → document → STOP
```

---

## WHEN ALL PHASES COMPLETE:

1. Final SESSION_CONTEXT.md update with Phase 4 summary
2. Final CHANGELOG.md entries
3. Update ROADMAP.md: Phase 4 → "✅ Complete (4A+4B)"
4. Commit: `git add -A && git commit -m "Phase 4 complete: Catalog/Shop + WhatsApp + Bulk Ops" && git push origin develop`
5. **Do NOT merge to main** — Daniel reviews + runs SQL migrations first
6. Tags:
   - opticup-storefront: `git tag v4.0-phase4-catalog-shop && git push origin v4.0-phase4-catalog-shop`
   - opticup: `git tag v4.0-phase4b-bulk-ops && git push origin v4.0-phase4b-bulk-ops`
7. Output summary:
```
=== PHASE 4 COMPLETE ===
SQL files: 006, 007, 008 (NOT RUN — Daniel must run manually)
New components: WhatsAppButton, NotifyMe, BookingButton
Product modes: catalog/shop/hidden (brand default + product override)
ERP pages: storefront-settings, storefront-brands, storefront-products
Bulk ops: select + change mode
Status: develop branch, NOT merged to main
⚠️ PENDING: Daniel must run SQL migrations before testing
Next: Daniel runs SQL → reviews → merge → Phase 5
========================
```

## WHEN DONE — Move this prompt:
```bash
move "C:\Users\User\opticup\modules\Module 3 - Storefront\docs\current prompt\AUTONOMOUS_START_M3_PHASE4.md" "C:\Users\User\opticup\modules\Module 3 - Storefront\docs\old prompts\"
```

Go.
