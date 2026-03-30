# Optic Up — Module 3 Storefront — Phase 7: White-Label + Analytics + Theme

Context: Optic Up — multi-tenant SaaS optical store management.
Two repos:
- **ERP:** OpticaLis/opticup — `C:\Users\User\opticup`
- **Storefront:** OpticaLis/opticup-storefront — `C:\Users\User\opticup-storefront`
Machine: 🖥️ Windows

MODE: AUTONOMOUS — execute all steps without waiting for approval.

## ⛔ CRITICAL SAFETY RULES ⛔

1. Both repos on `develop`. Verify before ANY work.
2. SQL files SAVED, never run.
3. Edge Functions: `/// <reference>` pattern, deploy with `--no-verify-jwt`.
4. NEVER commit `.env` or API keys.
5. **GOLDEN VIEW RULE:** Copy EXACT images subquery from CLAUDE.md when touching views.
6. **REGRESSION CHECK:** After ANY change: images load, products display, WhatsApp visible, booking visible.
7. Before CREATE TABLE / ALTER TABLE: check if column/table exists first (IF NOT EXISTS).

## ⛔ BACKUP RULE ⛔

```powershell
$ts = Get-Date -Format "yyyy-MM-dd_HH-mm"
$backupDir = "C:\Users\User\opticup\modules\Module 3 - Storefront\backups\${ts}_pre-phase7"
New-Item -ItemType Directory -Force -Path $backupDir
robocopy "C:\Users\User\opticup-storefront" "$backupDir\opticup-storefront" /E /XD node_modules .git dist .vercel /XF .env
robocopy "C:\Users\User\opticup" "$backupDir\opticup-erp" /E /XD node_modules .git /XF .env
```

## FIRST — Setup:

```bash
cd C:/Users/User/opticup-storefront && git checkout develop && git pull origin develop && git branch
cd C:/Users/User/opticup && git checkout develop && git pull origin develop && git branch
```

Read (in order):
1. `C:\Users\User\opticup-storefront\CLAUDE.md` — Golden View Reference + Regression Checklist + Known Fragile Areas
2. `C:\Users\User\opticup-storefront\SESSION_CONTEXT.md`
3. `C:\Users\User\opticup\CLAUDE.md`
4. PHASE_7_SPEC.md at `C:\Users\User\opticup\modules\Module 3 - Storefront\docs\PHASE_7_SPEC.md`

---

## EXECUTION — Steps 0-8 from PHASE_7_SPEC.md

Key notes:
- **Step 1** (SQL): Save file, DO NOT run
- **Step 2** (Partytown): `npm install @astrojs/partytown`, update astro.config
- **Step 3** (Analytics): All scripts use `type="text/partytown"` — CRITICAL for performance
- **Step 4** (Events): `dataLayer.push` for: view_product, whatsapp_click, notify_me, booking_click, search, search_no_results
- **Step 5** (Tenant resolution): custom_domain → subdomain → ?t= → default
- **Step 7** (ERP): Analytics as JSONB, not separate columns

## FOR EACH STEP:
1. Read step from SPEC
2. Verify correct repo
3. Implement
4. Verify
5. Commit: `git add -A && git commit -m "Phase 7 Step N: [description]" && git push origin develop`
6. Update SESSION_CONTEXT.md

EVERY 3 STEPS: checkpoint commit.
IF BLOCKED: document, skip, continue.

## ⚠️ SQL DEPLOY

Daniel must run after code is ready:
1. `sql/018-phase7-white-label.sql` in Supabase Dashboard

No new Edge Functions in this phase.

## QUALITY GATE:

```
CHECK 1: npm run build → zero errors (storefront)
CHECK 2: Partytown service worker in build output
CHECK 3: curl https://opticup-storefront.vercel.app/ → 200
CHECK 4: curl https://opticup-storefront.vercel.app/products/ → 200 + product cards
CHECK 5: curl https://opticup-storefront.vercel.app/?t=demo → 200 (no errors)
CHECK 6: ERP storefront-settings.html has analytics JSONB fields
CHECK 7: Images load (regression)

IF ALL PASS → COMPLETE
IF ANY FAIL → document → STOP
```

## WHEN DONE:

1. SESSION_CONTEXT.md + CHANGELOG.md + CLAUDE.md + ROADMAP.md
2. Commit: `Phase 7 complete: White-Label + Analytics + Theme`
3. Do NOT merge to main
4. Tags:
   - storefront: `v7.0-phase7-white-label`
   - ERP: `v7.0-phase7-white-label-erp`
5. Output summary

## WHEN DONE — Move this prompt:
```bash
move "C:\Users\User\opticup\modules\Module 3 - Storefront\docs\current prompt\AUTONOMOUS_START_M3_PHASE7.md" "C:\Users\User\opticup\modules\Module 3 - Storefront\docs\old prompts\"
```

Go.
